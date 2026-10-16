/** Run manually only. Uses a separate private sheet; restores production settings. */
function acceptanceCamp2027() {
 const props=PropertiesService.getScriptProperties(), original=props.getProperties();
 const ss=SpreadsheetApp.create('2027冬令營｜系統驗收（非正式報名）');
 const sheet=ss.getSheets()[0];sheet.setName('報名紀錄');sheet.appendRow(HEADERS);
 const check=(v,m)=>{if(!v)throw Error(m);};
 try {
  props.setProperties({SHEET_ID:ss.getId(),REGISTRATION_OPEN:'true',ADMIN_EMAIL:'arway.lu@gmail.com'});
  const v={requestId:Utilities.getUuid(),camp:'rc',plan:'takehome',grade:'3',child:'系統驗收測試',parent:'系統驗收',phone:'0900000000',email:'arway.lu@gmail.com',emergencyName:'系統驗收',emergencyPhone:'0900000000',school:'',referral:'',diet:'',notes:'非真實學生；僅測試報名系統',experience:'none',privacy:true,rules:true,outdoor:true,ability:false,early:['2027-01-21'],consentVersion:original.CONSENT_VERSION};
  const post=x=>JSON.parse(doPost({postData:{contents:JSON.stringify(x)}}).getContent());
  const a=post(v),b=post(v);
  check(a.ok&&Number(a.total)===campTotal(5800,1),'寫入或費用錯誤');
  check(b.ok&&a.registrationId===b.registrationId&&sheet.getLastRow()===2,'重複防護錯誤');
  check(!post({...v,child:'不同資料'}).ok,'請求衝突未阻擋');
  sheet.getRange(2,1).setValue('TEST-'+a.registrationId);
  processNotifications();
  const row=sheet.getRange(2,1,1,HEADERS.length).getValues()[0];
  check(row[28]==='已交寄'&&row[32]==='已交寄','通知寄送未成功：'+row[31]+' '+row[35]);
  console.log(JSON.stringify({ok:true,testSheet:ss.getUrl(),testId:row[0],total:row[9],parent:row[28],admin:row[32],rows:sheet.getLastRow()-1}));
 } finally {props.setProperties(original,true);}
}

