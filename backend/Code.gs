/** Configure Script Properties: SHEET_ID, ADMIN_EMAIL, REGISTRATION_OPEN,
 * CONSENT_VERSION. Keep REGISTRATION_OPEN false until acceptance is complete.
 * Public endpoint never exposes records. Run setup() once as the owner. */
const FOLDER_ID = '1ouGXc0d-3iIANtWskI8l14NjLfAqjwhR';
const HEADERS = ['編號','建立時間','請求ID','資料指紋','營隊ID','營隊名稱','方案ID','方案名稱','日期','費用','早托日期','孩子姓名','年級','學校','家長','電話','Email','緊急聯絡人','緊急電話','飲食過敏','備註','推薦人','經驗','組裝能力','同意版本','同意時間','戶外告知','處理狀態','家長信狀態','家長信次數','家長信時間','家長信錯誤','管理員信狀態','管理員信次數','管理員信時間','管理員信錯誤'];
function setup(){
 const props=PropertiesService.getScriptProperties();
 if(!props.getProperty('SENDER_EMAIL'))props.setProperty('SENDER_EMAIL','teacher_lu@creativstacks.info');
 let ss;if(props.getProperty('SHEET_ID'))ss=SpreadsheetApp.openById(props.getProperty('SHEET_ID'));
 else {ss=SpreadsheetApp.create('2027冬令營｜私人報名管理');DriveApp.getFileById(ss.getId()).moveTo(DriveApp.getFolderById(FOLDER_ID));props.setProperty('SHEET_ID',ss.getId());}
 let sheet=ss.getSheetByName('報名紀錄')||ss.insertSheet('報名紀錄');if(sheet.getLastRow()===0){sheet.appendRow(HEADERS);sheet.setFrozenRows(1);sheet.getRange(1,1,1,HEADERS.length).setFontWeight('bold');}
 if(!props.getProperty('REGISTRATION_OPEN'))props.setProperty('REGISTRATION_OPEN','false');
 if(!ScriptApp.getProjectTriggers().some(t=>t.getHandlerFunction()==='processNotifications'))ScriptApp.newTrigger('processNotifications').timeBased().everyMinutes(5).create();
 console.log('Setup complete; verify sharing is Restricted. Registration remains closed.');
}
function doGet(){return json_({ok:true,service:'camp2027',open:PropertiesService.getScriptProperties().getProperty('REGISTRATION_OPEN')==='true'});}
function json_(v){return ContentService.createTextOutput(JSON.stringify(v)).setMimeType(ContentService.MimeType.JSON);}
function safe_(v){const s=String(v==null?'':v);return /^[=+@\-\t\r\n]/.test(s)?"'"+s:s;}
function validate_(v){
 if(!v||typeof v!=='object')throw Error('無效資料');
 if(!/^[a-f0-9-]{36}$/i.test(v.requestId||''))throw Error('請求識別碼無效');
 for(const k of ['child','parent','phone','email','emergencyName','emergencyPhone'])if(typeof v[k]!=='string'||!v[k].trim()||v[k].length>120)throw Error('請補齊聯絡資料');
 for(const k of ['school','referral','diet','notes'])if(typeof v[k]!=='string'||v[k].length>500)throw Error('欄位內容過長或格式錯誤');
 if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.email))throw Error('Email 格式錯誤');
 if(!/^[0-9+() -]{8,20}$/.test(v.phone)||!/^[0-9+() -]{8,20}$/.test(v.emergencyPhone))throw Error('電話格式錯誤');
 if(!['none','some'].includes(v.experience))throw Error('經驗選項錯誤');
 const c=CAMPS.find(c=>c.id===v.camp),p=c&&c.plans.find(p=>p.id===v.plan);if(!p)throw Error('營隊與方案不符');
 const grade=Number(v.grade);if(!String(v.grade).match(/^[0-7]$/)||(!c.grades.includes(grade)&&!(c.id==='rc'&&v.ability===true)))throw Error('不符合營隊參加資格');
 if(v.privacy!==true||v.rules!==true||(c.id==='rc'&&v.outdoor!==true))throw Error('請閱讀並確認必要事項');
 if(!Array.isArray(v.early)||new Set(v.early).size!==v.early.length||v.early.some(d=>!c.dates.includes(d)))throw Error('早托日期錯誤');
 const now=Utilities.formatDate(new Date(),'Asia/Taipei','yyyy-MM-dd');if(now>=c.dates[0])throw Error('本梯次已停止網路收件');
 return {c,p,total:p.price+v.early.length*100};
}
function doPost(e){
 let lock,writing=false;
 try{
 const props=PropertiesService.getScriptProperties();
 if(!e.postData||e.postData.contents.length>12000)return json_({ok:false,saved:false,message:'資料格式錯誤'});
 const v=JSON.parse(e.postData.contents),valid=validate_(v),c=valid.c,p=valid.p;
 const normalized=JSON.stringify([v.camp,v.plan,v.early.slice().sort(),v.child,v.grade,v.school,v.parent,v.phone,v.email,v.emergencyName,v.emergencyPhone,v.diet,v.notes,v.referral,v.experience,v.ability,v.privacy,v.rules,v.outdoor,v.consentVersion]);
 const fingerprint=Utilities.base64Encode(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,normalized));
 lock=LockService.getScriptLock();if(!lock.tryLock(10000))return json_({ok:false,message:'系統忙碌，請使用相同資料重試。'});
 const sheet=SpreadsheetApp.openById(props.getProperty('SHEET_ID')).getSheetByName('報名紀錄'),rows=sheet.getDataRange().getValues();
 const existing=rows.slice(1).find(r=>r[2]===v.requestId);
 if(existing){if(existing[3]!==fingerprint)return json_({ok:false,message:'相同請求的資料已更動，請聯絡老師核對。'});return json_({ok:true,registrationId:existing[0],campName:existing[5],dateLabel:existing[8],planName:existing[7],total:existing[9]});}
 if(props.getProperty('REGISTRATION_OPEN')!=='true')return json_({ok:false,saved:false,message:'目前尚未開放或已暫停收件，請透過 LINE 洽詢。'});
 if(v.consentVersion!==props.getProperty('CONSENT_VERSION'))return json_({ok:false,saved:false,message:'規則版本已更新，請重新整理並閱讀。'});
 const recent=rows.slice(1).filter(r=>String(r[16]).replace(/^'/,'')===v.email&&new Date()-new Date(r[1])<3600000);if(recent.length>=3)return json_({ok:false,saved:false,message:'短時間內已有多筆資料，請聯絡老師確認。'});
 const id='W27-'+Utilities.getUuid().slice(0,8).toUpperCase(),now=new Date().toISOString();
 const row=[id,now,v.requestId,fingerprint,c.id,c.name,p.id,p.name,c.dates.join(', '),valid.total,v.early.join(', '),v.child,String(v.grade),v.school,v.parent,v.phone,v.email,v.emergencyName,v.emergencyPhone,v.diet,v.notes,v.referral,v.experience,String(v.ability===true),v.consentVersion,now,c.id==='rc'?'知悉安排；待詳細活動同意':'不適用','待聯絡','待寄送',0,'','','待寄送',0,'',''];
 writing=true;sheet.appendRow(row.map(safe_));SpreadsheetApp.flush();
 return json_({ok:true,registrationId:id,campName:c.name,dateLabel:c.dates.join(', '),planName:p.name,total:valid.total});
 }catch(err){return json_({ok:false,saved:writing?undefined:false,message:writing?'收件結果尚未確認，請使用相同資料重試或聯絡老師。':'無法受理：'+String(err.message).slice(0,160)});}finally{if(lock)lock.releaseLock();}
}
/** Independent queues. MailApp success means handed off, never delivered.
 * Mark sending before sending. An interrupted attempt becomes manual review.
 * Known failures retry after 15 min, at most 3 attempts, independently. */
function processNotifications(){
 const lock=LockService.getScriptLock();if(!lock.tryLock(1000))return;
 try{const props=PropertiesService.getScriptProperties(),sheet=SpreadsheetApp.openById(props.getProperty('SHEET_ID')).getSheetByName('報名紀錄');const rows=sheet.getDataRange().getValues();
 for(let i=1;i<rows.length;i++){const r=rows[i];for(const kind of ['parent','admin']){const col=kind==='parent'?28:32,status=r[col],attempts=Number(r[col+1]),last=r[col+2];
 if(status==='寄送中'){sheet.getRange(i+1,col+1).setValue('待人工確認');continue;}
 if(status!=='待寄送'&&status!=='寄送失敗')continue;if(attempts>=3)continue;if(last&&Date.now()-new Date(last).getTime()<900000)continue;
 const recipient=kind==='parent'?String(r[16]).replace(/^'/,''):props.getProperty('ADMIN_EMAIL');if(!recipient){sheet.getRange(i+1,col+1,1,4).setValues([['待人工確認',attempts,new Date().toISOString(),'未設定管理員信箱']]);continue;}
 const sender=props.getProperty('SENDER_EMAIL');if(!sender||Session.getEffectiveUser().getEmail().toLowerCase()!==sender.toLowerCase()){sheet.getRange(i+1,col+1,1,4).setValues([['待人工確認',attempts,new Date().toISOString(),'執行帳號與指定寄件信箱不符；停止寄送，請確認發信服務']]);continue;}
 if(MailApp.getRemainingDailyQuota()<1)return;
 sheet.getRange(i+1,col+1,1,4).setValues([['寄送中',attempts+1,new Date().toISOString(),'']]);SpreadsheetApp.flush();
 try{const body=kind==='parent'?`報名資料已收到（尚未保留名額）。\n編號：${r[0]}\n營隊：${r[5]}\n日期：${r[8]}\n方案：${r[7]}\n費用：NT$ ${r[9]}\n\n請加入 LINE https://lin.ee/NTY6jV8 ，告知孩子姓名與報名編號，由老師確認名額與繳費。完成繳費及教室確認後才算報名完成。`:`新報名：${r[0]}\n營隊：${r[5]}\n方案：${r[7]}\n請至私人管理表查看並聯絡家長：${SpreadsheetApp.openById(props.getProperty('SHEET_ID')).getUrl()}`;
 const message={to:recipient,subject:'創意方塊冬令營｜'+r[0]+(kind==='parent'?' 收件通知':' 新報名'),body:body,name:'創意方塊機器人教室'};
 if(kind==='parent')Object.assign(message,parentReceipt_(r));
 MailApp.sendEmail(message);sheet.getRange(i+1,col+1).setValue('已交寄');
 }catch(err){sheet.getRange(i+1,col+1).setValue('寄送失敗');sheet.getRange(i+1,col+4).setValue(safe_(String(err.message).slice(0,300)));}
 }}
 }finally{lock.releaseLock();}
}

/** Table layout and inline styles for email clients; escape every submitted value. */
function parentReceipt_(r){
 const clean=v=>String(v==null?'':v).replace(/^'/,'');
 const esc=v=>clean(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const money='NT$ '+Number(r[9]).toLocaleString('en-US');
 const early=clean(r[10])||'未預約';
 const fields=[['孩子姓名',r[11]],['營隊',r[5]],['營隊日期',r[8]],['上課時間','09:00–16:00'],['報名方案',r[7]],['早托日期',early]];
 const rows=fields.map(([label,value])=>`<tr><td style="padding:12px 0;border-bottom:1px solid #e9edf1;color:#697586;width:96px;vertical-align:top;font-size:13px;">${label}</td><td style="padding:12px 0 12px 12px;border-bottom:1px solid #e9edf1;color:#233247;line-height:1.7;font-size:15px;overflow-wrap:anywhere;">${esc(value)}</td></tr>`).join('');
 const body=`${clean(r[14])} 您好：\n我們已收到 ${clean(r[11])} 的營隊報名資料。\n目前狀態：待確認名額與繳費（尚未保留名額）。\n報名編號：${clean(r[0])}\n${fields.map(([k,v])=>k+'：'+clean(v)).join('\n')}\n報名費用：${money}（含午餐與已選早托，晚托另計）\n\n下一步：加入 LINE https://lin.ee/NTY6jV8 ，提供孩子姓名與報名編號。老師將確認名額與繳費方式；完成繳費及教室確認後，才算報名完成。\n如需更正資料，請透過 LINE 聯絡，無需重複填表。\n\n創意方塊機器人教室\n台北市萬華區莒光路347巷20號1樓\nhttps://twtimothylu.github.io/creativstack_camp2027/`;
 const htmlBody=`<!doctype html><html lang="zh-Hant"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;background:#f2f4f7;color:#233247;font-family:Arial,'Noto Sans TC','Microsoft JhengHei',sans-serif;">
 <div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">已收到您的營隊報名資料。請加入 LINE，確認名額與繳費。</div>
 <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f2f4f7;"><tr><td align="center" style="padding:28px 12px;">
 <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;background:#ffffff;border:1px solid #e1e6ec;border-radius:16px;overflow:hidden;">
 <tr><td style="padding:27px 28px;background:#233247;border-top:5px solid #bd5629;"><div style="font-size:21px;font-weight:bold;letter-spacing:2px;color:#ffffff;">創意方塊</div><div style="margin-top:7px;font-size:11px;letter-spacing:2px;color:#c8d1de;">CREATIVSTACK · WINTER CAMP 2027</div></td></tr>
 <tr><td style="padding:30px 28px 20px;"><div style="font-size:12px;font-weight:bold;color:#a54a25;letter-spacing:1px;">報名資料收件通知</div><h1 style="margin:10px 0 20px;font-size:27px;line-height:1.45;color:#233247;">收到報名，期待一起探索。</h1><p style="margin:0;font-size:15px;line-height:1.9;">${esc(r[14])} 您好：<br>我們已收到 <strong>${esc(r[11])}</strong> 的營隊報名資料。請核對下方資訊，並完成下一步確認。</p></td></tr>
 <tr><td style="padding:0 28px 24px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td style="padding:16px 18px;background:#fff5eb;border-left:3px solid #bd5629;"><strong style="font-size:14px;color:#8b411f;">待確認名額與繳費</strong><div style="margin-top:5px;font-size:13px;color:#755a49;line-height:1.7;">此信表示資料已收件，尚未保留名額。完成繳費及教室確認後，才算報名完成。</div></td></tr></table></td></tr>
 <tr><td style="padding:0 28px;"><div style="font-size:12px;color:#697586;">報名編號</div><div style="margin:7px 0 16px;font-family:Consolas,monospace;font-size:20px;font-weight:bold;letter-spacing:1px;">${esc(r[0])}</div><table role="presentation" width="100%" cellpadding="0" cellspacing="0">${rows}</table></td></tr>
 <tr><td style="padding:20px 28px 28px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td style="font-size:14px;color:#697586;">報名費用</td><td align="right" style="font-size:27px;font-weight:bold;color:#233247;">${esc(money)}</td></tr></table><p style="margin:8px 0 0;text-align:right;font-size:12px;line-height:1.7;color:#697586;">含午餐與已選早托，晚托另計</p></td></tr>
 <tr><td style="padding:26px 28px;background:#f8fafc;border-top:1px solid #e9edf1;"><h2 style="margin:0 0 12px;font-size:19px;">下一步，透過 LINE 完成確認</h2><p style="margin:0 0 20px;font-size:14px;line-height:1.9;color:#536174;">加入教室 LINE，提供<strong>孩子姓名與報名編號</strong>。老師將協助確認名額，並說明繳費方式。</p><table role="presentation" cellpadding="0" cellspacing="0"><tr><td bgcolor="#ad4c25" style="border-radius:7px;"><a href="https://lin.ee/NTY6jV8" style="display:inline-block;padding:15px 24px;border:1px solid #ad4c25;border-radius:7px;color:#ffffff;font-size:15px;font-weight:bold;text-decoration:none;">加入 LINE，確認報名 →</a></td></tr></table><p style="margin:15px 0 0;font-size:12px;line-height:1.8;color:#697586;">若按鈕無法開啟，請點選 <a href="https://lin.ee/NTY6jV8" style="color:#ad4c25;">lin.ee/NTY6jV8</a><br>如需更正資料，請透過 LINE 聯絡，無需重複填表。</p></td></tr>
 <tr><td style="padding:23px 28px;border-top:1px solid #e9edf1;font-size:12px;line-height:1.9;color:#697586;"><strong style="color:#233247;">創意方塊機器人教室</strong><br>台北市萬華區莒光路347巷20號1樓<br><a href="https://twtimothylu.github.io/creativstack_camp2027/" style="color:#536174;">查看營隊課程</a> · <a href="https://maps.app.goo.gl/XbzyMSb3q2zswpJj8" style="color:#536174;">教室地圖</a></td></tr>
 </table><p style="margin:18px 0 0;font-size:11px;color:#8390a1;">讓好奇心，變成看得見的作品。</p></td></tr></table></body></html>`;
 return {body,htmlBody};
}
