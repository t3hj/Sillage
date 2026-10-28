export function cacheKind(request,scope) {
  const base=new URL(scope),url=new URL(request.url);
  if(request.method!=='GET'||url.origin!==base.origin||!url.pathname.startsWith(base.pathname))return 'bypass';
  const path=url.pathname.slice(base.pathname.length);
  if(/^(api(?:\/|$)|signin-with-chatgpt|signout-with-chatgpt|callback)/.test(path))return 'bypass';
  if(request.mode==='navigate')return 'navigation';
  if(path.startsWith('assets/bottles/'))return 'image';
  if(/^[a-z0-9-]+\.(mjs|js|css|svg|webmanifest)$/.test(path)||['catalogue.json','catalogue-extra.json','collection.json','wearing.json','photos.json','app-icon-192.png','app-icon-512.png'].includes(path))return 'asset';
  return 'bypass';
}
export async function cacheable(response,kind){
  if(!response.ok||response.redirected)return false;
  const type=response.headers.get('Content-Type')||'';
  if(kind==='navigation')return type.includes('text/html')&&(await response.clone().text()).includes('data-sillage-app');
  if(kind==='image')return type.startsWith('image/');
  return !type.includes('text/html')&&/javascript|json|css|image\/|manifest/.test(type);
}
export async function authenticationGate(response,kind){
  if(response.status===401||response.status===403)return true;
  return kind==='navigation'&&response.ok&&(response.headers.get('Content-Type')||'').includes('text/html')&&!(await response.clone().text()).includes('data-sillage-app');
}
