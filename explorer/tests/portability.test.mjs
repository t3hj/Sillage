import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {emptyChanges,normaliseChanges,makeBackup,parseBackup,backupSummary,restoreBackup,storageKeys} from '../dist/storage.mjs';
import {mergeCollection,searchCollection} from '../dist/collection.mjs';
import {filterFragrances,applyWearingGuidance,rankFragrances} from '../dist/engine.mjs';
import {seed,catalogue} from './fixtures.mjs';
const prefs={weatherMode:'manual',weather:'Warm',occasion:'University',note:'Iris',location:{name:'London',latitude:51.5,longitude:-0.1},snapshot:{current:{temperature_2m:12}}};
const memory=()=>{const data=new Map();return {data,getItem:key=>data.get(key)??null,setItem:(key,value)=>data.set(key,value),removeItem:key=>data.delete(key)};};

test('collection and catalogue search tolerate accents, apostrophes, punctuation and a small typo',()=>{
  assert(searchCollection(seed,'terre dhermes','all',catalogue).some(r=>r.catalogueId==='hermes-terre-dhermes-parfum'));
  assert(searchCollection(seed,'vanila','all',catalogue).some(r=>r.catalogueId==='tom-ford-noir-extreme'));
  assert(filterFragrances(catalogue,{query:'l’homme prada'}).some(f=>f.id==='prada-lhomme-edt'));
  assert(filterFragrances(catalogue,{query:'noir extreme eau de parfum'}).some(f=>f.id==='tom-ford-noir-extreme'));
  assert.equal(searchCollection(seed,'zyxwvu-no-such-fragrance','all',catalogue).length,0);
});
test('a personal note does not block a later source correction to the same bottle',()=>{
  const original=seed[0],edit={...original,note:'My favourite for campus'};
  const corrected={...original,name:'A corrected source name',reviewNote:'Updated provenance'};
  const result=mergeCollection([corrected],{edits:{[edit.id]:edit},bases:{[edit.id]:original}})[0];
  assert.equal(result.name,corrected.name);assert.equal(result.note,edit.note);assert.equal(result.reviewNote,corrected.reviewNote);
  const explicit={...edit,concentration:'Parfum',catalogueId:null};
  assert.equal(mergeCollection([corrected],{edits:{[edit.id]:explicit},bases:{[edit.id]:original}})[0].concentration,'Parfum');
});
test('old full-record edits are preserved and malformed stored records are ignored safely',()=>{
  const edit={...seed[0],note:'Legacy personal note'};
  assert.equal(mergeCollection(seed,{edits:{[edit.id]:edit}})[0].note,edit.note);
  const value=normaliseChanges({edits:{[edit.id]:{...edit,variantCandidates:{bad:true}}},removed:'not an array',added:[edit,edit,{id:'bad'}]});
  assert.deepEqual(value.edits,{});assert.deepEqual(value.removed,[]);assert.equal(value.added.length,1);
});
test('backup round trip preserves edits, removals, additions, bookmarks and manual day preferences',()=>{
  const changes=emptyChanges();changes.edits[seed[0].id]={...seed[0],note:'Personal note'};changes.bases[seed[0].id]=seed[0];changes.removed=[seed[1].id];changes.added=[{...seed[2],id:'local-backup-test',name:'My unlisted bottle',catalogueId:null}];
  const exported=makeBackup(changes,['tf-oud-wood'],prefs,new Date('2026-10-28T10:00:00Z'));
  const restored=parseBackup(JSON.stringify(exported));
  const records=mergeCollection(seed,restored.collection);
  assert.equal(records.length,seed.length);assert(!records.some(r=>r.id===seed[1].id));assert.equal(records[0].note,'Personal note');
  assert(records.some(r=>r.id==='local-backup-test'));assert.deepEqual(restored.saved,['tf-oud-wood']);assert.equal(restored.day.weather,'Warm');assert.equal(restored.day.occasion,'University');assert(!('snapshot' in restored.day));
  assert.deepEqual(backupSummary(restored,seed,catalogue),{records:seed.length,fragrances:seed.length,saved:1});
  const storage=memory();restoreBackup(storage,restored);assert.deepEqual(JSON.parse(storage.getItem(storageKeys.collection)),changes);
});
test('backup validation rejects wrong formats, malformed records, prototype keys and invalid cities',()=>{
  const valid=makeBackup(emptyChanges(),[],prefs);
  for(const text of ['{bad',JSON.stringify({version:99}),JSON.stringify({...valid,collection:{...valid.collection,added:[{id:'bad'}]}}),JSON.stringify({...valid,day:{location:{name:'Bad',latitude:1000,longitude:0}}}),JSON.stringify({...valid,saved:['x'.repeat(121)]}),'x'.repeat(2_000_001)])assert.throws(()=>parseBackup(text));
  const dangerous=JSON.stringify(valid).replace('"edits":{}','"edits":{"__proto__":{}}');assert.throws(()=>parseBackup(dangerous));
});
test('a failed restore rolls back earlier key writes instead of leaving half a backup',()=>{
  const storage=memory();for(const key of Object.values(storageKeys))storage.setItem(key,'old '+key);
  const before=new Map(storage.data),original=storage.setItem;let calls=0;
  storage.setItem=(key,value)=>{if(++calls===2)throw Error('Quota exceeded');return original(key,value);};
  assert.throws(()=>restoreBackup(storage,makeBackup(emptyChanges(),[],prefs)),/storage/);
  assert.deepEqual(storage.data,before);
});
test('a heavy fragrance is never labelled a strong match in heat or a quiet shared space',()=>{
  const strong={...catalogue.find(f=>f.id==='dior-sauvage-elixir'),weather:['Hot','Cold'],occasions:['Work','Date Night']};
  for(const context of [{weather:'Hot',occasion:'Date Night'},{weather:'Cold',occasion:'Work'}]){
    const result=rankFragrances([strong],context)[0];assert.equal(result.label,'Use with care');assert(result.caution);
  }
});
