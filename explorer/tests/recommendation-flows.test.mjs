import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {rankFragrances,applyWearingGuidance,notesOf} from '../dist/engine.mjs';
import {eligibleOwnedProfiles} from '../dist/collection.mjs';
import {reviewedPool as pool} from './fixtures.mjs';
test('hot gym, rainy work and vanilla date night produce suitable different selections',()=>{
  const gym=rankFragrances(pool,{weather:'Hot',occasion:'Gym',temperature:28}).slice(0,3);
  const work=rankFragrances(pool,{weather:'Rainy',occasion:'Work'}).slice(0,3);
  const date=rankFragrances(pool,{weather:'Cold',occasion:'Date Night',note:'Vanilla'}).slice(0,3);
  assert(gym.every(r=>r.occasionMatch&&r.weatherMatch&&r.f.sillage==='Light'));
  assert(work.every(r=>r.occasionMatch&&r.weatherMatch&&['Light','Moderate'].includes(r.f.sillage)));
  assert(date.every(r=>r.occasionMatch&&r.weatherMatch&&notesOf(r.f).includes('Vanilla')));
  assert.notDeepEqual(gym.map(r=>r.f.id),date.map(r=>r.f.id));
});
test('all weather, plan and note combinations yield three unique catalogue suggestions with honest labels',()=>{
  for(const weather of ['Cold','Cool','Mild','Warm','Hot','Rainy','Humid','Dry'])
  for(const occasion of ['Work','University','Casual','Date Night','Night Out','Formal','Gym','Outdoor','Home','Evening'])
  for(const note of ['','Bergamot','Vanilla','Sandalwood','Vetiver','Lavender','Amber','Cedar','Iris','Mint','Patchouli']){
    const top=rankFragrances(pool,{weather,occasion,note}).slice(0,3);
    assert.equal(top.length,3);assert.equal(new Set(top.map(r=>r.f.id)).size,3);
    for(const r of top){assert(pool.includes(r.f));assert(r.reasons.length>0);if(r.label==='Strong match')assert(r.weatherMatch&&r.occasionMatch&&(!note||r.noteMatch));}
  }
});
test('heat and shared-space penalties prevent a strong night scent winning by one matching note',()=>{
  const ranked=rankFragrances(pool,{weather:'Hot',weatherTags:['Hot','Rainy'],temperature:30,occasion:'Gym',note:'Vanilla'});
  assert(ranked.slice(0,3).every(r=>r.f.sillage==='Light'));
  assert(ranked.find(r=>r.f.id==='dior-sauvage-elixir').caution.includes('heat'));
});
test('daily variation is stable within a day and does not override suitability',()=>{
  const context={weather:'Cool',occasion:'Work',dayKey:'2026-10-28'};
  const a=rankFragrances(pool,context),b=rankFragrances(pool,context);
  assert.deepEqual(a.map(r=>r.f.id),b.map(r=>r.f.id));
  assert(a.slice(0,3).every(r=>r.weatherMatch&&r.occasionMatch));
});

test('cold workdays retain versatile, appropriate office choices',()=>{
  const top=rankFragrances(pool,{weather:'Cold',occasion:'Work'}).slice(0,3);
  assert(top.every(r=>r.weatherMatch&&r.occasionMatch&&['Light','Moderate'].includes(r.f.sillage)));
});
