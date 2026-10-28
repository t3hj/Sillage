import {matchesSearch,notesOf} from './engine.mjs';
const types = new Set(['fragrance','body_spray','aftershave']);
const clean = value => String(value ?? '').trim();
const key = value => clean(value).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'');
export const wearGroupOptions = [['daily','Fresh & everyday'],['warm','Warm & sunny'],['cool','Cool & cosy'],['evening','Dates & evenings']];
export function groupsForRecord(record, catalogue=[]) {
  if(record.productType!=='fragrance') return [];
  if(Array.isArray(record.wearGroups)) return wearGroupOptions.filter(([id])=>record.wearGroups.includes(id)).map(([id])=>id);
  const profile=catalogue.find(f=>f.id===record.catalogueId);
  if(!profile) return [];
  const groups=[];
  if(profile.occasions?.some(o=>['Work','University'].includes(o))) groups.push('daily');
  if(profile.weather?.some(w=>['Warm','Hot'].includes(w))) groups.push('warm');
  if(profile.weather?.some(w=>['Cold','Cool'].includes(w))) groups.push('cool');
  if(profile.occasions?.some(o=>['Date','Date Night','Night Out','Evening'].includes(o))) groups.push('evening');
  return groups;
}
export function filterWearGroup(records, group='', catalogue=[]) {
  return group?records.filter(record=>groupsForRecord(record,catalogue).includes(group)):records;
}

export function createRecordId(runtimeCrypto=globalThis.crypto) {
  // Record identifiers are local bookkeeping, not security credentials.
  const suffix=runtimeCrypto?.randomUUID?.() || `${Date.now().toString(36)}-${Math.random().toString(36).slice(2,12)}`;
  return 'local-'+suffix;
}

export function validRecord(record) {
  return !!record && typeof record.id==='string' && record.id.length<120
    && typeof record.name==='string' && record.name.trim().length>0 && record.name.length<=120
    && typeof record.brand==='string' && record.brand.trim().length>0 && record.brand.length<=120
    && types.has(record.productType)
    && ['confirmed','unconfirmed'].includes(record.variantStatus)
    && typeof record.concentration==='string' && record.concentration.length<=80
    && ['note','reviewNote','sourceLabel','confirmedFrom','barcode'].every(field=>record[field]===undefined||(typeof record[field]==='string'&&record[field].length<=3000))
    && ['catalogueId','photoId'].every(field=>record[field]===undefined||record[field]===null||(typeof record[field]==='string'&&record[field].length<=120))
    && ['wearGroups','variantCandidates'].every(field=>record[field]===undefined||(Array.isArray(record[field])&&record[field].every(x=>typeof x==='string'&&x.length<=120)))
    && (record.sourceRows===undefined||(Array.isArray(record.sourceRows)&&record.sourceRows.every(Number.isInteger)));
}
export function mergeCollection(seed, changes={}) {
  const removed=new Set(Array.isArray(changes.removed)?changes.removed:[]);
  const edits=changes.edits && typeof changes.edits==='object'?changes.edits:{};
  const records=seed.filter(validRecord).map(record=>{
    const edit=edits[record.id],base=changes.bases?.[record.id];
    if(!validRecord(edit)||edit.id!==record.id)return record;
    // New edits retain their baseline so later seed corrections survive when a user
    // only changed a note or wearing group. Legacy complete overrides are preserved.
    if(!validRecord(base)||base.id!==record.id)return edit;
    const fields=Object.keys(edit).filter(field=>JSON.stringify(edit[field])!==JSON.stringify(base[field]));
    const merged={...record};for(const field of fields)merged[field]=edit[field];
    return validRecord(merged)?merged:record;
  });
  const ids=new Set(records.map(r=>r.id));
  for(const record of Array.isArray(changes.added)?changes.added:[]) {
    if(validRecord(record)&&!ids.has(record.id)) {records.push(record);ids.add(record.id);}
  }
  return records.filter(record=>!removed.has(record.id));
}
export function needsReview(record) {
  return record.variantStatus!=='confirmed' || !record.concentration.trim();
}
export function eligibleOwnedProfiles(records, catalogue) {
  const ids=new Set();
  return records.flatMap(record=>{
    if(record.productType!=='fragrance'||needsReview(record)||!record.catalogueId||ids.has(record.catalogueId)) return [];
    const profile=catalogue.find(f=>f.id===record.catalogueId);
    if(!profile || key(profile.concentration)!==key(record.concentration)
      || (![...(profile.topNotes||[]),...(profile.middleNotes||[]),...(profile.baseNotes||[])].length && !profile.notesUnavailable)
      || !profile.weather?.length || !profile.occasions?.length) return [];
    ids.add(profile.id);return [profile];
  });
}
export function duplicateRecord(record, records, exceptId='') {
  return records.find(r=>r.id!==exceptId && (
    (record.catalogueId && record.catalogueId===r.catalogueId)
    || (key(record.name)===key(r.name)&&key(record.brand)===key(r.brand)&&key(record.concentration)===key(r.concentration)&&record.productType===r.productType)
  ));
}
export function searchCollection(records,query='',filter='all',catalogue=[]) {
  return records.filter(r=>{
    const profile=catalogue.find(f=>f.id===r.catalogueId);
    return matchesSearch([r.name,r.brand,r.concentration,r.note,profile?.family,...(profile?notesOf(profile):[])].join(' '),query);
  })
    .filter(r=>filter==='review'?needsReview(r):filter==='fragrance'?r.productType==='fragrance':filter==='grooming'?r.productType!=='fragrance':true);
}
