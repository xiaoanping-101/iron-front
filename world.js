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
 moveOnGround(e,dx,dz);
 if(e.kind==='drone'){e.lift=25+Math.sin(tick*.045+e.origin)*7;e.ground=false}
 else {const support=coverSupport(e);e.jumpV=(e.jumpV||0)-.55;e.lift=Math.max(support,(e.lift||0)+e.jumpV);e.ground=e.lift===support;if(e.ground)e.jumpV=0}
 placeActor(e);
}
function makeWorld(){
 world.chunks.clear();world.builds=0;world.hits=0;cameraY=0;
 player.z=130;player.lift=0;player.jumpV=0;player.aimX=1;player.aimZ=0;placeActor(player);
 for(const e of enemies){e.z=MAP_BACK+25+(e.origin*17%155);e.lift=e.kind==='drone'?25:0;e.jumpV=0;e.ground=e.kind!=='drone';placeActor(e)}
 for(const p of pickups){p.z=45+(p.x*13%155);p.y=groundAt(p.x+12,p.z)-24}
 boss.z=130;boss.depthRadius=38;boss.lift=0;placeActor(boss);
 buildMap();initVisuals();world.layers=[makeBackdrop(0),makeBackdrop(1)];
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
 if(e.kind!=='drone'&&!clearTravel(e,player.x+13,player.z))[dx,dz]=flowDirection(e);
 const speed=e.kind==='drone'?1.35:1.05+stage*.035;walkActor(e,dx*speed,dz*speed);
 e.aimX=(player.x-e.x)/(Math.hypot(player.x-e.x,depthOf(player)-depthOf(e))||1);e.aimZ=(depthOf(player)-depthOf(e))/(Math.hypot(player.x-e.x,depthOf(player)-depthOf(e))||1);
}
function makeCanvas(w,h,draw){const c=document.createElement('canvas');c.width=w;c.height=h;draw(c.getContext('2d'));return c}
function onCanvas(c,draw){const previous=ctx;ctx=c;c.imageSmoothingEnabled=false;try{draw()}finally{ctx=previous}}
function makeBackdrop(layer){return makeCanvas(1920,H,c=>onCanvas(c,()=>paintBackdrop(layer)))}
function drawBackground(){rect(0,0,W,H,stages[stage].sky);for(let i=0;i<world.layers.length;i++){const offset=Math.floor(camera*(i===0?.12:.36))%1920;ctx.drawImage(world.layers[i],-offset,-cameraY*(i===0?.12:.3));if(offset+W>1920)ctx.drawImage(world.layers[i],1920-offset,-cameraY*(i===0?.12:.3))}}
function terrainChunk(index){
 if(world.chunks.has(index)){const value=world.chunks.get(index);world.chunks.delete(index);world.chunks.set(index,value);world.hits++;return value}
 const start=index*CHUNK_SIZE;
 const tile=makeCanvas(CHUNK_SIZE,H,c=>onCanvas(c,()=>{ctx.translate(-start,0);
 for(let x=start;x<start+CHUNK_SIZE;x+=20)poly([[x,groundAt(x,231)],[x+20,groundAt(x+20,231)],[x+20,H],[x,H]],'#263e42');
 detailGround(start);paintMapGround(start);
 }));world.builds++;world.chunks.set(index,tile);if(world.chunks.size>CACHE_LIMIT)world.chunks.delete(world.chunks.keys().next().value);return tile;
}
function drawTerrain(){for(let i=Math.max(0,Math.floor(camera/CHUNK_SIZE));i<=Math.floor((camera+W)/CHUNK_SIZE);i++)ctx.drawImage(terrainChunk(i),i*CHUNK_SIZE-Math.floor(camera),-Math.floor(cameraY))}
function projected(e,draw){ctx.save();ctx.translate(-Math.floor(camera),-cameraY);draw();ctx.restore()}
function visible(e){return e.x+(e.w||20)>camera-90&&e.x<camera+W+90}
function drawShadow(e){const floor=groundAt(e.x+e.w/2,depthOf(e)),width=e.w*(1.7-Math.min(.4,(e.lift||0)/250));ctx.drawImage(visuals.shadow,e.x+e.w/2-width/2,floor-7,width,18)}
function drawWorld(){
 drawBackground();drawTerrain();const objects=visuals.drawList;objects.length=0;
 for(const a of pickups)if(visible(a))objects.push(a);for(const e of enemies)if(visible(e))objects.push(e);for(const o of world.obstacles)if(visible(o))objects.push(o);
 if(boss.hp>0&&visible(boss))objects.push(boss);objects.push(player);for(const e of objects)e.drawDepth=renderDepth(e);objects.sort((a,b)=>a.drawDepth-b.drawDepth||a.x-b.x);
 ctx.save();ctx.translate(-Math.floor(camera),-cameraY);
 for(const e of objects){
  if(e.type){drawCover(e);continue}
  if(['health','supply','power'].includes(e.kind)){const y=(e.y??groundAt(e.x+12,e.z)-24)+Math.sin(tick*.08+e.x)*2;if(visuals.high){ctx.globalAlpha=.22;ctx.drawImage(visuals.glow,e.x-12,y+4,50,25);ctx.globalAlpha=1}ctx.drawImage(visuals.pickups[e.kind],e.x-6,y-9);continue}
  drawShadow(e);
  if(e===player){if(player.inv<=0||Math.floor(player.inv/5)%2===0||state==='title')cachedSoldier(e,true)}else if(e.kind==='soldier')cachedSoldier(e,false);else if(e===boss)drawBoss();
  else {rect(e.x,e.y,40,20,'#91a99d');rect(e.x-10,e.y-4,60,4,'#253d42');rect(e.x+5,e.y+3,30,2,'#d0d8b8');rect(e.x+15,e.y+20,9,7,'#f6b170');rect(e.x+7,e.y+7,26,6,'#213f47');line(e.x+3,e.y-6,e.x+13+Math.sin(tick)*8,e.y-6,'#a8c6ad',1)}
 }
 for(const b of bullets)if(visible(b)){line(b.x-b.vx*.8,b.y-b.vz*.8,b.x,b.y,b.owner==='player'?'#fce5a2':'#fc947d',2);rect(b.x,b.y,4,3,b.owner==='player'?'#fff5ce':'#ffd4a7')}
 for(const g of grenades)if(visible(g)){ctx.globalAlpha=.5;ctx.drawImage(visuals.shadow,g.x-10,groundAt(g.x,g.z)-3,20,6);ctx.globalAlpha=1;rect(g.x-4,g.y-4,9,10,'#bad077');rect(g.x-1,g.y-7,4,4,'#eae3b2')}
 for(let i=0;i<particles.length;i++){const a=particles[i];if(visible(a)&&(visuals.high||i%2===0)){ctx.globalAlpha=Math.min(1,a.life/10);rect(a.x,a.y,a.size,a.size,a.color)}}ctx.globalAlpha=1;
 if(visuals.high)drawEffects();const x=player.x+player.w/2,y=groundAt(x,player.z);line(x+player.aimX*20,y+player.aimZ*20,x+player.aimX*30,y+player.aimZ*30,'#f6d78caa',2);ctx.restore();
}
function movementHud(){const section=world.sectors.find(s=>player.x>=s.x&&player.x<s.end)||world.sectors[0];rect(W-222,67,204,91,'#0c1b1dda');text(section.name,W-30,85,12,'#e4d8a7','right');ctx.drawImage(world.minimap,W-218,92);const scale=196/stages[stage].length;ctx.strokeStyle='#d4dec177';ctx.lineWidth=1;ctx.strokeRect(W-218+camera*scale,93,W*scale,37);rect(W-218+player.x*scale,95+(player.z-MAP_BACK)/(MAP_FRONT-MAP_BACK)*29,3,4,'#ffe7a2');text('WASD 移动 · Shift 冲刺',W-30,150,10,'#a8c4b7','right')}
