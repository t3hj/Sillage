import test from 'node:test';
import assert from 'node:assert/strict';
test('the installed worker opens the cached shell offline, bypasses APIs and clears a signed-out copy',async()=>{
  const original={self:globalThis.self,caches:globalThis.caches,fetch:globalThis.fetch},handlers={},stores=new Map(),scope='https://sillage.test/';
  const key=request=>typeof request==='string'?request:request.url;
  globalThis.self={registration:{scope},clients:{claim:async()=>{}},addEventListener:(name,fn)=>handlers[name]=fn,skipWaiting:()=>{}};
  globalThis.caches={keys:async()=>[...stores.keys()],delete:async name=>stores.delete(name),open:async name=>{
    if(!stores.has(name))stores.set(name,new Map());const data=stores.get(name);
    return{put:async(request,response)=>data.set(key(request),response.clone()),match:async request=>data.get(key(request))?.clone(),keys:async()=>[...data.keys()].map(url=>({url})),delete:async request=>data.delete(key(request))};
  }};
  globalThis.fetch=async request=>{const url=key(request);return new Response(url.endsWith('index.html')?'<html data-sillage-app>Saved Sillage</html>':'fixture',{headers:{'Content-Type':url.endsWith('index.html')?'text/html':url.endsWith('.png')?'image/png':url.endsWith('.svg')?'image/svg+xml':url.endsWith('.json')||url.endsWith('.webmanifest')?'application/json':url.endsWith('.css')?'text/css':'application/javascript'}});};
  try{
    await import('../dist/sw.js?worker-test');let installing;handlers.install({waitUntil:p=>installing=p});await installing;
    globalThis.fetch=async()=>{throw Error('offline');};
    let response;handlers.fetch({request:{url:scope+'index.html',method:'GET',mode:'navigate'},respondWith:p=>response=p});assert((await(await response).text()).includes('Saved Sillage'));
    let intercepted=false;handlers.fetch({request:{url:scope+'api/state',method:'GET',mode:'cors'},respondWith:()=>intercepted=true});assert(!intercepted);
    globalThis.fetch=async()=>new Response('<h1>Log in to access</h1>',{headers:{'Content-Type':'text/html'}});
    handlers.fetch({request:{url:scope+'index.html',method:'GET',mode:'navigate'},respondWith:p=>response=p});assert((await(await response).text()).includes('Log in'));assert.equal(stores.size,0);
  }finally{Object.assign(globalThis,original);}
});
