import { describe,it,expect } from 'vitest';
import Fastify from 'fastify';
import { registerOpportunityResearchRoutes } from './opportunity-research-routes.js';
describe('opportunity research routes',()=>{
 it('rejects invalid opportunity id',async()=>{
  const app=Fastify();registerOpportunityResearchRoutes(app,{create:async()=>null,getByOpportunityId:async()=>null,update:async()=>null} as never);
  const response=await app.inject({method:'POST',url:'/api/opportunities/not-a-uuid/research'});
  expect(response.statusCode).toBe(400);await app.close();
 });
 it('creates research record',async()=>{
  const app=Fastify();registerOpportunityResearchRoutes(app,{create:async(id)=>({id:'research-id',opportunityId:id,status:'planned',questions:[],findings:[],evidence:[],unknowns:[],conclusion:null})} as never);
  const response=await app.inject({method:'POST',url:'/api/opportunities/00000000-0000-4000-8000-000000000001/research'});
  expect(response.statusCode).toBe(201);await app.close();
 });
});
