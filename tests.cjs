const {chromium}=require('playwright');
const assert=require('node:assert/strict'),path=require('node:path'),fs=require('node:fs');
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.BROWSER_PATH||(process.platform==='win32'?'C:/Program Files/Google/Chrome/Application/chrome.exe':undefined),headless:true});
 try{
 const page=await browser.newPage({viewport:{width:1280,height:900}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.goto('file:///'+path.resolve(__dirname,'index.html').replace(/\\/g,'/'));
 await page.waitForFunction(()=>typeof loop!=='undefined');
 fs.mkdirSync('test-results',{recursive:true});
 await page.screenshot({path:'test-results/title.png'});
 await page.click('#start');
 assert.equal(await page.evaluate(()=>state),'play');
 await page.evaluate(()=>loop.stop());
 const movement=await page.evaluate(()=>{let x=player.x;keys.add('KeyD');for(let i=0;i<30;i++)update();keys.clear();return player.x-x});assert(movement>100);
 const jump=await page.evaluate(()=>{const y=player.y;pressed.add('Space');update();let airborne=player.y<y;for(let i=0;i<60;i++)update();return airborne&&player.ground});assert(jump);
 const shot=await page.evaluate(()=>{enemies=[{x:player.x+160,y:FLOOR-43,w:28,h:43,hp:2,kind:'soldier',cd:999}];keys.add('KeyJ');for(let i=0;i<40;i++)update();keys.clear();return score>=100&&enemies.length===0});assert(shot);
 const grenade=await page.evaluate(()=>{enemies=[{x:player.x+250,y:FLOOR-43,w:28,h:43,hp:10,kind:'soldier',cd:999}];let n=player.ammo;pressed.add('KeyK');for(let i=0;i<60;i++)update();return player.ammo===n-1&&enemies.length===0});assert(grenade);
 const ammoRules=await page.evaluate(()=>{
 enemies=[];bullets=[];player.inv=99999;player.mag=2;player.reserve=40;player.cd=0;player.reload=0;
 shoot();if(player.mag!==1)return 'shot did not consume ammo';player.cd=0;shoot();if(player.mag!==0)return 'empty count';
 player.cd=0;shoot();if(player.reload!==90)return 'auto reload not started';let count=bullets.length;shoot();if(bullets.length!==count)return 'shot during reload';
 pause();for(let i=0;i<30;i++)update();if(player.reload!==90)return 'reload advanced while paused';pause();
 for(let i=0;i<90;i++)update();if(player.mag!==30||player.reserve!==10)return 'reload transfer failed';if(reloadWeapon())return 'full magazine reload allowed';
 player.mag=25;player.reserve=3;pressed.add('KeyR');update();for(let i=0;i<90;i++)update();if(player.mag!==28||player.reserve!==0)return 'partial reserve transfer failed';if(reloadWeapon())return 'zero reserve reload allowed';
 player.mag=0;player.cd=0;bullets=[];shoot();if(bullets.length||player.mag<0)return 'empty weapon fired';return true;
 });assert.equal(ammoRules,true);
 const grenadeRules=await page.evaluate(()=>{grenades=[];player.ammo=1;player.grenadeCD=0;throwGrenade();throwGrenade();if(grenades.length!==1||player.ammo!==0)return false;player.grenadeCD=0;throwGrenade();if(grenades.length!==1)return false;player.ammo=4;player.reserve=230;pickups=[{x:player.x,y:player.y,w:24,h:24,kind:'supply'}];update();return player.ammo===5&&player.reserve===240});assert(grenadeRules);
 const immunity=await page.evaluate(()=>{player.inv=0;let n=player.hp;hurt();hurt();return player.hp===n-1});assert(immunity);
 const pickup=await page.evaluate(()=>{player.hp=2;pickups=[{x:player.x,y:player.y,w:24,h:24,kind:'health'}];update();return player.hp===4});assert(pickup);
 await page.evaluate(()=>{pause()});assert.equal(await page.evaluate(()=>state),'paused');await page.click('#start');assert.equal(await page.evaluate(()=>state),'play');
 await page.evaluate(()=>{player.x=2850;enemies=[];update();render()});await page.screenshot({path:'test-results/combat.png'});
 assert(await page.evaluate(()=>boss.active));
 for(let i=0;i<6;i++){
  await page.evaluate(()=>{enemies=[];player.inv=9999;player.x=stages[stage].length-650;update();for(let j=0;j<16;j++)explode({x:boss.x+boss.w/2,y:boss.y+boss.h/2});update()});
  assert.equal(await page.evaluate(()=>state),i===5?'won':'clear');
  if(i<5){await page.click('#start');assert.equal(await page.evaluate(()=>stage),i+1)}
 }
 await page.click('#start');await page.evaluate(()=>{player.hp=1;player.inv=0;hurt()});assert.equal(await page.evaluate(()=>state),'dead');
 await page.click('#start');assert.equal(await page.evaluate(()=>player.hp),6);
 assert.deepEqual(await page.evaluate(()=>[player.mag,player.reserve,player.ammo,player.reload]),[30,150,3,0]);
 for(let s=0;s<6;s++){await page.evaluate(s=>{stage=s;loadStage();player.x=1700;player.inv=0;message=0;update();render()},s);await page.screenshot({path:'test-results/stage-'+(s+1)+'.png'})}

 const depth=await page.evaluate(()=>{
 stage=0;state='play';loadStage();enemies=[];player.inv=99999;player.x=655;player.y=groundAt(668,0)-player.h;keys.clear();
 pressed.add('KeyQ');update();if(player.lane!==1)return 'Q did not change route';if(laneShift(1))return 'lane cooldown not enforced';
 for(let i=0;i<21;i++)update();pressed.add('KeyQ');update();if(player.lane!==2)return 'back route unavailable';
 player.laneCD=0;if(laneShift(1))return 'lane bounds failed';
 let previous=player.y;keys.add('KeyD');for(let i=0;i<45;i++)update();keys.clear();if(!(player.ground&&player.y<previous-60))return 'slope walk failed';
 pressed.add('Space');update();if(laneShift(-1))return 'airborne lane change allowed';for(let i=0;i<60;i++)update();
 const bridge=platforms.find(p=>p.lane===2);player.x=bridge.x+40;player.y=groundAt(player.x+13,2)-player.h;player.vy=0;player.ground=true;
 pressed.add('Space');for(let i=0;i<65;i++)update();if(player.support!==bridge)return 'bridge landing failed';
 keys.add('KeyS');pressed.add('Space');update();keys.clear();for(let i=0;i<40;i++)update();if(player.support||!player.ground)return 'bridge drop failed';
 return true;
 });assert.equal(depth,true);
 const lanesCombat=await page.evaluate(()=>{
 loadStage();enemies=[];player.inv=99999;player.x=200;player.y=FLOOR-player.h;player.lane=0;
 let foe={x:260,y:FLOOR-43,w:28,h:43,hp:2,kind:'soldier',lane:1,cd:999};enemies=[foe];player.cd=0;shoot();for(let i=0;i<12;i++)update();if(foe.hp!==2)return 'bullet crossed lanes';
 player.lane=1;player.cd=0;shoot();for(let i=0;i<12;i++)update();if(foe.hp!==1)return 'same lane bullet missed';
 pickups=[{x:player.x,y:player.y,w:24,h:24,kind:'health',lane:0}];player.hp=2;update();if(player.hp!==2)return 'pickup crossed lanes';
 player.lane=0;update();if(player.hp!==4)return 'same lane pickup missed';
 enemies=[{x:player.x+30,y:FLOOR-43,w:28,h:43,hp:20,lane:1}];explode({x:player.x,y:FLOOR-20,lane:0});if(enemies[0].hp!==20)return 'grenade crossed lanes';return true;
 });assert.equal(lanesCombat,true);
 const perf=await page.evaluate(()=>{
 stage=3;loadStage();player.x=1700;player.inv=9999;update();for(let i=0;i<20;i++)render();
 let calls=0;const orig=ctx.fillRect;ctx.fillRect=function(...args){calls++;return orig.apply(this,args)};const t=performance.now();
 for(let i=0;i<200;i++){camera=1300+i*2;render()}const ms=performance.now()-t;ctx.fillRect=orig;
 const result={scenario:'stage4, 200 scrolling render calls, headless Chrome',msPerRender:ms/200,fillRectPerRender:calls/200};
 for(let i=0;i<30;i++){camera=i*140;render()}if(world.chunks.size>CACHE_LIMIT)throw Error('unbounded chunk cache');
 const builds=world.builds;render();render();if(world.builds!==builds)throw Error('cache rebuilt without camera movement');
 for(let i=0;i<30;i++)burst(player.x,player.y,'#fff',70);if(particles.length>220)throw Error('particle budget exceeded');return result;
 });fs.writeFileSync('test-results/benchmark-after.json',JSON.stringify(perf,null,2));console.log('Render benchmark',perf);
 for(let s=0;s<6;s++){await page.evaluate(s=>{stage=s;loadStage();player.x=950;player.lane=1;player.visualLane=1;player.y=groundAt(963,1)-player.h;player.inv=0;message=0;camera=player.x-280;cameraY=-30;render()},s);await page.screenshot({path:'test-results/depth-'+(s+1)+'.png'})}
 const touchPage=await browser.newPage({viewport:{width:844,height:390},hasTouch:true,isMobile:true});await touchPage.goto('file:///'+path.resolve(__dirname,'index.html').replace(/\\/g,'/'));assert(await touchPage.locator('.touch').isVisible());await touchPage.close();
 assert.deepEqual(errors,[]);console.log('PASS: boot, movement, jump/landing, shooting, grenade, immunity, health pickup, pause/resume, boss activation, 6-stage campaign, death/restart, depth lanes, slopes, bridge landing/drop, lane-specific bullets/pickups/grenades, cache/particle budgets, touch UI, magazine consumption, automatic/manual reload, pause-safe reload timer, partial reserves, empty ammo lockout, grenade cap/cooldown, supply caps. No browser errors.');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});

