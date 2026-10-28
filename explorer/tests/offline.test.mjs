import test from 'node:test';
import assert from 'node:assert/strict';
import {cacheKind,cacheable} from '../dist/offline-policy.mjs';
import {readFileSync} from 'node:fs';
const scope='https://sillage.test/explorer/';
test('offline policy excludes account APIs, authentication, other sites and writes',()=>{
  for(const path of ['api/state','signin-with-chatgpt','signout-with-chatgpt','callback'])assert.equal(cacheKind({url:new URL(path,scope),method:'GET',mode:'navigate'},scope),'bypass');
  assert.equal(cacheKind({url:'https://elsewhere.test/app.js',method:'GET'},scope),'bypass');
  assert.equal(cacheKind({url:scope+'app.js',method:'PUT'},scope),'bypass');
  assert.equal(cacheKind({url:scope+'personal-data.json',method:'GET'},scope),'bypass');
});
test('offline shell, module and photo requests respect the deployment subpath',()=>{
  assert.equal(cacheKind({url:scope+'index.html',method:'GET',mode:'navigate'},scope),'navigation');
  assert.equal(cacheKind({url:scope+'journal.mjs',method:'GET'},scope),'asset');
  assert.equal(cacheKind({url:scope+'assets/bottles/example.jpg',method:'GET'},scope),'image');
});
test('a sign-in gate cannot replace the cached application shell',async()=>{
  assert(!await cacheable(new Response('<h1>Sign in required</h1>',{headers:{'Content-Type':'text/html'}}),'navigation'));
  assert(await cacheable(new Response('<html data-sillage-app>',{headers:{'Content-Type':'text/html'}}),'navigation'));
  assert(!await cacheable(new Response('<h1>Sign in</h1>',{headers:{'Content-Type':'text/html'}}),'asset'));
});
test('install metadata uses portable paths and correctly sized app icons',()=>{
  const manifest=JSON.parse(readFileSync(new URL('../dist/manifest.webmanifest',import.meta.url)));
  assert.equal(manifest.scope,'./');assert.equal(manifest.display,'standalone');
  for(const icon of manifest.icons){const bytes=readFileSync(new URL('../dist/'+icon.src,import.meta.url)),size=Number(icon.sizes.split('x')[0]);assert.equal(bytes.readUInt32BE(16),size);assert.equal(bytes.readUInt32BE(20),size);}
});
