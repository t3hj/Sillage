import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import {handleState} from '../server/state.mjs';
const sql=readFileSync(new URL('../server/schema.sql',import.meta.url),'utf8');
class DB{constructor(){this.db=new DatabaseSync(':memory:');this.db.exec(sql);}prepare(sql){const statement=this.db.prepare(sql);return {bind:(...args)=>({first:async()=>statement.get(...args)||null,run:async()=>({meta:{changes:Number(statement.run(...args).changes)}})})};}}
const payload={version:1,records:[],saved:[],journal:{version:1,ratings:{},entries:[]}};
const req=(revision=0,operationId='first',value=payload,origin='https://sillage.test')=>new Request('https://sillage.test/api/state',{method:'PUT',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify({revision,operationId,payload:value})});
test('state API requires verified identity, rejects cross-origin writes and isolates users',async()=>{
  const db=new DB();assert.equal((await handleState(req(),db,null)).status,401);assert.equal((await handleState(req(0,'x',payload,'https://evil.test'),db,'alice')).status,403);
  assert.equal((await handleState(req(),db,'alice')).status,200);
  const bob=await (await handleState(new Request('https://sillage.test/api/state'),db,'bob')).json();assert.equal(bob.payload,null);
  const alice=await (await handleState(new Request('https://sillage.test/api/state'),db,'alice')).json();assert.equal(alice.revision,1);assert.equal(alice.account,'alice');
});
test('concurrent and stale writes cannot overwrite newer state, while retries are idempotent',async()=>{
  const db=new DB();const results=await Promise.all([handleState(req(0,'one'),db,'alice'),handleState(req(0,'two'),db,'alice')]);assert.deepEqual(results.map(r=>r.status).sort(),[200,409]);
  assert.equal((await handleState(req(0,'one'),db,'alice')).status,200);
  assert.equal((await handleState(req(1,'next',{...payload,saved:['example']}),db,'alice')).status,200);
  assert.equal((await handleState(req(1,'stale'),db,'alice')).status,409);
  assert.equal((await handleState(req(2,'bad',{...payload,journal:{}}),db,'alice')).status,400);
  for(const value of ['null','[]'])assert.equal((await handleState(new Request('https://sillage.test/api/state',{method:'PUT',headers:{Origin:'https://sillage.test','Content-Type':'application/json'},body:value}),db,'alice')).status,400);
});
