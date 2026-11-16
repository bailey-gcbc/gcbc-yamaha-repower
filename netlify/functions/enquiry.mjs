import {respond,readSheet,selections} from './_shared.mjs';
const clean=(v,n=300)=>String(v||'').trim().slice(0,n);
export async function handler(event){try{
 if(event.httpMethod!=='POST')return respond(405,{error:'Method not allowed'});
 if(process.env.ENABLE_ENQUIRIES!=='true')return respond(503,{error:'Enquiries are not enabled yet.'});
 if(!process.env.RESEND_API_KEY||!process.env.ENQUIRY_FROM_EMAIL||!process.env.ENQUIRY_TO_EMAIL)return respond(503,{error:'Enquiry delivery is not configured.'});
 const b=JSON.parse(event.body||'{}');if(b.website)return respond(200,{ok:true});
 const first=clean(b.first,80),last=clean(b.last,80),phone=clean(b.phone,40),email=clean(b.email,160),suburb=clean(b.suburb,100);
 if(!first||!last||!/^\+?[0-9 ()-]{8,20}$/.test(phone)||!/^\S+@\S+\.\S+$/.test(email)||!suburb||b.rated!==true||b.install!==true)return respond(400,{error:'Please complete all required fields and acknowledgements.'});
 const data=await readSheet();const x=selections(data,clean(b.motorId),clean(b.rigId),clean(b.control),clean(b.gauge),Array.isArray(b.extras)?b.extras:[]);
 const lines=[['Name',first+' '+last],['Mobile',phone],['Email',email],['Suburb',suburb],['Boat',clean(b.boat,200)],['Notes',clean(b.notes,2000)],['Motor',x.model.Model],['Horsepower',x.model.HP],['Rigging',x.rig.ID],['Controls',b.control],['Gauges',b.gauge],['Options',x.optionIds.join(', ')||'None'],['Indicative total (AUD)',x.price],['HP rating confirmed','Yes'],['GCBC installation acknowledged','Yes']];
 const html='<h2>GCBC Yamaha Repower enquiry</h2><table>'+lines.map(([k,v])=>'<tr><th style="text-align:left;padding:6px">'+escapeHtml(k)+'</th><td style="padding:6px">'+escapeHtml(String(v))+'</td></tr>').join('')+'</table>';
 const sent=await fetch('https://api.resend.com/emails',{method:'POST',headers:{authorization:'Bearer '+process.env.RESEND_API_KEY,'content-type':'application/json'},body:JSON.stringify({from:process.env.ENQUIRY_FROM_EMAIL,to:[process.env.ENQUIRY_TO_EMAIL],reply_to:email,subject:'New Yamaha Repower enquiry: '+x.model.Model,html}),signal:AbortSignal.timeout(12000)});
 if(!sent.ok){console.error('email delivery failed',sent.status);return respond(502,{error:'Unable to send your enquiry. Please contact GCBC directly.'})}
 return respond(200,{ok:true,message:'Your enquiry has been sent to Gold Coast Boating Centre.'});
 }catch(e){console.error('enquiry',e.message);return respond(400,{error:'Unable to process your enquiry. Please check your selections.'})}}
function escapeHtml(s){return s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
