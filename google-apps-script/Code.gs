/** Deploy as Web App: Execute as Me; access Anyone. Requests require secret. */
function doPost(e) {
 try {
   var body=JSON.parse((e.postData||{}).contents||'{}');
   var secret=PropertiesService.getScriptProperties().getProperty('GCBC_API_SECRET');
   if(!secret||body.secret!==secret||body.action!=='read')throw new Error('Unauthorized');
   var book=SpreadsheetApp.getActiveSpreadsheet();
   var tabs={'outboards':'Outboards','rigging':'Rigging Packages','options':'Upgrades & Options','promotions':'Promotions'};
   var result={ok:true};
   Object.keys(tabs).forEach(function(k){
     var sheet=book.getSheetByName(tabs[k]);if(!sheet)throw new Error('Missing tab: '+tabs[k]);
     var rows=sheet.getDataRange().getValues();var headers=rows.shift();
     result[k]=rows.filter(function(r){return r[0]!==''}).map(function(r){
       var obj={};headers.forEach(function(h,i){if(h)obj[String(h)]=r[i]});return obj;
     });
   });
   return json(result);
 }catch(err){return json({ok:false,error:'Unauthorized or unavailable'});}
}
function json(obj){return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON)}
