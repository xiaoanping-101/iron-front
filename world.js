'use strict';
// Continuous ground coordinates: x follows the level; z spans its entire depth.
const MAP_BACK=12,MAP_FRONT=218,CHUNK_SIZE=640,CACHE_LIMIT=8;
let world={chunks:new Map(),builds:0,hits:0,layers:[],vignette:null},cameraY=0;
const depthOf=e=>e.z??130;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
function groundAt(x,z=130){
 const end=stages[stage].length-980,t=(x-650)%1050,start=x-t;
 if(x<650||start+620>end)return 270+z;
 const along=t<0||t>620?0:Math.sin(t/620*Math.PI)**2;
 return 270+z-along*(18+14*Math.sin(z/230*Math.PI));
}
function placeActor(e){e.y=groundAt(e.x+e.w/2,depthOf(e))-e.h-(e.lift||0)}
function walkActor(e,dx,dz=0){
 e.x=clamp(e.x+dx,e===player?checkpoint:0,stages[stage].length-e.w);e.z=clamp(depthOf(e)+dz,MAP_BACK,MAP_FRONT);
 if(e.kind==='drone'){e.lift=25+Math.sin(tick*.045+e.origin)*7;e.ground=false}
 else {e.jumpV=(e.jumpV||0)-.55;e.lift=Math.max(0,(e.lift||0)+e.jumpV);if(e.lift===0)e.jumpV=0;e.ground=e.lift===0}
 placeActor(e);
}
function makeWorld(){
 world.chunks.clear();world.builds=0;world.hits=0;cameraY=0;
 player.z=130;player.lift=0;player.jumpV=0;player.aimX=1;player.aimZ=0;placeActor(player);
 for(const e of enemies){e.z=MAP_BACK+25+(e.origin*17%155);e.lift=e.kind==='drone'?25:0;e.jumpV=0;e.ground=e.kind!=='drone';placeActor(e)}
 for(const p of pickups){p.z=45+(p.x*13%155);p.y=groundAt(p.x+12,p.z)-24}
 boss.z=130;boss.depthRadius=38;boss.lift=0;placeActor(boss);
 world.layers=[makeBackdrop(0),makeBackdrop(1)];
 world.vignette=makeCanvas(W,H,c=>{const v=c.createRadialGradient(W/2,H/2,200,W/2,H/2,600);v.addColorStop(0,'#06121800');v.addColorStop(1,'#06121860');c.fillStyle=v;c.fillRect(0,0,W,H)});
}
function bodyContact(a,b){return Math.abs(a.x+a.w/2-b.x-b.w/2)<(a.w+b.w)/2&&Math.abs(depthOf(a)-depthOf(b))<((a.depthRadius||12)+(b.depthRadius||12))&&Math.abs((a.lift||0)-(b.lift||0))<30}
function projectileHits(b,e){return b.x+5>=e.x&&b.x-5<=e.x+e.w&&Math.abs(depthOf(b)-depthOf(e))<(e.depthRadius||13)&&b.alt>=(e.lift||0)-4&&b.alt<=(e.lift||0)+e.h+4}
function pickupContact(p,a){return Math.abs(p.x+p.w/2-a.x-12)<27&&Math.abs(depthOf(p)-depthOf(a))<21&&(p.lift||0)<22}
function moveEnemy(e){
 let dx=player.x-e.x,dz=depthOf(player)-depthOf(e),distance=Math.hypot(dx,dz)||1;
 const range=e.kind==='drone'?170:105;
 if(distance>range){dx/=distance;dz/=distance}
 else {const side=Math.sin(tick*.016+(e.origin||0))>0?1:-1;dx=-dz/distance*side*.65;dz=(player.x-e.x)/distance*side*.65}
 const speed=e.kind==='drone'?1.35:1.05+stage*.035;walkActor(e,dx*speed,dz*speed);
 e.aimX=(player.x-e.x)/(Math.hypot(player.x-e.x,depthOf(player)-depthOf(e))||1);e.aimZ=(depthOf(player)-depthOf(e))/(Math.hypot(player.x-e.x,depthOf(player)-depthOf(e))||1);
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
function terrainChunk(index){
 if(world.chunks.has(index)){const value=world.chunks.get(index);world.chunks.delete(index);world.chunks.set(index,value);world.hits++;return value}
 const start=index*CHUNK_SIZE;
 const tile=makeCanvas(CHUNK_SIZE,H,c=>onCanvas(c,()=>{ctx.translate(-start,0);const s=stages[stage];
  // One continuous surface, not stacked strips. Patches share exact vertices.
  for(let x=start;x<start+CHUNK_SIZE;x+=20){
   const a=groundAt(x,MAP_BACK-12),b=groundAt(x+20,MAP_BACK-12),frontA=groundAt(x,MAP_FRONT+13),frontB=groundAt(x+20,MAP_FRONT+13);
   poly([[x,a],[x+20,b],[x+20,frontB],[x,frontA]],s.ground);
   poly([[x,frontA],[x+20,frontB],[x+20,H],[x,H]],'#273e3c');
   line(x,a,x+20,b,'#bcc5a0',2);line(x,frontA,x+20,frontB,'#a7b593',2);
   for(let z=25;z<225;z+=24){let h=groundAt(x+8,z);rect(x+4,h,6+(Math.abs(x+z)%9),1,'#132d3025');if((x/20+z)%3===0)rect(x+12,h+6,2,2,'#e2dca455')}
  }
  // Irregular paving seams and puddles unify the floor without suggesting lanes.
  for(let x=Math.floor(start/125)*125;x<start+CHUNK_SIZE;x+=125){const z=35+Math.abs(x*7%165),y=groundAt(x,z);line(x,y,x+35,y+8,'#273c3533');line(x+35,y+8,x+49,y+4,'#273c3533');
   if(stage===3){ctx.fillStyle='#a6c1ab44';ctx.beginPath();ctx.ellipse(x+60,groundAt(x+60,z+15),27,7,.1,0,Math.PI*2);ctx.fill()}
   if(stage===4){rect(x+20,y,31,2,'#edf4eb99');rect(x+32,y+5,42,1,'#edf4eb66')}
   if(stage===5){line(x,y,x+28,y+4,'#ed997955');rect(x+28,y+3,7,2,'#ffbd8355')}
  }
 }));world.builds++;world.chunks.set(index,tile);if(world.chunks.size>CACHE_LIMIT)world.chunks.delete(world.chunks.keys().next().value);return tile;
}
function drawTerrain(){for(let i=Math.max(0,Math.floor(camera/CHUNK_SIZE));i<=Math.floor((camera+W)/CHUNK_SIZE);i++)ctx.drawImage(terrainChunk(i),i*CHUNK_SIZE-camera,-cameraY)}
function projected(e,draw){ctx.save();ctx.translate(-Math.floor(camera),-cameraY);draw();ctx.restore()}
function visible(e){return e.x+(e.w||20)>camera-90&&e.x<camera+W+90}
function drawShadow(e){const floor=groundAt(e.x+e.w/2,depthOf(e));ctx.fillStyle='#071f2866';ctx.beginPath();ctx.ellipse(e.x+e.w/2,floor-1,e.w*.65,4,0,0,Math.PI*2);ctx.fill()}
function drawWorld(){
 drawBackground();drawTerrain();
 const objects=[];
 for(const a of pickups)if(visible(a))objects.push({e:a,kind:'pickup'});
 for(const e of enemies)if(visible(e))objects.push({e,kind:e.kind});
 if(boss.hp>0&&visible(boss))objects.push({e:boss,kind:'boss'});
 objects.push({e:player,kind:'player'});
 objects.sort((a,b)=>depthOf(a.e)-depthOf(b.e)||a.e.x-b.e.x);
 for(const {e,kind} of objects)projected(e,()=>{
  if(kind==='pickup'){let y=e.y+Math.sin(tick*.08+e.x)*3;rect(e.x-3,y-3,30,30,'#163c3b');rect(e.x,y,24,24,e.kind==='health'?'#92c394':e.kind==='supply'?'#98d1d4':'#e3bb69');text(e.kind==='health'?'+':e.kind==='supply'?'A':'H',e.x+12,y+18,20,'#20382d','center');return}
  drawShadow(e);
  if(kind==='player'){if(player.inv<=0||Math.floor(player.inv/5)%2===0||state==='title')soldier(e,true)}
  else if(kind==='soldier')soldier(e,false);
  else if(kind==='boss')drawBoss();
  else {rect(e.x,e.y,40,20,'#91a99d');rect(e.x-10,e.y-4,60,4,'#253d42');rect(e.x+5,e.y+3,30,2,'#d0d8b8');rect(e.x+15,e.y+20,9,7,'#f6b170');rect(e.x+7,e.y+7,26,6,'#213f47')}
 });
 for(const b of bullets)if(visible(b))projected(b,()=>{rect(b.x-2,b.y-2,10,8,b.owner==='player'?'#edbd5240':'#ff816144');rect(b.x,b.y,6,4,b.owner==='player'?'#fff0aa':'#ff9c79')});
 for(const g of grenades)if(visible(g))projected(g,()=>{rect(g.x-4,g.y-4,9,10,'#bad077');rect(g.x-1,g.y-7,4,4,'#eae3b2')});
 for(const a of particles)if(visible(a))projected(a,()=>{ctx.globalAlpha=Math.min(1,a.life/10);rect(a.x,a.y,a.size,a.size,a.color)});
 projected(player,()=>{const x=player.x+player.w/2,y=groundAt(x,player.z);line(x+player.aimX*20,y+player.aimZ*20,x+player.aimX*30,y+player.aimZ*30,'#f6d78caa',2)});
}
function movementHud(){rect(W-222,67,204,46,'#0c1b1dcf');text('WASD 自由移动',W-32,86,13,'#e4d8a7','right');text('J 沿朝向射击 · 空格跳跃',W-30,103,10,'#a8c4b7','right')}
