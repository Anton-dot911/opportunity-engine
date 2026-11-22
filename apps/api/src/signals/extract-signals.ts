import { createHash } from 'node:crypto';
import type { SignalSourceDocument, ExtractedSignal } from '@oe/database';

type Rule = { type: ExtractedSignal['signalType']; keywords: RegExp; confidence: number };
const RULES: Rule[] = [
  { type: 'price', keywords: /price|pricing|cost|expensive|cheap|inflation|discount|tariff|ціна|вартіст|подорожч|дешевш|знижк|тариф/iu, confidence: 0.76 },
  { type: 'regulation', keywords: /regulation|regulatory|law|legislation|compliance|policy|закон|регуляц|законодав|правил/iu, confidence: 0.78 },
  { type: 'technology', keywords: /technology|technological|AI|artificial intelligence|automation|software|platform|технолог|штучн.*інтелект|автоматизац/iu, confidence: 0.72 },
  { type: 'supply', keywords: /supply|supplier|shortage|inventory|production|manufactur|logistics|поставк|постачаль|дефіцит|виробництв|логіст/iu, confidence: 0.72 },
  { type: 'demand', keywords: /demand|consumer|customer|buyers|sales|purchas|market interest|попит|споживач|покупц|продаж|клієнт/iu, confidence: 0.70 },
  { type: 'inefficiency', keywords: /inefficient|inefficiency|waste|bottleneck|friction|problem|failure|ineffective|неефектив|втрат|перешкод|проблем|збій/iu, confidence: 0.68 },
  { type: 'complaint', keywords: /complaint|complain|frustrat|dissatisf|poor service|broken|скарг|невдоволен|поган.*сервіс|злам/iu, confidence: 0.68 },
  { type: 'trend', keywords: /trend|growing|growth|rising|declining|increasing|decreasing|emerging|popular|тенденц|зрост|падін|збільш|зменш|популяр/iu, confidence: 0.66 },
  { type: 'event', keywords: /launch|announced|announcement|acquisition|partnership|opened|closed|event|запуск|оголос|придбан|партнерств|відкрит|закрит/iu, confidence: 0.65 },
  { type: 'market_change', keywords: /market|industry|sector|competitor|business model|ринок|галуз|конкурент/iu, confidence: 0.62 },
];

function sentences(text: string): string[] {
  return text.replace(/\\s+/g, ' ').split(/(?<=[.!?])\\s+/).map(s => s.trim()).filter(s => s.length >= 35 && s.length <= 700);
}

export function extractSignals(document: SignalSourceDocument): ExtractedSignal[] {
  const parts = sentences(document.content.slice(0, 80_000));
  const signals: ExtractedSignal[] = [];
  for (const rule of RULES) {
    const matching = parts.filter(sentence => rule.keywords.test(sentence));
    const firstMatch = matching[0];
    if (!firstMatch) continue;
    const summary = firstMatch.slice(0, 500);
    const normalized = summary.toLowerCase().replace(/[^\\p{L}\\p{N}]+/gu, ' ').trim();
    const dedupKey = createHash('sha256').update(document.id + '|' + rule.type + '|' + normalized).digest('hex');
    signals.push({ signalType: rule.type, summary, observedAt: document.published_at, confidence: rule.confidence, dedupKey, extractionMethod: 'rule-based-v1' });
  }
  return signals;
}
