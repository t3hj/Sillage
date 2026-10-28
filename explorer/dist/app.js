import {filterFragrances, rankFragrances, notesOf, occasionsOf, applyWearingGuidance} from './engine.mjs';
import {mergeCollection,eligibleOwnedProfiles,duplicateRecord,searchCollection,needsReview,createRecordId,wearGroupOptions,groupsForRecord,filterWearGroup,validRecord} from './collection.mjs';

import {storageKeys,emptyChanges,normaliseChanges,makeBackup,parseBackup,backupSummary,restoreBackup} from './storage.mjs';

import {defaultLocation,validLocation,conditionLabel,contextFromWeather,weatherIsFresh,fetchWeather,searchLocations} from './weather.mjs';

const $ = s => document.querySelector(s);
const esc = s => String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const icon = (name) => {
  const paths = {search:'<circle cx="10" cy="10" r="6.5"/><path d="m15 15 5 5"/>',bookmark:'<path d="M6 3h12v18l-6-4-6 4Z"/>',sun:'<circle cx="12" cy="12" r="4"/><path d="M12 1v3m0 16v3M1 12h3m16 0h3M4 4l2 2m12 12 2 2M4 20l2-2M18 6l2-2"/>',sliders:'<path d="M4 7h16M4 17h16"/><circle cx="9" cy="7" r="2.5" fill="currentColor"/><circle cx="15" cy="17" r="2.5" fill="currentColor"/>',leaf:'<path d="M20 3C5 1 0 13 9 19c7 4 13-5 11-16Z"/><path d="M4 22 16 9"/>'};
  return `<svg viewBox="0 0 24 24" aria-hidden="true">${paths[name]||''}</svg>`;
};
const popularNotes = ['Bergamot','Vanilla','Sandalwood','Vetiver','Lavender','Amber','Cedar','Iris','Mint','Patchouli'];
const weathers = ['Cold','Cool','Mild','Warm','Hot','Rainy','Humid','Dry'];
const occasions = ['Work','University','Casual','Date Night','Night Out','Formal','Gym','Outdoor','Home','Evening'];
const weatherLabels = {Cold:'Cold · below 10°C',Cool:'Cool · 10–15°C',Mild:'Mild · 15–20°C',Warm:'Warm · 20–25°C',Hot:'Hot · 25°C+',Rainy:'Rainy',Humid:'Humid',Dry:'Dry'};
const categoryLabels = [['all','All scents'],['fresh','Fresh & citrus'],['woody','Woody'],['amber','Amber & spice'],['floral','Floral'],['saved','Saved']];
let catalogue=[];
let photos={};
let collectionSeed=[];
let collectionChanges=emptyChanges();
try {collectionChanges=normaliseChanges(JSON.parse(localStorage.getItem(storageKeys.collection)||'null'));} catch {}
const ownedRecords=()=>mergeCollection(collectionSeed,collectionChanges);
const ownedProfiles=()=>eligibleOwnedProfiles(ownedRecords(),catalogue);
const isOwned=id=>ownedProfiles().some(f=>f.id===id);
let collectionQuery='', collectionFilter='all', collectionLimit=12, collectionSort='imported', collectionGroup='', collectionOccasion='';
let recommendationScope='owned';
let undoCollectionChanges=null;
function persistCollection() {
  try {localStorage.setItem(storageKeys.collection,JSON.stringify(collectionChanges));return true;}catch{return false;}
}

const readSaved = () => {try {const value=JSON.parse(localStorage.getItem(storageKeys.saved)||'[]'); return Array.isArray(value)?value.filter(x=>typeof x==='string'):[];}catch{return [];}};
const state = {view:'collection', query:'', notes:[], weather:'', occasion:'', category:'all', sort:'curated', limit:12, compare:[], saved:readSaved(), context:{weather:'Cool',occasion:'Work',note:''}};
let dayPrefs={};try {dayPrefs=JSON.parse(localStorage.getItem(storageKeys.day)||'{}')||{};}catch{}
let weatherMode=dayPrefs.weatherMode==='manual'?'manual':'live';
let weatherLocation=validLocation(dayPrefs.location)?dayPrefs.location:{...defaultLocation};
let weatherSnapshot=dayPrefs.snapshot&&Number.isFinite(dayPrefs.snapshot.current?.temperature_2m)?dayPrefs.snapshot:null;
let weatherBusy=false,weatherError='',weatherRequest=0;
let cityOpen=false,cityQuery='',cityResults=[],cityBusy=false,cityError='',cityRequest=0;
let manualWeather=weathers.includes(dayPrefs.weather)?dayPrefs.weather:'Cool';
state.context={weather:manualWeather,occasion:occasions.includes(dayPrefs.occasion)?dayPrefs.occasion:'Work',note:popularNotes.includes(dayPrefs.note)?dayPrefs.note:''};
const locationKey=place=>`${place.latitude},${place.longitude}`;
const activeWeather=()=>weatherMode==='live'&&weatherIsFresh(weatherSnapshot)&&weatherSnapshot.locationKey===locationKey(weatherLocation);
function recommendationContext() {
  return {...state.context,...(activeWeather()?contextFromWeather(weatherSnapshot):{weather:manualWeather,weatherTags:[],temperature:null,dayKey:new Date().toLocaleDateString('en-CA')})};
}
function persistDay() {try {localStorage.setItem(storageKeys.day,JSON.stringify({weatherMode,location:weatherLocation,snapshot:weatherSnapshot,weather:manualWeather,occasion:state.context.occasion,note:state.context.note}));}catch{}}
async function refreshWeather(force=false) {
  if(weatherBusy&&!force)return;
  const request=++weatherRequest,place={...weatherLocation};weatherBusy=true;weatherError='';
  if(state.view==='recommend')renderRecommendations();
  try {const snapshot=await fetchWeather(place);if(request!==weatherRequest)return;weatherSnapshot={...snapshot,locationKey:locationKey(place)};if(weatherMode==='live')state.context.weather=contextFromWeather(snapshot).weather;persistDay();}
  catch {if(request===weatherRequest)weatherError='Current weather could not be refreshed. Retry, or use a manual setting.';}
  finally {if(request===weatherRequest){weatherBusy=false;if(state.view==='recommend')renderRecommendations();}}
}
function renderDayWeather() {
  const live=activeWeather(),current=live?weatherSnapshot.current:null;
  const place=[weatherLocation.admin1,weatherLocation.country].filter(Boolean).join(', ')||weatherLocation.name;
  const time=current?String(current.time).slice(11,16):'';
  const low=weatherSnapshot?.daily?.temperature_2m_min?.[0],high=weatherSnapshot?.daily?.temperature_2m_max?.[0];
  const summary=live?`${Math.round(current.temperature_2m)}°C · ${conditionLabel(current.weather_code)} · Feels like ${Math.round(current.apparent_temperature??current.temperature_2m)}°C`:weatherBusy&&weatherMode==='live'?'Checking current weather…':'Your weather, your choice.';
  const detail=live?`Conditions at ${time} · ${weatherSnapshot.timezone}${Number.isFinite(low)&&Number.isFinite(high)?` · Today ${Math.round(low)}–${Math.round(high)}°C`:''}`:weatherMode==='manual'?`Manual ${manualWeather.toLowerCase()} scenario. Switch to current weather whenever you like.`:`Using the manual ${manualWeather.toLowerCase()} setting until current weather is available.`;
  return `<section class="day-weather" aria-label="Weather for recommendations"><div class="day-weather-top"><div><p class="eyebrow">${live?'CURRENT WEATHER':'SET THE SCENE'}</p><h2>${esc(weatherLocation.name)}</h2><p class="weather-now" role="status">${esc(summary)}</p><p class="weather-place">${esc(place)} · <button class="text-button" data-change-city>Change city</button></p></div><div class="weather-actions"><div class="weather-mode" role="group" aria-label="Weather source"><button data-weather-mode="live" aria-pressed="${weatherMode==='live'}" class="${weatherMode==='live'?'active':''}">Current weather</button><button data-weather-mode="manual" aria-pressed="${weatherMode==='manual'}" class="${weatherMode==='manual'?'active':''}">Set manually</button></div><button class="text-button" data-refresh-weather ${weatherBusy?'disabled':''}>${weatherBusy?'Updating…':'Refresh ↻'}</button></div></div>${weatherError&&weatherMode==='live'?`<p class="weather-error" role="status">${esc(weatherError)}${live?' The last available conditions are still shown.':''}</p>`:''}${cityOpen?`<form id="city-form" class="city-form"><label for="city-query">Find a city or town</label><div><input id="city-query" type="search" placeholder="City or town" autocomplete="off" minlength="2" maxlength="100" required value="${esc(cityQuery)}"><button class="button small" ${cityBusy?'disabled':''}>${cityBusy?'Searching…':'Search cities'}</button></div><p class="hint">Choose a city below. Your selection stays on this browser.</p>${cityError?`<p role="status" class="weather-error">${esc(cityError)}</p>`:''}<div class="city-results">${cityResults.map((city,i)=>`<button type="button" data-city-index="${i}">${esc([city.name,city.admin1,city.country].filter(Boolean).join(', '))} <span aria-hidden="true">↗</span></button>`).join('')}</div></form>`:''}<details class="weather-details"><summary>Weather details &amp; source</summary><p class="weather-meta">${esc(detail)}</p><p class="weather-credit">Weather data: <a href="https://open-meteo.com/" target="_blank" rel="noopener noreferrer">Open-Meteo ↗</a>. City-level conditions; refreshes while this page is open. Manual settings always remain available.</p></details></section>`;
}
function bindDayWeather() {
  $('#city-query')?.addEventListener('input',e=>{cityQuery=e.target.value;});
  $('#city-form')?.addEventListener('submit',async event=>{
    event.preventDefault();const request=++cityRequest;cityQuery=$('#city-query').value.trim();cityBusy=true;cityError='';cityResults=[];renderRecommendations();
    try {const results=await searchLocations(cityQuery);if(request!==cityRequest)return;cityResults=results;if(!results.length)cityError='No cities found. Try a nearby town or a different spelling.';}
    catch {if(request===cityRequest)cityError='City search is unavailable. Try again, or keep using a manual weather setting.';}
    finally {if(request===cityRequest){cityBusy=false;if(state.view==='recommend')renderRecommendations();}}
  });
}

