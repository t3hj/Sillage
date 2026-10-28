export class OfflineSupport {
  constructor(onStatus=()=>{}){this.onStatus=onStatus;this.prompt=null;this.registration=null;this.updating=false;this.status={message:'Preparing offline access…',installable:false,update:false};}
  update(values){Object.assign(this.status,values);this.onStatus({...this.status});}
  async start(){
    if(!globalThis.isSecureContext||!navigator.serviceWorker){this.update({message:'Offline installation is available when you open Sillage over HTTPS.'});return;}
    window.addEventListener('beforeinstallprompt',event=>{event.preventDefault();this.prompt=event;this.update({installable:true});});
    window.addEventListener('appinstalled',()=>{this.prompt=null;this.update({installable:false,message:'Sillage is installed. Your offline copy stays on this device.'});});
    navigator.serviceWorker.addEventListener('controllerchange',()=>{if(this.updating)location.reload();});
    try{
      this.registration=await navigator.serviceWorker.register('./sw.js',{type:'module',updateViaCache:'none'});
      const watch=()=>{if(this.registration.waiting)this.update({update:true});};watch();
      const watchWorker=worker=>worker?.addEventListener('statechange',()=>{watch();if(worker.state==='redundant')this.update({message:'The offline copy could not be prepared. Keep using Sillage online and try again later.'});});watchWorker(this.registration.installing);
      this.registration.addEventListener('updatefound',()=>watchWorker(this.registration.installing));
      let timer;try{await Promise.race([navigator.serviceWorker.ready,new Promise((resolve,reject)=>{timer=setTimeout(()=>reject(Error('Offline preparation timed out')),30000);})]);}finally{clearTimeout(timer);}this.update({message:'Ready for offline use. Viewed bottle images are saved as you browse.'});
    }catch{this.update({message:'The offline copy could not be prepared. Keep using Sillage online and try again later.'});}
  }
  async install(){if(!this.prompt)return;const prompt=this.prompt;this.prompt=null;await prompt.prompt();await prompt.userChoice;this.update({installable:false});}
  applyUpdate(){if(this.registration?.waiting){this.updating=true;this.registration.waiting.postMessage({type:'APPLY_UPDATE'});}}
}
