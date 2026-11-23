import { describe, expect, it } from 'vitest';
import Fastify from 'fastify';
import { registerOpportunityRoutes } from './opportunity-routes.js';

describe('opportunity routes',()=>{
 it('validates generation input',async()=>{
  const app=Fastify();
  registerOpportunityRoutes(app,{generate:async()=>({hypothesesConsidered:0,opportunitiesCreated:0,rejectedForNoEconomicMechanism:0,researchOnly:0}),list:async()=>[],getById:async()=>null,updateStatus:async()=>null} as never);
  const res=await app.inject({method:'POST',url:'/api/opportunities/generate',payload:{limit:0}});
  expect(res.statusCode).toBe(400);
  await app.close();
 });
 it('returns 404 for missing opportunity',async()=>{
  const app=Fastify();
  registerOpportunityRoutes(app,{generate:async()=>({}),list:async()=>[],getById:async()=>null,updateStatus:async()=>null} as never);
  const res=await app.inject({method:'GET',url:'/api/opportunities/00000000-0000-4000-8000-000000000001'});
  expect(res.statusCode).toBe(404);
  await app.close();
 });
});
