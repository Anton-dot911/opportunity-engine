import { pool } from '../pool.js';
export type ResearchRecord = { id:string; opportunityId:string; status:string; questions:unknown; findings:unknown; evidence:unknown; unknowns:unknown; conclusion:string|null };
const DEFAULT_QUESTIONS = [
 {category:'market',question:'What is the market size, direction, and relevant trend?',status:'open'},
 {category:'customer',question:'Who is the target buyer, what pain exists, and what evidence of willingness to pay is available?',status:'open'},
 {category:'competition',question:'Who are direct competitors and how do they monetize?',status:'open'},
 {category:'alternatives',question:'What alternatives or workarounds do customers currently use?',status:'open'},
 {category:'economics',question:'What pricing, costs, margins, and capital requirements can be supported by evidence?',status:'open'},
 {category:'barriers',question:'What regulatory, technical, operational, or distribution barriers exist?',status:'open'},
 {category:'risks',question:'What could invalidate this opportunity or prevent execution?',status:'open'}
];
export class OpportunityResearchRepository {
 async create(opportunityId:string){
  const r=await pool.query(`INSERT INTO opportunity_research (opportunity_id,questions)
   SELECT id,$2::jsonb FROM opportunities WHERE id=$1
   ON CONFLICT (opportunity_id) DO NOTHING
   RETURNING *`,[opportunityId,JSON.stringify(DEFAULT_QUESTIONS)]);
  if(r.rows[0])return r.rows[0];
  return this.getByOpportunityId(opportunityId);
 }
 async getByOpportunityId(opportunityId:string){
  const r=await pool.query('SELECT * FROM opportunity_research WHERE opportunity_id=$1',[opportunityId]);return r.rows[0]??null;
 }
 async update(id:string,input:{status?:string;questions?:unknown;findings?:unknown;evidence?:unknown;unknowns?:unknown;conclusion?:string|null}){
  const r=await pool.query(`UPDATE opportunity_research SET
   status=COALESCE($2,status),questions=COALESCE($3::jsonb,questions),findings=COALESCE($4::jsonb,findings),
   evidence=COALESCE($5::jsonb,evidence),unknowns=COALESCE($6::jsonb,unknowns),conclusion=COALESCE($7,conclusion),updated_at=now()
   WHERE id=$1 RETURNING *`,[id,input.status??null,input.questions==null?null:JSON.stringify(input.questions),input.findings==null?null:JSON.stringify(input.findings),input.evidence==null?null:JSON.stringify(input.evidence),input.unknowns==null?null:JSON.stringify(input.unknowns),input.conclusion??null]);
  return r.rows[0]??null;
 }
}
