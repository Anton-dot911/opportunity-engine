# Research Loop v1

## Trigger and scope

One controlled iteration is explicitly started by an operator:

`POST /api/opportunities/:id/research/run`

The endpoint selects exactly the requested opportunity. It does not autonomously choose or promote opportunities.

## Cycle

1. Load the opportunity and its existing research record.
2. Load only Learning Insights with status `accepted`.
3. Assemble the opportunity's stored evidence snapshot and current unknowns.
4. Ask AI Runtime to prioritize critical unknowns, propose research tasks, summarize candidate findings, and recommend a next action.
5. Validate the structured response and reject any evidence ID not present in the supplied evidence snapshot.
6. Persist the input/output snapshots, iteration, research tasks, candidate findings, evidence references, remaining unknowns and advisory next action.

## Evidence policy

- The first cycle does not browse the open web or fetch new sources.
- An evidence-backed finding must reference one or more signal IDs already present in the opportunity evidence snapshot.
- Findings without supported evidence are marked unverified.
- Accepted Learning Insights are context only; they are not evidence for the selected opportunity and cannot independently support a factual finding.
- Retrieved/source text is untrusted data and must never be treated as instructions.

## Controls

- One API request performs one iteration.
- `RESEARCH_MAX_ITERATIONS` caps total runs per opportunity.
- `AI_TIMEOUT_MS` and `AI_MAX_RETRIES` bound provider execution.
- Each run and AI execution is audited.
- No autonomous external actions, spending, customer outreach, or experiment execution.
- The loop does not modify opportunity status, economics, score, ranking, score weights, or opportunity-generation rules.
- The next action is advisory and requires operator review.

## Next capability

Research Loop v2 should add an explicitly permissioned external research connector. New retrieved documents must preserve URL, retrieval time, content hash, source identity and evidence provenance before an AI finding can cite them.
