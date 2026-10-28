import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {filterFragrances,rankFragrances,notesOf} from '../dist/engine.mjs';
const data=JSON.parse(readFileSync(new URL('../dist/catalogue.json',import.meta.url)));
test('catalogue contains distinct real profiles without ownership claims',()=>{
  assert.equal(data.length,38);assert.equal(new Set(data.map(f=>f.id)).size,38);
  assert(data.every(f=>!('owned' in f)&&f.topNotes.length&&f.weather.length));
});
test('search handles brand, multiple words and accents',()=>{
  assert(filterFragrances(data,{query:'terre hermes'}).some(f=>f.id==='hermes-terre-dhermes'));
  assert.equal(filterFragrances(data,{query:'not-a-real-scent'}).length,0);
});
test('notes are OR, weather and occasion intersect, Date is normalised',()=>{
  const result=filterFragrances(data,{notes:['Vanilla','Iris'],weather:'Cold',occasion:'Date Night'});
  assert(result.length>0);assert(result.every(f=>notesOf(f).some(n=>['Vanilla','Iris'].includes(n))&&f.weather.includes('Cold')));
  assert(filterFragrances(data,{occasion:'Date Night'}).some(f=>f.id==='bleu-de-chanel-edp'));
});
test('saved filter returns only explicitly saved discoveries',()=>{
  assert.equal(filterFragrances(data,{category:'saved',saved:[]}).length,0);
  assert.deepEqual(filterFragrances(data,{category:'saved',saved:['tf-oud-wood']}).map(f=>f.id),['tf-oud-wood']);
});
test('recommendations change with the setting and explain actual matches',()=>{
  const cool=rankFragrances(data,{weather:'Cool',occasion:'Work'});
  const hot=rankFragrances(data,{weather:'Hot',occasion:'Gym'});
  assert.notEqual(cool[0].f.id,hot[0].f.id);
  assert(cool.slice(0,3).every(r=>r.weatherMatch&&r.occasionMatch));
  assert(hot.slice(0,3).every(r=>r.f.weather.includes('Hot')&&r.f.occasions.includes('Gym')));
  assert(hot[0].reasons.some(reason=>reason.includes('softer trail')));
});
test('a preferred note changes ranking and an imperfect match is labelled',()=>{
  const vanilla=rankFragrances(data,{weather:'Cold',occasion:'Date Night',note:'Vanilla'});
  assert(notesOf(vanilla[0].f).includes('Vanilla'));
  const rare=rankFragrances(data,{weather:'Hot',occasion:'Gym',note:'Iris'});
  assert(rare.every(r=>r.label!=='Strong match'));
});
