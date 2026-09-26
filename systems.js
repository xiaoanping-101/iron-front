'use strict';
// Shared navigation grid and solid cover. All actors still use continuous x/z coordinates.
const NAV_CELL=26;
function buildMap(){
 world.obstacles=[];
 const end=stages[stage].length-1050;
 for(let x=610,i=0;x<end;x+=350,i++){
  const type=['crate','barrier','container'][(i+stage)%3];const width=type==='container'?104:type==='barrier'?90:56;
  world.obstacles.push({x,z:[55,171,104,164][(i+stage)%4],w:width,h:type==='container'?58:type==='barrier'?24:35,d:type==='container'?44:28,type});
 }
 const cols=Math.ceil(stages[stage].length/NAV_CELL),rows=Math.floor((MAP_FRONT-MAP_BACK)/NAV_CELL)+1;
 const grid=new Uint8Array(cols*rows);
 for(let r=0;r<rows;r++)for(let c=0;c<cols;c++){const x=c*NAV_CELL+NAV_CELL/2,z=MAP_BACK+r*NAV_CELL+NAV_CELL/2;grid[r*cols+c]=Number(z<=MAP_FRONT&&canStand(x,z,12,10,0))}
 world.nav={cols,rows,grid,dist:new Int16Array(cols*rows).fill(-1),queue:new Int32Array(cols*rows),target:-1,updates:0};
 for(const e of [...enemies,...pickups]){if(canStand(e.x+(e.w||24)/2,depthOf(e),12,10,e.lift||0))continue;for(let step=1;step<20;step++){let z=clamp(depthOf(e)+(step%2?1:-1)*Math.ceil(step/2)*15,MAP_BACK+5,MAP_FRONT-5);if(canStand(e.x+e.w/2,z,12,10,0)){e.z=z;break}}if(e.kind==='soldier'||e.kind==='drone')placeActor(e);else e.y=groundAt(e.x+12,e.z)-24}
}
function canStand(x,z,rx=12,rz=10,lift=0){return !(world.obstacles||[]).some(o=>lift<o.h&&x+rx>o.x&&x-rx<o.x+o.w&&z+rz>o.z-o.d/2&&z-rz<o.z+o.d/2)}
function moveOnGround(e,dx,dz){
 const min=e===player?checkpoint:0,lift=e.kind==='drone'?100:e.lift||0,oldX=e.x,oldZ=depthOf(e);
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
function coverHit(b){return (world.obstacles||[]).some(o=>b.alt<o.h&&b.x>o.x&&b.x<o.x+o.w&&Math.abs(b.z-o.z)<o.d/2)}
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
