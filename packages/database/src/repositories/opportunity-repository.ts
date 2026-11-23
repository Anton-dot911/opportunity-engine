import { pool } from '../pool.js';

const MECHANISM_PATTERN = /(?:sell|resell|broker|commission|subscription|license|arbitrage|margin|marketplace|aggregate|productiz|distribution|reduce\s+(?:cost|expense)|automate|replace\s+(?:manual|cost)|paid\s+service|revenue|profit|monetiz)/i;
type HypothesisRow = { id:string; title:string; statement:string; mechanism:string; assumptions:unknown; category:string };
export class OpportunityRepository {
 async generate(limit=100) {
  const rows=(await pool.query(
   `SELECT h.id,h.title,h.statement,h.mechanism,h.assumptions,h.category
    FROM hypotheses h
    LEFT JOIN opportunities o ON o.hypothesis_id=h.id
    WHERE h.status IN ('draft','review','active') AND o.id IS NULL
    ORDER BY h.updated_at DESC LIMIT $1`,[Math.max(1,Math.min(500,Math.floor(limit)))]
  )).rows as HypothesisRow[];
  let created=0, rejected=0, researchOnly=0;
  for(const h of rows){
   const mechanism=h.mechanism?.trim() ?? '';
   if(!MECHANISM_PATTERN.test(mechanism) || mechanism.length<40){
    rejected++;
    researchOnly++;
    continue;
   }
   const evidence=(await pool.query(
    `SELECT he.signal_id,he.contribution,s.summary,s.document_id
     FROM hypothesis_evidence he JOIN signals s ON s.id=he.signal_id
     WHERE he.hypothesis_id=$1 ORDER BY he.created_at`,[h.id])).rows;
   if(evidence.length===0){researchOnly++;continue;}
   await pool.query(
    `INSERT INTO opportunities (hypothesis_id,title,problem,target_segment,value_capture_mechanism,proposed_solution,evidence,assumptions,unknowns,economics,risks,validation_step,status)
     VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb,$8::jsonb,$9::jsonb,$10::jsonb,$11::jsonb,$12,'draft')
     ON CONFLICT (hypothesis_id) DO NOTHING`,
    [h.id,
     h.title,
     h.statement,
     'Unconfirmed segment; identify and interview affected buyers.',
     mechanism,
     'Solution concept not yet designed; derive options from validated buyer pain.',
     JSON.stringify({hypothesisId:h.id,signals:evidence}),
     JSON.stringify(Array.isArray(h.assumptions)?h.assumptions:[]),
     JSON.stringify(['Buyer willingness to pay','Problem frequency and severity','Feasible delivery and cost','Competitive alternatives']),
     JSON.stringify({revenue:null,costs:null,grossMargin:null,capitalRequired:null,currency:null,notes:'No financial estimates until evidence exists.'}),
     JSON.stringify(['Demand may not exist','Evidence may be correlated or inaccurate','Execution, competition, regulatory and unit-economic risks are unassessed']),
     'Interview at least three potential buyers and test problem severity and willingness to pay with a concrete offer.'
    ]);
   created++;
  }
  return {hypothesesConsidered:rows.length,opportunitiesCreated:created,rejectedForNoEconomicMechanism:rejected,researchOnly};
 }
 async list(status?:string){
  const r=await pool.query(`SELECT * FROM opportunities WHERE ($1::text IS NULL OR status=$1) ORDER BY updated_at DESC`,[status??null]);
  return r.rows;
 }
 async getById(id:string){
  const r=await pool.query('SELECT * FROM opportunities WHERE id=$1',[id]);
  return r.rows[0]??null;
 }
 async updateStatus(id:string,status:string){
  const r=await pool.query('UPDATE opportunities SET status=$2,updated_at=now() WHERE id=$1 RETURNING *',[id,status]);
  return r.rows[0]??null;
 }
}
