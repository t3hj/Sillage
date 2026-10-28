export function locationError(error) {
  return ({1:'Location access was declined. Allow it in your browser settings, or choose a town manually.',2:'Your device could not find a location. Try again outdoors or choose a town manually.',3:'Finding your location took too long. Try again or choose a town manually.'})[error?.code] || 'Current location is unavailable. You can still choose a town manually.';
}
export function devicePosition(geolocation=globalThis.navigator?.geolocation) {
  return new Promise((resolve,reject)=>{
    if(!geolocation?.getCurrentPosition){reject(Error(locationError()));return;}
    geolocation.getCurrentPosition(position=>{
      const {latitude,longitude,accuracy}=position.coords||{};
      if(!Number.isFinite(latitude)||Math.abs(latitude)>90||!Number.isFinite(longitude)||Math.abs(longitude)>180){reject(Error(locationError()));return;}
      resolve({name:'Current location',latitude:Math.round(latitude*1000)/1000,longitude:Math.round(longitude*1000)/1000,accuracyM:Number.isFinite(accuracy)?Math.round(accuracy):null});
    },error=>reject(Error(locationError(error))),{enableHighAccuracy:true,timeout:12000,maximumAge:0});
  });
}
export async function locationPermissionGranted(permissions=globalThis.navigator?.permissions) {
  try{return (await permissions?.query({name:'geolocation'}))?.state==='granted';}catch{return false;}
}
export async function nameDevicePosition(position,fetcher=fetch) {
  // Called only with a position freshly supplied by this device, never a stored city.
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),8000);
  try{
    const params=new URLSearchParams({latitude:String(position.latitude),longitude:String(position.longitude),localityLanguage:'en'});
    const response=await fetcher('https://api.bigdatacloud.net/data/reverse-geocode-client?'+params,{signal:controller.signal});
    if(!response.ok)throw Error('Area name unavailable');
    const data=await response.json();
    const text=value=>typeof value==='string'?value.trim().slice(0,99):'';
    return {...position,name:text(data.locality)||text(data.city)||'Current location',admin1:text(data.principalSubdivision),country:text(data.countryName)};
  }finally{clearTimeout(timer);}
}
