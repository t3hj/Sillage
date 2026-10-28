import test from 'node:test';
import assert from 'node:assert/strict';
import {temperatureBand,contextFromWeather,weatherIsFresh,fetchWeather,searchLocations,validLocation,defaultLocation} from '../dist/weather.mjs';
const snapshot=(temperature,code=0,humidity=50,precipitation=0)=>({current:{temperature_2m:temperature,weather_code:code,relative_humidity_2m:humidity,precipitation,time:'2026-10-28T10:00'},fetchedAt:1000});
test('temperature boundaries match the settings shown in the UI',()=>{
  assert.deepEqual([9.9,10,14.9,15,19.9,20,24.9,25].map(temperatureBand),['Cold','Cool','Cool','Mild','Mild','Warm','Warm','Hot']);
  assert.throws(()=>temperatureBand(null));
});
test('rain and humidity supplement temperature instead of replacing it',()=>{
  const rainy=contextFromWeather(snapshot(28,63,85));
  assert.equal(rainy.weather,'Hot');assert.deepEqual(rainy.weatherTags,['Hot','Rainy','Humid']);
  assert.equal(rainy.temperature,28);assert.equal(rainy.dayKey,'2026-10-28');
  assert.deepEqual(contextFromWeather(snapshot(8,3,30)).weatherTags,['Cold','Dry']);
});
test('stale or future cached weather is never presented as current',()=>{
  assert(weatherIsFresh({fetchedAt:1000},2000));
  assert(!weatherIsFresh({fetchedAt:1000},1000+3*60*60*1000));
  assert(!weatherIsFresh({fetchedAt:3000},2000));
  assert(!weatherIsFresh(null,2000));
});
test('a valid forecast is decoded, and service errors or malformed data reject cleanly',async()=>{
  const result=await fetchWeather(defaultLocation,async url=>{
    assert(url.includes('api.open-meteo.com/v1/forecast'));
    return {ok:true,json:async()=>snapshot(12)};
  });
  assert.equal(result.current.temperature_2m,12);
  await assert.rejects(fetchWeather(defaultLocation,async()=>({ok:false})));
  await assert.rejects(fetchWeather(defaultLocation,async()=>({ok:true,json:async()=>({current:{temperature_2m:null}})})));
  await assert.rejects(fetchWeather({name:'Invalid'},async()=>{throw Error('must not request');}));
});
test('city search keeps distinct choices and validates coordinates',async()=>{
  const results=await searchLocations('London',async()=>({ok:true,json:async()=>({results:[defaultLocation,{...defaultLocation,country:'Canada',latitude:42.98,longitude:-81.23},{name:'Bad',latitude:200,longitude:0}]})}));
  assert.equal(results.length,2);assert.notEqual(results[0].country,results[1].country);
  assert(!validLocation({name:'Bad',latitude:Infinity,longitude:0}));
  assert.deepEqual(await searchLocations('x',async()=>{throw Error('must not request');}),[]);
});
