import {respond,readSheet,configurations,publicOptions} from './_shared.mjs';
export async function handler(event){try{
 if(event.httpMethod!=='GET')return respond(405,{error:'Method not allowed'});
 const data=await readSheet();const models=configurations(data).map(m=>({...m,review:undefined,variants:m.variants.map(v=>({...v,options:publicOptions(data,data.outboards.find(x=>x.Model===m.id),v.id)}))}));
 return respond(200,{models,groups:[{label:'20–40HP',min:20,max:40},{label:'50–70HP',min:50,max:70},{label:'75–130HP',min:75,max:130},{label:'150–200HP',min:150,max:200},{label:'225–350HP',min:225,max:350}]});
 }catch(e){console.error('catalog',e.message);return respond(503,{error:'The outboard catalogue is temporarily unavailable.'})}}
