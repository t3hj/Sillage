export const notesOf = f => [...f.topNotes, ...f.middleNotes, ...f.baseNotes];
export const normalise = s => String(s??'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[’'`]/g,'').replace(/[^a-z0-9]+/g,' ').trim();
function oneEditApart(a,b) {
  if(Math.abs(a.length-b.length)>1)return false;
  let i=0,j=0,edits=0;
  while(i<a.length&&j<b.length){
    if(a[i]===b[j]){i++;j++;continue;}
    if(++edits>1)return false;
    if(a.length>=b.length)i++;
    if(b.length>=a.length)j++;
  }
  return edits+(i<a.length||j<b.length?1:0)<=1;
}
export function matchesSearch(text,query) {
  const haystack=normalise(text),tokens=haystack.split(/\s+/);
  return normalise(query).split(/\s+/).filter(Boolean).every(word=>haystack.includes(word)||(word.length>=4&&tokens.some(token=>token.length>=4&&oneEditApart(word,token))));
}
export const occasionsOf = f => [...new Set(f.occasions.map(o => o === 'Date' ? 'Date Night' : o))];
export function applyWearingGuidance(data, guidance={}) {
  return data.map(f=>guidance[f.id]?{...f,...guidance[f.id],estimated:[...new Set([...(f.estimated||[]),'weather','occasions','sillage','intensity','seasons'])]}:f);
}
export const categories = {
  all: () => true,
  fresh: f => ['Fresh','Citrus','Aquatic'].includes(f.family),
  woody: f => ['Woody','Chypre','Leather'].includes(f.family),
  amber: f => ['Amber','Oriental','Gourmand'].includes(f.family),
  floral: f => ['Floral','Fougère'].includes(f.family)
};
export function filterFragrances(data, {query='', notes=[], weather='', occasion='', category='all', saved=[]}={}) {
  return data.filter(f => {
    const text = [f.name, f.brand, f.concentration, f.family, f.subfamily, ...notesOf(f)].join(' ');
    return matchesSearch(text,query)
      && (!notes.length || notes.some(n => notesOf(f).includes(n)))
      && (!weather || f.weather.includes(weather))
      && (!occasion || occasionsOf(f).includes(occasion))
      && (category==='saved' ? saved.includes(f.id) : (categories[category] || categories.all)(f));
  });
}
export function rankFragrances(data, {weather='Cool', occasion='Work', note='', weatherTags=[], temperature=null, dayKey=''}={}) {
  const quiet = ['Work','University','Gym'].includes(occasion);
  const hot = weather==='Hot' || (Number.isFinite(temperature)&&temperature>=25);
  const dailyOrder=id=>{let hash=0;for(const c of dayKey+id)hash=(hash*31+c.charCodeAt(0))>>>0;return hash;};
  return data.map(f => {
    let score = 0;
    const reasons = [];
    const weatherMatch = f.weather.includes(weather);
    const occasionMatch = occasionsOf(f).includes(occasion);
    const noteMatch = note && notesOf(f).includes(note);
    const conditionMatch=weatherTags.find(tag=>tag!==weather&&f.weather.includes(tag));
    if(weatherMatch) { score += 4; reasons.push(`Suited to ${weather.toLowerCase()} weather`); }
    if(occasionMatch) { score += 6; reasons.push(`Suited to ${occasion.toLowerCase()}`); }
    else score-=3;
    if(noteMatch) { score += 3; reasons.push(`${note} in the note profile`); }
    if(conditionMatch) {score+=1;reasons.push(`Also suits ${conditionMatch.toLowerCase()} conditions`);}
    const strong=['Strong','Very Strong'].includes(f.sillage);
    let caution='';
    if(quiet) {
      if(['Light','Moderate'].includes(f.sillage)) {score += 2; reasons.push('A softer trail for shared spaces');}
      else if(strong) {score -= f.sillage==='Very Strong' ? 8 : 4;caution='Apply lightly in shared spaces.';}
      if(occasion==='Gym' && f.intensity==='Light') {score += 2;}
      if(occasion==='Gym'&&strong){score-=6;caution='Too strong for a typical gym setting; a lighter option is preferable.';}
    }
    if(hot&&strong){score-=f.sillage==='Very Strong'?10:6;caution='A rich, strong trail may feel heavy in this heat.';}
    if(!reasons.length) reasons.push('An alternative to explore beyond this setting');
    const label = caution ? 'Use with care' : weatherMatch && occasionMatch && (!note || noteMatch) ? 'Strong match' : (weatherMatch && occasionMatch ? 'Good match' : 'Alternative');
    return {f, score, reasons:reasons.slice(0,3), caution, label, weatherMatch, occasionMatch, noteMatch:!!noteMatch};
  }).sort((a,b) => b.score - a.score || (dayKey?dailyOrder(a.f.id)-dailyOrder(b.f.id):0) || a.f.name.localeCompare(b.f.name));
}
