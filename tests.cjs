const {chromium}=require('playwright');
const assert=require('node:assert/strict'),path=require('node:path'),fs=require('node:fs');
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.BROWSER_PATH||(process.platform==='win32'?'C:/Program Files/Google/Chrome/Application/chrome.exe':undefined),headless:true});
 try{
 const page=await browser.newPage({viewport:{width:1280,height:900}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.goto('file:///'+path.resolve(__dirname,'index.html').replace(/\\/g,'/'));
 await page.waitForFunction(()=>typeof loop!=='undefined');await page.click('#start');await page.evaluate(()=>{loop.stop();muted=true});
 fs.mkdirSync('test-results',{recursive:true});
 const reset=()=>page.evaluate(()=>{stage=0;state='play';loadStage();keys.clear();pressed.clear();enemies=[];pickups=[];player.inv=99999});
 await reset();
 const motion=await page.evaluate(()=>{const x=player.x,z=player.z;keys.add('KeyD');for(let i=0;i<20;i++)update();keys.clear();let straight=player.x-x;player.x=x;player.z=z;player.vx=0;player.vz=0;keys.add('KeyD');keys.add('KeyW');for(let i=0;i<20;i++)update();keys.clear();return {straight,diagonal:Math.hypot(player.x-x,player.z-z),depth:player.z-z}});assert(Math.abs(motion.straight-motion.diagonal)<.001);assert(motion.depth<-40);
 const bounds=await page.evaluate(()=>{keys.add('KeyW');for(let i=0;i<100;i++)update();keys.clear();const back=player.z;keys.add('KeyS');for(let i=0;i<100;i++)update();keys.clear();return [back,player.z]});assert.deepEqual(bounds,[12,218]);
 await reset();
 const jump=await page.evaluate(()=>{pressed.add('Space');update();let up=player.lift>0;keys.add('KeyW');for(let i=0;i<10;i++)update();keys.clear();let depth=player.z<120;for(let i=0;i<60;i++)update();return up&&depth&&player.ground&&player.lift===0});assert(jump);
 const terrain=await page.evaluate(()=>{player.x=650;player.z=120;let previous=groundAt(player.x,player.z);keys.add('KeyD');for(let i=0;i<80;i++)update();keys.clear();return player.ground&&groundAt(player.x,player.z)<previous-20&&Math.abs(player.y+player.h-groundAt(player.x+13.5,player.z))<.01});assert(terrain);
 await reset();
 const chase=await page.evaluate(()=>{let e={x:500,z:30,w:28,h:43,hp:3,kind:'soldier',origin:500,cd:999,lift:0};placeActor(e);let oldX=e.x,oldZ=e.z;for(let i=0;i<90;i++)moveEnemy(e);return e.x<oldX-40&&e.z>oldZ+10});assert(chase);
 const strafe=await page.evaluate(()=>{let e={x:player.x+80,z:player.z,w:28,h:43,kind:'soldier',origin:80,lift:0};let z=e.z;for(let i=0;i<25;i++)moveEnemy(e);return Math.abs(e.z-z)>10});assert(strafe);
 const shot=await page.evaluate(()=>{enemies=[{x:player.x+160,z:player.z,w:28,h:43,hp:2,kind:'soldier',origin:240,cd:999,lift:0}];placeActor(enemies[0]);keys.add('KeyJ');for(let i=0;i<40;i++)update();keys.clear();return enemies.length===0&&player.mag<30});assert(shot);
 await reset();
 const aiming=await page.evaluate(()=>{keys.add('KeyW');update();keys.clear();shoot();const b=bullets[0];return b.vz<0&&Math.abs(b.vx)<.001&&player.aimZ===-1});assert(aiming);
 const collision=await page.evaluate(()=>{const e={x:300,z:87.3,w:28,h:43,lift:0};return projectileHits({x:308,z:89.1,alt:28},e)&&!projectileHits({x:308,z:117,alt:28},e)&&!projectileHits({x:308,z:89,alt:100},e)});assert(collision);
 const aimEnemy=await page.evaluate(()=>{const e={x:500,z:40,w:28,h:43,lift:0};bullets=[];enemyShot(e);const b=bullets[0];return b.vx<0&&b.vz>0});assert(aimEnemy);
 await reset();
 const grenade=await page.evaluate(()=>{const a={x:player.x+65,z:player.z+45,w:28,h:43,hp:15,lift:0},b={x:player.x+65,z:player.z+180,w:28,h:43,hp:15,lift:0};enemies=[a,b];explode({x:player.x,z:player.z});return a.hp===3&&b.hp===15});assert(grenade);
 const grenadeFlight=await page.evaluate(()=>{enemies=[];let n=player.ammo;player.aimX=0;player.aimZ=-1;throwGrenade();let z=grenades[0].z;for(let i=0;i<12;i++)update();let moved=grenades[0].z<z;for(let i=0;i<50;i++)update();return moved&&grenades.length===0&&player.ammo===n-1});assert(grenadeFlight);
 const ammoRules=await page.evaluate(()=>{player.mag=1;player.reserve=40;player.cd=0;player.aimX=1;player.aimZ=0;shoot();player.cd=0;shoot();if(player.mag!==0||player.reload!==90)return false;const n=bullets.length;shoot();if(bullets.length!==n)return false;pause();for(let i=0;i<20;i++)update();if(player.reload!==90)return false;pause();for(let i=0;i<90;i++)update();if(player.mag!==30||player.reserve!==10||reloadWeapon())return false;player.mag=25;player.reserve=3;reloadWeapon();for(let i=0;i<90;i++)update();if(player.mag!==28||player.reserve!==0||reloadWeapon())return false;player.mag=0;player.cd=0;bullets=[];shoot();return bullets.length===0});assert(ammoRules);
 const supply=await page.evaluate(()=>{player.ammo=4;player.reserve=230;pickups=[{x:player.x,z:player.z+60,w:24,h:24,kind:'supply'}];update();if(player.ammo!==4)return false;pickups[0].z=player.z;update();return player.ammo===5&&player.reserve===240});assert(supply);
 const grenadeLimit=await page.evaluate(()=>{player.ammo=1;player.grenadeCD=0;grenades=[];throwGrenade();throwGrenade();if(grenades.length!==1)return false;player.grenadeCD=0;throwGrenade();return grenades.length===1&&player.ammo===0});assert(grenadeLimit);
 await reset();
 const immunity=await page.evaluate(()=>{player.inv=0;let hp=player.hp;hurt();hurt();return player.hp===hp-1});assert(immunity);
 for(let i=0;i<6;i++){
  await page.evaluate(()=>{enemies=[];player.inv=99999;player.x=stages[stage].length-650;update();for(let i=0;i<16;i++)explode({x:boss.x+boss.w/2,z:boss.z});update()});
  assert.equal(await page.evaluate(()=>state),i===5?'won':'clear');if(i<5)await page.click('#start');
 }
 await page.click('#start');await page.evaluate(()=>{player.hp=1;player.inv=0;hurt()});assert.equal(await page.evaluate(()=>state),'dead');await page.click('#start');assert.deepEqual(await page.evaluate(()=>[player.hp,player.mag,player.reserve,player.ammo]),[6,30,150,3]);
 await reset();
 const cover=await page.evaluate(()=>{const o=world.obstacles[0];player.x=o.x-player.w/2-14;player.z=o.z;player.vx=0;player.vz=0;placeActor(player);keys.add('KeyD');for(let i=0;i<25;i++)update();keys.clear();if(player.x+player.w/2>o.x-11)return 'walk penetrated cover';pressed.add('ShiftLeft');keys.add('KeyD');for(let i=0;i<15;i++)update();keys.clear();if(player.x+player.w/2>o.x-11)return 'dash penetrated cover';return true});assert.equal(cover,true);
 const jumpCover=await page.evaluate(()=>{const o=world.obstacles[0];player.x=o.x-player.w/2-14;player.z=o.z;player.lift=0;player.jumpV=0;player.ground=true;player.dash=0;player.vx=0;player.vz=0;pressed.add('Space');keys.add('KeyD');for(let i=0;i<20;i++)update();keys.clear();for(let i=0;i<30;i++)update();return player.ground&&player.lift===o.h&&player.x+player.w/2>o.x});assert(jumpCover);
 await reset();
 const mobility=await page.evaluate(()=>{keys.add('KeyD');update();if(!(player.vx>0&&player.vx<3.7))return false;for(let i=0;i<8;i++)update();let start=player.x;pressed.add('ShiftLeft');update();let dash=player.dash>0&&player.vx>3.7;const cd=player.dashCD;pressed.add('ShiftLeft');update();if(player.dashCD>=cd)return false;keys.clear();for(let i=0;i<25;i++)update();if(Math.hypot(player.vx,player.vz)>.001)return false;player.lift=1;player.jumpV=-1;player.ground=false;pressed.add('Space');update();update();return dash&&player.lift>0&&player.jumpV>0});assert(mobility);
 const coverBullet=await page.evaluate(()=>{const o=world.obstacles[0];return coverHit({x:o.x+10,z:o.z,alt:10})&&!coverHit({x:o.x+10,z:o.z,alt:o.h+10})});assert(coverBullet);
 const route=await page.evaluate(()=>{loadStage();enemies=[];player.x=760;player.z=55;placeActor(player);const e={x:550,z:55,w:28,h:43,kind:'soldier',origin:550,lift:0};placeActor(e);let collision=false;for(let i=0;i<550;i++){tick++;moveEnemy(e);if(!canStand(e.x+e.w/2,e.z,11.9,8.9,0))collision=true}return {x:e.x,z:e.z,collision,distance:Math.hypot(player.x-e.x,player.z-e.z)}});assert(!route.collision&&route.x>670&&route.distance<150,JSON.stringify(route));
 const mapReachability=await page.evaluate(()=>{for(let i=0;i<6;i++){stage=i;loadStage();player.x=stages[i].length-660;player.z=130;refreshFlow();if(world.nav.dist[navCell(93,130)]<0)return false;const updates=world.nav.updates;refreshFlow();if(world.nav.updates!==updates)return false}return true});assert(mapReachability);
 const visualCaches=await page.evaluate(()=>{const n=visuals.actors.length;for(let i=0;i<10;i++)render();for(let i=0;i<50;i++)addExplosion(player.x,player.y);return n===64&&visuals.actors.length===n&&visuals.fx.length===12});assert(visualCaches);
 await page.click('#quality');assert.equal(await page.evaluate(()=>visuals.high),false);await page.evaluate(()=>render());await page.click('#quality');assert.equal(await page.evaluate(()=>visuals.high),true);
 const budget=await page.evaluate(()=>{for(let i=0;i<35;i++){camera=i*120;render()}let count=world.chunks.size;let builds=world.builds;render();render();for(let i=0;i<30;i++)burst(player.x,player.y,'#fff',70);return count<=CACHE_LIMIT&&world.builds===builds&&particles.length<=220});assert(budget);
 for(let s=0;s<6;s++){await page.evaluate(s=>{stage=s;loadStage();player.x=970;player.z=138;placeActor(player);player.inv=0;message=0;camera=670;render()},s);await page.screenshot({path:'test-results/free-'+(s+1)+'.jpg',type:'jpeg',quality:80})}
 const touchPage=await browser.newPage({viewport:{width:375,height:812},hasTouch:true,isMobile:true});await touchPage.goto('file:///'+path.resolve(__dirname,'index.html').replace(/\\/g,'/'));await touchPage.locator('#start').tap();await touchPage.locator('[data-key=KeyW]').dispatchEvent('pointerdown',{pointerId:1});await touchPage.waitForFunction(()=>player.z<115);await touchPage.locator('[data-key=KeyW]').dispatchEvent('pointerup',{pointerId:1});assert.equal(await touchPage.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);assert.equal(await touchPage.locator('[data-key=KeyQ]').count(),0);await touchPage.close();
 assert.deepEqual(errors,[]);console.log('PASS: normalized WASD/diagonal movement, continuous depth bounds, jump+movement, terrain, enemy pursuit/strafe, directional shooting, spatial collisions, enemy aim, radial grenade/flight, ammo/reload/pause, supply caps, grenade limits, immunity, six-stage campaign, restart, cache/particle bounds, solid cover, jump-on-cover, dash collision/cooldown, buffered jumps, enemy cover navigation, six connected maps, sprite/effect budgets, quality toggle and mobile controls.');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
