import test from 'node:test';
import assert from 'node:assert/strict';
import {AccountSync,canonical} from '../dist/sync.mjs';
const payload=(saved=[])=>({version:1,records:[],saved,journal:{version:1,ratings:{},entries:[]}});
function setup(remote,local=payload(),edited=false){const data=new Map();const state={remote:structuredClone(remote),local:structuredClone(local),puts:0,applied:0};const client=new AccountSync({storage:{getItem:k=>data.get(k)||null,setItem:(k,v)=>data.set(k,v)},snapshot:()=>state.local,hasLocalEdits:()=>edited,apply:async p=>{state.applied++;state.local=p;},fetcher:async(url,options)=>{if(options.method==='GET')return Response.json(state.remote);state.puts++;const body=JSON.parse(options.body);if(body.revision!==state.remote.revision)return Response.json({error:'conflict'},{status:409});state.remote={account:'alice',revision:state.remote.revision+1,payload:body.payload};return Response.json({revision:state.remote.revision});}});return{client,state};}
test('a new device loads the account copy and an initial account receives the existing collection',async()=>{
  const first=setup({account:'alice',revision:1,payload:payload(['a'])});await first.client.run();assert.deepEqual(first.state.local.saved,['a']);assert.equal(first.state.puts,0);
  const fresh=setup({account:'alice',revision:0,payload:null},payload(['local']),true);await fresh.client.run();assert.equal(fresh.state.puts,1);assert.equal(fresh.state.remote.payload.saved[0],'local');
});
test('simultaneous offline edits prompt a choice rather than overwriting either copy',async()=>{
  const {client,state}=setup({account:'alice',revision:2,payload:payload(['remote'])},payload(['local']),true);client.remember(1,payload(),'alice');await client.run();assert.equal(client.state,'conflict');assert.equal(state.puts,0);assert.equal(state.applied,0);
  await client.resolve('cloud');assert.deepEqual(state.local.saved,['remote']);assert.equal(client.conflict,null);
});
test('new edits during a save remain pending and failures keep local data intact',async()=>{
  const {client,state}=setup({account:'alice',revision:0,payload:null},payload(['local']),true);client.fetcher=async()=>{throw Error('offline');};await client.run();assert.equal(client.state,'offline');assert.deepEqual(state.local.saved,['local']);
  assert.equal(canonical({b:1,a:2}),canonical({a:2,b:1}));
});
test('a local edit made during an in-flight upload is queued for another save',async()=>{
  const {client,state}=setup({account:'alice',revision:0,payload:null},payload(['first']),true);
  const original=client.fetcher;
  client.fetcher=async(url,options)=>{const response=await original(url,options);if(options.method==='PUT')state.local=payload(['second']);return response;};
  await client.run();assert.equal(client.state,'pending');assert.deepEqual(state.remote.payload.saved,['first']);assert.deepEqual(state.local.saved,['second']);clearTimeout(client.timer);
});
test('the default browser fetch adapter retains the global receiver',async()=>{
  const original=globalThis.fetch;
  try{globalThis.fetch=async function(){assert.equal(this,globalThis);return Response.json({account:'alice',revision:1,payload:payload()});};
    const data=new Map(),client=new AccountSync({snapshot:()=>payload(),apply:async()=>{},hasLocalEdits:()=>false,storage:{getItem:k=>data.get(k)||null,setItem:(k,v)=>data.set(k,v)}});
    await client.run();assert.equal(client.state,'synced');
  }finally{globalThis.fetch=original;}
});
