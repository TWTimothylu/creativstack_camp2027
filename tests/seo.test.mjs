import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
import {renderHome,renderCourse,card} from '../public/render.js';
const camps=JSON.parse(fs.readFileSync('data/camps.json'));
test('build exposes complete crawlable content and distinct metadata without JavaScript',()=>{
 execFileSync(process.execPath,['scripts/build.mjs']);
 const descriptions=new Set();
 for(const file of ['index.html',...camps.map(c=>`course-${c.id}.html`)]){
 const html=fs.readFileSync('dist/'+file,'utf8');
 assert.equal((html.match(/<h1\b/g)||[]).length,1);
 assert.ok(html.includes('台北市萬華區莒光路347巷20號1樓'));
 assert.ok(html.includes('register.html'));
 assert.ok(!html.includes('正在載入營隊資訊'));
 assert.ok(html.includes('rel="canonical"'));
 assert.ok(!html.includes('noindex'));
 descriptions.add(html.match(/name="description" content="([^"]+)"/)[1]);
 JSON.parse(html.match(/<script type="application\/ld\+json">(.*?)<\/script>/s)[1]);
 }
 assert.equal(descriptions.size,4);
 const home=fs.readFileSync('dist/index.html','utf8');
 for(const c of camps){assert.ok(home.includes(`href="course-${c.id}.html"`));const html=fs.readFileSync(`dist/course-${c.id}.html`,'utf8');assert.ok(html.includes(c.description));for(const day of c.schedule)assert.ok(html.includes(day[0]));}
 const map=fs.readFileSync('dist/sitemap.xml','utf8');assert.equal((map.match(/<loc>/g)||[]).length,4);assert.ok(!map.includes('register.html'));
 assert.ok(fs.readFileSync('dist/register.html','utf8').includes('noindex,follow'));
});
test('shared templates support interactive and timeless static pricing',()=>{
 for(const c of camps){assert.ok(renderCourse(c).includes('data-base-price'));assert.ok(card(c).includes('data-price-countdown'));assert.ok(renderCourse(c,undefined,true).includes('2026/11/1 23:59 前報名早鳥價'));}
 assert.equal((renderHome(camps).match(/<article /g)||[]).length,3);
});
