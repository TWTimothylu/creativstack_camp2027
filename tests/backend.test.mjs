import test from 'node:test';import assert from 'node:assert/strict';import vm from 'node:vm';import fs from 'node:fs';
class FixedDate extends Date {constructor(...args){super(...(args.length?args:['2026-10-16T00:00:00+08:00']))}static now(){return new FixedDate().getTime()}}
const context=vm.createContext({Date:FixedDate,Utilities:{formatDate:()=> '2026-10-15'}});vm.runInContext(fs.readFileSync('backend/Catalog.gs','utf8')+fs.readFileSync('backend/Code.gs','utf8'),context);
const valid=()=>({requestId:'12345678-1234-1234-1234-123456789012',camp:'rc',plan:'takehome',grade:'3',child:'測試',parent:'家長',phone:'0912345678',email:'test@example.com',emergencyName:'家長',emergencyPhone:'0912345678',school:'',referral:'',diet:'',notes:'',experience:'none',privacy:true,rules:true,outdoor:true,ability:false,early:[]});
test('server price is authoritative and early care counted by date',()=>{const v=valid();v.price=1;v.early=['2027-01-21'];assert.equal(context.validate_(v).total,5400)});
test('RC qualification is grade OR Technic ability',()=>{const v=valid();v.grade='1';assert.throws(()=>context.validate_(v));v.ability=true;assert.equal(context.validate_(v).total,5300)});
test('reject wrong plan, foreign and duplicate early dates',()=>{for(const patch of [{plan:'standard'},{early:['2027-02-01']},{early:['2027-01-21','2027-01-21']}])assert.throws(()=>context.validate_({...valid(),...patch}))});
test('Scratch age limits apply even when Technic ability is true',()=>{assert.throws(()=>context.validate_({...valid(),camp:'scratch',plan:'standard',grade:'1',ability:true}))});
test('reject unchecked consent, malformed email and oversized notes',()=>{for(const patch of [{privacy:false},{email:'x'},{notes:'x'.repeat(501)},{outdoor:false}])assert.throws(()=>context.validate_({...valid(),...patch}))});
test('neutralize spreadsheet formulas and preserve leading-zero phone',()=>{assert.equal(context.safe_('=IMPORTXML("x")'),'\'=IMPORTXML("x")');assert.equal(context.safe_('0912345678'),'0912345678')});

test('Taiwan early bird boundary and unchanged care fees',()=>{const last=Date.parse('2026-11-01T23:59:59.999+08:00'),end=Date.parse('2026-11-02T00:00:00+08:00');for(const price of [5800,4300,7000,5200]){assert.equal(context.campTotal(price,2,last),price-500+200);assert.equal(context.campTotal(price,2,end),price+200);}assert.equal(context.earlyBirdDiscount(end),0)});

test("Essential price increase includes early bird and care",()=>{const v={...valid(),camp:"essential",plan:"standard",grade:"1",early:["2027-02-01"]};assert.equal(context.validate_(v).total,4800)});
