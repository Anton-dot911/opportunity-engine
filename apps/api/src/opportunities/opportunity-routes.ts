import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { OpportunityRepository } from '@oe/database';
const statusSchema=z.enum(['draft','review','rejected','approved_for_validation']);
const idSchema=z.string().uuid();
export function registerOpportunityRoutes(app:FastifyInstance,repository=new OpportunityRepository()){
 app.post('/api/opportunities/generate',async(request,reply)=>{
  const parsed=z.object({limit:z.number().int().min(1).max(500).optional()}).safeParse(request.body??{});
  if(!parsed.success)return reply.code(400).send({error:'VALIDATION_ERROR',details:parsed.error.issues});
  try{return await repository.generate(parsed.data.limit??100)}
  catch(error){app.log.error(error);return reply.code(503).send({error:'OPPORTUNITY_GENERATION_UNAVAILABLE'})}
 });
 app.get('/api/opportunities',async(request,reply)=>{
  const parsed=z.object({status:statusSchema.optional()}).safeParse(request.query);
  if(!parsed.success)return reply.code(400).send({error:'VALIDATION_ERROR',details:parsed.error.issues});
  try{return await repository.list(parsed.data.status)}
  catch(error){app.log.error(error);return reply.code(503).send({error:'OPPORTUNITY_LIST_UNAVAILABLE'})}
 });
 app.get('/api/opportunities/:id',async(request,reply)=>{
  const parsed=idSchema.safeParse((request.params as {id:string}).id);
  if(!parsed.success)return reply.code(400).send({error:'VALIDATION_ERROR',details:parsed.error.issues});
  try{const row=await repository.getById(parsed.data);if(!row)return reply.code(404).send({error:'OPPORTUNITY_NOT_FOUND'});return row}
  catch(error){app.log.error(error);return reply.code(503).send({error:'OPPORTUNITY_RETRIEVAL_UNAVAILABLE')}
 });
 app.patch('/api/opportunities/:id/status',async(request,reply)=>{
  const id=idSchema.safeParse((request.params as {id:string}).id);
  const body=z.object({status:statusSchema}).safeParse(request.body);
  if(!id.success||!body.success)return reply.code(400).send({error:'VALIDATION_ERROR'});
  try{const row=await repository.updateStatus(id.data,body.data.status);if(!row)return reply.code(404).send({error:'OPPORTUNITY_NOT_FOUND'});return row}
  catch(error){app.log.error(error);return reply.code(503).send({error:'OPPORTUNITY_STATUS_UPDATE_UNAVAILABLE'})}
 });
}
