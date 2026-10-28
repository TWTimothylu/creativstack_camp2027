import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {execFileSync} from 'node:child_process';
test('legacy redirects preserve registration selections, ad parameters and section anchors',()=>{
 execFileSync(process.execPath,['scripts/build-redirects.mjs']);
 for(const file of ['index.html','course-rc.html','course-scratch.html','course-essential.html','register.html','404.html']){
  const html=fs.readFileSync('redirect-site/'+file,'utf8');
  const search='?camp=rc&plan=takehome&utm_source=facebook&fbclid=sample';
  let actual;const link={};
  vm.runInNewContext(html.match(/<script>(.*?)<\/script>/s)[1],{URL,window:{location:{search,hash:'#plans',replace:url=>actual=url}},document:{getElementById:()=>link}});
  const expected='https://www.creativstacks.info/camps/2027-winter/'+(['index.html','404.html'].includes(file)?'':file)+search+'#plans';
  assert.equal(actual,expected);assert.equal(link.href,expected);
  assert.ok(!html.includes('tracking.js'));assert.ok(!html.includes('http-equiv="refresh"'));
 }
});
