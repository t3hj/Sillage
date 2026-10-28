import test from 'node:test';
import assert from 'node:assert/strict';
import {mergeCollection,eligibleOwnedProfiles,duplicateRecord,needsReview,createRecordId,groupsForRecord,filterWearGroup,validRecord} from '../dist/collection.mjs';
import {seed,catalogue,read,reviewedPool} from './fixtures.mjs';
const record=id=>seed.find(r=>r.catalogueId===id);

test('the public distribution starts with no ownership claims or private source rows',()=>{
  assert.deepEqual(read('collection.json').records,[]);
  assert(seed.every(r=>r.id.startsWith('fixture-')&&!('sourceRows' in r)));
  assert(!catalogue.some(f=>f.id==='next-marine-edp'));
});
test('manual collection IDs work without randomUUID',()=>{
  const first=createRecordId({}),second=createRecordId({});
  assert(first.startsWith('local-'));assert.notEqual(first,second);
});
test('owning an EDP never marks its EDT counterpart as owned',()=>{
  const ids=eligibleOwnedProfiles([record('armaf-club-de-nuit-intense-man'),record('versace-eros-eau-de-parfum')],catalogue).map(f=>f.id);
  assert(ids.includes('armaf-club-de-nuit-intense-man'));assert(!ids.includes('armaf-club-de-nuit-intense'));
  assert(ids.includes('versace-eros-eau-de-parfum'));assert(!ids.includes('versace-eros'));
});
test('unconfirmed variants and grooming products never enter owned recommendations',()=>{
  const base=record('bleu-de-chanel-edp');
  for(const changed of [{variantStatus:'unconfirmed'},{productType:'body_spray'},{productType:'aftershave'},{concentration:'Parfum'}])
    assert.equal(eligibleOwnedProfiles([{...base,...changed}],catalogue).length,0);
  assert.equal(eligibleOwnedProfiles([base],catalogue).length,1);
  assert(needsReview({...base,concentration:''}));
});
test('browser edits merge without losing future seed additions',()=>{
  const edited={...seed[0],note:'A synthetic test note'},extra={...seed[0],id:'future-seed-record'};
  const result=mergeCollection([...seed,extra],{edits:{[edited.id]:edited},removed:[seed[1].id],added:[]});
  assert.equal(result.find(r=>r.id===edited.id).note,edited.note);
  assert(!result.some(r=>r.id===seed[1].id));assert(result.some(r=>r.id===extra.id));
});
test('duplicate prevention distinguishes concentrations and rejects malformed additions',()=>{
  const edp=record('armaf-club-de-nuit-intense-man'),edt=record('armaf-club-de-nuit-intense');
  assert(!duplicateRecord(edt,[edp]));assert(duplicateRecord({...edp,id:'new'},[edp]));
  assert.equal(mergeCollection(seed,{added:[{id:'bad',name:'bad'}]}).length,seed.length);
});
test('local additions work from an empty distribution and can be removed',()=>{
  const added={...seed[0],id:'local-example'};
  assert.deepEqual(mergeCollection([],{added:[added]}),[added]);
  assert.deepEqual(mergeCollection([],{added:[added],removed:[added.id]}),[]);
});
test('wearing groups overlap and grooming products stay outside them',()=>{
  const daily=filterWearGroup(seed,'daily',catalogue),warm=filterWearGroup(seed,'warm',catalogue);
  assert(daily.some(r=>r.catalogueId==='bleu-de-chanel-edp'));
  assert(warm.some(r=>r.catalogueId==='bleu-de-chanel-edp'));
  assert.deepEqual(groupsForRecord({productType:'body_spray',wearGroups:['daily']}),[]);
  assert.deepEqual(groupsForRecord({productType:'fragrance',wearGroups:['daily','invalid','daily']}),['daily']);
});
test('exact concentration profiles remain separately identifiable',()=>{
  const ids=eligibleOwnedProfiles([record('prada-luna-rossa-ocean-edt'),record('hermes-terre-dhermes-parfum')],catalogue).map(f=>f.id);
  assert(ids.includes('prada-luna-rossa-ocean-edt'));assert(!ids.includes('prada-luna-rossa-ocean'));
  assert(ids.includes('hermes-terre-dhermes-parfum'));assert(!ids.includes('hermes-terre-dhermes'));
});
test('reviewed editorial profiles have multiple occasions and weather guidance',()=>{
  assert(reviewedPool.length>30);
  for(const f of reviewedPool){
    assert(f.occasions.length>=3,f.id);assert.equal(new Set(f.occasions).size,f.occasions.length,f.id);
    assert(f.weather.length>=2,f.id);assert(f.wearingRationale.length>20,f.id);
    assert(['Light','Moderate','Strong','Very Strong'].includes(f.sillage),f.id);
  }
});
test('record validation rejects missing identities and oversized user input',()=>{
  assert(validRecord(seed[0]));
  assert(!validRecord({...seed[0],name:''}));assert(!validRecord({...seed[0],note:'x'.repeat(3001)}));
  assert(!validRecord({...seed[0],wearGroups:{bad:true}}));
});
