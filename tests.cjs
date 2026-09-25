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
 
 const touchPage=await browser.newPage({viewport:{width:844,height:390},hasTouch:true,isMobile:true});await touchPage.goto('file:///'+path.resolve(__dirname,'index.html').replace(/\\/g,'/'));assert(await touchPage.locator('.touch').isVisible());await touchPage.close();
 assert.deepEqual(errors,[]);console.log('PASS: boot, movement, jump/landing, shooting, grenade, immunity, health pickup, pause/resume, boss activation, 6-stage campaign, death/restart, touch UI, magazine consumption, automatic/manual reload, pause-safe reload timer, partial reserves, empty ammo lockout, grenade cap/cooldown, supply caps. No browser errors.');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});

