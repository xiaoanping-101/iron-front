/* Iron Front — original game and procedural pixel artwork. MIT. */
'use strict';
const {canvas,context:mainContext}=kontra.init('game');
let ctx=mainContext;ctx.imageSmoothingEnabled=false;
const W=960,H=540,FLOOR=454;
const stages=[
 {name:'边境废墟',label:'BORDER RUINS',sky:'#233c3c',mist:'#537267',mount:'#304e48',ground:'#65734a',accent:'#d8ad59',length:3600},
 {name:'赤沙工厂',label:'DUST FACTORY',sky:'#503a35',mist:'#b17650',mount:'#704c3a',ground:'#9c7245',accent:'#e4a158',length:4000},
 {name:'极夜要塞',label:'NIGHT CITADEL',sky:'#152737',mist:'#3d586b',mount:'#253d53',ground:'#536b70',accent:'#70d5d1',length:4300},
 {name:'雨林封锁',label:'MONSOON OUTPOST',sky:'#142f30',mist:'#3e6359',mount:'#294c43',ground:'#62835b',accent:'#b8d889',length:4600},
 {name:'冰原列车',label:'FROZEN RAILWAY',sky:'#30475a',mist:'#8ba6b1',mount:'#536d80',ground:'#bfd2cf',accent:'#b9ecf0',length:4900},
 {name:'熔炉核心',label:'INFERNO CORE',sky:'#281c2a',mist:'#79464c',mount:'#482e40',ground:'#766270',accent:'#ff9564',length:5200}
];
const MAG_SIZE=30,MAX_RESERVE=240,RELOAD_FRAMES=90,MAX_GRENADES=5;
let state='title',stage=0,score=0,best=0,camera=0,tick=0,shake=0,message=0,muted=false;
let player,enemies=[],bullets=[],grenades=[],particles=[],pickups=[],platforms=[],boss,checkpoint=0;
let keys=new Set(),pressed=new Set(),audio;
try{best=Number(localStorage.getItem('iron-front-best'))||0}catch{}
const overlay=document.getElementById('overlay'),start=document.getElementById('start');
document.getElementById('record').textContent='BEST '+String(best).padStart(6,'0');
const down=(...codes)=>codes.some(c=>keys.has(c));
const hit=(a,b)=>a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y;
const rnd=(a,b)=>a+Math.random()*(b-a);
function tone(f=200,d=.05,type='square',vol=.03){if(muted)return;try{audio??=new (window.AudioContext||window.webkitAudioContext)();if(audio.state==='suspended')audio.resume();let o=audio.createOscillator(),g=audio.createGain();o.type=type;o.frequency.setValueAtTime(f,audio.currentTime);o.frequency.exponentialRampToValueAtTime(Math.max(25,f/3),audio.currentTime+d);g.gain.setValueAtTime(vol,audio.currentTime);g.gain.exponentialRampToValueAtTime(.001,audio.currentTime+d);o.connect(g);g.connect(audio.destination);o.start();o.stop(audio.currentTime+d)}catch{}}
function rect(x,y,w,h,c){ctx.fillStyle=c;ctx.fillRect(Math.round(x),Math.round(y),w,h)}
function text(s,x,y,size=14,c='#eeeace',align='left'){ctx.fillStyle=c;ctx.font=`bold ${size}px monospace`;ctx.textAlign=align;ctx.fillText(s,x,y)}
function burst(x,y,color='#ffba59',n=16,lane=laneOf(player)){for(let i=0;i<n&&particles.length<220;i++)particles.push({x,y,lane,vx:rnd(-4,4),vy:rnd(-5,2),life:rnd(15,34),color,size:rnd(2,7)})}
function loadStage(){
 const s=stages[stage];camera=0;checkpoint=0;bullets=[];grenades=[];particles=[];pickups=[];enemies=[];platforms=[];message=170;
 player={x:80,y:FLOOR-48,w:27,h:48,vx:0,vy:0,hp:6,face:1,ground:true,inv:90,cd:0,ammo:3,grenadeCD:0,mag:MAG_SIZE,reserve:150,reload:0,power:0,lane:0,visualLane:0,laneCD:0,drop:0};
 for(let x=520;x<s.length-700;x+=540-stage*24)platforms.push({x,y:338+((Math.floor(x/500)+stage)%3)*22,w:150+(stage%3)*25,h:18});
 for(let x=650;x<s.length-500;x+=280-stage*8){let drone=(Math.floor(x/280)+stage)%4===3;enemies.push({x,y:drone?265:FLOOR-43,w:drone?40:28,h:drone?27:43,hp:drone?3:2,kind:drone?'drone':'soldier',cd:rnd(60,130),origin:x})}
 for(let x=850;x<s.length-600;x+=850)pickups.push({x,y:FLOOR-24,w:24,h:24,kind:x%1700===0?'health':'power'});
 for(let x=1150;x<s.length-300;x+=900)pickups.push({x,y:FLOOR-24,w:24,h:24,kind:'supply'});
 pickups.push({x:s.length-860,y:FLOOR-24,w:24,h:24,kind:'supply'});
 boss={x:s.length-340,y:FLOOR-110,w:170,h:110,hp:48+stage*16,max:48+stage*16,home:s.length-340,cd:90,phase:0,active:false};
 makeWorld();
}
function begin(){score=0;stage=0;state='play';overlay.style.display='none';loadStage();tone(440,.15,'sawtooth')}
function save(){best=Math.max(best,score);try{localStorage.setItem('iron-front-best',best)}catch{}document.getElementById('record').textContent='BEST '+String(best).padStart(6,'0')}
function modal(title,copy,button){overlay.style.display='flex';overlay.querySelector('h1').textContent=title;document.getElementById('brief').innerHTML=copy;start.textContent=button}
function pause(){if(state==='play'){state='paused';keys.clear();pressed.clear();modal('行动暂停','准备好后继续突围。','继续行动 →')}else if(state==='paused'){state='play';overlay.style.display='none'}}
start.onclick=()=>{if(state==='paused')pause();else if(state==='clear'){stage++;state='play';overlay.style.display='none';loadStage()}else begin()};
document.getElementById('pause').onclick=pause;
document.getElementById('sound').onclick=()=>{muted=!muted;document.getElementById('sound').textContent='声音：'+(muted?'关':'开')};
document.getElementById('full').onclick=()=>{if(document.fullscreenElement)document.exitFullscreen?.();else document.querySelector('.screen').requestFullscreen?.().catch(()=>{})};
window.addEventListener('keydown',e=>{if(['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code))e.preventDefault();if(!keys.has(e.code))pressed.add(e.code);keys.add(e.code);if(e.repeat)return;if(e.code==='KeyP'||e.code==='Escape')pause();if(e.code==='Enter'&&state!=='play'){e.preventDefault();start.click()}});
window.addEventListener('keyup',e=>keys.delete(e.code));
window.addEventListener('blur',()=>{keys.clear();pressed.clear();if(state==='play')pause()});
document.addEventListener('visibilitychange',()=>{if(document.hidden&&state==='play')pause()});
document.querySelectorAll('[data-key]').forEach(b=>{b.addEventListener('pointerdown',e=>{e.preventDefault();b.setPointerCapture(e.pointerId);keys.add(b.dataset.key);pressed.add(b.dataset.key)});for(const event of ['pointerup','pointercancel','lostpointercapture'])b.addEventListener(event,()=>keys.delete(b.dataset.key))});
function hurt(d=1){if(player.inv>0||state!=='play')return;player.hp-=d;player.inv=80;shake=9;tone(90,.2,'sawtooth');burst(player.x+13,player.y+20,'#ec7051',9);if(player.hp<=0){state='dead';save();modal('行动失败',`得分 ${score} · 到达第 ${stage+1} 关<br>保持移动，利用跳跃躲开火力。`,'重新出击 →')}}
function damage(e,d){if(e.hp<=0)return;e.hp-=d;burst(e.x+e.w/2,e.y+e.h/2,'#e8b85d',5,laneOf(e));if(e.hp<=0){score+=e===boss?1500:100;burst(e.x+e.w/2,e.y+e.h/2,'#ffa457',e===boss?70:18,laneOf(e));tone(70,.18,'sawtooth');shake=e===boss?18:3;if(e!==boss&&Math.random()<.15)pickups.push({x:e.x,y:groundAt(e.x,laneOf(e))-24,w:24,h:24,kind:'health',lane:laneOf(e)})}}
function reloadWeapon(){if(player.reload>0||player.mag===MAG_SIZE||player.reserve<=0)return false;player.reload=RELOAD_FRAMES;tone(230,.09,'triangle');return true}
function shoot(){if(player.cd>0||player.reload>0)return;if(player.mag<=0){reloadWeapon();return}player.mag--;const up=down('ArrowUp','KeyW');let powered=player.power>0;player.cd=powered?5:10;let x=player.x+13+(up?0:player.face*22),y=player.y+(up?-5:17);for(const offset of powered?[-.1,0,.1]:[0])bullets.push({x,y,w:up?5:14,h:up?14:5,vx:up?offset*12:player.face*12,vy:up?-12:offset*12,owner:'player',lane:laneOf(player),life:85});tone(powered?260:180,.045);burst(x,y,'#ffe394',2)}
function throwGrenade(){if(player.ammo<=0||player.grenadeCD>0)return;player.ammo--;player.grenadeCD=45;grenades.push({x:player.x+12,y:player.y+12,vx:player.face*6,vy:-8,lane:laneOf(player),life:52});tone(380,.06,'triangle')}
function explode(g){burst(g.x,g.y,'#ffb24e',45,laneOf(g));shake=12;tone(65,.3,'sawtooth',.08);for(const e of [...enemies,boss])if(sameLane(g,e)&&Math.hypot(e.x+e.w/2-g.x,e.y+e.h/2-g.y)<165)damage(e,12);bullets=bullets.filter(b=>b.owner==='player'||!sameLane(b,g)||Math.hypot(b.x-g.x,b.y-g.y)>180)}
function enemyShot(e,speed=3.2,spread=0){let dx=player.x+13-(e.x+e.w/2),dy=player.y+20-(e.y+e.h/2),a=Math.atan2(dy,dx)+spread;bullets.push({x:e.x+e.w/2,y:e.y+e.h/2,w:9,h:9,vx:Math.cos(a)*speed,vy:Math.sin(a)*speed,owner:'enemy',lane:e.spanLanes?laneOf(player):laneOf(e),life:210})}
function update(){
 if(state!=='play'){pressed.clear();return}tick++;message=Math.max(0,message-1);shake*=.88;
 const p=player,s=stages[stage];p.inv--;p.cd--;p.drop=Math.max(0,p.drop-1);p.laneCD=Math.max(0,p.laneCD-1);p.visualLane+=(laneOf(p)-p.visualLane)*.22;p.grenadeCD=Math.max(0,p.grenadeCD-1);if(p.reload>0&&--p.reload===0){let amount=Math.min(MAG_SIZE-p.mag,p.reserve);p.mag+=amount;p.reserve-=amount;tone(540,.07,'triangle')}p.power=Math.max(0,p.power-1);
 p.vx=(down('ArrowRight','KeyD')?3.7:0)-(down('ArrowLeft','KeyA')?3.7:0);if(p.vx)p.face=Math.sign(p.vx);
 if(pressed.has('KeyQ'))laneShift(1);if(pressed.has('KeyE'))laneShift(-1);
 if((pressed.has('Space')||pressed.has('KeyL'))&&p.ground){if(down('KeyS','ArrowDown')&&p.support){p.drop=22;p.y+=4;p.vy=1}else{p.vy=-11.7;tone(330,.08,'triangle')}p.ground=false}
 if(pressed.has('KeyR'))reloadWeapon();if(down('KeyJ'))shoot();if(pressed.has('KeyK'))throwGrenade();pressed.clear();
 walkActor(p,p.vx);
 const target=Math.max(0,Math.min(s.length-W,p.x-280));camera+=(target-camera)*.14;
 const targetY=Math.min(0,p.y-laneOf(p)*42-235);cameraY+=(targetY-cameraY)*.1;
 for(const e of enemies){if(e.hp<=0||Math.abs(e.x-p.x)>1000)continue;if(e.kind==='soldier'){walkActor(e,Math.abs(p.x-e.x)<45?0:Math.sign(p.x-e.x)*.65)}else{e.y=260+Math.sin(tick*.04+e.origin)*42}if(--e.cd<=0&&Math.abs(e.x-p.x)<650){enemyShot(e);e.cd=110-stage*14+rnd(0,40)}if(sameLane(p,e)&&hit(p,e))hurt()}
 if(p.x>s.length-920&&boss.hp>0){if(!boss.active){message=130;tone(100,.6,'sawtooth')}boss.active=true;checkpoint=s.length-960}
 if(boss.active&&boss.hp>0){boss.phase++;boss.x=boss.home+Math.sin(boss.phase*.018)*Math.min(60,stage*15);if(--boss.cd<=0){const spread=stage>=3?[-.38,-.19,0,.19,.38]:[-.24,0,.24];for(const a of spread)enemyShot(boss,3.4+stage*.25,a);boss.cd=boss.hp<boss.max/2?Math.max(40,60-stage*3):85-stage*3;tone(90,.1)}if(hit(p,boss))hurt(2)}
 for(const b of bullets){b.x+=b.vx;b.y+=b.vy;b.life--;if(b.owner==='player'){for(const e of [...enemies,boss]){if(e.hp>0&&(e!==boss||boss.active)&&sameLane(b,e)&&hit(b,e)){damage(e,1);b.life=0;break}}}else if(sameLane(b,p)&&hit(b,p)){hurt();b.life=0}}
 bullets=bullets.filter(b=>b.life>0&&b.y>-50&&b.y<FLOOR+20&&Math.abs(b.x-p.x)<1200);enemies=enemies.filter(e=>e.hp>0);
 for(const g of grenades){g.x+=g.vx;g.vy+=.35;g.y+=g.vy;const floor=groundAt(g.x,laneOf(g))-5;if(g.y>floor){g.y=floor;g.vy*=-.4;g.vx*=.75}if(--g.life<=0)explode(g)}grenades=grenades.filter(g=>g.life>0);
 for(const a of particles){a.x+=a.vx;a.y+=a.vy;a.vy+=.15;a.life--}particles=particles.filter(a=>a.life>0);
 pickups=pickups.filter(a=>{if(!sameLane(p,a)||!hit(p,a))return true;if(a.kind==='health'){p.hp=Math.min(6,p.hp+2)}else if(a.kind==='supply'){p.reserve=Math.min(MAX_RESERVE,p.reserve+90);p.ammo=Math.min(MAX_GRENADES,p.ammo+2)}else{p.power=650;p.reserve=Math.min(MAX_RESERVE,p.reserve+30)}score+=50;burst(a.x,a.y,'#9be2bb');tone(660,.15,'triangle');return false});
 if(state==='play'&&boss.hp<=0){score+=player.hp*100;save();state=stage===stages.length-1?'won':'clear';modal(stage===stages.length-1?'任务完成':'区域肃清',`第 ${stage+1} 关完成 · 得分 ${score}<br>${stage===stages.length-1?'机械军团已瓦解。前线，由你突破。':'下一关恢复生命、30 发弹匣、150 发备弹与 3 枚手雷。'}`,stage===stages.length-1?'再战一次 →':'下一关 →')}
}
function soldier(e,friendly){
 const x=Math.round(e.x),y=Math.round(e.y),face=friendly?pFace():Math.sign(player.x-e.x)||-1;let walk=friendly?Math.abs(player.vx)>0:true;let leg=walk?Math.sin(tick*.22)*5:0;
 ctx.save();ctx.translate(x+14,y);ctx.scale(face,1);rect(-14,e.h-1,28,4,'#11241d66');
 rect(-10,30,8,14+leg,'#273a35');rect(3,30,8,14-leg,'#344640');rect(-12,42+leg,11,5,'#182a29');rect(3,42-leg,12,5,'#182a29');rect(-11,15,23,20,friendly?'#d3b36d':'#977866');rect(-13,18,7,18,friendly?'#567350':'#564b44');rect(-6,19,13,14,friendly?'#7c9561':'#745340');rect(-7,3,18,14,'#d9b887');rect(-10,0,23,8,friendly?'#739764':'#844f48');rect(-11,6,26,3,friendly?'#b7bc78':'#ab6c50');rect(7,9,3,3,'#172e2b');rect(0,23,19,6,'#d9b887');
 if(friendly&&down('ArrowUp','KeyW')){rect(8,-12,6,35,'#1b2d30');rect(6,0,10,10,'#718175')}else{rect(9,19,25,7,'#253738');rect(30,19,8,4,'#9faaa0');rect(13,25,5,8,'#182728');rect(10,17,14,3,'#7b8b7a')}
 // Fine sprite shading: visor, straps, pouch seams, knee plates and backpack.
 rect(-13,16,4,17,'#273e36');rect(-12,17,2,13,'#a9ad74');rect(-7,19,2,13,'#d2c78b');rect(5,20,2,12,'#384f39');
 rect(-5,26,5,6,'#bdad6c');rect(2,26,5,6,'#a7985c');rect(-5,26,5,1,'#ead295');rect(-10,33,21,3,'#263d36');rect(-2,33,4,3,'#c9af71');
 rect(-7,38,5,3,'#8f9a77');rect(5,38,4,3,'#8f9a77');rect(-8,1,18,2,'#b7c892');rect(-6,4,5,2,'#425e4c');rect(2,9,9,3,'#384f4a');rect(4,9,5,1,'#9bdfd4');rect(7,14,4,2,'#a67755');
 if(friendly&&player.reload>0){let bob=Math.sin(player.reload*.23)*3;rect(11,27+bob,5,10,'#b5c1a3');rect(8,29+bob,8,4,'#d9b887')}
 ctx.restore();
}
function pFace(){return player.face}
function drawBoss(){if(!boss||boss.hp<=0)return;let b=boss,x=b.x,y=b.y;rect(x-10,y+82,192,30,'#14262b');for(let i=0;i<6;i++){rect(x+i*30,y+88,20,18,'#5b6960');rect(x+5+i*30,y+92,10,10,'#253939')}rect(x,y+45,173,43,'#5e6b4b');rect(x+8,y+40,150,9,'#93966a');rect(x+28,y+7,103,36,'#849070');rect(x+35,y,80,10,'#abb28c');rect(x-40,y+20,87,14,'#3a514b');rect(x-45,y+17,13,20,'#a6b594');rect(x+75,y+15,25,9,'#ef8662');rect(x+15,y+59,32,15,'#303f39');rect(x+117,y+58,39,17,'#303f39');for(let i=0;i<3;i++)rect(x+57+i*15,y+60,8,13,'#d7b566');for(let i=0;i<8;i++){rect(x+8+i*20,y+48,3,3,'#c7c49a');rect(x+8+i*20,y+79,3,3,'#b1b892')}
 for(let i=0;i<4;i++){rect(x+36+i*21,y+9,16,3,'#c0c79f');rect(x+119,y+17+i*4,15,2,'#30453d')}
 rect(x+8,y+53,150,2,'#b2ad78');rect(x+11,y+77,145,4,'#354a40');rect(x+77,y+16,19,2,'#ffd5a0');rect(x+102,y-25,2,26,'#a5b8a4');rect(x+99,y-28,8,4,stages[stage].accent);
 if(stage>=3){rect(x+120,y-8,21,17,'#607d79');rect(x+126,y-4,8,5,stages[stage].accent);rect(x+134,y-24,5,16,'#a4c4bb')}
 if(b.active&&b.cd<20){rect(x-48,y+22,6,8,'#fff2b4');ctx.fillStyle='#ffb45b30';ctx.beginPath();ctx.arc(x-44,y+25,18,0,Math.PI*2);ctx.fill()}}
function hud(){rect(18,17,288,63,'#0c1b1dcc');text('P1  /  VANGUARD',30,37,12,'#d2dcc0');for(let i=0;i<6;i++)rect(30+i*27,47,22,12,i<player.hp?'#e4b05c':'#384d43');text('G '+player.ammo+'/'+MAX_GRENADES,210,58,14,'#e8c785');text(String(score).padStart(6,'0'),W-26,40,26,'#f1ecd0','right');text(`OP. 0${stage+1} / ${stages[stage].name}`,W/2,34,14,'#dce2c9','center');rect(365,45,230,3,'#243d38');rect(365,45,230*Math.min(1,player.x/stages[stage].length),3,'#e4b05c');ammoHud();if(boss.active&&boss.hp>0){rect(282,491,396,28,'#10252a');rect(290,510,380,4,'#43594e');rect(290,510,380*boss.hp/boss.max,4,'#ed8c61');text('BOSS / 全线装甲镇压者',W/2,504,11,'#f2d7b5','center')}else text('ADVANCE →',W-24,509,12,'#bac8a0','right');if(message>0){text(boss.active?'WARNING · 重装单位接近':`MISSION 0${stage+1}`,W/2,143,27,'#f3c275','center');text(boss.active?'摧毁装甲核心，肃清区域':stages[stage].label,W/2,170,13,'#edf0d3','center')}}
function render(){ctx.save();if(state==='play'&&shake>.2)ctx.translate(Math.round(rnd(-shake,shake)),Math.round(rnd(-shake,shake)));drawWorld();atmosphere();ctx.restore();if(state!=='title'){hud();routeHud()}}
loadStage();player.x=630;camera=0;
const loop=kontra.GameLoop({update,render});loop.start();

// Layered procedural scenery: stable world-space details, no external artwork.
function line(x1,y1,x2,y2,color,width=1){ctx.strokeStyle=color;ctx.lineWidth=width;ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.stroke()}
function poly(points,color){ctx.fillStyle=color;ctx.beginPath();points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.closePath();ctx.fill()}
function atmosphere(){
 if(stage===3){for(let i=0;i<70;i++){let x=(i*107+tick*2)%W,y=(i*67+tick*9)%H;line(x,y,x-4,y+16,'#c6e9e733')}}
 else if(stage===4){for(let i=0;i<55;i++){let x=(i*137+tick*.65+Math.sin(i+tick*.02)*10)%W,y=(i*51+tick*(1+i%3*.2))%H;rect(x,y,i%3===0?3:2,2,'#e6f3ebaa')}}
 else {for(let i=0;i<22;i++){let x=(i*179+tick*.22)%W,y=430-(i*41+tick*(stage===5?1.5:.15))%350;rect(x,y,2,i%3===0?3:1,stage===5?'#ffc27caa':'#d1bb7833')}}
 ctx.drawImage(world.vignette,0,0);
}
function ammoHud(){
 const p=player;rect(18,81,288,51,'#0c1b1dd9');
 text(p.reload>0?'换弹中…':p.mag===0?(p.reserve?'按 R 换弹':'弹药耗尽 · 寻找 A 补给'):p.power>0?'HEAVY MACHINE GUN':'ASSAULT RIFLE',30,98,11,p.mag?'#c8d6b8':'#ffb275');
 text(String(p.mag).padStart(2,'0')+' / '+MAG_SIZE,30,120,19,'#f0d390');text('备弹 '+p.reserve,178,120,12,'#a9c4b5');
 if(p.reload>0){rect(30,126,260,3,'#354c46');rect(30,126,260*(1-p.reload/RELOAD_FRAMES),3,'#e8bf76')}
 if(p.grenadeCD>0)rect(211,64,71*(1-p.grenadeCD/45),2,'#dbaf70');
}
