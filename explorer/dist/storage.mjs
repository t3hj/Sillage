import {validRecord,mergeCollection} from './collection.mjs';
import {validLocation} from './weather.mjs';

export const storageKeys={collection:'sillage-collection-v1',saved:'sillage-explorer-saved-v1',day:'sillage-day-v1'};
const plain=value=>!!value&&typeof value==='object'&&!Array.isArray(value)&&Object.getPrototypeOf(value)===Object.prototype;
const ids=value=>Array.isArray(value)&&value.length<=5000&&value.every(x=>typeof x==='string'&&x.length>0&&x.length<=120);
export function emptyChanges(){return {edits:{},bases:{},removed:[],added:[]};}
export function normaliseChanges(value) {
  const result=emptyChanges();if(!plain(value))return result;
  for(const field of ['edits','bases'])if(plain(value[field]))for(const [id,record] of Object.entries(value[field]))if(validRecord(record)&&record.id===id&& !['__proto__','constructor','prototype'].includes(id))result[field][id]=record;
  result.removed=ids(value.removed)?[...new Set(value.removed)]:[];
  if(Array.isArray(value.added)){const seen=new Set();result.added=value.added.filter(record=>validRecord(record)&&!seen.has(record.id)&&seen.add(record.id));}
  return result;
}
export function makeBackup(changes,saved,day,now=new Date()) {
  return {format:'sillage-explorer',version:1,exportedAt:now.toISOString(),collection:normaliseChanges(changes),saved:[...new Set(saved)],day:{weatherMode:day.weatherMode,location:day.location,weather:day.weather,occasion:day.occasion,note:day.note}};
}
export function parseBackup(text) {
  if(typeof text!=='string'||text.length>2_000_000)throw Error('Choose a Sillage explorer JSON backup smaller than 2 MB.');
  let value;try{value=JSON.parse(text);}catch{throw Error('This file is not valid JSON. Choose an exported Sillage backup.');}
  if(!plain(value)||value.format!=='sillage-explorer'||value.version!==1)throw Error('This is not a supported Sillage explorer backup. Your data has not changed.');
  const changes=value.collection;
  if(!plain(changes)||!plain(changes.edits)||!plain(changes.bases)||!ids(changes.removed)||!Array.isArray(changes.added)||changes.added.length>5000)throw Error('The backup collection is incomplete or invalid.');
  for(const field of ['edits','bases']){
    if(Object.keys(changes[field]).length>5000)throw Error('The backup contains too many edits.');
    for(const [id,record] of Object.entries(changes[field]))if(['__proto__','constructor','prototype'].includes(id)||!validRecord(record)||record.id!==id)throw Error('The backup contains an invalid collection record.');
  }
  if(changes.added.some(record=>!validRecord(record))||new Set(changes.added.map(r=>r.id)).size!==changes.added.length||!ids(value.saved)||!plain(value.day))throw Error('The backup contains invalid records or preferences.');
  if(value.day.location!==undefined&&!validLocation(value.day.location))throw Error('The backup city is invalid.');
  return makeBackup(changes,value.saved,value.day);
}
export function backupSummary(backup,seed,catalogue) {
  const records=mergeCollection(seed,backup.collection);
  return {records:records.length,fragrances:records.filter(r=>r.productType==='fragrance').length,saved:backup.saved.filter(id=>catalogue.some(f=>f.id===id)).length};
}
export function restoreBackup(storage,backup) {
  const writes=[[storageKeys.collection,backup.collection],[storageKeys.saved,backup.saved],[storageKeys.day,backup.day]];
  const old=writes.map(([key])=>[key,storage.getItem(key)]);
  try{for(const [key,value] of writes)storage.setItem(key,JSON.stringify(value));}
  catch(error){for(const [key,value] of old){try{value===null?storage.removeItem(key):storage.setItem(key,value);}catch{}}throw Error('Browser storage could not save this backup. Existing data has been kept.');}
}
