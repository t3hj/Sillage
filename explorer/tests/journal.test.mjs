import test from 'node:test';
import assert from 'node:assert/strict';
import {emptyJournal,logWear,normaliseJournal,personalProfiles,validJournal} from '../dist/journal.mjs';
import {rankFragrances} from '../dist/engine.mjs';
import {makeBackup,parseBackup,restoreBackup,storageKeys} from '../dist/storage.mjs';
const record={id:'test-record',catalogueId:'test-profile',name:'Test fragrance',brand:'Example',productType:'fragrance'};
test('wear logging records context, prevents same-day duplicates and permits another day',()=>{
  const first=logWear(emptyJournal(),record,{occasion:'Work',weather:'Cool'},new Date('2026-10-28T10:00:00Z'));
  assert(first.added);assert(validJournal(first.journal));
  assert(!logWear(first.journal,record,{},new Date('2026-10-28T11:00:00Z')).added);
  assert(logWear(first.journal,record,{},new Date('2026-10-29T11:00:00Z')).added);
  assert.throws(()=>logWear(emptyJournal(),{...record,productType:'aftershave'}));
});
test('journal validation rejects malformed dates, ratings and prototype keys',()=>{
  assert(!validJournal({...emptyJournal(),ratings:{x:6}}));
  assert(!validJournal({...emptyJournal(),ratings:JSON.parse('{"__proto__":5}')}));
  assert.deepEqual(normaliseJournal({entries:'bad'}),emptyJournal());
  const j=logWear(emptyJournal(),record,{},new Date()).journal;j.entries[0].when='not-a-date';assert(!validJournal(j));
});
test('personal profiles distinguish never worn, worn today and older wears',()=>{
  const now=new Date('2026-10-28T15:00:00Z');
  let j=logWear(emptyJournal(),record,{},new Date('2026-10-01T10:00:00Z')).journal;j.ratings[record.id]=5;
  assert.equal(personalProfiles([record],j,now)['test-profile'].daysSince,27);
  j=logWear(j,record,{},now).journal;assert(personalProfiles([record],j,now)['test-profile'].wornToday);
});
test('rating and rotation adjust equally suitable choices without promoting a heavy gym scent',()=>{
  const base={id:'a',name:'A',weather:['Hot'],occasions:['Gym'],sillage:'Light',intensity:'Light',topNotes:[],middleNotes:[],baseNotes:[]};
  const b={...base,id:'b',name:'B'},heavy={...base,id:'heavy',sillage:'Very Strong',intensity:'Strong'};
  const ranked=rankFragrances([base,b,heavy],{weather:'Hot',occasion:'Gym',personal:{a:{rating:5,wornToday:true},b:{rating:4,daysSince:30},heavy:{rating:5,daysSince:null}}});
  assert.equal(ranked[0].f.id,'b');assert.equal(ranked.at(-1).f.id,'heavy');
  assert(ranked[0].personalReasons.length);assert(ranked.at(-1).caution);
});
test('backup round trip includes ratings and journal while legacy restores preserve them',()=>{
  const changes={edits:{},bases:{},removed:[],added:[]},j=logWear(emptyJournal(),record,{},new Date()).journal;j.ratings[record.id]=5;
  const backup=parseBackup(JSON.stringify(makeBackup(changes,[],{},new Date(),j)));assert.deepEqual(backup.journal,j);
  const data=new Map([[storageKeys.journal,JSON.stringify(j)]]),storage={getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v),removeItem:k=>data.delete(k)};
  const legacy={...backup,version:1};delete legacy.journal;restoreBackup(storage,parseBackup(JSON.stringify(legacy)));assert.deepEqual(JSON.parse(data.get(storageKeys.journal)),j);
});
