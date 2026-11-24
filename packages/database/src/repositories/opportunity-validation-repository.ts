import { pool } from '../pool.js';
export type ValidationInput = {opportunityId:string;title:string;hypothesis:string;method:string;successCriteria:string;budgetEstimate?:number|null|undefined;currency?:string|null|undefined;timeboxDays:number};
export type ValidationUpdate = {status:'planned'|'in_progress'|'completed'|'cancelled';outcome?:'confirmed'|'not_confirmed'|'inconclusive'|null|undefined;findings?:string|null|undefined;evidence?:unknown[]|undefined};
export class OpportunityValidationRepository {
 async create(input:ValidationInput){
  const result=await pool.query(`INSERT INTO opportunity_validations (opportunity_id,title,hypothesis,method,success_criteria,budget_estimate,currency,timebox_days)
   SELECT id,$2,$3,$4,$5,$6,$7,$8 FROM opportunities WHERE id=$1 RETURNING *`,
   [input.opportunityId,input.title,input.hypothesis,input.method,input.successCriteria,input.budgetEstimate??null,input.currency??null,input.timeboxDays]);
  return result.rows[0]??null;
 }
 async list(opportunityId:string){return (await pool.query('SELECT * FROM opportunity_validations WHERE opportunity_id=$1 ORDER BY created_at DESC',[opportunityId])).rows;}
 async getById(id:string){const r=await pool.query('SELECT * FROM opportunity_validations WHERE id=$1',[id]);return r.rows[0]??null;}
 async update(id:string,input:ValidationUpdate){
  const outcome=input.status==='completed'?(input.outcome??'inconclusive'):null;
  const r=await pool.query(`UPDATE opportunity_validations SET status=$2,outcome=$3,findings=$4,evidence=$5::jsonb,updated_at=now() WHERE id=$1 RETURNING *`,
  [id,input.status,outcome,input.findings??null,JSON.stringify(input.evidence??[])]);
  return r.rows[0]??null;
 }
}
