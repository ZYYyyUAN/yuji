'use strict';
const P=require('./platform.js'),D=require('./draw.js'),{Works}=require('./store.js');
const {Game,Paint,PALETTE,DEFAULTS,BOT_DIFFICULTIES}=require('../core/engine.js');
const Render=require('../core/render.js'),Choose=require('../core/choose.js'),battleDraw=require('../core/battle-draw.js');
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),smooth=t=>{t=clamp(t,0,1);return t*t*(3-2*t);};
const endingLines=['你在争取胜利。','他们也是。','没有人安排这些颜色如何相遇。','各自的选择，留下了一幅谁也没有事先画好的图景。','从局部的交锋，到共同的痕迹——这是我们对涌现的一次尝试。','各自争胜，共同留痕。','换一个角度，再看这些痕迹。','下一次交锋，又会留下什么？'];

class GameApp{
 constructor(surface){
  this.canvas=surface;this.ctx=surface.getContext('2d');this.targets=[];this.touches=new Map();this.keys=new Set();this.move=null;this.aim=null;this.pointer=null;
  this.screen='setup';this.overlay=null;this.game=null;this.paused=false;this.hidden=false;this.frame=0;this.visualTime=0;this.accumulator=0;this.lastNow=0;this.token=0;this.attempt=0;this.artState='idle';this.artMode='original';this.expanded=false;this.zoom=1;this.camera=null;this.artDirty=true;this.record=null;this.mainContext=null;this.listPage=0;this.viewsPage=0;this.ending=null;this.artVersion=-1;
  this.count=5;this.color=0;this.difficulty='standard';this.supplies=true;this.backdrop=true;this.sound=P.createSound();this.status='';this.statusUntil=0;this.auth='pending';this.authMessage='正在连接 TapTap…';
  try{const s=JSON.parse(P.storage.getItem('yujiMiniSettingsV1')||'{}');this.count=clamp(Number(s.count)||5,2,8);this.color=clamp(Number(s.color)||0,0,7);this.difficulty=BOT_DIFFICULTIES[s.difficulty]?s.difficulty:'standard';this.supplies=s.supplies!==false;this.backdrop=s.backdrop!==false;}catch{}
  this.store=new Works();this.shapeHistory=Choose.readHistory().entries;this.firstSeen=false;try{this.firstSeen=P.storage.getItem('yujiFirstEndingV1')==='done';}catch{}
  this.coverRaw=null;this.images={};for(const name of ['courtyard','lane','room','cover']){const task=P.image('assets/'+name+'.png');task.ready.then(image=>{this.images[name]=image;if(name==='cover')this.coverRaw=image;});}
  this.paintLayer=null;this.battleLayer=null;this.raw=null;this.artCanvas=null;
  this.backdropIndex=-1;this.resize();this.bind();this.login();
 }
 resize(){
  const s=P.system(),w=Math.max(1,s.windowWidth||s.screenWidth),h=Math.max(1,s.windowHeight||s.screenHeight);this.width=w;this.height=h;this.dpr=Math.min(2,s.pixelRatio||1);this.canvas.width=Math.round(w*this.dpr);this.canvas.height=Math.round(h*this.dpr);this.scale=Math.min(w/960,h/540);this.w=w/this.scale;this.h=h/this.scale;
  const safe=s.safeArea;this.margin=Math.max(30,(safe?.left||0)/this.scale+16);this.bottomSafe=Math.max(12,(h-(safe?.bottom||h))/this.scale+8);
  let menu=null;try{menu=P.api.getMenuButtonBoundingClientRect();}catch{}this.headRight=menu&&menu.left>0?Math.min(this.w-28,menu.left/this.scale-16):this.w-28;
  this.clearInput();if(this.game&&this.screen==='battle')this.pause();this.artDirty=true;
 }
 bind(){
  P.api.onTouchStart(e=>this.touchStart(e));P.api.onTouchMove(e=>this.touchMove(e));P.api.onTouchEnd(e=>this.touchEnd(e));P.api.onTouchCancel(()=>this.clearInput());
  if(P.api.onWindowResize)P.api.onWindowResize(()=>this.resize());
  P.api.onHide(()=>{this.hidden=true;this.clearInput();this.sound.stop();if(this.screen==='battle')this.pause();this.savePose();});
  P.api.onShow(()=>{this.hidden=false;this.lastNow=0;if(this.auth==='ready'&&P.api.checkSession)P.api.checkSession({fail:()=>{if(this.screen==='battle')this.pause();this.login();}});});
  if(P.api.onAudioInterruptionBegin)P.api.onAudioInterruptionBegin(()=>{this.clearInput();this.sound.stop();if(this.screen==='battle')this.pause();});
 }
 login(){
  if(this.auth==='working')return;this.auth='working';this.authMessage='正在连接 TapTap…';let done=false;
  const timer=setTimeout(()=>{if(done)return;done=true;this.auth='failed';this.authMessage='连接未完成，点击重试。';},12000);
  try{P.api.login({timeout:10000,success:res=>{if(done)return;done=true;clearTimeout(timer);if(typeof res?.code==='string'&&res.code){this.auth='ready';this.authMessage='TapTap 已连接';}else{this.auth='failed';this.authMessage='TapTap 未返回登录凭证，请重试。';}},fail:()=>{if(done)return;done=true;clearTimeout(timer);this.auth='failed';this.authMessage='未能连接 TapTap，请重试。';}});}catch{clearTimeout(timer);this.auth='failed';this.authMessage='当前环境无法连接 TapTap。';}
 }
 settings(){try{P.storage.setItem('yujiMiniSettingsV1',JSON.stringify({count:this.count,color:this.color,difficulty:this.difficulty,supplies:this.supplies,backdrop:this.backdrop}));}catch{this.notify('设置暂未能保存，本次仍可游玩。');}}
 notify(text){this.status=text;this.statusUntil=this.visualTime+3.3;P.toast(text);}
 clearInput(){this.touches.clear();this.keys.clear();this.move=null;this.aim=null;this.pointer=null;this.drag=null;this.pinch=null;}
 pause(){if(this.screen!=='battle')return;this.paused=true;this.overlay='pause';this.clearInput();this.accumulator=0;}
 resume(){if(this.auth!=='ready'){this.notify('请先连接 TapTap。');return;}this.overlay=null;this.paused=false;this.clearInput();this.accumulator=0;this.lastNow=0;}
 home(){this.savePose();this.token++;this.screen='setup';this.overlay=null;this.game=null;this.record=null;this.mainContext=null;this.ending=null;this.expanded=false;this.artState='idle';this.paused=false;this.clearInput();}
 start(options={}){
  if(this.auth!=='ready'){if(this.auth==='failed')this.login();return;}
  this.settings();this.token++;this.game=null;this.record=null;this.mainContext=null;this.ending=null;this.screen='battle';this.overlay=null;this.expanded=false;this.paused=false;this.accumulator=0;this.artState='idle';this.attempt=0;this.clearInput();
  const area=DEFAULTS.width*DEFAULTS.height,aspect=this.width/this.height,width=Math.round(Math.sqrt(area*aspect)/2)*2,height=Math.round(Math.sqrt(area/aspect)/2)*2;
  this.game=new Game({seed:options.seed??Math.floor(Math.random()*4294967296),player:options.allBots?null:this.color,color:this.color,bots:options.bots!==false,config:{width,height,tankCount:this.count,botDifficulty:this.difficulty,supplies:this.supplies,...(options.limit?{timeLimit:options.limit}:{})}});
  if(!this.paintLayer)this.paintLayer=P.canvas();if(!this.battleLayer)this.battleLayer=P.canvas();this.paintLayer.width=this.game.paint.width;this.paintLayer.height=this.game.paint.height;this.battleLayer.width=width;this.battleLayer.height=height;
  this.paintData=P.imageData(this.game.paint.width,this.game.paint.height,this.paintLayer.getContext('2d'));this.observedShots=0;this.observedHit=-10;this.backdropIndex=(this.backdropIndex+1)%3;this.lastNow=0;this.sound.sample('paper');
 }
 input(){const t=this.game.tanks[this.game.selected],mv=this.move||{dx:0,dy:0},aim=this.aim;return {x:clamp(mv.dx+(this.keys.has('d')?1:0)-(this.keys.has('a')?1:0),-1,1),y:clamp(mv.dy+(this.keys.has('s')?1:0)-(this.keys.has('w')?1:0),-1,1),shoot:!!(aim&&Math.hypot(aim.dx,aim.dy)>.18)||!!this.pointer?.shoot,aimX:aim?t.x+aim.dx*1000:this.pointer?.x??t.x+Math.cos(t.aim)*100,aimY:aim?t.y+aim.dy*1000:this.pointer?.y??t.y+Math.sin(t.aim)*100};}
 syncPaint(){const p=this.game.paint;if(!p.dirty)return;this.paintData.data.set(p.rgba);this.paintLayer.getContext('2d').putImageData(this.paintData,0,0);p.dirty=false;}
 rawFor(source){const p=new Paint(source.width,source.height,2,source.palette,source.clipRects||[]);for(const mark of source.impacts)p.stamp(mark);const small=P.canvas(p.width,p.height),x=small.getContext('2d'),data=P.imageData(p.width,p.height,x);data.data.set(p.rgba);x.putImageData(data,0,0);const c=P.canvas(source.width,source.height),ctx=c.getContext('2d');ctx.imageSmoothingEnabled=false;ctx.drawImage(small,0,0,c.width,c.height);return c;}
 finish(){
  this.syncPaint();this.battleLayer.width=this.canvas.width;this.battleLayer.height=this.canvas.height;this.battleLayer.getContext('2d').drawImage(this.canvas,0,0);this.settlementStart=this.visualTime;const game=this.game;this.record=this.store.create(game.sourceForArt(),game.snapshot());this.raw=P.canvas(game.config.width,game.config.height);const ctx=this.raw.getContext('2d');ctx.imageSmoothingEnabled=false;ctx.drawImage(this.paintLayer,0,0,this.raw.width,this.raw.height);
  this.screen='result';this.overlay=null;this.clearInput();this.artMode='original';this.artState='working';this.artVersion=-1;this.camera=null;this.zoom=1;this.artDirty=true;this.revealStart=this.visualTime;this.sound.sample('wood');this.generate();
  if(this.store.error)this.notify(this.store.error);
 }
 async generate(){
  const work=this.record;if(!work||work.source.impacts.length<3){this.artState='fallback';this.artMessage='这一局先保留原画。';return;}
  const token=++this.token;this.artState='working';this.artMessage='正在安排墨斑高度与展示角度…';const seed=(work.source.seed+Math.imul(++this.attempt,0x9e3779b9))>>>0;
  try{const result=await Choose.generate(work.source,this.shapeHistory,seed,message=>{if(token===this.token)this.artMessage=message;},()=>token!==this.token);if(token!==this.token||!result)return;this.shapeHistory=Choose.commit(this.shapeHistory,result.descriptor);Choose.writeHistory(this.shapeHistory);this.store.addVersion(work,result);if(this.record===work){this.artVersion=work.latest;this.camera=P.clone(result.model.camera);this.zoom=1;this.artMode='sculpture';this.artState='revealing';this.revealStart=this.visualTime;this.artDirty=true;}if(this.store.error)this.notify(this.store.error);}
  catch{if(token!==this.token)return;this.artState='fallback';this.artMessage='这一局先保留原画，可重试成形。';this.artMode=this.model()?'sculpture':'original';}
 }
 model(){return this.record?.versions[this.artVersion]?.model||null;}
 savePose(){if(!this.record||!this.camera||this.artVersion<0)return;this.record.lastView={version:this.artVersion,camera:P.clone(this.camera),zoom:this.zoom};this.store.write(this.record);}
 collect(){if(!this.model()||this.artState==='revealing')return;this.notify(this.store.view(this.record,this.artVersion,this.camera,this.zoom));}
 openHistory(){
  if(this.screen==='battle'){this.pause();return;}
  this.savePose();this.mainContext={screen:this.screen,record:this.record,version:this.artVersion,camera:P.clone(this.camera),zoom:this.zoom,raw:this.raw,mode:this.artMode,state:this.artState};
  this.screen='history';this.overlay=null;this.expanded=false;this.listPage=0;this.record=null;if(this.store.items[0])this.selectWork(this.store.items[0].id);
 }
 closeHistory(){this.savePose();const c=this.mainContext;if(!c){this.home();return;}if(c.record&&c.state==='working'&&c.record.latest>=0){c.version=c.record.latest;c.camera=P.clone(c.record.versions[c.version].model.camera);c.zoom=1;c.mode='sculpture';c.state='ready';}else if(c.state==='working'&&this.artState==='fallback')c.state='fallback';Object.assign(this,{screen:c.screen,record:c.record,artVersion:c.version,camera:c.camera,zoom:c.zoom,raw:c.raw,artMode:c.mode,artState:c.state});this.mainContext=null;this.expanded=false;this.overlay=null;this.artDirty=true;}
 selectWork(id){this.savePose();const r=this.store.read(id);if(!r){this.notify('这局记录暂时无法读取。');return;}this.record=r;this.artVersion=r.lastView?.version??r.latest;this.camera=P.clone(r.lastView?.camera||r.versions[this.artVersion]?.model.camera||null);this.zoom=r.lastView?.zoom||1;this.artMode=this.model()?'sculpture':'original';this.artState='ready';this.artDirty=true;this.raw=this.rawFor(r.source);}
 async saveImage(original){
  if(this.saving)return;if(!original&&!this.model())return;this.saving=true;this.savePose();this.notify('正在准备图片…');
  try{const c=original?this.raw:P.canvas(1400,1000);if(!original)Render.draw(c.getContext('2d'),c.width,c.height,{source:this.record.source,model:this.model(),camera:this.camera,zoom:this.zoom,progress:1,background:true,paddingX:84,paddingY:112});await P.saveCanvas(c);}catch{this.notify('未能生成图片，请重试。');}finally{this.saving=false;}
 }
 restoreView(v){this.artVersion=v.version;this.camera=P.clone(v.camera);this.zoom=v.zoom;this.artMode='sculpture';this.artDirty=true;this.overlay=null;this.savePose();}
 async deleteWork(){
  const r=this.record;if(!r)return;try{const res=await P.call('showModal',{title:'删除这局记录？',content:'删除后无法恢复。已保存到相册的图片不受影响。',confirmText:'删除',confirmColor:'#a45742'});if(res.confirm&&this.store.remove(r.id)){if(this.mainContext?.record?.id===r.id)this.mainContext={screen:'setup',record:null,version:-1,camera:null,zoom:1,raw:null,mode:'original',state:'idle'};this.record=null;const next=this.store.items[this.listPage*5]||this.store.items[0];if(next)this.selectWork(next.id);}}catch{this.notify('未能删除，原记录已保留。');}
 }
 endingDone(again=false){try{P.storage.setItem('yujiFirstEndingV1','done');}catch{}this.firstSeen=true;this.ending=null;this.artDirty=true;if(again)this.home();}
 run(onError,onReady){const handle=error=>{if(onError)onError(error);else throw error;};const loop=now=>{try{const time=typeof now==='number'?now:Date.now(),delta=this.lastNow?Math.min(.1,Math.max(0,(time-this.lastNow)/1000)):0;this.lastNow=time;if(!this.hidden){this.visualTime+=delta;this.update(delta);this.draw();}this.frame++;requestAnimationFrame(loop);}catch(error){handle(error);}};try{this.draw();if(onReady)onReady();requestAnimationFrame(loop);}catch(error){handle(error);}}
 update(dt){
  if(this.screen==='battle'&&!this.paused&&!this.overlay&&this.auth==='ready'){
   this.accumulator+=dt*(this.game.tanks[this.game.selected].alive?1:this.spectatorSpeed||1);let n=0;while(this.accumulator>=DEFAULTS.dt&&n++<30&&this.game.phase!=='finished'){this.game.step(DEFAULTS.dt,this.input());this.accumulator-=DEFAULTS.dt;}
   const t=this.game.tanks[this.game.selected];if(t.shots>this.observedShots)this.sound.sample('shot');this.observedShots=t.shots;if(t.lastHit>this.observedHit)this.sound.sample('hit');this.observedHit=t.lastHit;
   if(this.game.phase==='finished')this.finish();
  }
  if(this.artState==='revealing'&&this.visualTime-this.revealStart>2.7){this.artState='ready';this.artDirty=true;this.readyAt=this.visualTime;}
  if(this.screen==='result'&&this.artState==='ready'&&!this.firstSeen&&!this.overlay&&!this.expanded&&!this.ending&&this.visualTime-(this.readyAt||this.visualTime)>4){this.ending={index:0,elapsed:0};this.artDirty=true;}
  if(this.ending){this.ending.elapsed+=dt;const duration=Math.max(3,endingLines[this.ending.index].length*.13);if(this.ending.elapsed>duration){if(this.ending.index<endingLines.length-1){this.ending.index++;this.ending.elapsed=0;}else this.endingDone();}}
 }
 draw(){
  const c=this.ctx;c.setTransform(this.dpr*this.scale,0,0,this.dpr*this.scale,0,0);c.globalAlpha=1;D.rect(c,0,0,this.w,this.h,'#f3f0e7');this.targets=[];
  if(this.width<this.height){D.rect(c,0,0,this.w,this.h,'#25332e');D.text(c,'余迹',this.w/2,this.h/2-36,64,'#f3f0e7','center',D.serif);D.text(c,'请横屏，展开这片交锋。',this.w/2,this.h/2+28,24,'#f3f0e7','center');return;}
  if(this.ending){this.drawArt({x:0,y:0,w:this.w,h:this.h});this.drawEnding();return;}
  if(this.screen==='setup')this.drawSetup();else if(this.screen==='battle')this.drawBattle();else this.drawResult();
  if(this.overlay)this.drawOverlay();
  if(this.status&&this.visualTime<this.statusUntil){c.save();D.round(c,this.w/2-240,this.h-52,480,36,3);c.fillStyle='rgba(23,38,35,0.874510)';c.fill();D.text(c,this.status,this.w/2,this.h-27,17,'#f3f0e7','center');c.restore();}
 }
 header(){
  const c=this.ctx;if(this.screen!=='setup')D.text(c,'余迹',this.margin,45,30,'#f4f1e7','left',D.serif);
  if(this.screen!=='battle'){D.button(this,'history','历史作品',this.headRight-250,13,130,46,()=>this.openHistory());D.button(this,'sound',this.sound.enabled?'声音 开':'声音 关',this.headRight-110,13,110,46,()=>this.sound.toggle());}
 }
 drawSetup(){
  const c=this.ctx,m=this.margin;D.cover(c,this.images.courtyard,0,0,this.w,this.h);D.rect(c,0,0,this.w*.53,this.h,'rgba(21,40,35,0.733333)');D.rect(c,this.w*.53,0,this.w*.47,this.h,'rgba(21,40,35,0.133333)');this.header();
  D.text(c,'余迹',m,125,78,'#f4f1e7','left',D.serif);D.text(c,'活到最后，或在终局占据最多颜色。',m,164,22);
  const left=424;for(let i=0;i<8;i++){const x=m+i%4*106,y=192+Math.floor(i/4)*57;D.rect(c,x,y,98,49,PALETTE[i].color);D.text(c,PALETTE[i].name,x+49,y+32,20,i===4?'#25332c':'#111d1c','center');if(i===this.color){c.strokeStyle='#f3f0e7';c.lineWidth=3;c.strokeRect(x-3,y-3,104,55);}this.targets.push({key:'color-'+i,x,y,w:98,h:49,action:()=>{this.color=i;this.settings();}});}
  D.text(c,'参战坦克',m,335,21);D.text(c,this.count+' 辆',m+424,335,24,'#f3f0e7','right');
  const trackX=m+137,trackW=215,trackY=321,thumbX=trackX+(this.count-2)/6*trackW;D.rect(c,trackX,trackY-2,trackW,4,'rgba(243,240,231,0.35)');D.rect(c,trackX,trackY-2,thumbX-trackX,4,'#f3f0e7');
  for(let n=2;n<=8;n++){const tx=trackX+(n-2)/6*trackW;D.rect(c,tx-1,trackY-4,2,8,'#f3f0e7');D.text(c,n,tx,350,15,'#f3f0e7','center');}c.fillStyle='#f3f0e7';c.beginPath();c.arc(thumbX,trackY,9,0,Math.PI*2);c.fill();
  this.targets.push({key:'count-range',kind:'range',x:trackX-14,y:302,w:trackW+28,h:54,trackX,trackW,onPoint:px=>{this.count=clamp(Math.round(2+(px-trackX)/trackW*6),2,8);}});
  D.text(c,'难度',m,393,20);['easy','standard','challenge'].forEach((id,i)=>D.button(this,'difficulty-'+id,BOT_DIFFICULTIES[id].name,m+66+i*115,363,108,46,()=>{this.difficulty=id;this.settings();},{selected:this.difficulty===id}));
  const bottom=this.h-this.bottomSafe-80;D.button(this,'start',this.auth==='ready'?'开始交锋  ↗':this.auth==='failed'?'重新连接 TapTap':'正在连接 TapTap…',m,bottom,left,60,()=>this.auth==='ready'?this.start():this.login(),{primary:true,disabled:this.auth==='working',fontSize:25});
  D.text(c,'左侧移动 · 右侧瞄准射击 · 每局包含白色',m,this.h-this.bottomSafe+1,17);
  const x=Math.max(m+478,this.w*.54),w=this.w-x-42,y=128,h=this.h-292;
  c.save();c.translate(x+w/2,y+h/2);c.rotate(-.07);D.rect(c,-w/2-12,-h/2-12,w+24,h+52,'#efeada');D.contain(c,this.coverRaw,-w/2,-h/2,w,h);D.text(c,'交锋中的一刻',-w/2+10,h/2+30,19,'#68705f','left',D.serif);c.restore();
  D.button(this,'help','玩法',x,this.h-84,80,46,()=>this.overlay='help');D.button(this,'privacy','隐私说明',x+90,this.h-84,126,46,()=>this.overlay='privacy');D.button(this,'supply-toggle',this.supplies?'补给 开':'补给 关',x+226,this.h-84,116,46,()=>{this.supplies=!this.supplies;this.settings();},{fontSize:19});
  if(this.auth==='failed')D.text(c,this.authMessage,x,this.h-111,18,'#f3f0e7');
 }
 worldFrame(){const g=this.game,s=Math.min(this.w/g.config.width,this.h/g.config.height);return {s,x:(this.w-g.config.width*s)/2,y:(this.h-g.config.height*s)/2};}
 drawBattle(){
  const c=this.ctx,g=this.game;this.syncPaint();const f=this.worldFrame();
  if(this.backdrop)D.cover(c,this.images[['lane','courtyard','room'][this.backdropIndex]],f.x,f.y,g.config.width*f.s,g.config.height*f.s,.24);
  c.globalAlpha=1;c.save();c.translate(f.x,f.y);c.scale(f.s,f.s);c.imageSmoothingEnabled=false;c.drawImage(this.paintLayer,0,0,g.config.width,g.config.height);battleDraw(c,g);c.restore();c.globalAlpha=1;
  const t=g.tanks[g.selected],m=this.margin;D.rect(c,m-12,14,244,103,'#f4f1e7');D.swatch(c,g.palette[g.selected].color,m+3,37,9);D.text(c,g.palette[g.selected].name+' · '+(t.alive?'交锋中':'已退场'),m+22,45,21,'#25332c');D.text(c,'生命 '+Math.ceil(t.health)+' / '+g.config.health,m,72,19,'#25332c');D.rect(c,m,83,192,7,'#d0d1c3');D.rect(c,m,83,192*t.health/g.config.health,7,'#546e5e');D.text(c,'护甲 '+Math.ceil(t.armor)+'    弹仓 '+t.ammo+'/'+g.config.ammoCapacity,m,110,17,'#435444');
  D.rect(c,this.w/2-100,14,200,58,'#f4f1e7');D.text(c,D.clock(g.config.timeLimit-g.time),this.w/2,41,26,'#25332c','center');D.text(c,'存活 '+g.tanks.filter(t=>t.alive).length+' / '+g.tanks.length,this.w/2,63,17,'#435444','center');
  D.button(this,'pause','暂停',this.headRight-86,16,86,48,()=>this.pause());D.button(this,'rank','占色',this.headRight-182,16,86,48,()=>{this.clearInput();this.overlay='rank';this.paused=true;});
  const own=(g.paint.share(g.selected)*100).toFixed(1);D.rect(c,this.w/2-155,this.h-47,310,34,'#f4f1e7');D.text(c,'占色 '+own+'%   回血 +'+(t.alive?g.regeneration(g.selected):0).toFixed(1)+'/秒',this.w/2,this.h-24,18,'#25332c','center');
  if(!t.alive){D.button(this,'spectator-speed',this.spectatorSpeed===4?'恢复速度':'加速观看 ×4',this.w/2-88,this.h-113,176,48,()=>this.spectatorSpeed=this.spectatorSpeed===4?1:4);D.text(c,'已退场，可继续观战',this.w/2,this.h-128,21,'#25332c','center');}
  if(g.time<7&&t.alive)D.text(c,'左移右射 · 借掩体换位 · 弹药自动恢复',this.w/2,102,20,'#25332c','center');
  this.drawStick('move',m+82,this.h-106,this.move,'移动');this.drawStick('aim',this.w-m-82,this.h-106,this.aim,'瞄准 / 射击');
 }
 drawStick(type,x,y,stick,label){const c=this.ctx;c.save();c.fillStyle='#f3f0e7';c.strokeStyle='#344935';c.lineWidth=2;c.beginPath();c.arc(x,y,65,0,Math.PI*2);c.fill();c.stroke();c.fillStyle='#344935';c.beginPath();c.arc(x+(stick?.dx||0)*42,y+(stick?.dy||0)*42,26,0,Math.PI*2);c.fill();D.text(c,label,x,y+94,18,'#314331','center');c.restore();}
 stageRect(){return this.expanded?{x:0,y:0,w:this.w,h:this.h}:this.screen==='history'?{x:274,y:84,w:this.w-306,h:this.h-242}:{x:32,y:78,w:this.w-328,h:this.h-234};}
 drawArt(stage){
  const c=this.ctx,model=this.model();D.rect(c,stage.x,stage.y,stage.w,stage.h,this.artMode==='original'?'#f3f0e7':'#222a29');
  if(this.artMode==='original'||!model){if(this.raw)D.contain(c,this.raw,stage.x,stage.y,stage.w,stage.h);}
  else{
   if(!this.artCanvas)this.artCanvas=P.canvas();const progress=this.artState==='revealing'?smooth((this.visualTime-this.revealStart)/2.5):1;
   if(this.artDirty||this.artState==='revealing'){const ww=Math.max(640,Math.round(stage.w*this.scale*this.dpr)),hh=Math.max(360,Math.round(stage.h*this.scale*this.dpr));if(this.artCanvas.width!==ww||this.artCanvas.height!==hh){this.artCanvas.width=ww;this.artCanvas.height=hh;}
    const camera=this.artState==='revealing'?{az:model.camera.az*progress,elevation:Math.PI/2+(model.camera.elevation-Math.PI/2)*progress}:this.camera||model.camera;
    Render.draw(this.artCanvas.getContext('2d'),ww,hh,{source:this.record.source,model,camera,progress,zoom:this.zoom,background:true,paddingX:ww*.05,paddingY:hh*.08,frameBlend:progress});this.artDirty=false;
   }c.drawImage(this.artCanvas,stage.x,stage.y,stage.w,stage.h);
  }
  if(!this.ending){D.expand(this,'expand-art',Math.min(stage.x+stage.w-62,this.expanded?this.headRight-56:Infinity),stage.y+12,()=>{this.expanded=!this.expanded;this.artDirty=true;},this.expanded);
   if(model&&this.artMode==='sculpture')D.text(c,'拖动旋转 · 双指缩放',stage.x+18,stage.y+stage.h-18,17,'#d4d8ca');}
  this.artStage=stage;
 }
 drawResult(){
  const c=this.ctx;D.cover(c,this.images.lane,0,0,this.w,this.h);D.rect(c,0,0,this.w,this.h,'rgba(23,38,35,0.611765)');
  if(this.expanded){this.drawArt(this.stageRect());return;}
  if(this.screen==='history'){this.drawHistory();return;}
  this.header();const stage=this.stageRect();this.drawArt(stage);
  D.text(c,'本局作品 · '+(this.model()?.name||'原画'),stage.x,stage.y+stage.h+35,29,'#f3f0e7','left',D.serif);
  const n=this.model()&&this.record?this.record.views.length:0;D.button(this,'collect','＋ 收藏视角',stage.x+stage.w-208,stage.y+stage.h+10,132,42,()=>this.collect(),{disabled:!this.model()||this.artState==='revealing',fontSize:18});D.button(this,'views','视角 '+n,stage.x+stage.w-66,stage.y+stage.h+10,66,42,()=>{this.overlay='views';this.viewsPage=0;},{disabled:!n,fontSize:17});
  const gap=9,bw=(stage.w-gap*3)/4,y=this.h-this.bottomSafe-62;
  const actions=[['toggle',this.artMode==='original'?'看立体':'看原画',()=>{this.artMode=this.artMode==='original'&&this.model()?'sculpture':'original';this.artDirty=true;}],['reset','展示角度',()=>{this.camera=P.clone(this.model().camera);this.zoom=1;this.artDirty=true;this.savePose();}],['rise','重新升起',()=>{this.artState='revealing';this.revealStart=this.visualTime;this.artMode='sculpture';this.camera=P.clone(this.model().camera);this.zoom=1;this.artDirty=true;}],['shape',this.artState==='fallback'?'重试成形':'换个形态',()=>this.generate()]];
  actions.forEach(([key,label,action],i)=>D.button(this,key,label,stage.x+i*(bw+gap),y,bw,54,action,{disabled:key==='shape'?this.artState==='working'||this.artState==='revealing':!this.model()||this.artState==='revealing',fontSize:19}));
  const x=this.w-264,w=232,s=this.record.game;D.text(c,'本局胜者',x,115,20,'#d4d8ca');const winner=s.winners.length>2?'多方并列':s.winners.map(i=>s.palette[i].name).join('、');D.text(c,winner,x,158,s.winners.length===2?28:34,'#f3f0e7','left',D.serif);D.text(c,s.reason==='survivor'?'最后存活。':s.winners.length>1?'并列获胜。':'占色最多。',x,195,19);
  D.text(c,'本局占色',x,230,21);this.rankRows(s,x,257,21,w);
  D.button(this,'save-angle','保存此角度',x,this.h-this.bottomSafe-124,112,50,()=>this.saveImage(false),{primary:true,disabled:!this.model()||this.artState==='revealing'||this.saving,fontSize:18});D.button(this,'save-original','保存原画',x+120,this.h-this.bottomSafe-124,112,50,()=>this.saveImage(true),{primary:true,disabled:this.saving,fontSize:18});
  D.button(this,'again','再来一局  ↗',x,this.h-this.bottomSafe-62,w,54,()=>this.home());
  if(this.artState==='working'||this.artState==='fallback')D.text(c,this.artMessage,stage.x,stage.y+stage.h/2,20,this.artMode==='original'?'#314331':'#f3f0e7');
  if(this.visualTime-this.settlementStart<.75){c.save();c.globalAlpha=1-smooth((this.visualTime-this.settlementStart)/.75);c.drawImage(this.battleLayer,0,0,this.w,this.h);c.restore();c.globalAlpha=1;}
 }
 rankRows(s,x,y,line=28,w=220){const data=s.palette.map((p,i)=>({...p,i,share:s.shares?.[i]??s.areas?.[i]??0})).sort((a,b)=>b.share-a.share||a.i-b.i);for(let i=0;i<data.length;i++){const p=data[i];D.swatch(this.ctx,p.color,x+7,y+i*line-6,6);D.text(this.ctx,p.name+(p.i===s.selected?' · 你':''),x+23,y+i*line,18);D.text(this.ctx,(p.share*100).toFixed(1)+'%',x+w,y+i*line,18,'#f3f0e7','right');}}
 drawHistory(){
  const c=this.ctx;D.text(c,'历史作品',34,49,32,'#f3f0e7','left',D.serif);D.button(this,'history-back','返回',this.headRight-88,14,88,46,()=>this.closeHistory());
  const records=this.store.items.slice(this.listPage*5,this.listPage*5+5);records.forEach((m,i)=>{D.button(this,'work-'+m.id,m.name,32,87+i*66,216,57,()=>this.selectWork(m.id),{selected:m.id===this.record?.id,fontSize:22});});
  if(!this.store.items.length){D.text(c,'完成一局后，记录会留在这里。',this.w/2,this.h/2,26,'#f3f0e7','center',D.serif);return;}
  const pages=Math.max(1,Math.ceil(this.store.items.length/5));D.button(this,'history-prev','上一页',32,this.h-90,103,48,()=>this.listPage--,{disabled:this.listPage===0,fontSize:18});D.button(this,'history-next','下一页',145,this.h-90,103,48,()=>this.listPage++,{disabled:this.listPage>=pages-1,fontSize:18});D.text(c,(this.listPage+1)+' / '+pages,140,this.h-18,18,'#f3f0e7','center');
  if(!this.record)return;const s=this.stageRect();this.drawArt(s);D.text(c,this.model()?.name||'原画',s.x,s.y+s.h+36,28,'#f3f0e7','left',D.serif);
  const y=this.h-102,gap=8,bw=(s.w-gap*4)/5;[['history-toggle',this.artMode==='original'?'看立体':'看原画',()=>{this.artMode=this.artMode==='original'&&this.model()?'sculpture':'original';this.artDirty=true;}],['history-reset','展示角度',()=>{this.camera=P.clone(this.model().camera);this.zoom=1;this.artDirty=true;}],['history-collect','收藏视角',()=>this.collect()],['history-save-angle','保存此角度',()=>this.saveImage(false)],['history-save-original','保存原画',()=>this.saveImage(true)]].forEach(([key,label,action],i)=>D.button(this,key,label,s.x+i*(bw+gap),y,bw,50,action,{disabled:key!=='history-save-original'&&!this.model(),primary:i>=3,fontSize:17}));
  D.button(this,'history-views','查看视角 '+this.record.views.length,s.x,this.h-43,150,35,()=>{this.viewsPage=0;this.overlay='views';},{fontSize:17,disabled:!this.record.views.length});D.button(this,'history-delete','删除记录',s.x+s.w-112,this.h-43,112,35,()=>this.deleteWork(),{fontSize:17});
 }
 drawOverlay(){
  const c=this.ctx,type=this.overlay;c.save();D.rect(c,0,0,this.w,this.h,'rgba(16,27,24,0.788235)');this.targets=[];const x=this.w/2-300,y=62,w=600;
  if(type==='pause'){
   D.text(c,'交锋暂停',this.w/2,109,44,'#f3f0e7','center',D.serif);D.button(this,'resume','继续交战',x+80,145,440,58,()=>this.resume(),{primary:true,fontSize:25});D.button(this,'pause-help','玩法',x+80,218,212,50,()=>this.overlay='help');D.button(this,'pause-sound',this.sound.enabled?'声音 开':'声音 关',x+308,218,212,50,()=>this.sound.toggle());D.button(this,'pause-background',this.backdrop?'场景背景 开':'场景背景 关',x+80,283,440,50,()=>{this.backdrop=!this.backdrop;this.settings();});D.button(this,'pause-home','返回首页',x+80,348,440,50,()=>this.home());if(this.auth!=='ready')D.button(this,'pause-login','重新连接 TapTap',x+80,413,440,50,()=>this.login());
  }else if(type==='help'||type==='privacy'){
   D.text(c,type==='help'?'交锋方式':'隐私说明',x,110,40,'#f3f0e7','left',D.serif);
   const content=type==='help'?'左摇杆移动，右摇杆偏转后瞄准并持续射击。\n移动按距离间隔落墨，占色影响回血。弹丸才造成伤害，墨斑不会。\n弹仓自动恢复。利用石块掩体与机动补给换位。\n最后存活者获胜；十分钟或全灭时按占色面积判胜。\n背景插画不参与碰撞，实际石块才是掩体。':'游戏调用 TapTap 登录获取临时凭证，不读取头像、昵称或通讯录。\n对局、历史作品与设置保存在本机；未提供账号云同步。\n仅在你点击保存时，调用系统相册接口保存图片。\n本游戏无广告、无内购、无真实联机。\n小游戏的账号与防沉迷由平台提供相关能力。';
   D.lines(c,content,x,160,22,w,'#f3f0e7',34,'left',D.sans);D.button(this,'close-overlay','知道了',x+190,this.h-86,220,56,()=>this.overlay=this.screen==='battle'?'pause':null,{primary:true});
  }else if(type==='rank'){
   D.text(c,'当前占色',x+80,109,38,'#f3f0e7','left',D.serif);this.rankRows(this.game.snapshot(),x+110,160,34,350);D.button(this,'close-rank','继续交战',x+140,this.h-88,320,55,()=>this.resume(),{primary:true});
  }else if(type==='views'){
   D.text(c,'收藏视角',x,108,38,'#f3f0e7','left',D.serif);const views=this.record.views.slice(this.viewsPage*5,this.viewsPage*5+5);
   views.forEach((v,i)=>{D.button(this,'view-'+i,v.name+' · '+this.record.versions[v.version].model.name,x,134+i*57,480,48,()=>this.restoreView(v),{fontSize:21});D.button(this,'delete-view-'+i,'删除',x+492,134+i*57,108,48,()=>{this.record.views.splice(this.viewsPage*5+i,1);this.store.write(this.record);this.viewsPage=Math.min(this.viewsPage,Math.max(0,Math.ceil(this.record.views.length/5)-1));},{fontSize:18});});
   D.button(this,'views-prev','上一页',x,this.h-78,134,48,()=>this.viewsPage--,{disabled:this.viewsPage===0,fontSize:19});D.button(this,'views-close','返回作品',x+152,this.h-78,260,48,()=>this.overlay=null,{primary:true});D.button(this,'views-next','下一页',x+430,this.h-78,170,48,()=>this.viewsPage++,{disabled:(this.viewsPage+1)*5>=this.record.views.length,fontSize:19});
  }c.restore();
 }
 drawEnding(){const c=this.ctx,e=this.ending;this.targets=[];D.rect(c,0,0,this.w,this.h,'rgba(8,18,15,0.741176)');c.save();c.globalAlpha=smooth(e.elapsed/.9);D.lines(c,endingLines[e.index],this.w/2,this.h*.43,39,Math.min(780,this.w-140),'#f3f0e7',64,'center',D.serif);c.restore();c.globalAlpha=1;D.button(this,'ending-skip','跳过',this.headRight-80,16,80,44,()=>this.endingDone(),{fontSize:18});}
 point(t){return {id:t.identifier,x:t.clientX/this.scale,y:t.clientY/this.scale};}
 hit(p){return [...this.targets].reverse().find(t=>p.x>=t.x&&p.y>=t.y&&p.x<=t.x+t.w&&p.y<=t.y+t.h);}
 touchStart(event){
  for(const touch of event.changedTouches||event.touches||[]){const p=this.point(touch);this.touches.set(p.id,{...p,startX:p.x,startY:p.y,moved:false,target:this.hit(p)});
   const target=this.hit(p);if(target){if(target.kind==='range')target.onPoint(p.x);continue;}
   if(this.screen==='battle'&&!this.paused&&!this.overlay&&this.game.tanks[this.game.selected].alive){if(p.y<this.h*.42)continue;const type=p.x<this.w/2?'move':'aim';if(!this[type])this[type]={id:p.id,x:p.x,y:p.y,dx:0,dy:0};}
   else if(['result','history'].includes(this.screen)&&!this.overlay&&!this.ending&&this.artStage&&this.model()&&this.artMode==='sculpture'&&this.artState!=='revealing'&&p.x>=this.artStage.x&&p.x<this.artStage.x+this.artStage.w&&p.y>=this.artStage.y&&p.y<this.artStage.y+this.artStage.h){this.drag={id:p.id,x:p.x,y:p.y};}
  }
  this.updatePinch();
 }
 updatePinch(){const points=[...this.touches.values()].filter(p=>!p.target);if(points.length>=2&&['result','history'].includes(this.screen)&&this.model()&&this.artMode==='sculpture'&&!this.overlay){const [a,b]=points;this.pinch={ids:[a.id,b.id],distance:Math.hypot(a.x-b.x,a.y-b.y),zoom:this.zoom};this.drag=null;}}
 touchMove(event){
  for(const touch of event.changedTouches||event.touches||[]){const p=this.point(touch),old=this.touches.get(p.id);if(!old)continue;this.touches.set(p.id,{...old,...p,moved:old.moved||Math.hypot(p.x-old.startX,p.y-old.startY)>10});
   if(old.target?.kind==='range'){old.target.onPoint(p.x);continue;}
   for(const type of ['move','aim'])if(this[type]?.id===p.id){const stick=this[type],dx=(p.x-stick.x)/58,dy=(p.y-stick.y)/58,n=Math.max(1,Math.hypot(dx,dy));stick.dx=dx/n;stick.dy=dy/n;}
   if(this.drag?.id===p.id&&!this.pinch){this.camera.az+=(this.drag.x-p.x)*.007;this.camera.elevation=clamp(this.camera.elevation+(p.y-this.drag.y)*.004,-1.45,1.5);this.drag={id:p.id,x:p.x,y:p.y};this.artDirty=true;}
  }
  if(this.pinch){const a=this.touches.get(this.pinch.ids[0]),b=this.touches.get(this.pinch.ids[1]);if(a&&b&&this.pinch.distance>1){this.zoom=clamp(this.pinch.zoom*Math.hypot(a.x-b.x,a.y-b.y)/this.pinch.distance,.45,2.8);this.artDirty=true;}}
 }
 touchEnd(event){
  for(const touch of event.changedTouches||[]){const p=this.point(touch),old=this.touches.get(p.id);this.touches.delete(p.id);for(const type of ['move','aim'])if(this[type]?.id===p.id)this[type]=null;if(this.drag?.id===p.id){this.drag=null;this.savePose();}if(this.pinch?.ids.includes(p.id)){this.pinch=null;this.savePose();}
   if(old?.target?.kind==='range'){old.target.onPoint(p.x);this.settings();continue;}
   const target=this.hit(p);if(old&&!old.moved&&old.target&&target?.key===old.target.key){this.lastTouch=this.visualTime;if(this.readyAt)this.readyAt=this.visualTime;old.target.action();}
  }
 }
 snapshot(){return {screen:this.screen,overlay:this.overlay,paused:this.paused,auth:this.auth,width:this.width,height:this.height,controls:{move:this.move,aim:this.aim},settings:{count:this.count,color:this.color,difficulty:this.difficulty,supplies:this.supplies},game:this.game?.snapshot()||null,art:{state:this.artState,mode:this.artMode,version:this.artVersion,source:this.record?.source||null,model:this.model(),camera:this.camera,zoom:this.zoom},works:this.store.items,targets:this.targets.map(({key,x,y,w,h})=>({key,x,y,w,h})),scale:this.scale,ending:this.ending,storeError:this.store.error};}
}
module.exports={GameApp};
