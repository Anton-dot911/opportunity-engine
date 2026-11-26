import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { createAIProviderAdapter, researchCyclePrompt } from '@oe/ai-runtime';
import { OpportunityResearchLoopRepository, OpportunityResearchRepository } from '@oe/database';
import { env } from '../config/env.js';

const outputSchema = z.object({
  researchTasks: z.array(z.object({
    category: z.string().min(1).max(80),
    question: z.string().min(1).max(1000),
    priority: z.enum(['critical','high','normal']),
    rationale: z.string().min(1).max(1200),
  })).min(1).max(20),
  findings: z.array(z.object({
    claim: z.string().min(1).max(2000),
    evidenceIds: z.array(z.string().min(1)).max(20),
    status: z.enum(['evidence_backed','unverified']),
    limitation: z.string().max(1000).optional(),
  })).max(30),
  remainingUnknowns: z.array(z.string().min(1).max(1000)).max(30),
  nextAction: z.enum(['gather_more_evidence','operator_review','run_validation','stop_insufficient_evidence']),
  nextActionRationale: z.string().min(1).max(1500),
});

export class ResearchLoopService {
  constructor(
    private readonly loopRepository = new OpportunityResearchLoopRepository(),
    private readonly researchRepository = new OpportunityResearchRepository(),
  ) {}

  async execute(opportunityId: string) {
    if (!env.ANTHROPIC_API_KEY) throw Object.assign(new Error('AI_PROVIDER_NOT_CONFIGURED'), { code: 'AI_PROVIDER_NOT_CONFIGURED' });
    const loaded = await this.loopRepository.loadInput(opportunityId);
    if (!loaded) throw Object.assign(new Error('OPPORTUNITY_NOT_FOUND'), { code: 'OPPORTUNITY_NOT_FOUND' });

    const research = loaded.research ?? await this.researchRepository.create(opportunityId);
    if (!research) throw Object.assign(new Error('OPPORTUNITY_NOT_FOUND'), { code: 'OPPORTUNITY_NOT_FOUND' });
    const iteration = Number(await this.loopRepository.countRuns(opportunityId)) + 1;
    if (iteration > env.RESEARCH_MAX_ITERATIONS) {
      throw Object.assign(new Error('RESEARCH_ITERATION_LIMIT_REACHED'), { code: 'RESEARCH_ITERATION_LIMIT_REACHED' });
    }

    const runId = randomUUID();
    const inputSnapshot = {
      opportunity: loaded.opportunity,
      currentResearch: {
        questions: research.questions,
        findings: research.findings,
        evidence: research.evidence,
        unknowns: research.unknowns,
      },
      evidenceRecords: loaded.evidenceRecords,
      acceptedLearningInsights: loaded.acceptedLearningInsights,
      iteration,
      guardrails: {
        maxTasks: 20,
        evidenceMustReferenceProvidedIds: true,
        acceptedLearningIsContextOnly: true,
        noOpportunityStatusOrScoreChanges: true,
      },
    };
    const adapter = createAIProviderAdapter({ provider: env.AI_PROVIDER, model: env.ANTHROPIC_MODEL, apiKey: env.ANTHROPIC_API_KEY });
    const started = Date.now();
    try {
      const result = await adapter.generateStructured({
        prompt: researchCyclePrompt,
        input: inputSnapshot,
        schema: outputSchema,
        timeoutMs: env.AI_TIMEOUT_MS,
        maxRetries: env.AI_MAX_RETRIES,
      });
      const allowedEvidence = new Set(loaded.evidenceRecords.map((item) => item.id));
      for (const finding of result.output.findings) {
        if (finding.evidenceIds.some((id) => !allowedEvidence.has(id))) {
          throw Object.assign(new Error('AI_REFERENCED_UNKNOWN_EVIDENCE'), { code: 'AI_REFERENCED_UNKNOWN_EVIDENCE' });
        }
        if (finding.status === 'evidence_backed' && finding.evidenceIds.length === 0) {
          throw Object.assign(new Error('AI_UNSUPPORTED_EVIDENCE_CLAIM'), { code: 'AI_UNSUPPORTED_EVIDENCE_CLAIM' });
        }
      }
      const estimatedCostUsd = result.usage.inputTokens !== null && result.usage.outputTokens !== null
        && env.AI_INPUT_COST_PER_MILLION !== undefined && env.AI_OUTPUT_COST_PER_MILLION !== undefined
        ? (result.usage.inputTokens * env.AI_INPUT_COST_PER_MILLION + result.usage.outputTokens * env.AI_OUTPUT_COST_PER_MILLION) / 1_000_000
        : null;
      await this.loopRepository.recordExecution({
        runId, taskType: 'opportunity_research_cycle', provider: result.provider, model: result.model,
        promptId: result.promptId, promptVersion: result.promptVersion, status: 'succeeded',
        inputTokens: result.usage.inputTokens, outputTokens: result.usage.outputTokens,
        estimatedCostUsd, durationMs: result.durationMs, attempts: result.attempts,
      });
      const questions = result.output.researchTasks.map((task) => ({ ...task, status: 'open' }));
      const findings = result.output.findings.map((finding) => ({
        ...finding,
        source: 'ai_research_candidate',
        verified: finding.status === 'evidence_backed',
      }));
      const evidence = result.output.findings.flatMap((finding) =>
        finding.evidenceIds.map((evidenceId) => ({ evidenceId, claim: finding.claim, source: 'opportunity_evidence_snapshot' })),
      );
      const saved = await this.loopRepository.saveRun({
        opportunityId, researchId: research.id, runId, iteration, inputSnapshot,
        outputSnapshot: result.output, nextAction: result.output.nextAction,
        questions, findings, evidence, unknowns: result.output.remainingUnknowns,
      });
      return {
        run: saved.run,
        research: saved.research,
        nextAction: result.output.nextAction,
        nextActionRationale: result.output.nextActionRationale,
        usage: result.usage,
        estimatedCostUsd,
      };
    } catch (error) {
      const code = error instanceof Error && 'code' in error ? String(error.code) : 'AI_RESEARCH_EXECUTION_FAILED';
      const durationMs = Date.now() - started;
      await this.loopRepository.recordExecution({
        runId, taskType: 'opportunity_research_cycle', provider: 'anthropic', model: env.ANTHROPIC_MODEL,
        promptId: researchCyclePrompt.id, promptVersion: researchCyclePrompt.version,
        status: 'failed', inputTokens: null, outputTokens: null, estimatedCostUsd: null,
        durationMs, attempts: 1, errorCode: code,
      });
      await this.loopRepository.saveFailedRun({
        opportunityId, researchId: research.id, iteration, inputSnapshot, errorCode: code,
      });
      throw Object.assign(new Error(code), { code });
    }
  }
}
