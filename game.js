/* Iron Front — original game and procedural pixel artwork. MIT. */
'use strict';
const {canvas,context:ctx}=kontra.init('game');
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
function burst(x,y,color='#ffba59',n=16){for(let i=0;i<n;i++)particles.push({x,y,vx:rnd(-4,4),vy:rnd(-5,2),life:rnd(15,34),color,size:rnd(2,7)})}
function loadStage(){
 const s=stages[stage];camera=0;checkpoint=0;bullets=[];grenades=[];particles=[];pickups=[];enemies=[];platforms=[];message=170;
 player={x:80,y:FLOOR-48,w:27,h:48,vx:0,vy:0,hp:6,face:1,ground:true,inv:90,cd:0,ammo:3,grenadeCD:0,mag:MAG_SIZE,reserve:150,reload:0,power:0};
 for(let x=520;x<s.length-700;x+=540-stage*24)platforms.push({x,y:338+((Math.floor(x/500)+stage)%3)*22,w:150+(stage%3)*25,h:18});
 for(let x=650;x<s.length-500;x+=280-stage*8){let drone=(Math.floor(x/280)+stage)%4===3;enemies.push({x,y:drone?265:FLOOR-43,w:drone?40:28,h:drone?27:43,hp:drone?3:2,kind:drone?'drone':'soldier',cd:rnd(60,130),origin:x})}
 for(let x=850;x<s.length-600;x+=850)pickups.push({x,y:FLOOR-24,w:24,h:24,kind:x%1700===0?'health':'power'});
 for(let x=1150;x<s.length-300;x+=900)pickups.push({x,y:FLOOR-24,w:24,h:24,kind:'supply'});
 pickups.push({x:s.length-860,y:FLOOR-24,w:24,h:24,kind:'supply'});
 boss={x:s.length-340,y:FLOOR-110,w:170,h:110,hp:48+stage*16,max:48+stage*16,home:s.length-340,cd:90,phase:0,active:false};
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
function damage(e,d){if(e.hp<=0)return;e.hp-=d;burst(e.x+e.w/2,e.y+e.h/2,'#e8b85d',5);if(e.hp<=0){score+=e===boss?1500:100;burst(e.x+e.w/2,e.y+e.h/2,'#ffa457',e===boss?70:18);tone(70,.18,'sawtooth');shake=e===boss?18:3;if(e!==boss&&Math.random()<.15)pickups.push({x:e.x,y:FLOOR-24,w:24,h:24,kind:'health'})}}
function reloadWeapon(){if(player.reload>0||player.mag===MAG_SIZE||player.reserve<=0)return false;player.reload=RELOAD_FRAMES;tone(230,.09,'triangle');return true}
function shoot(){if(player.cd>0||player.reload>0)return;if(player.mag<=0){reloadWeapon();return}player.mag--;const up=down('ArrowUp','KeyW');let powered=player.power>0;player.cd=powered?5:10;let x=player.x+13+(up?0:player.face*22),y=player.y+(up?-5:17);for(const offset of powered?[-.1,0,.1]:[0])bullets.push({x,y,w:up?5:14,h:up?14:5,vx:up?offset*12:player.face*12,vy:up?-12:offset*12,owner:'player',life:85});tone(powered?260:180,.045);burst(x,y,'#ffe394',2)}
function throwGrenade(){if(player.ammo<=0||player.grenadeCD>0)return;player.ammo--;player.grenadeCD=45;grenades.push({x:player.x+12,y:player.y+12,vx:player.face*6,vy:-8,life:52});tone(380,.06,'triangle')}
function explode(g){burst(g.x,g.y,'#ffb24e',45);shake=12;tone(65,.3,'sawtooth',.08);for(const e of [...enemies,boss])if(Math.hypot(e.x+e.w/2-g.x,e.y+e.h/2-g.y)<165)damage(e,12);bullets=bullets.filter(b=>b.owner==='player'||Math.hypot(b.x-g.x,b.y-g.y)>180)}
function enemyShot(e,speed=3.2,spread=0){let dx=player.x+13-(e.x+e.w/2),dy=player.y+20-(e.y+e.h/2),a=Math.atan2(dy,dx)+spread;bullets.push({x:e.x+e.w/2,y:e.y+e.h/2,w:9,h:9,vx:Math.cos(a)*speed,vy:Math.sin(a)*speed,owner:'enemy',life:210})}
function update(){
 if(state!=='play'){pressed.clear();return}tick++;message=Math.max(0,message-1);shake*=.88;
 const p=player,s=stages[stage];p.inv--;p.cd--;p.grenadeCD=Math.max(0,p.grenadeCD-1);if(p.reload>0&&--p.reload===0){let amount=Math.min(MAG_SIZE-p.mag,p.reserve);p.mag+=amount;p.reserve-=amount;tone(540,.07,'triangle')}p.power=Math.max(0,p.power-1);
 p.vx=(down('ArrowRight','KeyD')?3.7:0)-(down('ArrowLeft','KeyA')?3.7:0);if(p.vx)p.face=Math.sign(p.vx);
 if((pressed.has('Space')||pressed.has('KeyL'))&&p.ground){p.vy=-11.7;p.ground=false;tone(330,.08,'triangle')}
 if(pressed.has('KeyR'))reloadWeapon();if(down('KeyJ'))shoot();if(pressed.has('KeyK'))throwGrenade();pressed.clear();
 p.x=Math.max(checkpoint,Math.min(s.length-p.w,p.x+p.vx));let oldBottom=p.y+p.h;p.vy+=.55;p.y+=p.vy;p.ground=false;
 for(const a of [...platforms,{x:0,y:FLOOR,w:s.length,h:100}])if(p.vy>=0&&oldBottom<=a.y+1&&p.y+p.h>=a.y&&p.x+p.w>a.x&&p.x<a.x+a.w){p.y=a.y-p.h;p.vy=0;p.ground=true}
 camera=Math.max(0,Math.min(s.length-W,p.x-280));
 for(const e of enemies){if(e.hp<=0||Math.abs(e.x-p.x)>1000)continue;if(e.kind==='soldier'){e.x+=Math.sign(p.x-e.x)*.65}else{e.y=260+Math.sin(tick*.04+e.origin)*42}if(--e.cd<=0&&Math.abs(e.x-p.x)<650){enemyShot(e);e.cd=110-stage*14+rnd(0,40)}if(hit(p,e))hurt()}
 if(p.x>s.length-920&&boss.hp>0){if(!boss.active){message=130;tone(100,.6,'sawtooth')}boss.active=true;checkpoint=s.length-960}
 if(boss.active&&boss.hp>0){boss.phase++;boss.x=boss.home+Math.sin(boss.phase*.018)*Math.min(60,stage*15);if(--boss.cd<=0){const spread=stage>=3?[-.38,-.19,0,.19,.38]:[-.24,0,.24];for(const a of spread)enemyShot(boss,3.4+stage*.25,a);boss.cd=boss.hp<boss.max/2?Math.max(40,60-stage*3):85-stage*3;tone(90,.1)}if(hit(p,boss))hurt(2)}
 for(const b of bullets){b.x+=b.vx;b.y+=b.vy;b.life--;if(b.owner==='player'){for(const e of [...enemies,boss]){if(e.hp>0&&(e!==boss||boss.active)&&hit(b,e)){damage(e,1);b.life=0;break}}}else if(hit(b,p)){hurt();b.life=0}}
 bullets=bullets.filter(b=>b.life>0&&b.y>-50&&b.y<FLOOR+20&&Math.abs(b.x-p.x)<1200);enemies=enemies.filter(e=>e.hp>0);
 for(const g of grenades){g.x+=g.vx;g.vy+=.35;g.y+=g.vy;if(g.y>FLOOR-5){g.y=FLOOR-5;g.vy*=-.4;g.vx*=.75}if(--g.life<=0)explode(g)}grenades=grenades.filter(g=>g.life>0);
 for(const a of particles){a.x+=a.vx;a.y+=a.vy;a.vy+=.15;a.life--}particles=particles.filter(a=>a.life>0);
 pickups=pickups.filter(a=>{if(!hit(p,a))return true;if(a.kind==='health'){p.hp=Math.min(6,p.hp+2)}else if(a.kind==='supply'){p.reserve=Math.min(MAX_RESERVE,p.reserve+90);p.ammo=Math.min(MAX_GRENADES,p.ammo+2)}else{p.power=650;p.reserve=Math.min(MAX_RESERVE,p.reserve+30)}score+=50;burst(a.x,a.y,'#9be2bb');tone(660,.15,'triangle');return false});
 if(state==='play'&&boss.hp<=0){score+=player.hp*100;save();state=stage===stages.length-1?'won':'clear';modal(stage===stages.length-1?'任务完成':'区域肃清',`第 ${stage+1} 关完成 · 得分 ${score}<br>${stage===stages.length-1?'机械军团已瓦解。前线，由你突破。':'下一关恢复生命、30 发弹匣、150 发备弹与 3 枚手雷。'}`,stage===stages.length-1?'再战一次 →':'下一关 →')}
}
function scenery(){
 const s=stages[stage];rect(0,0,W,H,s.sky);rect(0,145,W,240,s.mist);rect(715-camera*.025,72,58,58,stage===2?'#b5d3cd':'#d0b57b');
 for(let i=-1;stage!==3&&stage!==4&&i<12;i++){let x=i*135-(camera*.16)%135,h=90+((i+20)*47%110);rect(x,280-h,100,h,s.mount);rect(x+15,260-h,45,25,s.mount);for(let j=0;j<3;j++)rect(x+22+j*20,290-h,7,20,s.mist)}
 for(let i=-1;stage!==3&&stage!==4&&i<7;i++){let x=i*230-(camera*.4)%230;rect(x,285,95,140,'#293d38');rect(x-6,278,107,9,'#819079');rect(x+65,233,17,45,'#293d38');for(let j=0;j<3;j++){rect(x+10+j*25,304,15,24,'#101e21');rect(x+10+j*25,350,15,26,'#101e21')}rect(x+4,400,92,40,'#20332e');if(stage===1){rect(x+123,215,24,204,'#3d3630');rect(x+115,213,40,9,'#b68353')}if(stage===2){rect(x+20,300,4,14,'#8bf0d3');rect(x+65,350,4,14,'#8bf0d3')}}
 rect(0,421,W,35,'#273931');for(let i=0;i<30;i++)rect(i*40-(camera*.7)%40,418,3,36,'#9b967266');
 rect(0,FLOOR,W,H-FLOOR,'#252f29');rect(0,FLOOR,W,10,s.ground);rect(0,FLOOR+10,W,5,'#182721');
 for(let i=0;i<35;i++){let x=i*35-camera%35;rect(x,FLOOR+24+(i%3)*17,12,3,'#657252');rect(x+12,FLOOR+13,3,6,'#414d39')}
 ctx.save();ctx.translate(-Math.floor(camera),0);
 for(let x=310;x<s.length;x+=390){rect(x,415,44,39,'#66734c');rect(x+4,419,36,3,'#9b9e64');rect(x+5,442,34,4,'#323d2b');rect(x+19,421,6,21,'#8d9059');rect(x-18,442,17,12,'#4b5b41')}
 for(const p of platforms){rect(p.x,p.y,p.w,p.h,'#76836a');rect(p.x,p.y,p.w,4,'#bcc19a');rect(p.x+12,p.y+18,8,FLOOR-p.y-18,'#384d43');rect(p.x+p.w-20,p.y+18,8,FLOOR-p.y-18,'#384d43');for(let x=p.x+8;x<p.x+p.w;x+=24)rect(x,p.y+7,9,4,'#303e33')}
 if(boss&&boss.hp<=0)text('AREA CLEAR →',s.length-300,320,24,'#e3c472');ctx.restore();
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
function hud(){rect(18,17,288,63,'#0c1b1dcc');text('P1  /  VANGUARD',30,37,12,'#d2dcc0');for(let i=0;i<6;i++)rect(30+i*27,47,22,12,i<player.hp?'#e4b05c':'#384d43');text('G '+player.ammo+'/'+MAX_GRENADES,210,58,14,'#e8c785');text(String(score).padStart(6,'0'),W-26,40,26,'#f1ecd0','right');text(`OP. 0${stage+1} / ${stages[stage].name}`,W/2,34,14,'#dce2c9','center');rect(365,45,230,3,'#243d38');rect(365,45,230*Math.min(1,player.x/stages[stage].length),3,'#e4b05c');ammoHud();if(boss.active&&boss.hp>0){rect(282,491,396,28,'#10252a');rect(290,510,380,4,'#43594e');rect(290,510,380*boss.hp/boss.max,4,'#ed8c61');text('BOSS / 装甲镇压者',W/2,504,11,'#f2d7b5','center')}else text('ADVANCE →',W-24,509,12,'#bac8a0','right');if(message>0){text(boss.active?'WARNING · 重装单位接近':`MISSION 0${stage+1}`,W/2,143,27,'#f3c275','center');text(boss.active?'摧毁装甲核心，肃清区域':stages[stage].label,W/2,170,13,'#edf0d3','center')}}
function render(){ctx.save();if(state==='play')ctx.translate(Math.round(rnd(-shake,shake)),Math.round(rnd(-shake,shake)));scenery();detailScenery();ctx.save();ctx.translate(-Math.floor(camera),0);for(const a of pickups){let y=a.y+Math.sin(tick*.08+a.x)*4;rect(a.x-3,y-3,30,30,'#1e3830');rect(a.x,y,24,24,a.kind==='health'?'#87bc86':a.kind==='supply'?'#8fcbd0':'#e3b359');text(a.kind==='health'?'+':a.kind==='supply'?'A':'H',a.x+12,y+18,20,'#20382d','center')}for(const e of enemies){if(e.x<camera-100||e.x>camera+W+100)continue;if(e.kind==='soldier')soldier(e,false);else{rect(e.x,e.y,40,20,'#899482');rect(e.x-10,e.y-4,60,5,'#243633');rect(e.x+15,e.y+20,9,10,'#f38d60');rect(e.x+7,e.y+6,26,6,'#253b3a')}}drawBoss();if(player&&(player.inv<=0||Math.floor(player.inv/5)%2===0||state==='title'))soldier(player,true);for(const b of bullets){rect(b.x-2,b.y-2,b.w+4,b.h+4,b.owner==='player'?'#edbd5233':'#ff816144');rect(b.x,b.y,b.w,b.h,b.owner==='player'?'#ffeb99':'#fb936b')}for(const g of grenades){rect(g.x-4,g.y-4,9,10,'#bad077');rect(g.x-1,g.y-7,4,4,'#eae3b2')}for(const a of particles){ctx.globalAlpha=Math.min(1,a.life/10);rect(a.x,a.y,a.size,a.size,a.color)}ctx.globalAlpha=1;ctx.restore();atmosphere();if(state!=='title')hud();ctx.restore()}
loadStage();player.x=630;camera=0;
const loop=kontra.GameLoop({update,render});loop.start();

// Layered procedural scenery: stable world-space details, no external artwork.
function line(x1,y1,x2,y2,color,width=1){ctx.strokeStyle=color;ctx.lineWidth=width;ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.stroke()}
function poly(points,color){ctx.fillStyle=color;ctx.beginPath();points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.closePath();ctx.fill()}
function detailScenery(){
 const s=stages[stage];
 const haze=ctx.createLinearGradient(0,0,0,420);haze.addColorStop(0,s.sky+'aa');haze.addColorStop(.6,'#b9c6a000');haze.addColorStop(1,s.mist+'55');ctx.fillStyle=haze;ctx.fillRect(0,0,W,420);
 for(let i=0;i<8;i++){let x=((i*193-camera*.07)%1200+1200)%1200-120;rect(x,96+i%3*32,110,3,s.accent+'18');rect(x+22,91+i%3*32,50,4,s.accent+'10')}
 if(stage===0||stage===1||stage===2||stage===5){
  for(let i=-1;i<7;i++){let x=i*230-(camera*.4)%230;
   for(let r=0;r<7;r++)for(let c=0;c<5;c++)rect(x+c*18+(r%2)*6,287+r*18,15,1,'#9aa58424');
   line(x+82,286,x+79,366,'#112a29',2);line(x+79,366,x+88,385,'#112a29',2);rect(x+10,332,67,3,'#172e2d');rect(x+10,379,67,3,'#172e2d');
   for(let j=0;j<3;j++){rect(x+10+j*25,304,15,2,'#a2ac8355');rect(x+10+j*25,350,15,2,'#a2ac8355');rect(x+17+j*25,305,1,20,'#798b7055')}
   rect(x+35,389,28,34,'#172c2d');rect(x+39,392,20,2,'#71856a');rect(x+57,407,2,3,'#cfaf64');
   line(x+115,217,x+115,423,'#293c37',5);line(x+105,229,x+153,229,'#344d40',4);ctx.strokeStyle='#1e3531';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(x+115,234);ctx.quadraticCurveTo(x+215,275,x+345,234);ctx.stroke();
   if(stage===1||stage===5){for(let k=0;k<5;k++){let sy=200-k*19-(tick*.3)%19;rect(x+118-k*5,sy,30+k*8,16,s.sky+'66')}rect(x+124,246,20,3,'#ba9973');rect(x+126,292,19,3,'#ba9973')}
   if(stage===2||stage===5){rect(x+14,285,27,4,s.accent);let glow=ctx.createRadialGradient(x+26,293,1,x+26,293,65);glow.addColorStop(0,s.accent+'30');glow.addColorStop(1,s.accent+'00');ctx.fillStyle=glow;ctx.fillRect(x-40,250,135,90)}
  }
 }
 if(stage===3){
  for(let layer=0;layer<2;layer++)for(let i=-1;i<10;i++){let x=i*(145-layer*25)-(camera*(.22+layer*.3))%(145-layer*25),top=120+(i+12)%3*30;
   rect(x+25,top,12+layer*8,310-top,layer?'#244839':'#34594a');line(x+30,top+60,x-5,top+20,'#284b3f',8);line(x+33,top+80,x+75,top+32,'#284b3f',7);
   for(let k=0;k<4;k++)poly([[x-55+k*12,top+40+k*19],[x+32,top-30+k*18],[x+115-k*12,top+40+k*19]],layer?'#315b41':'#47725a');
   line(x+76,top+30,x+68,350,'#6c8c55',2);
  }
 }
 if(stage===4){
  for(let i=-1;i<5;i++){let x=i*290-(camera*.19)%290;poly([[x,330],[x+140,110],[x+300,330]],'#6d8999');poly([[x+96,180],[x+140,110],[x+185,178],[x+152,162],[x+128,181],[x+115,165]],'#d4e2de')}
  for(let i=-1;i<5;i++){let x=i*300-(camera*.5)%300;rect(x,342,270,74,'#506570');rect(x+4,342,263,5,'#d3e4df');rect(x+12,352,245,3,'#8aa6ad');for(let n=0;n<6;n++){rect(x+16+n*40,366,26,22,'#213c4a');rect(x+17+n*40,367,24,3,'#9bc9ce')}rect(x,408,270,10,'#253e4b');rect(x+30,418,35,10,'#182d39');rect(x+205,418,35,10,'#182d39')}
 }
 ctx.save();ctx.translate(-Math.floor(camera),0);
 for(let x=Math.floor(camera/160)*160-160;x<camera+W+160;x+=160){
  let seed=Math.abs(x/160);for(let j=0;j<5;j++){rect(x+j*27,FLOOR+19+(seed+j)%4*13,13,2,s.ground+'77');rect(x+j*23,FLOOR+23+(seed+j)%4*13,4,3,'#14282c55')}
  if(stage===4){rect(x,FLOOR,158,4,'#e1ebe1');rect(x+8,FLOOR+37,4,17,'#4a5f69');rect(x,FLOOR+40,160,3,'#a8c0c0');rect(x,FLOOR+51,160,3,'#a8c0c0')}
  else if(stage===5){rect(x+15,FLOOR+32,85,9,'#482b34');rect(x+22,FLOOR+35,68,3,'#f78954');rect(x+38,FLOOR+36,25,1,'#ffd278')}
  else {for(let j=0;j<4;j++)line(x+j*8,FLOOR,x+j*8-4,FLOOR-7-(j%2)*4,'#8a9a60',2)}
 }
 for(let x=310;x<s.length;x+=390){if(x<camera-100||x>camera+W+100)continue;
  line(x+6,424,x+37,446,'#b6ac73',3);line(x+37,424,x+6,446,'#b6ac73',3);rect(x+3,418,3,33,'#a6aa73');rect(x+39,418,3,33,'#424f35');
  for(let j=0;j<3;j++){rect(x+66+j*20,FLOOR-10-j%2*8,19,10,'#8a8761');rect(x+67+j*20,FLOOR-10-j%2*8,16,2,'#b2ab7b')}
  rect(x+118,FLOOR-33,21,33,'#3b5652');rect(x+117,FLOOR-30,23,4,'#91a091');rect(x+117,FLOOR-10,23,3,'#8c9b8b');rect(x+124,FLOOR-20,8,6,s.accent);
 }
 for(const p of platforms){rect(p.x,p.y,p.w,p.h,'#76836a');rect(p.x,p.y,p.w,4,'#bcc19a');rect(p.x+12,p.y+18,8,FLOOR-p.y-18,'#384d43');rect(p.x+p.w-20,p.y+18,8,FLOOR-p.y-18,'#384d43');for(let x=p.x+20;x<p.x+p.w-10;x+=36){rect(x,p.y+5,3,3,'#d4d3a4');line(x,p.y+18,x+24,Math.min(FLOOR,p.y+59),'#536b59',3)}rect(p.x,p.y-2,p.w,2,stage===4?'#ecf3e9':'#c4c29a')}
 ctx.restore();
}
function atmosphere(){
 if(stage===3){for(let i=0;i<70;i++){let x=(i*107+tick*2)%W,y=(i*67+tick*9)%H;line(x,y,x-4,y+16,'#c6e9e733')}}
 else if(stage===4){for(let i=0;i<55;i++){let x=(i*137+tick*.65+Math.sin(i+tick*.02)*10)%W,y=(i*51+tick*(1+i%3*.2))%H;rect(x,y,i%3===0?3:2,2,'#e6f3ebaa')}}
 else {for(let i=0;i<22;i++){let x=(i*179+tick*.22)%W,y=430-(i*41+tick*(stage===5?1.5:.15))%350;rect(x,y,2,i%3===0?3:1,stage===5?'#ffc27caa':'#d1bb7833')}}
 let v=ctx.createRadialGradient(W/2,H/2,180,W/2,H/2,580);v.addColorStop(0,'#06121800');v.addColorStop(1,'#06121865');ctx.fillStyle=v;ctx.fillRect(0,0,W,H);
}
function ammoHud(){
 const p=player;rect(18,81,288,51,'#0c1b1dd9');
 text(p.reload>0?'换弹中…':p.mag===0?(p.reserve?'按 R 换弹':'弹药耗尽 · 寻找 A 补给'):p.power>0?'HEAVY MACHINE GUN':'ASSAULT RIFLE',30,98,11,p.mag?'#c8d6b8':'#ffb275');
 text(String(p.mag).padStart(2,'0')+' / '+MAG_SIZE,30,120,19,'#f0d390');text('备弹 '+p.reserve,178,120,12,'#a9c4b5');
 if(p.reload>0){rect(30,126,260,3,'#354c46');rect(30,126,260*(1-p.reload/RELOAD_FRAMES),3,'#e8bf76')}
 if(p.grenadeCD>0)rect(211,64,71*(1-p.grenadeCD/45),2,'#dbaf70');
}
