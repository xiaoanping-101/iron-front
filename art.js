'use strict';
const visuals={actors:[],props:new Map(),drawList:[],fx:[],high:true,shadow:null,glow:null,pickups:{}};
const ART=[
 ['#142c35','#698179','#747967','#354b4c','#e9bc73'],['#3b2934','#c18a68','#9c8060','#564e49','#ffc889'],['#0c1b32','#415b78','#536a76','#26394d','#83e9e1'],
 ['#132e32','#6c9480','#617c64','#2c5047','#c3dea3'],['#293b59','#a5becb','#b2c7c8','#667f94','#d6f6ef'],['#261d34','#9b5963','#77616b','#443547','#ffa77e']
];
function seeded(seed){return ()=>{seed=(Math.imul(seed,1664525)+1013904223)|0;return (seed>>>0)/4294967296}}
function artGlow(c,x,y,r,color,alpha='66'){const g=c.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,color+alpha);g.addColorStop(1,color+'00');c.fillStyle=g;c.fillRect(x-r,y-r,r*2,r*2)}
function paintBackdrop(layer){
 const p=ART[stage],rand=seeded(stage*543+layer*77+11);
 if(layer===0){const sky=ctx.createLinearGradient(0,0,0,300);sky.addColorStop(0,p[0]);sky.addColorStop(.7,p[1]);sky.addColorStop(1,p[1]);ctx.fillStyle=sky;ctx.fillRect(0,0,1920,H);artGlow(ctx,745,95,140,p[4],'55');ctx.fillStyle=stage===2?'#d6ede4':'#e8c894';ctx.beginPath();ctx.arc(745,95,23,0,Math.PI*2);ctx.fill();
  for(let i=0;i<28;i++){let x=rand()*1920,y=40+rand()*130;rect(x,y,65+rand()*90,2,p[4]+'18');rect(x+20,y-3,40,2,p[4]+'0b')}
  if(stage===2)for(let i=0;i<90;i++)rect(rand()*1920,rand()*150,1,1,'#bddce888');
  for(let i=0;i<25;i++){const x=i*83,h=40+rand()*90;if(stage===3||stage===4){poly([[x-80,270],[x+35,130+rand()*55],[x+190,270]],p[0]+'80')}else{rect(x,268-h,55,h,p[0]+'66');rect(x+10,255-h,28,20,p[0]+'66');for(let j=0;j<3;j++)rect(x+9+j*13,278-h,3,Math.max(5,h-25),p[1]+'66')}}
  return;
 }
 if(stage===3){
  for(let i=0;i<17;i++){let x=i*125,top=95+rand()*45;rect(x+31,top,12,170,'#23483f');rect(x+33,top,3,170,'#52735a');for(let n=0;n<8;n++){let lx=x+rand()*90-20,ly=top+rand()*60;poly([[lx-30,ly+16],[lx+3,ly-10],[lx+38,ly+15],[lx+8,ly+29]],n%2?'#365f4b':'#48785a')}line(x+69,top+20,x+63,261,'#8b9d6977',2);for(let k=0;k<6;k++)line(x+20,266,x+k*12-10,240+rand()*12,'#40694b',3)}return;
 }
 if(stage===4){for(let i=0;i<12;i++){const x=i*170;poly([[x-90,270],[x+45,72+i%3*20],[x+195,270]],i%2?'#577a91':'#7193a4');poly([[x+4,132+i%3*20],[x+45,72+i%3*20],[x+89,134+i%3*20],[x+51,117+i%3*20],[x+30,140+i%3*20]],'#d6e7e4')}
  for(let i=0;i<8;i++){const x=i*260;rect(x,222,235,48,'#365c70');poly([[x,222],[x+16,212],[x+246,212],[x+235,222]],'#cfdfda');for(let n=0;n<7;n++){rect(x+12+n*31,231,20,20,'#173a50');rect(x+13+n*31,231,19,3,'#a6ccd3')}rect(x+4,262,224,3,'#8daaa8')}return;
 }
 for(let i=0;i<11;i++){const x=i*190,h=80+(i*29)%65,top=272-h;
  rect(x,top,113,h,'#263e43');poly([[x,top],[x+16,top-11],[x+128,top-11],[x+113,top]],'#7b8b80');poly([[x+113,top],[x+128,top-11],[x+128,262],[x+113,272]],'#192f36');
  for(let r=0;r<Math.floor(h/12);r++)for(let n=0;n<8;n++)rect(x+n*14+(r%2)*5,top+5+r*12,11,1,'#b4c4a322');
  for(let n=0;n<4;n++){rect(x+9+n*25,top+17,16,24,'#0c2530');rect(x+10+n*25,top+18,14,2,p[4]+'99');rect(x+16+n*25,top+19,1,21,'#708d81');rect(x+10+n*25,top+30,14,1,'#6b827c')}
  rect(x+37,244,25,28,'#122c35');rect(x+40,247,19,2,'#607e74');rect(x+60,257,2,2,p[4]);
  line(x+152,top-19,x+152,272,'#2b4244',4);line(x+140,top-8,x+170,top-8,'#809083',3);ctx.strokeStyle='#20383d';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(x+151,top-8);ctx.quadraticCurveTo(x+243,top+30,x+340,top-4);ctx.stroke();
  if(i%3===1){line(x+70,top-9,x+74,top-57,'#73918a',2);line(x+56,top-40,x+92,top-40,'#73918a',2);rect(x+54,top-42,3,5,p[4]);rect(x+92,top-42,3,5,p[4])}
  if(stage===1||stage===5){rect(x+83,top-35,14,35,'#50615d');rect(x+81,top-37,18,4,'#9d9f87');for(let k=0;k<4;k++)rect(x+80-k*4,top-45-k*11,17+k*7,10,p[0]+'45')}
  if(stage===2||stage===5){rect(x+10,top+6,31,4,p[4]);artGlow(ctx,x+26,top+9,44,p[4],'33')}
 }
 // Scattered skyline cranes give industrial areas identifiable silhouettes.
 for(let i=0;i<3;i++){const x=360+i*660;line(x,270,x,108,'#56716c',5);line(x-40,108,x+155,108,'#718c7b',4);line(x,79,x+150,108,'#56716c',2);line(x,79,x-40,108,'#56716c',2);line(x+128,110,x+128,188,'#60776d',1);rect(x+123,187,11,5,'#3c5755')}
}
function detailGround(start){
 const p=ART[stage],rand=seeded(start+stage*981+94),surface=ctx.createLinearGradient(0,240,0,510);surface.addColorStop(0,p[3]);surface.addColorStop(.55,p[2]);surface.addColorStop(1,p[3]);
 for(let x=start;x<start+CHUNK_SIZE;x+=20)poly([[x,groundAt(x,0)],[x+20,groundAt(x+20,0)],[x+20,groundAt(x+20,231)],[x,groundAt(x,231)]],surface);
 for(let i=0;i<700;i++){const x=start+rand()*CHUNK_SIZE,z=rand()*227,y=groundAt(x,z);rect(x,y,1+rand()*3,1,rand()>.55?'#dce2b71d':'#0a242526')}
 for(let i=0;i<18;i++){const x=start+rand()*CHUNK_SIZE,z=25+rand()*170,y=groundAt(x,z);ctx.fillStyle=stage===3?'#abc7ad28':'#152c3020';ctx.beginPath();ctx.ellipse(x,y,12+rand()*26,3+rand()*8,-.2,0,Math.PI*2);ctx.fill();if(stage===4)line(x-8,y,x+16,y,'#e5f2ee77',1)}
 if(stage!==3){for(let x=Math.floor(start/120)*120;x<start+CHUNK_SIZE;x+=120){let z=55+(Math.abs(x*17)%115);for(let j=0;j<3;j++){let yy=groundAt(x+10,z+j*7);line(x,yy,x+65,yy+3,'#c7ceaf15',2)}line(x+8,groundAt(x+8,z+26),x+43,groundAt(x+43,z+32),'#182c3344',1)}}
 for(let x=Math.floor(start/310)*310;x<start+CHUNK_SIZE;x+=310){
  const z=80+(Math.abs(x)%65),y=groundAt(x,z);line(x,y,x+28,y+8,'#132a3155');line(x+28,y+8,x+47,y+2,'#132a3155');
  if(stage===1||stage===2||stage===5){rect(x+100,y+20,50,17,'#263e4299');for(let n=0;n<8;n++)line(x+103+n*6,y+22,x+103+n*6,y+34,'#8da39866',1);rect(x+98,y+19,54,2,'#bec2a255')}
  else {for(let n=0;n<7;n++){const xx=x+100+n*4;rect(xx,groundAt(xx,10),2,3+n%3,stage===4?'#e7f4e9':'#94a46b');}}
 }
 for(let x=Math.floor(start/70)*70;x<start+CHUNK_SIZE;x+=70){let y=groundAt(x,2);rect(x,y,54,5,stage===4?'#dae8df':'#a6b394');rect(x+1,y+5,52,4,'#203c3d');let f=groundAt(x,230);rect(x,f,66,4,'#0e2934');rect(x+4,f+9,54,2,'#7c92845c')}
 // Offset arrows mark forward progress without dividing the playfield into lanes.
 for(let x=Math.floor(start/620)*620+245;x<start+CHUNK_SIZE;x+=620){const y=groundAt(x,122);poly([[x,y-5],[x+22,y-5],[x+22,y-10],[x+37,y],[x+22,y+10],[x+22,y+5],[x,y+5]],p[4]+'45')}
}
function initVisuals(){
 visuals.fx=[];visuals.props.clear();
 if(!visuals.shadow){
  visuals.shadow=makeCanvas(96,24,c=>{const g=c.createRadialGradient(48,12,1,48,12,46);g.addColorStop(0,'#031b2377');g.addColorStop(1,'#031b2300');c.save();c.translate(0,9);c.scale(1,.27);c.fillStyle=g;c.fillRect(0,0,96,88);c.restore()});
  visuals.glow=makeCanvas(96,96,c=>artGlow(c,48,48,48,'#ffd695','bb'));
  for(let friendly=0;friendly<2;friendly++)for(let frame=0;frame<4;frame++)for(let dir=0;dir<8;dir++)visuals.actors.push(makeCanvas(80,72,c=>onCanvas(c,()=>paintSoldier(friendly,frame,dir))));
  for(const kind of ['health','supply','power'])visuals.pickups[kind]=makeCanvas(42,44,c=>onCanvas(c,()=>{const color=kind==='health'?'#a9d7a6':kind==='supply'?'#9cdee3':'#efc777';poly([[4,12],[11,6],[36,6],[30,12]],'#dbe0be');rect(4,12,27,24,'#243b42');poly([[31,12],[37,6],[37,30],[31,36]],'#476160');rect(6,14,23,20,color);rect(8,16,19,2,'#e7ebca');text(kind==='health'?'+':kind==='supply'?'A':'H',17,31,17,'#253f44','center')}));
 }
 for(const o of world.obstacles){const key=o.type;if(!visuals.props.has(key))visuals.props.set(key,makeCanvas(o.w+28,o.h+32,c=>onCanvas(c,()=>paintCover(o))));o.image=visuals.props.get(key)}
}
function paintSoldier(friendly,frame,dir){
 const angle=dir*Math.PI/4,face=Math.cos(angle)<-.1?-1:1,leg=[0,3,0,-3][frame];ctx.translate(36,8);ctx.scale(face,1);
 const suit=friendly?'#658e86':'#9e7864',light=friendly?'#a9c6a5':'#c7a180',dark=friendly?'#2a5159':'#51474a';
 rect(-12,14,25,22,'#132e38');rect(-12,32,9,14+leg,'#183743');rect(3,32,9,14-leg,'#203e48');rect(-13,43+leg,11,5,'#0b242f');rect(3,43-leg,13,5,'#0b242f');rect(-10,36,5,5,'#8d9f8c');rect(5,36,5,5,'#8d9f8c');
 rect(-15,18,7,17,dark);rect(-15,19,3,13,light);rect(-10,14,23,20,suit);rect(-8,15,19,3,light);rect(-7,18,3,16,dark);rect(6,18,3,16,dark);rect(-10,31,23,4,dark);rect(-2,32,5,3,'#d9c590');
 rect(-4,22,5,7,'#b4b98a');rect(3,22,5,7,'#9d9e73');rect(-3,23,3,1,'#e0d6a9');rect(-7,4,19,14,'#ddb688');rect(-7,4,3,10,'#a77f67');rect(7,10,6,3,'#eccea0');rect(-9,0,23,8,dark);rect(-8,0,21,3,light);rect(-8,3,21,5,suit);rect(-10,7,27,3,light);rect(0,10,12,4,'#143644');rect(2,10,8,1,'#a6eee5');rect(8,15,4,2,'#986856');
 if(friendly){rect(-10,15,22,3,'#e4bc76');poly([[-11,15],[-18,18],[-21,14]],'#d3a660')}
 ctx.save();ctx.translate(3,21);ctx.rotate(Math.atan2(Math.sin(angle),Math.cos(angle)*face));rect(0,-2,13,6,'#d9b58a');rect(10,-4,25,7,'#173440');rect(12,-6,17,2,'#9aaea4');rect(27,-3,12,3,'#b4c6ae');rect(13,3,5,8,'#102a35');rect(19,-3,4,2,'#d5b877');ctx.restore();
}
function paintCover(o){
 const p=ART[stage],w=o.w,h=o.h;ctx.translate(10,h+15);
 if(o.type==='container'){rect(0,-h,w,h,'#385c61');poly([[0,-h],[12,-h-10],[w+12,-h-10],[w,-h]],'#9bad99');poly([[w,-h],[w+12,-h-10],[w+12,-10],[w,0]],'#24424c');for(let x=7;x<w;x+=9){rect(x,-h+6,3,h-12,'#71918b');rect(x+3,-h+6,2,h-12,'#284c53')}rect(0,-8,w,4,'#8ca090');text('IF / 0'+(stage+1),w/2,-h+23,10,'#dfd5a8','center')}
 else if(o.type==='barrier'){poly([[0,0],[7,-h],[w-7,-h],[w,0]],'#788b83');poly([[7,-h],[18,-h-8],[w+4,-h-8],[w-7,-h]],'#bfc7ac');rect(9,-h+7,w-18,9,'#293f41');for(let x=12;x<w-16;x+=18)poly([[x,-h+7],[x+7,-h+7],[x+1,-h+16],[x-6,-h+16]],p[4]);rect(1,-3,w-2,3,'#3b5758')}
 else {rect(0,-h,w,h,'#66765c');poly([[0,-h],[11,-h-9],[w+11,-h-9],[w,-h]],'#a9b58a');poly([[w,-h],[w+11,-h-9],[w+11,-9],[w,0]],'#354e48');rect(3,-h+3,w-6,3,'#c1c595');rect(4,-h+3,4,h-5,'#a5b084');rect(w-8,-h+3,4,h-5,'#a5b084');line(9,-h+8,w-10,-6,'#b9bd8d',4);line(w-10,-h+8,9,-6,'#b9bd8d',4);rect(1,-3,w-2,3,'#314940')}
}
function cachedSoldier(e,friendly){const angle=Math.atan2(e.aimZ||0,e.aimX??1),dir=(Math.round(angle/(Math.PI/4))+8)%8,moving=friendly?Math.hypot(e.vx||0,e.vz||0)>.1:Math.hypot(e.travelX||0,e.travelZ||0)>.1;const frame=moving?Math.floor(tick/5)%4:0;const image=visuals.actors[(friendly?32:0)+frame*8+dir];
 if(e.flashUntil>tick){ctx.globalAlpha=.6;ctx.drawImage(image,Math.round(e.x)-22,Math.round(e.y)-8);ctx.globalAlpha=1}else ctx.drawImage(image,Math.round(e.x)-22,Math.round(e.y)-8);
 if(friendly&&e.reload>0){rect(e.x+19,e.y+29+Math.sin(e.reload*.2)*3,5,9,'#d9d6ab')}
 if(e.muzzleUntil>tick){const mx=e.x+15+(e.aimX||0)*34,my=e.y+20+(e.aimZ||0)*34;ctx.drawImage(visuals.glow,mx-16,my-16,32,32);line(mx,my,mx+(e.aimX||0)*9,my+(e.aimZ||0)*9,'#fff4c4',3)}
}
function addExplosion(x,y){if(visuals.fx.length>=12)visuals.fx.shift();visuals.fx.push({x,y,start:tick,duration:28})}
function drawEffects(){for(const f of visuals.fx){const age=tick-f.start;if(age<0||age>=f.duration||f.x<camera-100||f.x>camera+W+100)continue;const life=1-age/f.duration,r=16+age*2.3;ctx.globalAlpha=life;ctx.drawImage(visuals.glow,f.x-r,f.y-r,r*2,r*2);ctx.strokeStyle='#ffe0a4';ctx.lineWidth=1+life*2;ctx.beginPath();ctx.ellipse(f.x,f.y,r*.8,r*.45,0,0,Math.PI*2);ctx.stroke();ctx.globalAlpha=1}}
