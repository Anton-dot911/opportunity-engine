import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { OpportunityResearchRepository } from '@oe/database';
const idSchema=z.string().uuid();
const updateSchema=z.object({
 status:z.enum(['planned','in_progress','completed','cancelled']).optional(),
 questions:z.array(z.unknown()).max(100).optional(),
 findings:z.array(z.unknown()).max(500).optional(),
 evidence:z.array(z.unknown()).max(500).optional(),
 unknowns:z.array(z.unknown()).max(500).optional(),
 conclusion:z.string().max(10000).nullable().optional()
});
export function registerOpportunityResearchRoutes(app:FastifyInstance,repository=new OpportunityResearchRepository()){
 app.post('/api/opportunities/:id/research',async(request,reply)=>{
  const id=idSchema.safeParse((request.params as {id:string}).id);if(!id.success)return reply.code(400).send({error:'VALIDATION_ERROR'});
  try{const row=await repository.create(id.data);if(!row)return reply.code(404).send({error:'OPPORTUNITY_NOT_FOUND'});return reply.code(201).send(row)}
  catch(error){app.log.error(error);return reply.code(503).send({error:'RESEARCH_CREATE_UNAVAILABLE'})}
 });
 app.get('/api/opportunities/:id/research',async(request,reply)=>{
  const id=idSchema.safeParse((request.params as {id:string}).id);if(!id.success)return reply.code(400).send({error:'VALIDATION_ERROR'});
  try{const row=await repository.getByOpportunityId(id.data);if(!row)return reply.code(404).send({error:'RESEARCH_NOT_FOUND'});return row}
  catch(error){app.log.error(error);return reply.code(503).send({error:'RESEARCH_GET_UNAVAILABLE'})}
 });
 app.patch('/api/research/:id',async(request,reply)=>{
  const id=idSchema.safeParse((request.params as {id:string}).id),body=updateSchema.safeParse(request.body);
  if(!id.success||!body.success)return reply.code(400).send({error:'VALIDATION_ERROR'});
  try{const input={...(body.data.status!==undefined?{status:body.data.status}:{}),...(body.data.questions!==undefined?{questions:body.data.questions}:{}),...(body.data.findings!==undefined?{findings:body.data.findings}:{}),...(body.data.evidence!==undefined?{evidence:body.data.evidence}:{}),...(body.data.unknowns!==undefined?{unknowns:body.data.unknowns}:{}),...(body.data.conclusion!==undefined?{conclusion:body.data.conclusion}:{})};const row=await repository.update(id.data,input);if(!row)return reply.code(404).send({error:'RESEARCH_NOT_FOUND'});return row}
  catch(error){app.log.error(error);return reply.code(503).send({error:'RESEARCH_UPDATE_UNAVAILABLE'})}
 });
}
