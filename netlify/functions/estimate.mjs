import {respond,readSheet,selections,firstServiceCredit} from './_shared.mjs';
export async function handler(event){try{
 if(event.httpMethod!=='POST')return respond(405,{error:'Method not allowed'});
 const b=JSON.parse(event.body||'{}');const data=await readSheet();
 const x=selections(data,String(b.motorId||''),String(b.rigId||''),String(b.control||''),String(b.gauge||''),Array.isArray(b.extras)?b.extras:[]);
 return respond(200,{estimate:x.price,rebateApplied:x.rebateApplied,firstServiceCredit:firstServiceCredit(data,x.model.HP),currency:'AUD',notice:'Indicative fitted price only. Subject to inspection and formal quotation.'});
 }catch(e){return respond(400,{error:e.message})}}
