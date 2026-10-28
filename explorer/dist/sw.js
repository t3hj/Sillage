import {cacheKind,cacheable,authenticationGate} from './offline-policy.mjs';
const CACHE='sillage-offline-v1',scope=self.registration.scope;
const files=['index.html','app.js','engine.mjs','collection.mjs','weather.mjs','location.mjs','journal.mjs','storage.mjs','sync.mjs','offline.mjs','offline-policy.mjs','style.css','midnight.css','icon.svg','manifest.webmanifest','app-icon-192.png','app-icon-512.png','catalogue.json','catalogue-extra.json','collection.json','wearing.json','photos.json'];
const purge=async()=>{for(const key of await caches.keys())if(key.startsWith('sillage-offline-'))await caches.delete(key);};
self.addEventListener('install',event=>event.waitUntil((async()=>{
  const cache=await caches.open(CACHE);
  try{for(const file of files){const url=new URL(file,scope).href,response=await fetch(url,{credentials:'same-origin',cache:'reload'});if(!await cacheable(response,file==='index.html'?'navigation':'asset'))throw Error('Offline copy could not be verified.');await cache.put(url,response);}}
  catch(error){await caches.delete(CACHE);throw error;}
})()));
self.addEventListener('activate',event=>event.waitUntil((async()=>{for(const key of await caches.keys())if(key.startsWith('sillage-offline-')&&key!==CACHE)await caches.delete(key);await self.clients.claim();})()));
self.addEventListener('message',event=>{if(event.data?.type==='APPLY_UPDATE')self.skipWaiting();});
self.addEventListener('fetch',event=>{
  const request=event.request,url=new URL(request.url);
  if(url.origin===new URL(scope).origin&&/\/(signout-with-chatgpt)(?:\?|$|\/)/.test(url.href)){event.respondWith(purge().then(()=>fetch(request)));return;}
  const kind=cacheKind(request,scope);if(kind==='bypass')return;
  event.respondWith((async()=>{
    const cache=await caches.open(CACHE);
    try{
      const response=await fetch(request);
      if(await authenticationGate(response,kind)){await purge();return response;}
      if(await cacheable(response,kind)){await cache.put(request,response.clone());if(kind==='image'){const keys=(await cache.keys()).filter(key=>new URL(key.url).pathname.includes('/assets/bottles/'));for(const key of keys.slice(0,Math.max(0,keys.length-100)))await cache.delete(key);}}
      return response;
    }catch{
      const stored=await cache.match(request);if(stored)return stored;
      if(kind==='navigation'){const shell=await cache.match(new URL('index.html',scope).href);if(shell)return shell;}
      return new Response(kind==='image'?'':'This page is not available offline yet.',{status:503,headers:{'Content-Type':'text/plain'}});
    }
  })());
});
