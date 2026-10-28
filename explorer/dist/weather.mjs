export const defaultLocation={name:'London',country:'United Kingdom',admin1:'England',latitude:51.5074,longitude:-0.1278,timezone:'Europe/London'};
export function validLocation(value) {
  return !!value && typeof value.name==='string' && value.name.length>0 && value.name.length<100
    && Number.isFinite(value.latitude)&&Math.abs(value.latitude)<=90
    && Number.isFinite(value.longitude)&&Math.abs(value.longitude)<=180;
}
export function temperatureBand(celsius) {
  if(!Number.isFinite(celsius)) throw Error('Temperature unavailable');
  return celsius<10?'Cold':celsius<15?'Cool':celsius<20?'Mild':celsius<25?'Warm':'Hot';
}
export function conditionLabel(code) {
  if(code===0)return 'Clear';
  if(code<=3)return ['','Mostly clear','Partly cloudy','Overcast'][code]||'Cloudy';
  if([45,48].includes(code))return 'Foggy';
  if(code>=51&&code<=57)return 'Drizzle';
  if(code>=61&&code<=67)return 'Rain';
  if(code>=71&&code<=77)return 'Snow';
  if(code>=80&&code<=82)return 'Rain showers';
  if(code===85||code===86)return 'Snow showers';
  if(code>=95)return 'Thunderstorms';
  return 'Current conditions';
}
export function contextFromWeather(snapshot) {
  const current=snapshot.current;
  const weather=temperatureBand(current.temperature_2m);
  const code=current.weather_code;
  const tags=[weather];
  if((code>=51&&code<=67)||(code>=80&&code<=82)||code>=95||current.precipitation>0.05)tags.push('Rainy');
  if(current.relative_humidity_2m>=80&&current.temperature_2m>=20)tags.push('Humid');
  if(current.relative_humidity_2m<40)tags.push('Dry');
  return {weather,weatherTags:tags,temperature:current.temperature_2m,dayKey:String(current.time||'').slice(0,10)};
}
export function weatherIsFresh(snapshot,now=Date.now()) {
  return !!snapshot&&Number.isFinite(snapshot.fetchedAt)&&now-snapshot.fetchedAt>=0&&now-snapshot.fetchedAt<3*60*60*1000;
}
async function fetchJSON(url,fetcher=fetch) {
  const controller=new AbortController();const timeout=setTimeout(()=>controller.abort(),12000);
  try {const response=await fetcher(url,{signal:controller.signal});if(!response.ok)throw Error('Weather service unavailable');return await response.json();}
  finally {clearTimeout(timeout);}
}
export async function fetchWeather(location,fetcher=fetch) {
  if(!validLocation(location))throw Error('Choose a city first');
  const params=new URLSearchParams({latitude:String(location.latitude),longitude:String(location.longitude),current:'temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code',daily:'temperature_2m_max,temperature_2m_min',timezone:'auto',forecast_days:'1'});
  const data=await fetchJSON('https://api.open-meteo.com/v1/forecast?'+params,fetcher);
  if(!data.current||!Number.isFinite(data.current.temperature_2m)||typeof data.current.time!=='string')throw Error('Current weather unavailable');
  return {current:data.current,daily:data.daily||{},timezone:data.timezone||location.timezone||'UTC',fetchedAt:Date.now()};
}
export async function searchLocations(query,fetcher=fetch) {
  const name=String(query).trim();if(name.length<2)return [];
  const data=await fetchJSON('https://geocoding-api.open-meteo.com/v1/search?'+new URLSearchParams({name,count:'5',language:'en',format:'json'}),fetcher);
  return (data.results||[]).filter(validLocation).map(({name,country='',admin1='',latitude,longitude,timezone='UTC'})=>({name,country,admin1,latitude,longitude,timezone}));
}
