import {createRecordId} from './collection.mjs';
export const emptyJournal=()=>({version:1,ratings:{},entries:[]});
const plain=x=>!!x&&typeof x==='object'&&!Array.isArray(x)&&Object.getPrototypeOf(x)===Object.prototype;
const safeKey=x=>typeof x==='string'&&x.length>0&&x.length<=120&&!['__proto__','constructor','prototype'].includes(x);
const text=(x,max)=>typeof x==='string'&&x.length<=max;
export const localDay=(value=new Date())=>{const d=new Date(value);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;};
export function validWear(x){return plain(x)&&safeKey(x.id)&&safeKey(x.recordId)&&(x.catalogueId===null||safeKey(x.catalogueId))&&text(x.name,120)&&x.name.trim()&&text(x.brand,120)&&text(x.when,40)&&/^\d{4}-\d\d-\d\dT/.test(x.when)&&Number.isFinite(Date.parse(x.when))&&text(x.occasion,80)&&text(x.weather,80)&&text(x.note,3000);}
export function validJournal(x){return plain(x)&&x.version===1&&plain(x.ratings)&&Object.keys(x.ratings).length<=5000&&Object.entries(x.ratings).every(([id,rating])=>safeKey(id)&&Number.isInteger(rating)&&rating>=1&&rating<=5)&&Array.isArray(x.entries)&&x.entries.length<=10000&&x.entries.every(validWear)&&new Set(x.entries.map(e=>e.id)).size===x.entries.length;}
export function normaliseJournal(x){return validJournal(x)?structuredClone(x):emptyJournal();}
export function logWear(journal,record,context={},now=new Date()) {
  if(journal.entries.length>=10000)throw Error('Export a backup and remove older wears before adding more.');
  if(record.productType!=='fragrance')throw Error('Wear logging is for fragrances.');
  if(journal.entries.some(e=>e.recordId===record.id&&localDay(e.when)===localDay(now)))return {journal,added:false};
  const entry={id:createRecordId(),recordId:record.id,catalogueId:record.catalogueId||null,name:record.name,brand:record.brand,when:now.toISOString(),occasion:context.occasion||'Casual',weather:context.weather||'Not recorded',note:''};
  if(!validWear(entry))throw Error('This wear could not be saved.');
  return {journal:{...journal,entries:[entry,...journal.entries]},added:true};
}
export function personalProfiles(records,journal,now=new Date()) {
  const result={};
  for(const record of records){if(!record.catalogueId)continue;
    const wears=journal.entries.filter(e=>e.recordId===record.id).sort((a,b)=>b.when.localeCompare(a.when));
    const daysSince=wears.length?Math.max(0,Math.floor((now-new Date(wears[0].when))/86400000)):null;
    result[record.catalogueId]={rating:journal.ratings[record.id]||0,wornToday:wears.some(e=>localDay(e.when)===localDay(now)),daysSince};
  }
  return result;
}
