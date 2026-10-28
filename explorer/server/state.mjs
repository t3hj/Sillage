import {validRecord} from '../dist/collection.mjs';
import {validJournal} from '../dist/journal.mjs';
export function validState(value){return !!value&&value.version===1&&Array.isArray(value.records)&&value.records.length<=5000&&value.records.every(r=>validRecord(r)&&r.id.length>0&&!['__proto__','constructor','prototype'].includes(r.id))&&new Set(value.records.map(r=>r.id)).size===value.records.length&&Array.isArray(value.saved)&&value.saved.length<=5000&&value.saved.every(id=>typeof id==='string'&&id.length>0&&id.length<=120)&&validJournal(value.journal);}
const json=(value,status=200)=>new Response(JSON.stringify(value),{status,headers:{'Content-Type':'application/json','Cache-Control':'private, no-store','Vary':'Cookie','X-Content-Type-Options':'nosniff'}});
export async function handleState(request,db,verifiedUserId) {
  if(!verifiedUserId)return json({error:'Sign in to sync your collection.'},401);
  if(!db)return json({error:'Account storage is unavailable.'},503);
  const read=()=>db.prepare('SELECT revision,payload,operation_id,updated_at FROM user_state WHERE user_id = ?').bind(verifiedUserId).first();
  if(request.method==='GET'){
    const row=await read();return json(row?{account:verifiedUserId,revision:row.revision,payload:JSON.parse(row.payload),updatedAt:row.updated_at}:{account:verifiedUserId,revision:0,payload:null});
  }
  if(request.method!=='PUT')return json({error:'Method not allowed.'},405);
  if(request.headers.get('Origin')!==new URL(request.url).origin)return json({error:'Use Sillage on its own website to save changes.'},403);
  if(!request.headers.get('Content-Type')?.includes('application/json'))return json({error:'Send a JSON state.'},415);
  const raw=await request.text();if(new TextEncoder().encode(raw).byteLength>1_800_000)return json({error:'This collection is too large to sync. Export a backup to keep all your data.'},413);
  let body;try{body=JSON.parse(raw);}catch{return json({error:'Invalid JSON.'},400);}
  if(!Number.isSafeInteger(body.revision)||body.revision<0||typeof body.operationId!=='string'||!body.operationId.length||body.operationId.length>120||!validState(body.payload))return json({error:'The saved data is incomplete or invalid.'},400);
  const now=new Date().toISOString(),payload=JSON.stringify(body.payload);
  const result=body.revision===0
    ?await db.prepare('INSERT INTO user_state (user_id,revision,payload,operation_id,updated_at) VALUES (?,1,?,?,?) ON CONFLICT(user_id) DO NOTHING').bind(verifiedUserId,payload,body.operationId,now).run()
    :await db.prepare('UPDATE user_state SET revision=revision+1,payload=?,operation_id=?,updated_at=? WHERE user_id=? AND revision=?').bind(payload,body.operationId,now,verifiedUserId,body.revision).run();
  if(result.meta?.changes)return json({revision:body.revision+1,updatedAt:now});
  const row=await read();
  if(row?.operation_id===body.operationId)return json({revision:row.revision,updatedAt:row.updated_at});
  return json({error:'Another device saved newer changes. Review both copies before replacing either one.',revision:row?.revision||0},409);
}