const curated=['bleu-de-chanel-edp','maison-margiela-jazz-club','jomalone-wood-sage-sea-salt','dior-homme-intense','tf-oud-wood','kilian-angels-share','chanel-allure-homme-sport','parfums-de-marly-layton','hermes-terre-dhermes'];
const themes={Woody:['#e4e8df','#525c42'],Chypre:['#e8e6dc','#6a6544'],Aquatic:['#e0e9e8','#4b7b7e'],Citrus:['#eeecd9','#b2a352'],Fresh:['#e5e9df','#84967b'],Amber:['#eee3d7','#ac7040'],Oriental:['#e9e1d8','#865332'],Gourmand:['#e8dfd6','#9f683c'],Floral:['#eee3e0','#b18e83'],Fougère:['#e4e5e9','#77758b'],Leather:['#e6e0d8','#6f5442'],Aromatic:['#e1e7e7','#466571']};
const theme=f=>themes[f.family]||themes.Woody;
function bottle(f) {
  const photo=photos[f.id];
  const placeholder=`<span class="photo-unavailable"><span aria-hidden="true">${icon('search')}</span><span>Bottle photo unavailable</span><small>${esc(f.concentration)}</small></span>`;
  if(!photo?.path) return `<span class="bottle-visual no-photo">${placeholder}</span>`;
  return `<span class="bottle-visual"><img class="bottle-photo" src="${esc(photo.path)}" width="${photo.width}" height="${photo.height}" alt="${esc(f.brand)} ${esc(f.name)} — ${esc(f.concentration)} bottle" loading="lazy" decoding="async">${placeholder}</span>`;
}
function photoCredit(f) {
  const photo=photos[f.id];
  return photo?.path?`<a href="${esc(photo.source)}" target="_blank" rel="noopener noreferrer">Product photo: ${esc(photo.credit)} ↗</a>. Bottle size and packaging may vary.`:esc(photo?.note||'A verified photo is not available for this catalogue variant.');
}
const tags = list => `<div class="tags">${list.map(t=>`<span>${esc(t)}</span>`).join('')}</div>`;
const selectOptions=(values,current,placeholder,labels={}) => (placeholder?`<option value="">${esc(placeholder)}</option>`:'')+values.map(o=>`<option value="${esc(o)}" ${current===o?'selected':''}>${esc(labels[o]||o)}</option>`).join('');
function intro(title,description,eyebrow='THE SCENT LIBRARY') {return `<div class="intro"><div><p class="eyebrow">${eyebrow}</p><h1>${title}</h1><p>${description}</p></div><div class="catalogue-stamp"><span class="dot"></span><b>${state.view==='collection'?ownedRecords().length+' collection entries':catalogue.length+' scents, ready to explore'}</b><br>${state.view==='collection'?'Added by you on this browser':'Your fragrance library'}</div></div>`;}
function render() {
  document.querySelectorAll('[data-view]').forEach(b=>{b.classList.toggle('active',b.dataset.view===state.view);b.setAttribute('aria-current',b.dataset.view===state.view?'page':'false');});
  $('#nav-count').textContent=state.compare.length;
  if(state.view==='collection') renderCollection();
  else if(state.view==='recommend') renderRecommendations();
  else if(state.view==='compare') renderCompare();
  else renderExplorer();
  renderTray();
}
const views=['collection','explore','compare','recommend'];
function go(view) {if(!views.includes(view))return;state.view=view;if(location.hash!==`#${view}`)history.pushState(null,'',`#${view}`);render();window.scrollTo({top:0,behavior:'instant'});$('#main').focus({preventScroll:true});}
function renderCollection() {
  const records=ownedRecords();
  const fragranceCount=records.filter(r=>r.productType==='fragrance').length;
  const reviewCount=records.filter(needsReview).length;
  $('#main').innerHTML=`<div class="view-enter">${intro('A collection, unmistakably yours.','The bottles you own. The details that make them yours.','MY COLLECTION')}<div class="collection-toolbar"><div class="collection-summary"><span><b>${fragranceCount}</b> fragrance entries</span><span><b>${records.length-fragranceCount}</b> body &amp; grooming</span><span><b>${ownedProfiles().length}</b> ready for daily picks</span></div><button class="button small" data-new-owned>Add a fragrance <span aria-hidden="true">+</span></button></div>${reviewCount?`<section class="collection-review"><div><p class="eyebrow">A LITTLE CLARITY</p><h2>${reviewCount} variants need a closer look.</h2><p>Some names cover several concentrations or editions. Confirm the label on your bottle and link its matching profile for daily picks.</p></div><button class="button outline small" data-collection-filter="review">Review variants <span aria-hidden="true">↗</span></button></section>`:''}<div class="collection-controls"><div class="search-wrap">${icon('search')}<input type="search" id="collection-search" aria-label="Search my collection" placeholder="Search a bottle, brand or note…" value="${esc(collectionQuery)}"></div><label class="collection-sort"><span>Sort</span><select id="collection-sort" aria-label="Sort my collection"><option value="imported" ${collectionSort==='imported'?'selected':''}>Your list order</option><option value="name" ${collectionSort==='name'?'selected':''}>Name A–Z</option><option value="brand" ${collectionSort==='brand'?'selected':''}>Brand A–Z</option></select></label></div><div class="category-row" role="group" aria-label="Collection filter">${[['all','All entries'],['fragrance','Fragrances'],['review',`To confirm · ${reviewCount}`],['grooming','Body & grooming']].map(([id,label])=>`<button class="category ${collectionFilter===id?'active':''}" data-collection-filter="${id}" aria-pressed="${collectionFilter===id}">${label}</button>`).join('')}</div><div class="wear-group-controls"><label for="collection-group">Wear it your way</label><select id="collection-group" aria-label="Wearing group">${selectOptions(wearGroupOptions.map(([id])=>id),collectionGroup,'All settings',Object.fromEntries(wearGroupOptions))}</select><label for="collection-occasion">Occasion</label><select id="collection-occasion" aria-label="Collection occasion">${selectOptions(occasions,collectionOccasion,'Any occasion')}</select><p>Suggested settings, with room to overlap. Choose what feels right for you.</p></div><div id="collection-results"></div><p class="data-note">Your collection starts empty. Add bottles from Explore or enter them manually.<br>Your collection and edits stay on this browser. Use Data &amp; backup below to transfer them to another device. Bookmarks remain a separate discovery shortlist.</p></div>`;
  $('#collection-search').addEventListener('input',e=>{collectionQuery=e.target.value;collectionLimit=12;renderCollectionResults();});
  $('#collection-sort').addEventListener('change',e=>{collectionSort=e.target.value;renderCollectionResults();});
  $('#collection-group').addEventListener('change',e=>{collectionGroup=e.target.value;collectionLimit=12;renderCollectionResults();});
  $('#collection-occasion').addEventListener('change',e=>{collectionOccasion=e.target.value;collectionLimit=12;renderCollectionResults();});
  renderCollectionResults();
}
function renderCollectionResults() {
  if(!ownedRecords().length){$('#collection-results').innerHTML='<div class="empty"><h2>Your first bottle belongs here.</h2><p>Browse the catalogue to add a matching profile, or use Add a fragrance for an unlisted bottle.</p><button class="button outline small" data-go="explore">Explore the catalogue ↗</button></div>';return;}
  let records=filterWearGroup(searchCollection(ownedRecords(),collectionQuery,collectionFilter,catalogue),collectionGroup,catalogue);
  if(collectionOccasion)records=records.filter(record=>{const profile=catalogue.find(f=>f.id===record.catalogueId);return profile&&occasionsOf(profile).includes(collectionOccasion);});
  if(collectionSort==='name')records.sort((a,b)=>a.name.localeCompare(b.name));
  if(collectionSort==='brand')records.sort((a,b)=>a.brand.localeCompare(b.brand)||a.name.localeCompare(b.name));
  $('#collection-results').innerHTML=`<div class="results-heading" role="status" aria-live="polite"><span><b>${records.length}</b> collection ${records.length===1?'entry':'entries'}</span><span>${collectionFilter==='review'?'Exact bottles make better picks.':'Your own scent wardrobe.'}</span></div><div class="grid collection-grid">${records.length?records.slice(0,collectionLimit).map(collectionCard).join(''):`<div class="empty"><h2>${collectionFilter==='review'?'No variants to review here.':'No bottles in this view.'}</h2><p>${collectionFilter==='review'?'Try another setting or view all of your entries.':'Try another name or browse all of your entries.'}</p><button class="button outline small" data-reset-collection>View all entries ↗</button></div>`}</div>${records.length>collectionLimit?`<div class="load-more"><button class="button outline" id="more-collection">More from your collection <span>${Math.min(12,records.length-collectionLimit)} more ↓</span></button></div>`:''}`;
  $('#more-collection')?.addEventListener('click',()=>{collectionLimit+=12;renderCollectionResults();});
}
function recordVisual(record) {
  const profile=record.catalogueId?catalogue.find(f=>f.id===record.catalogueId):null;
  return profile || {id:record.photoId||record.id,name:record.name,brand:record.brand,concentration:record.concentration||'Variant to confirm',family:'Woody'};
}
function collectionCard(record) {
  const f=recordVisual(record), review=needsReview(record);
  const ready=ownedProfiles().some(p=>p.id===record.catalogueId);
  const label=review?'To confirm':record.productType==='body_spray'?'Body spray':record.productType==='aftershave'?'Aftershave':'In your collection';
  return `<article class="fragrance-card owned-card"><div class="art-wrap" style="--tint:${theme(f)[0]}"><button class="card-open" data-owned-open="${esc(record.id)}" aria-label="View owned ${esc(record.name)} by ${esc(record.brand)}">${bottle(f)}</button><span class="family-tag ${review?'review-tag':''}">${label}</span></div><div class="card-copy"><p class="card-brand">${esc(record.brand)}</p><button class="card-name" data-owned-open="${esc(record.id)}">${esc(record.name)}</button><p class="concentration">${esc(record.concentration||'Concentration to confirm')}</p><div class="owned-groups">${groupsForRecord(record,catalogue).map(id=>`<span>${esc(Object.fromEntries(wearGroupOptions)[id])}</span>`).join('')}</div><div class="owned-status">${record.productType!=='fragrance'?'Body & grooming · outside fragrance picks':review?'Check the exact edition on your bottle':ready?'✓ Ready for your daily picks':'Profile not linked yet'}</div><div class="card-bottom"><button class="text-button" data-owned-open="${esc(record.id)}">View details</button><button class="owned-edit" data-edit-owned="${esc(record.id)}">${review?'Confirm variant':'Edit'} <span aria-hidden="true">↗</span></button></div></div></article>`;
}
function openOwnedDetail(id) {
  const record=ownedRecords().find(r=>r.id===id);if(!record)return;
  if(record.catalogueId && !needsReview(record)) {openDetail(record.catalogueId);return;}
  const visual=recordVisual(record);
  $('#dialog-content').innerHTML=`<div class="dialog-head"><span>YOUR COLLECTION · ${needsReview(record)?'VARIANT TO CONFIRM':'OWNED ENTRY'}</span><button class="close-dialog" data-close aria-label="Close collection details">×</button></div><div class="detail-top"><div class="detail-art" style="--tint:${theme(visual)[0]}">${bottle(visual)}</div><div class="detail-summary"><p class="card-brand">${esc(record.brand)}</p><h2 id="dialog-title">${esc(record.name)}</h2><div class="concentration">${esc(record.concentration||'Concentration not supplied')}</div><p>${esc(record.reviewNote || (record.productType==='fragrance'?'This bottle is in your collection. Its full scent profile has not been linked yet.':'This body or grooming product is kept separate from fragrance recommendations.'))}</p><button class="button small" data-edit-owned="${esc(id)}">${needsReview(record)?'Confirm exact variant':'Edit this entry'} <span aria-hidden="true">↗</span></button></div></div><div class="detail-body">${record.note?`<div class="owned-source-note"><h3>Your import note</h3><p>${esc(record.note)}</p></div>`:''}<p class="detail-source">${record.sourceRows?.length?`From item${record.sourceRows.length>1?'s':''} ${record.sourceRows.join(', ')} in your supplied collection list.`:esc(record.sourceLabel||'Added by you on this browser.')} Confirmed, matched fragrances can appear in daily picks. Unconfirmed variants, body sprays and aftershave are kept outside those suggestions.</p></div>`;
  if(!$('#detail').open)$('#detail').showModal();$('#detail').scrollTop=0;
}
function editOwned(id='',preselectedId='') {
  let record=ownedRecords().find(r=>r.id===id) || {id:'',name:'',brand:'',concentration:'',productType:'fragrance',variantStatus:'unconfirmed',catalogueId:null,note:''};
  if(preselectedId) {const f=catalogue.find(f=>f.id===preselectedId);if(f) record={...record,name:f.name,brand:f.brand,concentration:f.concentration,catalogueId:f.id,variantStatus:'confirmed'};}
  const candidates=new Set(record.variantCandidates||[]);
  const sorted=[...catalogue].sort((a,b)=>(candidates.has(a.id)?-1:0)-(candidates.has(b.id)?-1:0)||a.brand.localeCompare(b.brand)||a.name.localeCompare(b.name));
  $('#dialog-content').innerHTML=`<div class="dialog-head"><span>YOUR SCENT WARDROBE</span><button class="close-dialog" data-close aria-label="Close collection editor">×</button></div><div class="owned-form-wrap"><p class="eyebrow">${id?'MAKE IT YOURS':'A NEW DISCOVERY, NOW YOURS'}</p><h2 id="dialog-title">${id?'The details on your bottle.':'Add to your collection.'}</h2>${record.reviewNote?`<p class="form-guidance">${esc(record.reviewNote)}</p>`:''}<form id="owned-form"><label class="form-field">Exact catalogue match<select id="owned-profile" aria-label="Exact catalogue match"><option value="">Keep as a personal entry · no match yet</option>${sorted.map(f=>`<option value="${esc(f.id)}" ${record.catalogueId===f.id?'selected':''}>${candidates.has(f.id)?'Suggested · ':''}${esc(f.brand)} — ${esc(f.name)} · ${esc(f.concentration)}</option>`).join('')}</select><small>Choose only the edition and concentration that match your bottle. Selecting a match fills the details below.</small></label><div class="form-columns"><label class="form-field">Brand<input id="owned-brand" required maxlength="120" value="${esc(record.brand)}" autocomplete="off"></label><label class="form-field">Name<input id="owned-name" required maxlength="120" value="${esc(record.name)}" autocomplete="off"></label><label class="form-field">Product type<select id="owned-type" aria-label="Product type">${[['fragrance','Fragrance'],['body_spray','Body spray'],['aftershave','Aftershave lotion']].map(([value,label])=>`<option value="${value}" ${record.productType===value?'selected':''}>${label}</option>`).join('')}</select></label><label class="form-field">Concentration / format<input id="owned-concentration" list="concentrations" maxlength="80" value="${esc(record.concentration)}" placeholder="As printed on your bottle"><datalist id="concentrations">${['Eau de Toilette','Eau de Parfum','Eau de Parfum Intense','Parfum','Parfum Intense','Extrait de Parfum','Elixir','Body spray','Aftershave lotion'].map(c=>`<option value="${c}"></option>`).join('')}</datalist></label></div><label class="form-field">Your note<textarea id="owned-note" aria-label="Your note" maxlength="2000" rows="3" placeholder="A favourite setting, storage note, or anything to check…">${esc(record.note||'')}</textarea></label><fieldset class="group-editor"><legend>Wearing groups</legend><p class="hint">Choose any that fit to organise My Collection. Daily picks use the linked profile’s specific weather and occasion tags.</p><div>${wearGroupOptions.map(([value,label])=>`<label><input type="checkbox" name="wear-group" value="${value}" ${groupsForRecord(record,catalogue).includes(value)?'checked':''}>${label}</label>`).join('')}</div></fieldset><label class="confirmation-check"><input id="owned-confirmed" type="checkbox" ${!needsReview(record)&&record.name?'checked':''}><span>These details match my bottle.</span></label><p class="hint">An unmatched entry can still be saved. Daily picks use confirmed fragrances with a linked scent profile. Changes stay on this browser.</p><div class="form-actions"><button class="button" type="submit">Save to My Collection <span aria-hidden="true">↗</span></button>${id?`<button type="button" class="text-button remove-owned" data-remove-owned="${esc(id)}">Remove this entry</button>`:''}</div></form></div>`;
  const profileSelect=$('#owned-profile');
  profileSelect.addEventListener('change',()=>{
    const f=catalogue.find(f=>f.id===profileSelect.value);if(!f)return;
    $('#owned-brand').value=f.brand;$('#owned-name').value=f.name;$('#owned-concentration').value=f.concentration;$('#owned-type').value='fragrance';$('#owned-confirmed').checked=true;
    const suggested=groupsForRecord({productType:'fragrance',catalogueId:f.id},catalogue);
    document.querySelectorAll('[name="wear-group"]').forEach(input=>{input.checked=suggested.includes(input.value);});
  });
  ['#owned-brand','#owned-name','#owned-concentration','#owned-type'].forEach(selector=>$(selector).addEventListener('input',()=>{profileSelect.value='';}));
  $('#owned-form').addEventListener('submit',event=>{
    event.preventDefault();
    const concentration=$('#owned-concentration').value.trim();
    const saved={...record,id:record.id||createRecordId(),brand:$('#owned-brand').value.trim(),name:$('#owned-name').value.trim(),concentration,productType:$('#owned-type').value,wearGroups:[...document.querySelectorAll('[name="wear-group"]:checked')].map(input=>input.value),variantStatus:$('#owned-confirmed').checked&&concentration?'confirmed':'unconfirmed',catalogueId:profileSelect.value||null,note:$('#owned-note').value.trim(),reviewNote:$('#owned-confirmed').checked&&concentration?'':'Confirm the exact name and concentration on your bottle.'};
    if(!validRecord(saved)) {toast('Enter a brand and fragrance name, rather than only spaces.');return;}
    if(duplicateRecord(saved,ownedRecords(),record.id)) {toast('That exact fragrance is already in your collection.');return;}
    undoCollectionChanges=structuredClone(collectionChanges);
    if(collectionSeed.some(r=>r.id===saved.id)) {
      collectionChanges.bases[saved.id]=structuredClone(collectionSeed.find(r=>r.id===saved.id));
      collectionChanges.edits[saved.id]=saved;
    }
    else {const i=collectionChanges.added.findIndex(r=>r.id===saved.id);if(i>=0)collectionChanges.added[i]=saved;else collectionChanges.added.push(saved);}
    const stored=persistCollection();$('#detail').close();render();
    toast(stored?'Your collection entry is saved on this browser.':'Saved for this visit; browser storage is unavailable.');
  });
  if(!$('#detail').open)$('#detail').showModal();$('#detail').scrollTop=0;
}
function addOwnedProfile(id) {
  const f=catalogue.find(f=>f.id===id);if(!f)return;
  if(isOwned(id)) {$('#detail').close();go('collection');return;}
  const pending=ownedRecords().filter(r=>needsReview(r)&&r.variantCandidates?.includes(id));
  if(pending.length===1) {editOwned(pending[0].id,id);return;}
  const record={id:createRecordId(),name:f.name,brand:f.brand,concentration:f.concentration,productType:'fragrance',variantStatus:'confirmed',catalogueId:f.id,note:'',sourceRows:[]};
  if(duplicateRecord(record,ownedRecords())) {toast('That exact fragrance is already in your collection.');return;}
  undoCollectionChanges=structuredClone(collectionChanges);collectionChanges.added.push(record);
  const stored=persistCollection();$('#detail').close();render();toast(stored?'Added to My Collection on this browser.':'Added for this visit; browser storage is unavailable.');
}
function removeOwned(id) {
  undoCollectionChanges=structuredClone(collectionChanges);
  collectionChanges.removed=[...new Set([...collectionChanges.removed,id])];
  const stored=persistCollection();$('#detail').close();render();
  clearTimeout(toastTimer);$('#toast').innerHTML=(stored?'Entry removed.':'Removed for this visit; browser storage is unavailable.')+' <button data-undo-owned>Undo</button>';$('#toast').classList.add('show');toastTimer=setTimeout(()=>$('#toast').classList.remove('show'),7000);
}
function undoOwned() {
  if(!undoCollectionChanges)return;collectionChanges=undoCollectionChanges;undoCollectionChanges=null;const stored=persistCollection();render();toast(stored?'Your collection entry is restored.':'Restored for this visit; browser storage is unavailable.');
}
function renderExplorer() {
  const activeFilters=state.notes.length+!!state.weather+!!state.occasion;
  $('#main').innerHTML=`<div class="view-enter">${intro('A scent for every setting.','Follow a note, find your mood, or let the day decide.')}<section class="scene-banner" aria-label="Discover recommendations"><div class="scene-copy"><p class="eyebrow">A LITTLE DIRECTION</p><h2>What does today smell like?</h2><p>Find a fragrance that fits your plans.</p></div><svg class="scene-art" viewBox="0 0 400 290" aria-hidden="true"><g fill="none" stroke="#c6b48b" stroke-width=".6"><ellipse cx="220" cy="154" rx="145" ry="76" transform="rotate(-30 220 154)"/><ellipse cx="220" cy="154" rx="130" ry="65" transform="rotate(-30 220 154)"/><ellipse cx="220" cy="154" rx="112" ry="54" transform="rotate(-30 220 154)"/><path d="M60 267C145 181 202 112 313 47M150 169q-19-42 9-70 21 39-9 70M194 127q20-39 56-34-16 33-56 34M225 98q-10-31 11-52 11 29-11 52M115 210q34-33 64-13-28 22-64 13"/></g></svg><div class="scene-action"><div class="scene-context">${icon('sun')}<span>${esc(state.context.weather)} weather</span><span>·</span><span>${esc(state.context.occasion)}</span></div><button class="button light" data-go="recommend">Find my scent <span aria-hidden="true">↗</span></button></div></section><div class="library-layout"><aside class="filters" id="filters" aria-label="Fragrance filters"><div class="filter-title"><span>Refine your search</span><button class="text-button" data-reset>Reset</button></div><section class="filter-section"><h3>Notes to follow</h3><div class="note-chips">${popularNotes.map(n=>`<button class="chip ${state.notes.includes(n)?'selected':''}" aria-pressed="${state.notes.includes(n)}" data-note="${n}">${n}</button>`).join('')}</div><p class="hint">Matches any selected note.</p></section><section class="filter-section"><h3><label for="weather-filter">Weather</label></h3><select id="weather-filter">${selectOptions(weathers,state.weather,'Any weather',weatherLabels)}</select></section><section class="filter-section"><h3><label for="occasion-filter">Occasion</label></h3><select id="occasion-filter">${selectOptions(occasions,state.occasion,'Any occasion')}</select></section><button class="button outline small apply-filters" data-apply-filters>Show results ↓</button><div class="filter-note">${icon('leaf')}Go by feel.<br>Weather and occasion tags are a guide. Your own taste comes first.</div></aside><section class="library" aria-label="Fragrance catalogue"><div class="search-row"><div class="search-wrap">${icon('search')}<input id="search" type="search" placeholder="Search a scent, brand or note…" aria-label="Search fragrances" value="${esc(state.query)}"></div><button class="mobile-filter" aria-expanded="false" aria-controls="filters" id="filter-toggle">${icon('sliders')}Filters${activeFilters?` (${activeFilters})`:''}</button><label class="sort-wrap" for="sort"><span>Sort by</span><select id="sort" aria-label="Sort by"><option value="curated" ${state.sort==='curated'?'selected':''}>The Sillage edit</option><option value="name" ${state.sort==='name'?'selected':''}>Name A–Z</option><option value="brand" ${state.sort==='brand'?'selected':''}>Brand A–Z</option></select></label></div><div class="category-row" role="group" aria-label="Scent family">${categoryLabels.map(([id,label])=>`<button class="category ${state.category===id?'active':''}" aria-pressed="${state.category===id}" data-category="${id}">${label}${id==='saved'?` <span id="saved-count">${state.saved.length}</span>`:''}</button>`).join('')}</div><div id="results"></div><p class="data-note">Catalogue entries, not an ownership list. Real product photography where verified.<br>Profiles combine the Sillage repository with linked brand sources. Wearing guidance is subjective; performance varies by wearer.</p></section></div></div>`;
  $('#search').addEventListener('input',e=>{state.query=e.target.value;state.limit=12;renderResults();});
  $('#weather-filter').addEventListener('change',e=>{state.weather=e.target.value;state.limit=12;renderResults();});
  $('#occasion-filter').addEventListener('change',e=>{state.occasion=e.target.value;state.limit=12;renderResults();});
  $('#sort').addEventListener('change',e=>{state.sort=e.target.value;renderResults();});
  $('#filter-toggle').addEventListener('click',()=>{const open=$('#filters').classList.toggle('open');$('#filter-toggle').setAttribute('aria-expanded',open);});
  positionFilters();
  renderResults();
}
const phoneLayout=window.matchMedia('(max-width:600px)');
function positionFilters() {
  const filters=$('#filters'),library=$('.library');if(!filters||!library)return;
  if(phoneLayout.matches)library.insertBefore(filters,$('.library>.category-row'));
  else $('.library-layout').insertBefore(filters,library);
}
phoneLayout.addEventListener('change',positionFilters);
function orderedResults() {
  let values=filterFragrances(catalogue,state);
  if(state.sort==='name') values.sort((a,b)=>a.name.localeCompare(b.name));
  else if(state.sort==='brand') values.sort((a,b)=>a.brand.localeCompare(b.brand)||a.name.localeCompare(b.name));
  else values.sort((a,b)=>(curated.indexOf(a.id)<0?999:curated.indexOf(a.id))-(curated.indexOf(b.id)<0?999:curated.indexOf(b.id)));
  return values;
}
function renderResults() {
  const values=orderedResults();
  const count=state.notes.length+!!state.weather+!!state.occasion;
  if($('#filter-toggle')) $('#filter-toggle').innerHTML=`${icon('sliders')}Filters${count?` (${count})`:''}`;
  const narrowed=state.query||state.notes.length||state.weather||state.occasion||state.category!=='all';
  $('#results').innerHTML=`<div class="results-heading" role="status" aria-live="polite"><span><b>${values.length}</b> ${values.length===1?'fragrance':'fragrances'}${narrowed?' found':' to discover'}</span><span>${state.category==='saved'?'Your saved discoveries':'A world of notes. One good place to start.'}</span></div><div class="grid">${values.length?values.slice(0,state.limit).map(card).join(''):`<div class="empty"><h2>${state.category==='saved'&&!state.saved.length?'Your next discovery belongs here.':'No scents in this setting.'}</h2><p>${state.category==='saved'&&!state.saved.length?'Tap a bookmark on any fragrance to save it for later.':'Try another note, a different occasion or a broader search.'}</p><button class="button outline small" data-reset>${state.category==='saved'&&!state.saved.length?'Explore the catalogue':'Clear all filters'} <span aria-hidden="true">↗</span></button></div>`}</div>${values.length>state.limit?`<div class="load-more"><button class="button outline" id="load-more">Explore more scents <span>${Math.min(12,values.length-state.limit)} more ↓</span></button></div>`:''}`;
  $('#load-more')?.addEventListener('click',()=>{state.limit+=12;renderResults();});
}
function card(f) {
  return `<article class="fragrance-card"><div class="art-wrap" style="--tint:${theme(f)[0]}"><button class="card-open" data-open="${f.id}" aria-label="Explore ${esc(f.name)} by ${esc(f.brand)}">${bottle(f)}</button><span class="family-tag">${esc(f.family==='Oriental'?'Amber':f.family)}</span><button class="save-button ${state.saved.includes(f.id)?'saved':''}" data-save="${f.id}" aria-label="${state.saved.includes(f.id)?'Unsave':'Save'} ${esc(f.name)}" aria-pressed="${state.saved.includes(f.id)}">${icon('bookmark')}</button></div><div class="card-copy"><p class="card-brand">${esc(f.brand)}</p><button class="card-name" data-open="${f.id}">${esc(f.name)}</button><p class="concentration">${esc(f.concentration)}</p><p class="card-notes">${esc([...f.topNotes.slice(0,1),...f.middleNotes.slice(0,1),...f.baseNotes.slice(0,1)].join(' · '))}</p><div class="card-bottom"><span class="card-context">${esc(f.weather.slice(0,2).join(' / '))}</span>${compareToggle(f)}</div></div></article>`;
}
function compareToggle(f) {return `<button class="compare-toggle" data-compare="${f.id}" aria-label="${state.compare.includes(f.id)?'Remove':'Compare'} ${esc(f.name)}${state.compare.includes(f.id)?' from comparison':''}" aria-pressed="${state.compare.includes(f.id)}">${state.compare.includes(f.id)?'Selected':'Compare'}</button>`;}
function renderRecommendations() {
  const pool=recommendationScope==='owned'?ownedProfiles():catalogue;
  const context=recommendationContext();
  const ranked=rankFragrances(pool,context).slice(0,3);
  const scenario=activeWeather()?`${weatherLocation.name} · ${Math.round(weatherSnapshot.current.temperature_2m)}°C · ${conditionLabel(weatherSnapshot.current.weather_code)}`:`Manual weather · ${context.weather}`;
  $('#main').innerHTML=`<div class="view-enter">${intro('Let the day lead.','A few thoughtful suggestions, shaped around your setting.','FOR YOUR DAY')}${renderDayWeather()}<div class="recommend-scope" role="group" aria-label="Recommendation source"><button class="scope-button ${recommendationScope==='owned'?'active':''}" data-rec-scope="owned" aria-pressed="${recommendationScope==='owned'}">My collection · ${ownedProfiles().length} ready</button><button class="scope-button ${recommendationScope==='catalogue'?'active':''}" data-rec-scope="catalogue" aria-pressed="${recommendationScope==='catalogue'}">Whole catalogue</button></div><section class="context-panel ${activeWeather()?'live-context':''}" aria-label="Recommendation preferences"><div class="context-field weather-setting" ${activeWeather()?'hidden':''}><label for="rec-weather">01 / Weather setting</label><select id="rec-weather" ${activeWeather()?'disabled':''}>${selectOptions(weathers,context.weather,null,weatherLabels)}</select>${activeWeather()?'<span class="hint">From current weather · choose Set manually to override.</span>':''}</div><div class="context-field"><label for="rec-occasion">02 / Choose your plans</label><select id="rec-occasion">${selectOptions(occasions,state.context.occasion)}</select></div><div class="context-field"><label for="rec-note">03 / Follow a note</label><select id="rec-note">${selectOptions(popularNotes,state.context.note,'Surprise me · any note')}</select></div></section><div id="recommend-results"><div class="recommend-head"><h2>${ranked.length===3?'Your day, in three scents.':ranked.length?'Your day, in your collection.':'Your next pick starts here.'}</h2><p>${esc(scenario)} · ${esc(state.context.occasion)}${state.context.note?' · '+esc(state.context.note):''}</p></div><div class="recommend-grid">${ranked.length?ranked.map((r,i)=>recommendCard(r,i)).join(''):'<div class="empty"><h2>Add a bottle to begin.</h2><p>Daily picks use your confirmed fragrances with a wearing profile.</p><button class="button" data-go="collection">Open My Collection ↗</button></div>'}</div></div><div class="how-it-works"><h3>Instinct, with a little logic.</h3><p>Plans come first, then temperature, conditions and your chosen note. Strong trails are deprioritised for heat, work and the gym. Every match explains its fit; alternatives are labelled. ${recommendationScope==='owned'?'Only confirmed fragrances in your collection appear here. Body sprays and aftershave stay separate.':'You are exploring the full catalogue, including fragrances outside your collection.'}</p></div><p class="data-note">Occasion, weather and strength are subjective wearing guidance, reviewed against each scent’s character. A fragrance can suit several occasions. Changes to your plans, city and manual settings stay on this browser.</p></div>`;
  $('#rec-weather').addEventListener('change',e=>{manualWeather=e.target.value;weatherMode='manual';state.context.weather=manualWeather;persistDay();renderRecommendations();$('#rec-weather').focus();});
  [['#rec-occasion','occasion'],['#rec-note','note']].forEach(([selector,key])=>$(selector).addEventListener('change',e=>{state.context[key]=e.target.value;persistDay();renderRecommendations();$(selector).focus();}));
  bindDayWeather();
}
function recommendCard(r,i) {
  const f=r.f;
  return `<article class="recommend-card"><div class="art-wrap" style="--tint:${theme(f)[0]}"><button class="card-open" data-open="${f.id}" aria-label="Explore ${esc(f.name)}">${bottle(f)}</button><span class="rank-tag">0${i+1} / ${['THE FIRST CHOICE','ANOTHER DIRECTION','WORTH EXPLORING'][i]}</span><button class="save-button ${state.saved.includes(f.id)?'saved':''}" data-save="${f.id}" aria-label="${state.saved.includes(f.id)?'Unsave':'Save'} ${esc(f.name)}" aria-pressed="${state.saved.includes(f.id)}">${icon('bookmark')}</button></div><div class="card-copy"><div class="match-heading"><span>${r.label}</span><span aria-hidden="true">↗</span></div><p class="card-brand">${esc(f.brand)}</p><button class="card-name" data-open="${f.id}">${esc(f.name)}</button><p class="concentration">${esc(f.concentration)}</p><p class="card-notes">${esc(f.subfamily)}</p><div class="match-reasons"><ul>${r.reasons.map(reason=>`<li>${esc(reason)}</li>`).join('')}</ul>${r.caution?`<p class="match-caution">${esc(r.caution)}</p>`:''}</div><div class="card-bottom"><button class="text-button" data-open="${f.id}">Explore notes</button>${compareToggle(f)}</div></div></article>`;
}
function renderCompare() {
  const scents=state.compare.map(id=>catalogue.find(f=>f.id===id)).filter(Boolean);
  $('#main').innerHTML=`<div class="view-enter">${intro('The details make the difference.','Bring up to three scents together. Find what sets them apart.','SIDE BY SIDE')}${scents.length?`<div class="compare-actions"><button class="button outline small" data-go="explore">← ${scents.length<3?'Add another scent':'Back to the library'}</button><button class="text-button" data-clear-compare>Clear comparison</button></div>${scents.length===1?'<p class="data-note" style="margin:0 0 22px">One scent selected. Add another from Explore to see their differences.</p>':''}<p class="mobile-compare-hint">Swipe the table sideways to compare every scent.</p><div class="compare-scroll" tabindex="0" role="region" aria-label="Scroll fragrance comparison"><table class="comparison"><caption class="sr-only">Fragrance notes, weather, occasion and performance comparison</caption><thead><tr><th scope="col">THE SCENT</th>${scents.map(f=>`<th scope="col"><div class="compare-art" style="--tint:${theme(f)[0]}">${bottle(f)}</div><p class="card-brand">${esc(f.brand)}</p><h2>${esc(f.name)}</h2><span class="concentration">${esc(f.concentration)}</span><br><button class="remove" data-compare="${f.id}" aria-label="Remove ${esc(f.name)} from comparison">Remove</button></th>`).join('')}</tr></thead><tbody>${compareRow('Scent character',scents,f=>esc(f.subfamily))}${compareRow('Opening notes',scents,f=>f.notesAreFlat?'Order not supplied':highlightNotes(f.topNotes,scents,f)||'Not supplied')}${compareRow('Heart / key notes',scents,f=>highlightNotes(f.middleNotes,scents,f)||'Not supplied')}${compareRow('Base notes',scents,f=>f.notesAreFlat?'Order not supplied':highlightNotes(f.baseNotes,scents,f)||'Not supplied')}${compareRow('Weather',scents,f=>tags(f.weather))}${compareRow('Occasions',scents,f=>tags(occasionsOf(f)))}${compareRow('Seasons',scents,f=>esc(f.seasons.join(' · ')))}${compareRow('Trail / sillage',scents,f=>esc(f.sillage))}${compareRow('Longevity',scents,f=>esc(f.longevity))}${compareRow('Explore',scents,f=>`<button class="text-button" data-open="${f.id}">View full profile ↗</button>`)}</tbody></table></div><p class="data-note"><span class="shared-note">Terracotta notes</span> appear in more than one selected fragrance. Strength and longevity are qualitative catalogue ratings, not measured hours.</p>`:`<div class="empty"><p class="eyebrow">A CLOSER LOOK</p><h2>Some things are better side by side.</h2><p>Choose “Compare” on two or three fragrances to explore<br>their notes, weather and occasion profiles together.</p><button class="button" data-go="explore">Find scents to compare <span aria-hidden="true">↗</span></button></div>`}</div>`;
}
function compareRow(label,scents,fn) {return `<tr><th scope="row">${label}</th>${scents.map(f=>`<td>${fn(f)}</td>`).join('')}</tr>`;}
function highlightNotes(notes,scents,current) {return notes.map(n=>scents.some(f=>f.id!==current.id&&notesOf(f).includes(n))?`<span class="shared-note">${esc(n)}</span>`:esc(n)).join(' · ');}
function renderTray() {
  const shown=state.compare.length>0&&state.view!=='compare';
  $('#compare-tray').hidden=!shown;
  document.body.classList.toggle('has-tray',shown);
  $('#nav-count').textContent=state.compare.length;
  if(shown) $('#compare-tray').innerHTML=`<span class="tray-label">${state.compare.length} of 3 scents selected</span><span class="tray-names">${state.compare.map(id=>esc(catalogue.find(f=>f.id===id)?.name||'')).join(' · ')}</span><button class="button small" data-go="compare">Compare scents <span aria-hidden="true">↗</span></button><button class="icon-button" data-clear-compare aria-label="Clear comparison">×</button>`;
}
function toggleCompare(id) {
  if(state.compare.includes(id)) state.compare=state.compare.filter(x=>x!==id);
  else if(state.compare.length>=3) {toast('Three scents at a time. Remove one to add another.');return;}
  else state.compare.push(id);
  if(state.view==='compare') renderCompare();
  else {
    document.querySelectorAll('[data-compare]').forEach(button=>{const selected=state.compare.includes(button.dataset.compare),f=catalogue.find(x=>x.id===button.dataset.compare);button.setAttribute('aria-pressed',selected);button.textContent=selected?'Selected':'Compare';if(f) button.setAttribute('aria-label',`${selected?'Remove':'Compare'} ${f.name}${selected?' from comparison':''}`);});
  }
  renderTray();
}
function toggleSaved(id) {
  const nowSaved=!state.saved.includes(id);
  state.saved=nowSaved?[...state.saved,id]:state.saved.filter(x=>x!==id);
  let stored=true;try{localStorage.setItem(storageKeys.saved,JSON.stringify(state.saved));}catch{stored=false;}
  document.querySelectorAll('[data-save]').forEach(button=>{const selected=state.saved.includes(button.dataset.save),f=catalogue.find(x=>x.id===button.dataset.save);button.classList.toggle('saved',selected);button.setAttribute('aria-pressed',selected);if(f) button.setAttribute('aria-label',`${selected?'Unsave':'Save'} ${f.name}`);if(button.classList.contains('detail-save')) button.innerHTML=selected?'Saved to discoveries ✓':'Save for later';});
  if($('#saved-count')) $('#saved-count').textContent=state.saved.length;
  if(state.view==='explore'&&state.category==='saved') renderResults();
  toast(stored?(nowSaved?'Saved to your discoveries on this browser.':'Removed from saved discoveries.'):'Saved for this visit. Browser storage is unavailable.');
}
let toastTimer;
function toast(message) {clearTimeout(toastTimer);$('#toast').textContent=message;$('#toast').classList.add('show');toastTimer=setTimeout(()=>$('#toast').classList.remove('show'),3200);}
function openDetail(id) {
  const f=catalogue.find(x=>x.id===id);if(!f)return;
  const owned=ownedRecords().find(r=>r.catalogueId===id&&!needsReview(r));
  const collectionNote=owned?`<section class="owned-source-note"><h3>Your collection entry</h3><p>${owned.sourceRows?.length?'From item'+(owned.sourceRows.length>1?'s':'')+' '+owned.sourceRows.join(', ')+' in your supplied list.':esc(owned.sourceLabel||'Added by you on this browser.')}${owned.note?'<br>'+esc(owned.note):''}</p><button class="text-button" data-edit-owned="${esc(owned.id)}" style="margin-top:12px">Edit your bottle ↗</button></section>`:'';
  $('#dialog-content').innerHTML=`<div class="dialog-head"><span>THE SCENT PROFILE · ${isOwned(f.id)?'IN YOUR COLLECTION':'DISCOVERY CATALOGUE'}</span><button class="close-dialog" aria-label="Close fragrance details" data-close>×</button></div><div class="detail-top"><div class="detail-art" style="--tint:${theme(f)[0]}">${bottle(f)}</div><div class="detail-summary"><p class="card-brand">${esc(f.brand)}${f.year?' · '+f.year:''}</p><h2 id="dialog-title">${esc(f.name)}</h2><div class="concentration">${esc(f.concentration)} · ${esc(f.subfamily)}</div><p>${esc(f.description)}</p><div class="detail-actions"><button class="button small" data-add-owned="${f.id}">${isOwned(f.id)?'In My Collection ✓':'Add to My Collection'}</button><button class="button outline small detail-save" data-save="${f.id}" aria-label="${state.saved.includes(f.id)?'Unsave':'Save'} ${esc(f.name)}" aria-pressed="${state.saved.includes(f.id)}">${state.saved.includes(f.id)?'Saved to discoveries ✓':'Save for later'}</button>${compareToggle(f)}</div></div></div><div class="detail-body">${collectionNote}<h3>${f.notesUnavailable?'Note profile':f.notesAreFlat?'Key notes · order not specified':'The note journey'}</h3>${f.notesUnavailable?'<p class="data-note">Official notes are not verified; no note pyramid is inferred.</p>':f.notesAreFlat?`<div class="flat-notes">${tags(notesOf(f))}</div>`:`<div class="pyramid">${[['Opening',f.topNotes],['The heart',f.middleNotes],['The dry-down',f.baseNotes]].map(([name,notes])=>`<div class="note-tier"><span>${name}</span><p>${esc(notes.length?notes.join(', '):'Not supplied')}</p></div>`).join('')}</div>`}<div class="wear-grid"><div><h3>When it feels right</h3>${tags(f.weather)}</div><div><h3>Where it fits</h3>${tags(occasionsOf(f))}</div></div>${f.wearingRationale?`<p class="wearing-rationale">${esc(f.wearingRationale)}</p>`:''}<div class="performance"><span>The trail<b>${esc(f.sillage)}</b></span><span>Longevity<b>${esc(f.longevity)}</b></span><span>Season<b>${esc(f.seasons.length?f.seasons.join(' / '):'Not rated')}</b></span></div><p class="detail-source">Source: <a href="${esc(f.sourceUrl||'https://github.com/t3hj/Sillage/blob/main/catalogue/data/core.json')}" target="_blank" rel="noopener noreferrer">${esc(f.profileOrigin||'Sillage repository catalogue')} ↗</a>. Wearing guidance is subjective${f.estimated?.length?'; weather, occasion or strength tags may be estimated':''}. Notes describe a fragrance profile, not an ingredient or allergen list. ${photoCredit(f)}</p></div>`;
  if(!$('#detail').open)$('#detail').showModal();$('#detail').scrollTop=0;
}
function about() {
  $('#dialog-content').innerHTML=`<div class="dialog-head"><span>A NOTE ON SILLAGE</span><button class="close-dialog" data-close aria-label="Close about">×</button></div><div class="about"><p class="eyebrow">DISCOVERY, WITH INTENTION</p><h2 id="dialog-title">Your space for a little scent exploration.</h2><p>This explorer brings your Sillage collection-app concept to life, combining <a href="https://github.com/t3hj/Sillage" target="_blank" rel="noopener noreferrer">the Sillage repository catalogue</a> with additional sourced profiles. The collection starts empty; add the bottles you own. My Collection tracks ownership separately from bookmarks. Edits and additions made through this page stay on the current browser.</p><ul><li><b>Browse by instinct.</b> Search names, brands and notes, or combine weather and occasion filters. Note chips match any selected note.</li><li><b>Compare the details.</b> Select up to three scents to see their note journeys and wearing profiles side by side.</li><li><b>Set the scene.</b> Recommendations use current city weather or your manual scenario, your plans and an optional note. Choose or change your city in For your day. Matches explain their fit, with strong trails deprioritised for heat and shared spaces.</li><li><b>Keep a discovery.</b> Bookmarks stay on this browser. They are a separate discovery shortlist. Use My Collection to manage owned fragrances.</li></ul><p>Bottle photographs show real products, matched to the fragrance and concentration. Image credits are linked in each scent profile. A photo is left unavailable when the exact variant cannot be verified. Bottle size and packaging may vary. Some additional profiles are sourced from the repository’s Scento dataset (© Scento, CC BY 4.0). Their weather, occasion and strength tags are estimates. <a href="data-notice.html" target="_blank" rel="noopener noreferrer">Data credits ↗</a>. Qualitative wearing tags may not suit every wearer. Hosting access depends on your deployment settings; this source code does not provide authentication.</p></div>`;
  if(!$('#detail').open)$('#detail').showModal();$('#detail').scrollTop=0;
}
function dataBackup() {
  $('#dialog-content').innerHTML=`<div class="dialog-head"><span>YOUR DATA, WITH YOU</span><button class="close-dialog" data-close aria-label="Close backup settings">×</button></div><div class="owned-form-wrap backup-panel"><p class="eyebrow">DATA &amp; BACKUP</p><h2 id="dialog-title">Keep your scent wardrobe.</h2><p>Your collection edits, saved discoveries and day preferences live on this browser. They do not sync automatically. Download a backup before changing phones, browsers or clearing site data, then restore it here on the new device.</p><section><h3>Take a copy</h3><p>The JSON file includes your additions, edits, removals, saved discoveries and preferences. All your collection entries are included in this backup.</p><button class="button small" id="export-backup">Download backup ↓</button><p class="hint" id="backup-export-status" role="status"></p></section><section><h3>Bring a backup back</h3><p>Choose a backup exported by this explorer. You can review its contents before replacing this browser’s saved changes. Nothing is uploaded.</p><label class="form-field">Sillage backup file<input id="backup-file" type="file" accept="application/json,.json"></label><details><summary>Or paste backup JSON</summary><label class="form-field">Backup JSON<textarea id="backup-text" maxlength="2000000" rows="5" spellcheck="false" placeholder="Paste an exported Sillage explorer backup"></textarea></label><button class="button outline small" id="review-pasted-backup">Review backup</button></details><div id="backup-review" role="status" aria-live="polite"></div></section></div>`;
  let draft=null;
  const review=text=>{
    try {draft=parseBackup(text);const summary=backupSummary(draft,collectionSeed,catalogue);$('#backup-review').innerHTML=`<div class="backup-review"><h3>Ready to restore</h3><p>${summary.records} collection entries · ${summary.fragrances} fragrances · ${summary.saved} saved discoveries.</p><p>This replaces this browser’s collection changes, saved discoveries and day preferences. Download your current backup first if you want to keep it.</p><button class="button small" id="restore-backup">Replace browser data &amp; restore</button><button class="text-button" id="cancel-backup">Cancel</button></div>`;
      $('#restore-backup').addEventListener('click',()=>{
        try {restoreBackup(localStorage,draft);$('#backup-review').innerHTML='<p>Backup restored. Reopening your collection…</p>';location.hash='collection';location.reload();}
        catch(error){$('#backup-review').textContent=error.message;}
      });
      $('#cancel-backup').addEventListener('click',()=>{draft=null;$('#backup-review').textContent='Restore cancelled. Your data has not changed.';});
    } catch(error){draft=null;$('#backup-review').textContent=error.message;}
  };
  $('#export-backup').addEventListener('click',()=>{
    const data=makeBackup(collectionChanges,state.saved,{...state.context,weatherMode,location:weatherLocation,weather:manualWeather});
    const url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}));
    const link=document.createElement('a');link.href=url;link.download=`Sillage-backup-${new Date().toISOString().slice(0,10)}.json`;document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);
    $('#backup-export-status').textContent='Backup download started. Keep the file somewhere you can find it on your next device.';
  });
  $('#backup-file').addEventListener('change',async event=>{
    const file=event.target.files[0];if(!file)return;
    if(file.size>2_000_000){$('#backup-review').textContent='Choose a Sillage explorer backup smaller than 2 MB.';return;}
    try{review(await file.text());}catch{$('#backup-review').textContent='The file could not be read. Try again or paste its JSON.';}
  });
  $('#review-pasted-backup').addEventListener('click',()=>review($('#backup-text').value));
  if(!$('#detail').open)$('#detail').showModal();$('#detail').scrollTop=0;
}
function reset() {state.query='';state.notes=[];state.weather='';state.occasion='';state.category='all';state.limit=12;renderExplorer();}
document.addEventListener('click',e=>{
  const b=e.target.closest('button');if(!b)return;
  if(b.dataset.view) go(b.dataset.view);
  else if(b.dataset.go) {$('#detail').close();go(b.dataset.go);}
  else if(b.dataset.open) openDetail(b.dataset.open);
  else if(b.dataset.weatherMode) {weatherMode=b.dataset.weatherMode;if(weatherMode==='manual')state.context.weather=manualWeather;persistDay();renderRecommendations();if(weatherMode==='live')refreshWeather();}
  else if(b.hasAttribute('data-refresh-weather')) {weatherMode='live';persistDay();refreshWeather();}
  else if(b.hasAttribute('data-change-city')) {cityOpen=!cityOpen;++cityRequest;cityBusy=false;cityResults=[];cityError='';renderRecommendations();$('#city-query')?.focus();}
  else if(b.hasAttribute('data-city-index')) {const city=cityResults[Number(b.dataset.cityIndex)];if(city){weatherLocation=city;weatherSnapshot=null;cityOpen=false;cityResults=[];weatherMode='live';persistDay();refreshWeather(true);}}
  else if(b.dataset.recScope) {recommendationScope=b.dataset.recScope;renderRecommendations();}
  else if(b.dataset.ownedOpen) openOwnedDetail(b.dataset.ownedOpen);
  else if(b.dataset.editOwned) editOwned(b.dataset.editOwned);
  else if(b.hasAttribute('data-new-owned')) editOwned();
  else if(b.dataset.addOwned) addOwnedProfile(b.dataset.addOwned);
  else if(b.dataset.removeOwned) removeOwned(b.dataset.removeOwned);
  else if(b.hasAttribute('data-undo-owned')) undoOwned();
  else if(b.hasAttribute('data-reset-collection')) {collectionQuery='';collectionFilter='all';collectionGroup='';collectionOccasion='';collectionLimit=12;renderCollection();}
  else if(b.dataset.collectionFilter) {collectionFilter=b.dataset.collectionFilter;collectionLimit=12;renderCollection();}
  else if(b.dataset.compare) toggleCompare(b.dataset.compare);
  else if(b.dataset.save) toggleSaved(b.dataset.save);
  else if(b.hasAttribute('data-apply-filters')) {$('#filters').classList.remove('open');$('#filter-toggle').setAttribute('aria-expanded','false');$('#filter-toggle').focus();}
  else if(b.hasAttribute('data-reset')) reset();
  else if(b.dataset.note) {
    const note=b.dataset.note;state.notes=state.notes.includes(note)?state.notes.filter(n=>n!==note):[...state.notes,note];state.limit=12;b.classList.toggle('selected',state.notes.includes(note));b.setAttribute('aria-pressed',state.notes.includes(note));renderResults();
  }
  else if(b.dataset.category) {state.category=b.dataset.category;state.limit=12;document.querySelectorAll('[data-category]').forEach(el=>{el.classList.toggle('active',el.dataset.category===state.category);el.setAttribute('aria-pressed',el.dataset.category===state.category);});renderResults();}
  else if(b.hasAttribute('data-clear-compare')) {state.compare=[];render();}
  else if(b.hasAttribute('data-close')) $('#detail').close();
  else if(b.id==='about-button') about();
  else if(b.id==='data-button') dataBackup();
});
document.addEventListener('error',event=>{if(event.target instanceof HTMLImageElement&&event.target.classList.contains('bottle-photo')) event.target.parentElement.classList.add('image-failed');},true);
$('#detail').addEventListener('click',e=>{if(e.target===$('#detail')){const r=$('#detail').getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)$('#detail').close();}});
$('.brand').addEventListener('click',e=>{e.preventDefault();go('collection');});
window.addEventListener('hashchange',()=>{const view=location.hash.slice(1);if(views.includes(view)){state.view=view;render();window.scrollTo({top:0,behavior:'instant'});}});
try {
  const response=await fetch('./catalogue.json');if(!response.ok)throw Error('Catalogue unavailable');
  catalogue=await response.json();
  const [extraResponse,collectionResponse,wearingResponse]=await Promise.all([fetch('./catalogue-extra.json'),fetch('./collection.json'),fetch('./wearing.json')]);
  if(extraResponse.ok) {const extra=await extraResponse.json();const ids=new Set(catalogue.map(f=>f.id));for(const f of extra) if(!ids.has(f.id)) {catalogue.push(f);ids.add(f.id);}}
  if(wearingResponse.ok) catalogue=applyWearingGuidance(catalogue,await wearingResponse.json());
  if(collectionResponse.ok) collectionSeed=(await collectionResponse.json()).records||[];
  try {const photoResponse=await fetch('./photos.json');if(photoResponse.ok) photos=await photoResponse.json();} catch {}
  state.saved=state.saved.filter(id=>catalogue.some(f=>f.id===id));
  const view=location.hash.slice(1);if(views.includes(view))state.view=view;
  render();
  if(weatherMode==='live')refreshWeather();
  setInterval(()=>{if(document.visibilityState==='visible'&&weatherMode==='live')refreshWeather();},30*60*1000);
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'&&weatherMode==='live'&&(!weatherSnapshot||Date.now()-weatherSnapshot.fetchedAt>20*60*1000))refreshWeather();});
} catch(error) {
  $('#main').innerHTML='<div class="empty"><h1>The library needs a moment.</h1><p>The catalogue could not be loaded. Refresh to try again.</p><button class="button" id="retry">Try again</button></div>';
  $('#retry').addEventListener('click',()=>location.reload());
}
