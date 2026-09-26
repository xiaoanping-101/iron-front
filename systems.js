'use strict';
// Shared navigation grid and solid cover. All actors still use continuous x/z coordinates.
const NAV_CELL=26;
const COVER_BIN=240;
let coverStamp=0;
const COVER_TYPES={crate:{w:56,h:35,d:28},barrier:{w:90,h:24,d:28},container:{w:112,h:60,d:48},sandbag:{w:98,h:26,d:34},tank:{w:48,h:48,d:40,round:true}};
const SECTOR_PLANS=[
 {name:'前哨检查站',surface:'concrete',cover:[['barrier',230,170],['sandbag',425,70],['tank',585,173]]},
 {name:'仓储装卸区',surface:'paving',cover:[['container',70,52],['crate',258,171],['crate',330,171],['sandbag',455,71],['tank',602,170]]},
 {name:'维修中庭',surface:'grate',cover:[['sandbag',60,173],['tank',255,60],['barrier',370,155],['crate',565,65]]}
];
function buildMap(){
 world.obstacles=[];world.coverBins=new Map();world.sectors=[{x:0,end:520,name:'集结入口',surface:'concrete'}];world.coverCandidates=0;
 const end=stages[stage].length-1000;
 function add(type,x,z){const dimensions=COVER_TYPES[type];world.obstacles.push({id:world.obstacles.length,type,x,z,...dimensions,baseY:groundAt(x+dimensions.w/2,z),variant:world.obstacles.length%3})}
 add('crate',610,55);
 for(let x=520,i=0;x<end;x+=760,i++){
  const plan=SECTOR_PLANS[(i+stage)%SECTOR_PLANS.length],stop=Math.min(end,x+760);world.sectors.push({x,end:stop,name:plan.name,surface:plan.surface});
  for(const [type,offset,z] of plan.cover){const px=x+offset;if(px+COVER_TYPES[type].w>stop-28||px<710)continue;add(type,px,z)}
 }
 world.sectors.push({x:end,end:stages[stage].length,name:'装甲决战区',surface:'arena'});
 for(const o of world.obstacles){o.elevation=270+o.z-o.baseY;for(let i=Math.floor(o.x/COVER_BIN);i<=Math.floor((o.x+o.w)/COVER_BIN);i++){if(!world.coverBins.has(i))world.coverBins.set(i,[]);world.coverBins.get(i).push(o)}}
 const cols=Math.ceil(stages[stage].length/NAV_CELL),rows=Math.floor((MAP_FRONT-MAP_BACK)/NAV_CELL)+1,grid=new Uint8Array(cols*rows);
 for(let r=0;r<rows;r++)for(let c=0;c<cols;c++){const x=c*NAV_CELL+NAV_CELL/2,z=MAP_BACK+r*NAV_CELL+NAV_CELL/2;grid[r*cols+c]=Number(z<=MAP_FRONT&&canStand(x,z,12,10,0))}
 world.nav={cols,rows,grid,dist:new Int16Array(cols*rows).fill(-1),queue:new Int32Array(cols*rows),target:-1,updates:0};
 // Relocate every supply/enemy to a valid navigation cell, not only out of its nearest box.
 for(const e of [...enemies,...pickups]){if(e.kind==='drone')continue;if(canStand(e.x+(e.w||24)/2,depthOf(e),12,10,0))continue;let best=-1,distance=Infinity;
  for(let r=0;r<rows;r++)for(let c=Math.max(0,Math.floor(e.x/NAV_CELL)-5);c<Math.min(cols,Math.floor(e.x/NAV_CELL)+6);c++){if(!grid[r*cols+c])continue;const px=c*NAV_CELL+13,pz=MAP_BACK+r*NAV_CELL+13,d=(px-e.x-e.w/2)**2+(pz-depthOf(e))**2;if(d<distance){distance=d;best=r*cols+c}}
  if(best>=0){e.x=best%cols*NAV_CELL+13-e.w/2;e.z=MAP_BACK+Math.floor(best/cols)*NAV_CELL+13}if(e.kind==='soldier')placeActor(e);else e.y=groundAt(e.x+12,e.z)-24;
 }
}
function scanCover(minX,maxX,visit){const stamp=++coverStamp;for(let i=Math.floor(minX/COVER_BIN);i<=Math.floor(maxX/COVER_BIN);i++)for(const o of world.coverBins?.get(i)||[]){if(o._stamp===stamp)continue;o._stamp=stamp;world.coverCandidates++;if(visit(o))return o}return null}
function footprintOverlap(o,x,z,rx=0,rz=0){
 if(!o.round)return x+rx>o.x&&x-rx<o.x+o.w&&z+rz>o.z-o.d/2&&z-rz<o.z+o.d/2;
 const cx=o.x+o.w/2,px=clamp(cx,x-rx,x+rx),pz=clamp(o.z,z-rz,z+rz);return ((px-cx)/(o.w/2))**2+((pz-o.z)/(o.d/2))**2<1;
}
function coverTopAt(o,x,z){return o.h+o.elevation-(270+z-groundAt(x,z))}
function canStand(x,z,rx=12,rz=10,lift=0){return !scanCover(x-rx,x+rx,o=>lift<coverTopAt(o,x,z)-.05&&footprintOverlap(o,x,z,rx,rz))}
function coverSupport(e){let height=0,support=null;const x=e.x+e.w/2,z=depthOf(e);scanCover(x,x,o=>{const top=coverTopAt(o,x,z);if(footprintOverlap(o,x,z)&&((e.lift||0)>=top-.15||(e.ground&&e.supportCover===o))&&top>height){height=top;support=o}return false});e.supportCover=support;return height}
function moveOnGround(e,dx,dz){
 const min=e===player?checkpoint:0,lift=e.kind==='drone'?150:(e.lift||0)+(e.supportCover?2:0),oldX=e.x,oldZ=depthOf(e);
 const x=clamp(e.x+dx,min,stages[stage].length-e.w);if(canStand(x+e.w/2,oldZ,Math.min(12,e.w/2),9,lift))e.x=x;
 const z=clamp(oldZ+dz,MAP_BACK,MAP_FRONT);if(canStand(e.x+e.w/2,z,Math.min(12,e.w/2),9,lift))e.z=z;
 e.travelX=e.x-oldX;e.travelZ=depthOf(e)-oldZ;
}
function navCell(x,z){const n=world.nav;return clamp(Math.floor((z-MAP_BACK)/NAV_CELL),0,n.rows-1)*n.cols+clamp(Math.floor(x/NAV_CELL),0,n.cols-1)}
function refreshFlow(){
 const n=world.nav;if(!n)return;let goal=navCell(player.x+13,player.z);
 if(!n.grid[goal]){const row=Math.floor(goal/n.cols),col=goal%n.cols;let best=Infinity;for(let r=Math.max(0,row-4);r<Math.min(n.rows,row+5);r++)for(let c=Math.max(0,col-4);c<Math.min(n.cols,col+5);c++){const i=r*n.cols+c,d=(r-row)**2+(c-col)**2;if(n.grid[i]&&d<best){best=d;goal=i}}}
 if(n.target===goal)return;n.target=goal;n.updates++;n.dist.fill(-1);let head=0,tail=0;n.queue[tail++]=goal;n.dist[goal]=0;
 while(head<tail){const i=n.queue[head++],row=Math.floor(i/n.cols),col=i%n.cols;for(const j of [col>0?i-1:-1,col<n.cols-1?i+1:-1,row>0?i-n.cols:-1,row<n.rows-1?i+n.cols:-1])if(j>=0&&n.grid[j]&&n.dist[j]<0){n.dist[j]=n.dist[i]+1;n.queue[tail++]=j}}
}
function clearTravel(e,tx,tz){const sx=e.x+e.w/2,sz=depthOf(e),steps=Math.ceil(Math.hypot(tx-sx,tz-sz)/15);for(let i=1;i<=steps;i++)if(!canStand(sx+(tx-sx)*i/steps,sz+(tz-sz)*i/steps,12,10,e.kind==='drone'?100:0))return false;return true}
function flowDirection(e){
 refreshFlow();const n=world.nav,i=navCell(e.x+e.w/2,depthOf(e)),row=Math.floor(i/n.cols),col=i%n.cols;let best=i;
 for(const j of [col>0?i-1:-1,col<n.cols-1?i+1:-1,row>0?i-n.cols:-1,row<n.rows-1?i+n.cols:-1])if(j>=0&&n.grid[j]&&n.dist[j]>=0&&(n.dist[best]<0||n.dist[j]<n.dist[best]))best=j;
 const tx=best%n.cols*NAV_CELL+NAV_CELL/2,tz=MAP_BACK+Math.floor(best/n.cols)*NAV_CELL+NAV_CELL/2;let dx=tx-e.x-e.w/2,dz=tz-depthOf(e),d=Math.hypot(dx,dz)||1;return [dx/d,dz/d];
}
function coverHit(b){return !!scanCover(b.x,b.x,o=>b.alt<coverTopAt(o,b.x,b.z)&&footprintOverlap(o,b.x,b.z))}
function coverImpact(b,from){
 let result=null,nearest=Infinity;const endHeight=270+b.z-groundAt(b.x,b.z)+b.alt,startHeight=270+from.z-groundAt(from.x,from.z)+from.alt;
 scanCover(Math.min(from.x,b.x),Math.max(from.x,b.x),o=>{
  let enter=0,leave=1;const clip=(p,v,min,max)=>{if(Math.abs(v)<1e-9)return p>=min&&p<=max;let t1=(min-p)/v,t2=(max-p)/v;if(t1>t2)[t1,t2]=[t2,t1];enter=Math.max(enter,t1);leave=Math.min(leave,t2);return enter<=leave};
  if(!clip(from.x,b.x-from.x,o.x,o.x+o.w)||!clip(from.z,b.z-from.z,o.z-o.d/2,o.z+o.d/2)||!clip(startHeight,endHeight-startHeight,o.elevation,o.elevation+o.h))return false;
  if(o.round){const x=(from.x-o.x-o.w/2)/(o.w/2),z=(from.z-o.z)/(o.d/2),dx=(b.x-from.x)/(o.w/2),dz=(b.z-from.z)/(o.d/2),A=dx*dx+dz*dz,B=2*(x*dx+z*dz),C=x*x+z*z-1;
   if(A<1e-10){if(C>0)return false}else{const disc=B*B-4*A*C;if(disc<0)return false;enter=Math.max(enter,(-B-Math.sqrt(disc))/(2*A));leave=Math.min(leave,(-B+Math.sqrt(disc))/(2*A));if(enter>leave)return false}}
  if(enter>=0&&enter<=1&&enter<nearest){nearest=enter;result={cover:o,t:enter}}return false;
 });return result;
}
function movePlayer(){
 const p=player;let mx=Number(down('ArrowRight','KeyD'))-Number(down('ArrowLeft','KeyA')),mz=Number(down('ArrowDown','KeyS'))-Number(down('ArrowUp','KeyW')),length=Math.hypot(mx,mz);
 if(length){mx/=length;mz/=length;p.aimX=mx;p.aimZ=mz;if(mx)p.face=Math.sign(mx)}
 p.dashCD=Math.max(0,(p.dashCD||0)-1);p.dash=Math.max(0,(p.dash||0)-1);
 if((pressed.has('ShiftLeft')||pressed.has('ShiftRight'))&&p.dashCD===0&&length&&p.ground){p.dash=10;p.dashCD=65;p.dashX=mx;p.dashZ=mz;tone(200,.08,'triangle')}
 const tx=p.dash?p.dashX*7.2:mx*3.7,tz=p.dash?p.dashZ*7.2:mz*3.7,dx=tx-(p.vx||0),dz=tz-(p.vz||0),d=Math.hypot(dx,dz),accel=p.dash?3:length?.85:1.25;
 p.vx=(p.vx||0)+(d?dx/d*Math.min(d,accel):0);p.vz=(p.vz||0)+(d?dz/d*Math.min(d,accel):0);
 if(pressed.has('Space')||pressed.has('KeyL'))p.jumpBuffer=7;else p.jumpBuffer=Math.max(0,(p.jumpBuffer||0)-1);
 if(p.jumpBuffer>0&&p.ground){p.jumpV=10.5;p.ground=false;p.jumpBuffer=0;tone(330,.08,'triangle')}
}
