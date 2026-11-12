// usage: node v2shot.cjs <outPrefix> <hash> [w] [h] [clickText...]   (fresh page each run; state routing)
const { chromium } = require('playwright');
(async()=>{
  const [,, out, hash, w='390', h='844', ...clicks] = process.argv;
  const b=await chromium.launch();
  const W=+w, H=+h;
  const ctx=await b.newContext({viewport:{width:W,height:H},isMobile:W<700,hasTouch:W<700,deviceScaleFactor:W<700?2:1});
  const p=await ctx.newPage(); const errs=[];
  p.on('console',m=>{ if(m.type()==='error') errs.push(m.text()); }); p.on('pageerror',e=>errs.push(String(e)));
  await p.goto('file:///home/user/procurement/mock/proto2/'+(process.env.DIST||'dist')+'/index.html'+(hash||'')); await p.waitForTimeout(700);
  for(const c of clicks){ if(c==='@desk'){ await p.getByText('Kompiuteris',{exact:true}).first().click(); } else if(c.startsWith('@go:')){ await p.evaluate(h=>window.__gausGo(h), c.slice(4)); } else { await p.getByText(c,{exact:true}).first().click({timeout:6000}); } await p.waitForTimeout(450); }
  await p.screenshot({path:out+'.png'});
  if(W<700){ // full page of the scroller
    const full=await p.evaluate(()=>{const s=document.querySelector('.v-scroll');return s?s.scrollHeight:0});
    if(full>H){ await p.setViewportSize({width:W,height:Math.min(full,3200)}); await p.waitForTimeout(300); await p.screenshot({path:out+'-full.png'}); }
  } else { await p.screenshot({path:out+'-full.png',fullPage:true}); }
  if(errs.length) console.log('ERR',errs);
  await b.close();
})();
