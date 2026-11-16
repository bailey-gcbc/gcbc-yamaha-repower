export const respond=(status,body)=>({statusCode:status,headers:{'content-type':'application/json','cache-control':'no-store','x-content-type-options':'nosniff'},body:JSON.stringify(body)});
export async function readSheet(){
 if(!process.env.SHEETS_WEBAPP_URL||!process.env.SHEETS_API_SECRET)throw Error('Pricing connection is not configured');
 const res=await fetch(process.env.SHEETS_WEBAPP_URL,{method:'POST',headers:{'content-type':'text/plain;charset=utf-8'},body:JSON.stringify({secret:process.env.SHEETS_API_SECRET,action:'read'}),redirect:'follow',signal:AbortSignal.timeout(12000)});
 if(!res.ok)throw Error('Google Sheets unavailable');const data=await res.json();if(!data.ok)throw Error('Google Sheets rejected request');return data;
}
export const parseIds=s=>String(s||'').split('|').map(x=>x.trim()).filter(Boolean);
export function configurations(data){
 const rigs=new Map(data.rigging.map(r=>[String(r.ID),r]));
 return data.outboards.filter(m=>m.Model&&m['Motor sale AUD']!==''&&m['Motor sale AUD']!=null&&Number(m.HP)>=20&&m.Model!=='F15').map(m=>{
 const ids=parseIds(m['Rigging IDs']);const variants=ids.map(id=>({id,operation:String(rigs.get(id)?.Operation||'')})).filter(r=>rigs.has(r.id));
 return {id:String(m.Model),hp:Number(m.HP),technology:String(m.Technology||''),variants,image:`/images/motors/${encodeURIComponent(String(m.Model))}.jpg`,review:String(m.Status||'')};
 });
}
export function allowed(data,model,rig){const r=data.rigging.find(x=>String(x.ID)===rig);return r&&parseIds(model['Rigging IDs']).includes(rig)?r:null}
export function optionsFor(data,model,rig){return data.options.filter(o=>String(o['Website behaviour']).toLowerCase()!=='tba'&&String(o.Category)!=='Assessment only'&&parseIds(o['Applies to IDs or models']).some(x=>x===rig||x===String(model.Model)));}
// Promotions are applied server-side only. Google Sheets Date cells arrive as ISO timestamps.
// All expiry checks use the Australia/Brisbane calendar date, inclusive of the end date.
function brisbaneToday(){return new Intl.DateTimeFormat('en-CA',{timeZone:'Australia/Brisbane',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());}
function expiryDate(value){
 if(value==null||value==='')return null;
 const raw=String(value).trim();
 let m=raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
 if(m)return validDate(+m[1],+m[2],+m[3]);
 m=raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
 if(m)return validDate(+m[3],+m[2],+m[1]);
 // JSON serialization of a Sheets date: 2027-01-30T14:00:00.000Z
 if(/^\d{4}-\d{2}-\d{2}T/.test(raw)){
  const date=new Date(raw);if(!Number.isFinite(date.getTime()))return null;
  return new Intl.DateTimeFormat('en-CA',{timeZone:'Australia/Brisbane',year:'numeric',month:'2-digit',day:'2-digit'}).format(date);
 }
 return null;
}
function validDate(y,m,d){
 const date=new Date(Date.UTC(y,m-1,d));
 return date.getUTCFullYear()===y&&date.getUTCMonth()===m-1&&date.getUTCDate()===d
  ? `${String(y).padStart(4,'0')}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`:null;
}
export function applicableRebate(data,motorId){
 const today=brisbaneToday();
 const matches=(data.promotions||[]).filter(p=>String(p.Model||'').trim()===motorId&&String(p['Enabled?']||'').trim().toLowerCase()==='yes');
 // Fail closed on ambiguous overlapping promotions, rather than double-discounting.
 if(matches.length!==1)return 0;
 const p=matches[0], end=expiryDate(p['End Date']);
 if(!end||end<today)return 0;
 const adjustment=Number(p['Adjustment AUD']);
 return Number.isFinite(adjustment)&&adjustment<0?adjustment:0;
}
export function selections(data,motorId,rigId,control,gauge,extras){
 const m=data.outboards.find(x=>String(x.Model)===motorId);if(!m)throw Error('Unknown model');
 const r=allowed(data,m,rigId);if(!r)throw Error('Invalid rigging selection');
 const tiller=String(r.Operation).toLowerCase()==='tiller';
 if(['F20LWPHB','F20-MANUAL-TBC'].includes(motorId)&&!tiller)throw Error('F20 is tiller only');
 if(Number(m.HP)===25&&!tiller)throw Error('F25 is tiller only');
 const choices=optionsFor(data,m,rigId);const controls=choices.filter(o=>o.Category==='Control');const gauges=choices.filter(o=>o.Category==='Gauge');
 const allowedControl=['standard',...controls.map(o=>String(o.ID))];const allowedGauge=['standard',...gauges.map(o=>String(o.ID))];
 if(tiller&&(control!=='none'||gauge!=='none'))throw Error('Tiller cannot use remote controls or gauges');
 if(!tiller&&(!allowedControl.includes(control)||!allowedGauge.includes(gauge)))throw Error('Invalid control or gauge');
 const ids=[...(tiller?[]:[control,gauge]),...(extras||[])].filter(x=>x!=='standard'&&x!=='none');
 if(new Set(ids).size!==ids.length)throw Error('Duplicate options');
 const selected=ids.map(id=>choices.find(o=>String(o.ID)===id));if(selected.some(x=>!x))throw Error('Invalid option');
 if(ids.includes('AP3')&&ids.includes('AP4'))throw Error('Autopilot and joystick are mutually exclusive');
 let price=Number(m['Motor sale AUD'])+Number(r['Sale AUD']);if(!Number.isFinite(price))throw Error('Missing pricing');
 for(const o of selected){let q=String(o.ID)==='SUPL'&&Number(m.HP)>=300?2:1;price+=Number(o['Sale AUD'])*q;}
 if(!Number.isFinite(price))throw Error('Invalid pricing');
 const rebate=applicableRebate(data,motorId);
 if(price+rebate<=0)throw Error('Invalid promotional pricing');
 price=Math.round((price+rebate)*100)/100;
 return {price,rebateApplied:rebate<0,model:m,rig:r,optionIds:ids,tiller};
}
export function publicOptions(data,model,rigId){const list=optionsFor(data,model,rigId);return list.map(o=>({id:String(o.ID),label:String(o['Option / upgrade']),category:String(o.Category),image:`/images/options/${encodeURIComponent(String(o.ID))}.jpg`,note:String(o.Notes||'')}));}
