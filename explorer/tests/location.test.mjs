import test from 'node:test';
import assert from 'node:assert/strict';
import {devicePosition,locationPermissionGranted,nameDevicePosition,locationError} from '../dist/location.mjs';
test('device position is requested explicitly, bounded and rounded for weather',async()=>{
  const place=await devicePosition({getCurrentPosition(success,error,options){assert.equal(options.maximumAge,0);assert(options.enableHighAccuracy);success({coords:{latitude:51.512345,longitude:-0.123456,accuracy:18.6}});}});
  assert.deepEqual(place,{name:'Current location',latitude:51.512,longitude:-0.123,accuracyM:19});
  await assert.rejects(devicePosition({getCurrentPosition(success){success({coords:{latitude:91,longitude:0}});}}));
});
test('denied, unavailable, timeout and unsupported location leave useful fallback messages',async()=>{
  for(const code of [1,2,3])await assert.rejects(devicePosition({getCurrentPosition(success,error){error({code});}}),new RegExp(locationError({code}).replace(/[.*+?^${}()|[\]\\]/g,'\\$&')));
  await assert.rejects(devicePosition({}));
});
test('checking existing permission never invokes device location or a new prompt',async()=>{
  assert(await locationPermissionGranted({query:async()=>({state:'granted'})}));
  assert(!await locationPermissionGranted({query:async()=>({state:'prompt'})}));
  assert(!await locationPermissionGranted({query:async()=>{throw Error('unsupported');}}));
});
test('area lookup prefers a locality, retains coordinates and rejects service failures',async()=>{
  const position={name:'Current location',latitude:51.5,longitude:-.1,accuracyM:20};
  const place=await nameDevicePosition(position,async url=>{assert(url.includes('api.bigdatacloud.net'));return {ok:true,json:async()=>({locality:'Example borough',city:'London',principalSubdivision:'England',countryName:'United Kingdom'})};});
  assert.equal(place.name,'Example borough');assert.equal(place.latitude,position.latitude);
  await assert.rejects(nameDevicePosition(position,async()=>({ok:false})));
});
