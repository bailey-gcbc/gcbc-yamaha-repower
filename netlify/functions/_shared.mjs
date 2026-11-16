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
 return {price,model:m,rig:r,optionIds:ids,tiller};
}
export function publicOptions(data,model,rigId){const list=optionsFor(data,model,rigId);return list.map(o=>({id:String(o.ID),label:String(o['Option / upgrade']),category:String(o.Category),image:`/images/options/${encodeURIComponent(String(o.ID))}.jpg`,note:String(o.Notes||'')}));}
