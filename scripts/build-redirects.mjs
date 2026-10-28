import fs from 'node:fs';
const base='https://twtimothylu.github.io/courses_introduction/camps/2027-winter/';
const pages=['index.html','course-rc.html','course-scratch.html','course-essential.html','register.html'];
fs.mkdirSync('redirect-site',{recursive:true});
for(const page of [...pages,'404.html']){
 const destination=base+(page==='index.html'||page==='404.html'?'':page);
 const script=`const target=new URL(${JSON.stringify(destination)});target.search=window.location.search;target.hash=window.location.hash;document.getElementById('continue').href=target.href;window.location.replace(target.href);`;
 fs.writeFileSync('redirect-site/'+page,`<!doctype html><html lang="zh-Hant"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>營隊網站已搬至教室官網｜創意方塊</title><link rel="canonical" href="${destination}"><meta name="robots" content="noindex,follow"><style>body{max-width:560px;margin:15vh auto;padding:24px;font:18px/1.8 Arial,sans-serif;color:#152640}a{color:#b94413}</style></head><body><h1>營隊網站搬新家了。</h1><p>正在前往創意方塊教室官網，查看同一個營隊的介紹與報名資訊。</p><p><a id="continue" href="${destination}">繼續前往營隊網站 →</a></p><script>${script}</script><noscript>請點上方連結前往新網站。</noscript></body></html>`);
}
fs.writeFileSync('redirect-site/.nojekyll','');
console.log('Built legacy redirects preserving query parameters and fragments.');
