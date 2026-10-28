import {createRecordId} from './collection.mjs';
export const canonical=value=>JSON.stringify(value,(_,item)=>item&&typeof item==='object'&&!Array.isArray(item)?Object.fromEntries(Object.entries(item).sort(([a],[b])=>a.localeCompare(b))):item);
export class AccountSync {
  constructor({snapshot,apply,hasLocalEdits,storage,fetcher=(...args)=>globalThis.fetch(...args),onStatus=()=>{}}){Object.assign(this,{snapshot,apply,hasLocalEdits,storage,fetcher,onStatus});this.busy=false;this.conflict=null;this.timer=null;this.again=false;this.meta=null;try{const m=JSON.parse(storage.getItem('sillage-sync-meta-v1'));if(m&&Number.isSafeInteger(m.revision)&&typeof m.baseline==='string')this.meta=m;}catch{}}
  status(state,message){this.state=state;this.message=message;this.onStatus({state,message,remote:this.conflict});}
  changed(){clearTimeout(this.timer);this.timer=setTimeout(()=>this.run(),900);if(this.state!=='conflict')this.status('pending','Changes saved on this device · waiting to sync');}
  remember(revision,payload,account){this.meta={revision,baseline:canonical(payload),account};this.storage.setItem('sillage-sync-meta-v1',JSON.stringify(this.meta));}
  async request(method,body){const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),12000);try{
    const response=await this.fetcher('./api/state',{method,credentials:'same-origin',cache:'no-store',signal:controller.signal,...(body?{headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}:{})});
    if(response.status===401)throw Error('Sign in to sync. Changes remain on this device.');
    if(response.status===404)throw Error('Account sync is unavailable on this copy of Sillage. Changes remain on this device.');
    if(!response.headers?.get('Content-Type')?.includes('application/json'))throw Error('Sign in or reconnect to sync. Changes remain on this device.');
    const data=await response.json();if(response.status===409)return {conflict:true,...data};if(!response.ok)throw Error(data.error||'Sync is unavailable. Changes remain on this device.');return data;
  }finally{clearTimeout(timer);}}
  async push(remote,payload){const result=await this.request('PUT',{revision:remote.revision,operationId:createRecordId(),payload});if(result.conflict){this.conflict=await this.request('GET');this.status('conflict','Another device saved changes. Review both copies in Data & backup.');return;}
    this.remember(result.revision,payload,remote.account);this.status('synced','Saved to your account');if(canonical(this.snapshot())!==this.meta.baseline)this.again=true;
  }
  async run(){if(this.busy){this.again=true;return;}if(this.conflict)return;
    this.busy=true;this.status('syncing','Syncing your collection…');
    try{const remote=await this.request('GET'),local=this.snapshot(),same=remote.payload&&canonical(remote.payload)===canonical(local);
      if(same){this.remember(remote.revision,local,remote.account);this.status('synced','Saved to your account');}
      else if(this.meta?.account&&remote.account!==this.meta.account){this.conflict=remote;this.status('conflict','This browser has data from another account. Review both copies in Data & backup.');}
      else if(!remote.payload){if(this.meta&&canonical(local)===this.meta.baseline&&this.meta.revision>0){this.conflict=remote;this.status('conflict','The account copy changed. Review both copies before saving.');}else await this.push(remote,local);}
      else if((!this.meta&&!this.hasLocalEdits())||(this.meta&&canonical(local)===this.meta.baseline)){await this.apply(remote.payload);this.remember(remote.revision,remote.payload,remote.account);this.status('synced','Updated from your account');}
      else if(this.meta&&remote.revision===this.meta.revision)await this.push(remote,local);
      else{this.conflict=remote;this.status('conflict','Both copies have changes. Review them in Data & backup.');}
    }catch(error){this.status('offline',error.name==='AbortError'?'Sync timed out. Changes remain on this device.':error instanceof TypeError?'Unable to connect. Changes remain on this device.':error.message);}
    finally{this.busy=false;if(this.again&&!this.conflict){this.again=false;this.changed();}}
  }
  async resolve(choice){if(!this.conflict||this.busy)return;this.busy=true;try{const latest=await this.request('GET');
      if(latest.revision!==this.conflict.revision){this.conflict=latest;this.status('conflict','The account copy changed again. Review the latest copy.');return;}
      if(choice==='cloud'){const payload=latest.payload||{version:1,records:[],saved:[],journal:{version:1,ratings:{},entries:[]}};await this.apply(payload);this.remember(latest.revision,payload,latest.account);this.conflict=null;this.status('synced','Using your account copy');}
      else if(choice==='device'){this.conflict=null;await this.push(latest,this.snapshot());}
    }catch(error){this.status('offline',error.message);}finally{this.busy=false;}
  }
}
