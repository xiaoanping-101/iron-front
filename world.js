'use strict';
// World positions remain independent of the 2.5D projection used to display lanes.
const LANE_NAMES=['前线 · 地面','中线 · 栈道','后线 · 高地'];
const CHUNK_SIZE=640,CACHE_LIMIT=12;
let world={chunks:new Map(),builds:0,hits:0,layers:[],vignette:null},cameraY=0;
const laneOf=e=>e.lane??0;
const sameLane=(a,b)=>a.spanLanes||b.spanLanes||laneOf(a)===laneOf(b);
function groundAt(x,lane=0){
 const end=stages[stage].length-980;if(x<650||x>end)return FLOOR;
 const t=(x-650)%1050,amp=[32,72,106][lane];
 let height=t<180?t/180:t<440?1:t<620?(620-t)/180:0;
 // Finish each hill before the boss arena, avoiding a discontinuity at its boundary.
 const start=x-t;if(start+620>end)return FLOOR;
 return FLOOR-Math.max(0,height)*amp;
}
function laneShift(direction){
 if(!player.ground||player.laneCD>0)return false;
 const next=Math.max(0,Math.min(2,laneOf(player)+direction));if(next===laneOf(player))return false;
 player.lane=next;player.laneCD=20;player.y=groundAt(player.x+player.w/2,next)-player.h;player.vy=0;player.support=null;tone(310,.055,'triangle');return true;
}
function walkActor(e,dx){
 const oldBottom=e.y+e.h,wasGround=e.ground;e.x=Math.max(e===player?checkpoint:0,Math.min(stages[stage].length-e.w,e.x+dx));
 const floor=groundAt(e.x+e.w/2,laneOf(e));e.vy=(e.vy||0)+.55;e.y+=e.vy;e.ground=false;e.support=null;
 if(wasGround&&Math.abs(oldBottom-floor)<8&&e.vy>=0){e.y=floor-e.h;e.vy=0;e.ground=true}
 let surface=floor,support=null;
 for(const a of platforms){if(a.lane!==laneOf(e)||e.drop>0||e.x+e.w<=a.x||e.x>=a.x+a.w)continue;if(e.vy>=0&&oldBottom<=a.y+2&&e.y+e.h>=a.y&&a.y<surface){surface=a.y;support=a}}
 if(e.y+e.h>=surface&&e.vy>=0){e.y=surface-e.h;e.vy=0;e.ground=true;e.support=support}
}
function makeWorld(){
 world.chunks.clear();world.builds=0;world.hits=0;cameraY=0;platforms=[];
 const end=stages[stage].length-980;
 for(let x=650;x+620<end;x+=1050){
  platforms.push({x:x+210,y:groundAt(x+260,1)-74,w:220,h:16,lane:1});
  platforms.push({x:x+250,y:groundAt(x+300,2)-72,w:190,h:16,lane:2});
  pickups.push({x:x+315,y:groundAt(x+300,2)-96,w:24,h:24,kind:'supply',lane:2});
 }
 for(const e of enemies){e.lane=e.kind==='drone'?2:Math.floor(e.origin/280)%3;e.ground=true;e.vy=0;if(e.kind==='soldier')e.y=groundAt(e.x+e.w/2,e.lane)-e.h}
 for(const p of pickups){p.lane??=0;if(p.lane===0)p.y=groundAt(p.x+12,0)-24}
 boss.spanLanes=true;boss.lane=0;
 world.layers=[makeBackdrop(0),makeBackdrop(1)];
 world.vignette=makeCanvas(W,H,c=>{const v=c.createRadialGradient(W/2,H/2,200,W/2,H/2,600);v.addColorStop(0,'#06121800');v.addColorStop(1,'#06121860');c.fillStyle=v;c.fillRect(0,0,W,H)});
}
function makeCanvas(w,h,draw){const c=document.createElement('canvas');c.width=w;c.height=h;draw(c.getContext('2d'));return c}
function onCanvas(c,draw){const previous=ctx;ctx=c;c.imageSmoothingEnabled=false;try{draw()}finally{ctx=previous}}
function makeBackdrop(layer){return makeCanvas(1920,H,c=>onCanvas(c,()=>{
 const s=stages[stage];
 if(layer===0){const sky=ctx.createLinearGradient(0,0,0,H);sky.addColorStop(0,s.sky);sky.addColorStop(.65,s.mist);sky.addColorStop(1,s.mount);ctx.fillStyle=sky;ctx.fillRect(0,0,1920,H);
  const glow=ctx.createRadialGradient(740,114,4,740,114,125);glow.addColorStop(0,s.accent+'4f');glow.addColorStop(1,s.accent+'00');ctx.fillStyle=glow;ctx.fillRect(600,0,280,260);ctx.fillStyle=stage===2?'#c8e0d4':'#d5bd82';ctx.beginPath();ctx.arc(740,114,27,0,Math.PI*2);ctx.fill();
  for(let i=0;i<20;i++){let x=i*110;if(stage===3||stage===4){poly([[x-100,375],[x+60,145+i%3*25],[x+245,375]],s.mount);if(stage===4)poly([[x+20,202+i%3*25],[x+60,145+i%3*25],[x+105,203+i%3*25],[x+61,187+i%3*25]],'#bdd1d3')}
   else{let h=95+(i*43)%125;rect(x,345-h,80,h,s.mount);rect(x+14,329-h,44,20,s.mount);for(let j=0;j<4;j++)rect(x+12+j*15,357-h,5,h-25,s.mist+'55')}}
  for(let i=0;i<14;i++)rect(i*151,80+i%4*29,97,2,'#e1c8a315');
 }else if(stage===3){
  for(let i=0;i<18;i++){const x=i*120,top=155+i%3*17;rect(x+40,top,15,260,'#214637');for(let k=0;k<5;k++){ctx.fillStyle=k%2?'#35634c':'#2d5742';ctx.beginPath();ctx.ellipse(x+40+(k%2?25:-12),top+k*17,65-k*6,32,0,0,Math.PI*2);ctx.fill()}line(x+77,top+30,x+70,388,'#759763',2)}
 }else if(stage===4){
  for(let i=0;i<7;i++){let x=i*300;rect(x,320,270,96,'#456274');poly([[x,320],[x+22,308],[x+284,308],[x+270,320]],'#b4c9ce');poly([[x+270,320],[x+284,308],[x+284,400],[x+270,416]],'#2c485d');for(let j=0;j<6;j++){rect(x+14+j*42,337,27,29,'#203c51');rect(x+15+j*42,338,25,4,'#b6dce3')}rect(x+5,393,258,5,'#87a8b4');for(let j=0;j<2;j++){rect(x+30+j*180,414,31,15,'#172d40');rect(x+36+j*180,416,18,9,'#577483')}}
 }else{
  for(let i=0;i<10;i++){let x=i*210,h=105+i%3*24,top=415-h;rect(x,top,115,h,'#29403e');poly([[x,top],[x+20,top-15],[x+133,top-15],[x+115,top]],'#718275');poly([[x+115,top],[x+133,top-15],[x+133,400],[x+115,415]],'#1c3234');
   for(let r=0;r<6;r++)for(let j=0;j<6;j++)rect(x+j*19+(r%2)*7,top+8+r*18,16,1,'#9cab8020');for(let j=0;j<4;j++){rect(x+8+j*26,top+20,16,25,'#122b30');rect(x+9+j*26,top+21,14,2,s.accent+'77');rect(x+15+j*26,top+22,2,23,'#4d6960')}
   rect(x+35,386,27,29,'#152c30');line(x+155,top-25,x+155,415,'#334d46',5);line(x+142,top-14,x+175,top-14,'#698071',3);line(x+155,top-12,x+355,top+10,'#1d3334',2);
   if(stage===1||stage===5){rect(x+72,top-45,20,45,'#405753');rect(x+68,top-45,28,5,'#9d9f77')}
   if(stage===2||stage===5){rect(x+8,top+7,30,4,s.accent);const g=ctx.createRadialGradient(x+23,top+8,1,x+23,top+8,48);g.addColorStop(0,s.accent+'35');g.addColorStop(1,s.accent+'00');ctx.fillStyle=g;ctx.fillRect(x-25,top-40,96,96)}
  }
 }
}))}
function drawBackground(){rect(0,0,W,H,stages[stage].sky);for(let i=0;i<world.layers.length;i++){const offset=Math.floor(camera*(i===0?.12:.36))%1920;ctx.drawImage(world.layers[i],-offset,-cameraY*(i===0?.12:.3));if(offset+W>1920)ctx.drawImage(world.layers[i],1920-offset,-cameraY*(i===0?.12:.3))}}
function terrainChunk(lane,index){
 const key=lane+':'+index;if(world.chunks.has(key)){const value=world.chunks.get(key);world.chunks.delete(key);world.chunks.set(key,value);world.hits++;return value}
 const start=index*CHUNK_SIZE;
 const tile=makeCanvas(CHUNK_SIZE,H,c=>onCanvas(c,()=>{ctx.translate(-start,0);const s=stages[stage];
  for(let x=start-20;x<start+CHUNK_SIZE;x+=20){let a=groundAt(x,lane),b=groundAt(x+20,lane);poly([[x,a],[x+20,b],[x+20,H],[x,H]],lane===0?'#233a3a':lane===1?'#304b49':'#3c5954');
   poly([[x,a],[x+20,b],[x+40,b-25],[x+20,a-25]],lane===0?s.ground:lane===1?'#7d947d':'#9aab8c');line(x,a,x+20,b,stage===4?'#edf4ea':'#c4c59a',2);
   if(Math.abs(x/20)%3===0){line(x+6,a+8,x+16,a+8,'#8a9e7b55',2);rect(x+4,a+22,3,3,'#112a3155')}
  }
  for(let x=Math.floor(start/190)*190;x<start+CHUNK_SIZE;x+=190){let y=groundAt(x,lane);rect(x+8,y+10,76,22,'#142f3433');rect(x+9,y+10,74,2,'#9faf8050');if(lane>0){line(x+25,y+24,x+25,H,'#172f3655',6)}
   if(lane===0){rect(x+104,y-22,28,22,'#617b64');poly([[x+104,y-22],[x+113,y-30],[x+141,y-30],[x+132,y-22]],'#a4af83');poly([[x+132,y-22],[x+141,y-30],[x+141,y-7],[x+132,y]],'#3b594c');line(x+106,y-19,x+128,y-3,'#b3b98b',2)}
  }
  for(const p of platforms){if(p.lane!==lane||p.x+p.w<start||p.x>start+CHUNK_SIZE)continue;let bottom=groundAt(p.x+30,lane);rect(p.x+12,p.y+16,7,bottom-p.y-16,'#38574e');rect(p.x+p.w-20,p.y+16,7,bottom-p.y-16,'#38574e');poly([[p.x,p.y],[p.x+20,p.y-14],[p.x+p.w+20,p.y-14],[p.x+p.w,p.y]],'#b2baa0');rect(p.x,p.y,p.w,16,'#5d7b6c');rect(p.x,p.y,p.w,3,'#e0d9ad');for(let x=p.x+10;x<p.x+p.w;x+=24){rect(x,p.y+7,3,3,'#c6c7a3');line(x,p.y+17,x+15,bottom,'#456358',2)}}
 }));world.builds++;world.chunks.set(key,tile);if(world.chunks.size>CACHE_LIMIT)world.chunks.delete(world.chunks.keys().next().value);return tile;
}
function drawTerrain(lane){const offset=lane*20;for(let i=Math.max(0,Math.floor((camera-offset)/CHUNK_SIZE));i<=Math.floor((camera+W-offset)/CHUNK_SIZE);i++)ctx.drawImage(terrainChunk(lane,i),i*CHUNK_SIZE-camera+offset,-lane*42-cameraY)}
function projected(e,draw){let lane=e===player?(e.visualLane??laneOf(e)):laneOf(e);ctx.save();ctx.translate(-Math.floor(camera)+lane*20,-lane*42-cameraY);draw();ctx.restore()}
function visible(e){return e.x+e.w>camera-90&&e.x<camera+W+90}
function drawShadow(e){const floor=groundAt(e.x+e.w/2,laneOf(e));ctx.fillStyle='#071f2866';ctx.beginPath();ctx.ellipse(e.x+e.w/2,floor-1,e.w*.65,4,0,0,Math.PI*2);ctx.fill()}
function drawWorld(){
 drawBackground();
 for(let lane=2;lane>=0;lane--){drawTerrain(lane);
  for(const a of pickups){if(laneOf(a)!==lane||!visible(a))continue;projected(a,()=>{let y=a.y+Math.sin(tick*.08+a.x)*3;rect(a.x-3,y-3,30,30,'#163c3b');rect(a.x,y,24,24,a.kind==='health'?'#92c394':a.kind==='supply'?'#98d1d4':'#e3bb69');text(a.kind==='health'?'+':a.kind==='supply'?'A':'H',a.x+12,y+18,20,'#20382d','center')})}
  for(const e of enemies){if(laneOf(e)!==lane||!visible(e))continue;projected(e,()=>{drawShadow(e);if(e.kind==='soldier')soldier(e,false);else{rect(e.x,e.y,40,20,'#91a99d');rect(e.x-10,e.y-4,60,4,'#253d42');rect(e.x+5,e.y+3,30,2,'#d0d8b8');rect(e.x+15,e.y+20,9,7,'#f6b170');rect(e.x+7,e.y+7,26,6,'#213f47')}})}
  if(lane===0&&visible(boss))projected(boss,()=>{drawShadow(boss);const b=boss;if(b.hp>0){poly([[b.x,b.y+45],[b.x+40,b.y-39],[b.x+b.w+40,b.y-39],[b.x+b.w,b.y+45]],'#718b74');poly([[b.x+b.w,b.y+45],[b.x+b.w+40,b.y-39],[b.x+b.w+40,b.y+20],[b.x+b.w,b.y+92]],'#304e48');for(let i=0;i<4;i++)line(b.x+25+i*34,b.y+40,b.x+63+i*34,b.y-33,'#b5bd9188',2)}drawBoss()});
  if(laneOf(player)===lane)projected(player,()=>{drawShadow(player);if(player.inv<=0||Math.floor(player.inv/5)%2===0||state==='title')soldier(player,true)});
  for(const b of bullets)if(laneOf(b)===lane&&b.x>camera-50&&b.x<camera+W+50)projected(b,()=>{rect(b.x-2,b.y-2,b.w+4,b.h+4,b.owner==='player'?'#edbd5240':'#ff816144');rect(b.x,b.y,b.w,b.h,b.owner==='player'?'#fff0aa':'#ff9c79')});
  for(const g of grenades)if(laneOf(g)===lane)projected(g,()=>{rect(g.x-4,g.y-4,9,10,'#bad077');rect(g.x-1,g.y-7,4,4,'#eae3b2')});
  for(const a of particles)if(laneOf(a)===lane&&a.x>camera-40&&a.x<camera+W+40)projected(a,()=>{ctx.globalAlpha=Math.min(1,a.life/10);rect(a.x,a.y,a.size,a.size,a.color)});
 }
}
function routeHud(){rect(W-235,67,217,54,'#0c1b1dcf');text(LANE_NAMES[laneOf(player)],W-32,87,13,'#e4d8a7','right');text('Q 后移 / E 前移 · S+空格下落',W-30,107,10,'#a8c4b7','right');for(let i=0;i<3;i++)rect(W-223+i*11,77,7,25,i===laneOf(player)?'#edc679':'#45635a')}
