'use strict';
(() => {
  const {Game,PALETTE,DEFAULTS}=TankPaint;
  const $=id=>document.getElementById(id);
  const stage=$('battle-canvas'),context=stage.getContext('2d');
  const paintCanvas=document.createElement('canvas'),paintContext=paintCanvas.getContext('2d');
  paintCanvas.width=DEFAULTS.width/DEFAULTS.cell;paintCanvas.height=DEFAULTS.height/DEFAULTS.cell;
  const exported=document.createElement('canvas');exported.width=DEFAULTS.width;exported.height=DEFAULTS.height;
  const help=$('help-dialog'),pause=$('pause-dialog');
  const battleBackdrop=$('battle-backdrop'),battleImage=$('battle-background'),backdropAssets=['assets/lane.png','assets/courtyard.png','assets/room.png'];let backdropEnabled=true,backdropIndex=-1,backdropStatus='loading';try{backdropEnabled=localStorage.getItem('yujiBattleBackdropV1')!=='off';}catch{}
  function fitBackdrop(){const r=$('arena-wrap').getBoundingClientRect();if(!r.width||!r.height)return;const scale=Math.min(r.width/stage.width,r.height/stage.height),width=stage.width*scale,height=stage.height*scale;Object.assign(battleBackdrop.style,{width:width+'px',height:height+'px',left:(r.width-width)/2+'px',top:(r.height-height)/2+'px'});}
  function syncBackdrop(){battleBackdrop.hidden=!backdropEnabled;$('pause-backdrop').textContent=backdropEnabled?'场景背景 开':'场景背景 关';$('pause-backdrop').setAttribute('aria-pressed',String(backdropEnabled));}
  battleImage.addEventListener('load',()=>{backdropStatus='ready';battleImage.hidden=false;fitBackdrop();});battleImage.addEventListener('error',()=>{backdropStatus='fallback';battleImage.hidden=true;});new ResizeObserver(fitBackdrop).observe($('arena-wrap'));
  const keys=new Set();let selected=0,tankCount=5,screen='setup',game=null,paused=false,focusArt=false,speed=1,suppliesEnabled=new URLSearchParams(location.search).get('supplies')!=='0',observedSupply='',difficulty=['easy','standard','challenge'].includes(new URLSearchParams(location.search).get('difficulty'))?new URLSearchParams(location.search).get('difficulty'):'standard';
  let accumulator=0,lastFrame=0,lastHUD=0,pointer={x:700,y:500,shoot:false};
  let paintImage=null;
  const touch=new DualSticks($('move-stick'),$('aim-stick'),()=>screen==='battle'&&!paused&&game?.tanks[game.selected].alive);
  const sound=new RoomSound($('sound-button'));let observedShots=0,observedHit=-10,observedPosition=null,observedAmmo=DEFAULTS.ammoCapacity,observedHits=0;
  function feedback(){if(!game||paused)return;const t=game.tanks[game.selected];sound.movement(t.alive&&observedPosition!==null&&Math.hypot(t.x-observedPosition.x,t.y-observedPosition.y)>.05);observedPosition={x:t.x,y:t.y};if(t.shots>observedShots)sound.effect('shot');observedShots=t.shots;if(game.hits[game.selected]>observedHits)sound.effect('confirm');observedHits=game.hits[game.selected];if(game.config.magazine&&t.alive&&t.ammo===game.config.ammoCapacity&&observedAmmo<t.ammo){sound.effect('reload');$('ammo-slots').classList.remove('restored');void $('ammo-slots').offsetWidth;$('ammo-slots').classList.add('restored');}observedAmmo=t.ammo;if(t.lastHit>observedHit){observedHit=t.lastHit;sound.effect('hit');$('hit-vignette').classList.remove('active');void $('hit-vignette').offsetWidth;$('hit-vignette').classList.add('active');}}

  const viewer=new InkViewer($('sculpture-canvas')),savedHistory=InkChoose.readHistory();let shapeHistory=savedHistory.entries;
  let artSource=null,artResult=null,artState='idle',artMode='original',artToken=0,artAttempt=0,settlementWait=Promise.resolve();
  const settlement=new YujiSettlement();
  const gallery=new YujiArchive.Gallery(viewer,(result,view)=>{artToken++;artResult=result;artState='ready';viewer.set(artSource,result.model);cleanReveal();viewer.stop();viewer.camera={...view.camera};viewer.zoom=view.zoom;viewer.progress=view.progress;setArtView('sculpture');viewer.request();});
  const ending=new YujiEnding({eligible:()=>screen==='result'&&['ready','fallback'].includes(artState)&&!viewer.animation&&!settlement.active&&!document.hidden&&!document.querySelector('dialog[open]'),onOpen:()=>{clearInput();sound.stopSamples();viewer.stop();gallery.flushMain();},onReturn:()=>{if(screen==='result'){if(artMode==='sculpture')viewer.request();$(focusArt?'focus-art':'again-button').focus({preventScroll:true});}},onAgain:()=>home(),sound:()=>sound.enabled});
  const formatTime=n=>`${Math.floor(Math.max(0,n)/60).toString().padStart(2,'0')}:${Math.floor(Math.max(0,n)%60).toString().padStart(2,'0')}`;

  function tankSVG(color){return `<svg class="tank-icon" viewBox="0 0 88 88" xmlns="http://www.w3.org/2000/svg"><g fill="${color}" stroke="#343a30" stroke-width="1.6"><rect x="18" y="24" width="12" height="44" rx="3"/><rect x="58" y="24" width="12" height="44" rx="3"/><rect x="26" y="24" width="36" height="44" rx="5"/><rect x="40" y="7" width="8" height="36" rx="1"/><circle cx="44" cy="46" r="12"/></g></svg>`;}
  function identity(){
    document.documentElement.style.setProperty('--selected',PALETTE[selected].color);
    document.documentElement.style.setProperty('--player-ui',selected===4?'#737c70':PALETTE[selected].color);
    $('selected-name').textContent=PALETTE[selected].name;$('player-color').textContent=PALETTE[selected].name;
    $('player-tank').innerHTML=tankSVG(PALETTE[selected].color);$('cover-tank').innerHTML=tankSVG(PALETTE[selected].color);
    document.querySelectorAll('[data-color]').forEach((b,i)=>b.setAttribute('aria-pressed',String(i===selected)));
  }
  function clearInput(){keys.clear();pointer.shoot=false;touch.clear();sound.movement(false);}
  function setFocus(value){focusArt=value;document.body.classList.toggle('art-focus',value);$('focus-art').setAttribute('aria-expanded',String(value));$('focus-art').setAttribute('aria-label',value?'收起作品':'展开作品');$('focus-art').title=value?'收起作品':'展开作品';if(screen==='result')$('focus-art').focus();}
  function show(next){
    if(next!=='result'){ending.cancel();settlement.cancel();cleanReveal();}
    screen=next;document.body.dataset.screen=next;$('rank-panel').hidden=true;$('rank-button').setAttribute('aria-expanded','false');if(focusArt)setFocus(false);
    document.querySelectorAll('.screen').forEach(section=>section.hidden=section.id!==next);
    history.replaceState(null,'','#'+next);
    $(next+'-title').focus({preventScroll:true});window.scrollTo({top:0,behavior:'instant'});
    $('session-label').textContent=next==='setup'?'你与'+(tankCount-1)+'辆机器人':next==='battle'?'各自交锋，共同留色':'';
  }
  function syncPaint(){if(game.paint.dirty){paintContext.putImageData(paintImage,0,0);game.paint.dirty=false;}}
  function drawCovers(ctx,rects){
    ctx.save();for(const r of rects){ctx.fillStyle='#303d3030';ctx.fillRect(r.x+4,r.y+5,r.width,r.height);ctx.fillStyle='#b6b4a3';ctx.fillRect(r.x,r.y,r.width,r.height);ctx.strokeStyle='#566052';ctx.lineWidth=2;ctx.strokeRect(r.x,r.y,r.width,r.height);ctx.strokeStyle='#d7d3bf';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(r.x+5,r.y+r.height-5);ctx.lineTo(r.x+5,r.y+5);ctx.lineTo(r.x+r.width-5,r.y+5);ctx.stroke();}ctx.restore();
  }
  function drawSupply(){
    const s=game.supply;if(!game.config.supplies||!['warning','active'].includes(s.state))return;
    const waiting=s.state==='warning',seconds=Math.max(0,Math.ceil(s.until-game.time));context.save();context.translate(s.x,s.y);context.lineWidth=3;
    context.beginPath();context.arc(0,0,waiting?31:27,0,Math.PI*2);context.setLineDash(waiting?[6,5]:[]);context.strokeStyle=waiting?'#535e48':'#85652b';context.stroke();context.setLineDash([]);
    if(!waiting){context.fillStyle='#f3f0e7';context.beginPath();for(let i=0;i<6;i++){const a=i*Math.PI/3;const x=Math.cos(a)*21,y=Math.sin(a)*21;i?context.lineTo(x,y):context.moveTo(x,y);}context.closePath();context.fill();context.strokeStyle='#85652b';context.stroke();}
    context.strokeStyle='#584719';context.lineWidth=3.5;context.beginPath();for(const y of [-7,5]){context.moveTo(-8,y+6);context.lineTo(0,y-2);context.lineTo(8,y+6);}context.stroke();
    context.textAlign='center';context.font='18px "Microsoft YaHei",sans-serif';context.strokeStyle='#eeeadd';context.lineWidth=5;const text=waiting?seconds+'秒后出现':'机动补给';context.strokeText(text,0,55);context.fillStyle='#30392c';context.fillText(text,0,55);context.restore();
  }
  function renderTank(t){
    context.save();context.shadowColor='#f3f0e7';context.shadowBlur=4;context.translate(t.x,t.y);context.rotate(t.body);
    context.fillStyle=game.palette[t.id].color;context.strokeStyle='#30392c';context.lineWidth=1.8;
    for(const [x,y,w,h] of [[-22,-24,9,48],[13,-24,9,48],[-15,-24,30,48]]){context.beginPath();context.roundRect(x,y,w,h,3);context.fill();context.stroke();}
    context.restore();context.save();context.translate(t.x,t.y);context.rotate(t.aim);
    context.fillStyle=game.palette[t.id].color;context.strokeStyle='#30392c';context.lineWidth=1.8;
    context.fillRect(0,-3.5,34,7);context.strokeRect(0,-3.5,34,7);context.beginPath();context.arc(0,0,10,0,Math.PI*2);context.fill();context.stroke();if(t.shots>0&&t.cooldown>DEFAULTS.fireInterval-.05){context.fillStyle='#d2ab62';context.beginPath();context.moveTo(35,-4);context.lineTo(48,0);context.lineTo(35,4);context.fill();}context.restore();
    if(t.id===game.selected){
      context.save();context.beginPath();context.arc(t.x,t.y,36,0,Math.PI*2);context.strokeStyle='#f3f0e7';context.lineWidth=5;context.stroke();context.strokeStyle='#30392c';context.lineWidth=2;context.setLineDash([5,4]);context.stroke();context.restore();
      if(t.lastHitAngle!==null&&game.time-t.lastHit<.65){context.save();context.globalAlpha=1-(game.time-t.lastHit)/.65;context.beginPath();context.arc(t.x,t.y,48,t.lastHitAngle-.42,t.lastHitAngle+.42);context.strokeStyle='#f3f0e7';context.lineWidth=8;context.stroke();context.strokeStyle='#b9634d';context.lineWidth=4;context.stroke();context.restore();}
      context.fillStyle='#f3f0e7';context.fillRect(t.x-12,t.y+39,24,22);context.fillStyle='#252923';context.font='14px "Microsoft YaHei",sans-serif';context.textAlign='center';context.fillText('你',t.x,t.y+55);
    }
    context.fillStyle='#f3f0e7';context.fillRect(t.x-24,t.y-39,48,5);context.fillStyle='#30392c';context.fillRect(t.x-24,t.y-39,48*t.health/DEFAULTS.health,5);
    if(game.config.magazine){for(let i=0;i<game.config.ammoCapacity;i++){context.fillStyle='#f3f0e7';context.fillRect(t.x-23+i*16,t.y-58,13,5);context.fillStyle=i<t.ammo?'#75653b':'#52604e55';context.fillRect(t.x-22+i*16,t.y-57,11,3);}if(t.ammo<game.config.ammoCapacity){context.fillStyle='#75653b';context.fillRect(t.x-23,t.y-64,45*t.reload/game.config.reloadInterval,2);}}
    if(t.armor>0){context.fillStyle='#70877d';context.fillRect(t.x-24,t.y-46,48*t.armor/DEFAULTS.armor,3);}
    if(game.speedFactor(t)>1){context.save();context.strokeStyle='#b58c36';context.lineWidth=3;context.beginPath();context.arc(t.x,t.y,43,.2,Math.PI-.2);context.stroke();context.beginPath();for(const y of [-77,-69]){context.moveTo(t.x-7,t.y+y+5);context.lineTo(t.x,t.y+y);context.lineTo(t.x+7,t.y+y+5);}context.stroke();context.restore();}
    if(game.time-t.lastHit<.12){context.strokeStyle='#f3f0e7';context.lineWidth=4;context.beginPath();context.arc(t.x,t.y,30,0,Math.PI*2);context.stroke();}
  }
  function render(){
    if(!game)return;
    feedback();syncPaint();context.clearRect(0,0,stage.width,stage.height);context.imageSmoothingEnabled=false;context.drawImage(paintCanvas,0,0,stage.width,stage.height);
    drawCovers(context,game.arena.rects);
    drawSupply();
    for(const t of game.tanks)if(t.alive)renderTank(t);
    for(const event of game.hitEvents)if(event.owner===game.selected&&game.time-event.time<.22){context.save();context.globalAlpha=1-(game.time-event.time)/.22;context.beginPath();for(const side of [-1,1]){context.moveTo(event.x+side*5,event.y-5);context.lineTo(event.x+side*10,event.y-10);context.moveTo(event.x+side*5,event.y+5);context.lineTo(event.x+side*10,event.y+10);}context.strokeStyle='#f3f0e7';context.lineWidth=4;context.stroke();context.strokeStyle='#344635';context.lineWidth=1.5;context.stroke();context.restore();}
    for(const b of game.bullets){context.fillStyle='#30392c';context.beginPath();context.arc(b.x,b.y,8,0,Math.PI*2);context.fill();context.fillStyle=game.palette[b.owner].color;context.beginPath();context.arc(b.x,b.y,5,0,Math.PI*2);context.fill();}
  }
  function rankingMarkup(){
    return game.palette.map((p,i)=>({...p,id:i,share:game.paint.share(i),alive:game.tanks[i].alive})).sort((a,b)=>b.share-a.share||a.id-b.id).map(p=>`<div class="area-row ${p.id===game.selected?'current':''} ${p.alive?'':'dead'}"><div><span class="area-color" style="--swatch:${p.color}"></span><span>${p.name}</span>${p.id===game.selected?'<span class="you">你</span>':''}${p.alive?'':'<span class="you">已退场</span>'}</div><strong>${(p.share*100).toFixed(1)}%</strong></div>`).join('');
  }
  function hud(){
    if(!game)return;const t=game.tanks[game.selected];
    $('clock').textContent=formatTime(Math.ceil(game.config.timeLimit-game.time));$('alive').textContent=game.tanks.filter(t=>t.alive).length;$('total-tanks').textContent=game.tanks.length;
    $('battle-difficulty').textContent=TankPaint.BOT_DIFFICULTIES[game.config.botDifficulty].name;
    $('self-share').innerHTML=(game.paint.share(game.selected)*100).toFixed(1)+'<small>%</small>';
    document.body.dataset.health=t.alive&&t.health<game.config.health*.3?'low':'normal';
    $('hp').textContent=Math.ceil(t.health);$('armor').textContent=Math.ceil(t.armor);
    $('hp-bar').style.width=100*t.health/DEFAULTS.health+'%';$('armor-bar').style.width=100*t.armor/DEFAULTS.armor+'%';
    const capacity=game.config.ammoCapacity;$('ammo-slots').parentElement.hidden=!game.config.magazine;$('ammo-count').textContent=t.ammo+'/'+capacity;$('ammo-state').textContent=!t.alive?'已退场':t.ammo===capacity?'就绪':'恢复中';$('ammo-slots').setAttribute('aria-label',`弹药${t.ammo}发，共${capacity}发`);document.querySelectorAll('#ammo-slots i').forEach((slot,i)=>{slot.classList.toggle('ready',i<t.ammo);slot.classList.toggle('recovering',i===t.ammo&&t.ammo<capacity);slot.firstElementChild.style.width=(i<t.ammo?100:i===t.ammo?t.reload/game.config.reloadInterval*100:0)+'%';});
    $('armor-note').textContent=t.armor>0?'先承伤 · 不可恢复':'已耗尽 · 不可恢复';
    $('regen').textContent='+'+(t.alive?game.regeneration(game.selected):0).toFixed(1);
    $('player-state').textContent=t.alive?(t.health<game.config.health*.3?'生命偏低':'交锋中'):'已退场';$('battle-ranking').innerHTML=rankingMarkup();
    const supply=game.supply,pick=supply.lastPickup,recent=pick&&game.time-pick.time<3,boost=game.speedFactor(t)>1;let supplyText='';
    if(recent)supplyText=(pick.owner===game.selected?'你':game.palette[pick.owner].name)+'取得机动补给';
    else if(boost)supplyText='机动提升 · '+Math.ceil(t.boostUntil-game.time)+'秒';
    else if(supply.state==='warning')supplyText='补给 · '+Math.max(0,Math.ceil(supply.until-game.time))+'秒后出现';
    else if(supply.state==='active')supplyText='机动补给 · 可争夺';
    $('supply-status').textContent=supplyText;$('supply-status').hidden=!supplyText;const supplyKey=supply.serial+':'+supply.state+':'+(pick?.owner??'');if(supplyKey!==observedSupply){observedSupply=supplyKey;if(supplyText)$('status-message').textContent=supplyText;}
    $('coverage-value').textContent=(game.paint.coverage*100).toFixed(1)+'%';
    $('ownership-strip').innerHTML=game.palette.map((p,i)=>`<span style="background:${p.color};width:${game.paint.share(i)*100}%"></span>`).join('');
    $('arena-hint').textContent=touch.enabled?'左移右射 · 借掩体换位 · 弹药自动恢复':'WASD 移动 · 按住左键射击 · 弹药自动恢复';
    $('arena-hint').hidden=game.time>7||!t.alive||game.phase!=='running';
    $('spectator-banner').hidden=t.alive||game.phase!=='running';
    $('battle-eyebrow').textContent=t.alive?'交锋进行中':'退场观赏中';
  }
  function finish(){
    closeDialogs();paused=false;sound.sample('wood');
    syncPaint();const out=exported.getContext('2d');out.clearRect(0,0,exported.width,exported.height);out.imageSmoothingEnabled=false;out.drawImage(paintCanvas,0,0,exported.width,exported.height);
    $('result-canvas').width=exported.width;$('result-canvas').height=exported.height;const result=$('result-canvas').getContext('2d');result.drawImage(exported,0,0);
    $('duration-caption').textContent=formatTime(game.time)+' / '+game.marks.length+' 枚墨斑';
    $('winner-name').textContent=game.winners.map(i=>game.palette[i].name).join('、');
    $('winner-name').parentElement.classList.toggle('multiple',game.winners.length>1);
    $('winner-reason').textContent=game.reason==='survivor'?'最后存活。':game.winners.length>1?'并列获胜。':'占色最多。';
    $('winner-swatch').style.background=game.palette[game.winners[0]].color;
    $('result-ranking').innerHTML=rankingMarkup();
    artToken++;artSource=game.sourceForArt();artResult=null;artAttempt=0;viewer.clear();setArtView('original');
    gallery.begin(artSource,game.snapshot(),exported);$('download-status').textContent='';clearInput();show('result');const backgroundStyle=getComputedStyle(battleBackdrop);settlementWait=settlement.run(stage,exported,$('art-mat'),{image:battleImage,enabled:backdropEnabled&&!battleImage.hidden,opacity:Number(backgroundStyle.opacity),filter:backgroundStyle.filter});$('status-message').textContent='本局结束，'+$('winner-name').textContent+'获胜。';const finishedSource=artSource;generateArt().then(()=>{if(screen==='result'&&artSource===finishedSource)ending.schedule();});
  }
  function start(){
    gallery.detach();sound.unlock();sound.sample('paper');observedShots=0;observedHit=-10;observedPosition=null;observedAmmo=DEFAULTS.ammoCapacity;observedHits=0;observedSupply='';
    artToken++;viewer.clear();closeDialogs();clearInput();paused=false;speed=1;accumulator=0;artState='idle';artSource=null;artResult=null;
    const params=new URLSearchParams(location.search),given=params.get('seed');
    const seed=given!==null?Number(given)>>>0:(globalThis.crypto?.getRandomValues(new Uint32Array(1))[0]??Date.now());
    const aspect=innerWidth/innerHeight,area=DEFAULTS.width*DEFAULTS.height;
    const width=Math.round(Math.sqrt(area*aspect)/DEFAULTS.cell)*DEFAULTS.cell,height=Math.round(Math.sqrt(area/aspect)/DEFAULTS.cell)*DEFAULTS.cell;
    const check=params.has('check'),limit=Number(params.get('limit')),config={tankCount,width,height,supplies:suppliesEnabled,botDifficulty:difficulty,botStyles:params.get('styles')!=='classic',...(check?{cover:params.get('cover')!=='0',magazine:params.get('magazine')!=='0'}:{}),...(check&&limit>0&&limit<=DEFAULTS.timeLimit?{timeLimit:limit}:{})};
    game=new Game({seed,color:selected,player:check&&params.get('allBots')==='1'?null:selected,bots:!(check&&params.get('bots')==='0'),config});document.body.dataset.tanks=String(game.tanks.length);paintImage=new ImageData(game.paint.rgba,game.paint.width,game.paint.height);
    stage.width=exported.width=width;stage.height=exported.height=height;paintCanvas.width=game.paint.width;paintCanvas.height=game.paint.height;
    pointer={x:game.tanks[game.selected].x+Math.cos(game.tanks[game.selected].aim)*100,y:game.tanks[game.selected].y+Math.sin(game.tanks[game.selected].aim)*100,shoot:false};
    $('speed-button').textContent='加速观看 ×4';$('status-message').textContent='对局开始，你的颜色是'+PALETTE[selected].name;
    backdropIndex=(backdropIndex+1)%backdropAssets.length;const asset=backdropAssets[backdropIndex];if(battleImage.getAttribute('src')!==asset){battleImage.hidden=true;backdropStatus='loading';battleImage.src=asset;}else if(battleImage.complete&&battleImage.naturalWidth){backdropStatus='ready';battleImage.hidden=false;}else if(battleImage.complete){backdropStatus='fallback';battleImage.hidden=true;}syncBackdrop();
    show('battle');fitBackdrop();hud();render();lastFrame=performance.now();
  }
  function input(){const t=game?.tanks[game.selected],v=touch.state();return {x:Math.max(-1,Math.min(1,(keys.has('d')||keys.has('arrowright')?1:0)-(keys.has('a')||keys.has('arrowleft')?1:0)+v.x)),y:Math.max(-1,Math.min(1,(keys.has('s')||keys.has('arrowdown')?1:0)-(keys.has('w')||keys.has('arrowup')?1:0)+v.y)),shoot:pointer.shoot||v.firing,aimX:v.firing&&t?t.x+v.ax*1000:pointer.x,aimY:v.firing&&t?t.y+v.ay*1000:pointer.y};}
  function tick(now){
    const elapsed=lastFrame?Math.min(.1,(now-lastFrame)/1000):0;lastFrame=now;
    if(game&&screen==='battle'&&!paused){
      accumulator+=elapsed*(game.tanks[game.selected].alive?1:speed);
      let steps=0;while(accumulator>=DEFAULTS.dt&&steps<30&&game.phase!=='finished'){game.step(DEFAULTS.dt,input());accumulator-=DEFAULTS.dt;steps++;}
      render();if(now-lastHUD>100){hud();lastHUD=now;}
      if(game.phase==='finished')finish();
    }
    requestAnimationFrame(tick);
  }
  function suspend(){if(screen!=='battle'||paused)return;paused=true;clearInput();sound.stopSamples();accumulator=0;pause.showModal();}
  function closeDialogs(){if(help.open)help.close();if(pause.open)pause.close();if($('online-dialog').open)$('online-dialog').close();}
  function resume(){paused=false;clearInput();accumulator=0;lastFrame=performance.now();}
  function home(){gallery.detach();artToken++;viewer.clear();artState='idle';artSource=null;artResult=null;closeDialogs();game=null;paused=false;clearInput();show('setup');}
  function point(event){const r=stage.getBoundingClientRect(),scale=Math.min(r.width/stage.width,r.height/stage.height);pointer.x=(event.clientX-r.left-(r.width-stage.width*scale)/2)/scale;pointer.y=(event.clientY-r.top-(r.height-stage.height*scale)/2)/scale;}
  stage.addEventListener('pointermove',point);
  stage.addEventListener('pointerdown',event=>{if(event.button!==0||event.pointerType==='touch'||screen!=='battle'||paused)return;point(event);if(pointer.x<0||pointer.x>stage.width||pointer.y<0||pointer.y>stage.height)return;event.preventDefault();stage.setPointerCapture(event.pointerId);pointer.shoot=true;});
  window.addEventListener('pointerup',()=>pointer.shoot=false);stage.addEventListener('pointercancel',()=>pointer.shoot=false);
  document.addEventListener('keydown',event=>{
    if(event.key==='Escape'){
      if(!$('rank-panel').hidden){$('rank-panel').hidden=true;$('rank-button').setAttribute('aria-expanded','false');return;}
      if(help.open||pause.open||$('online-dialog').open)return;
      if(gallery.dialog.open)return;
      if(focusArt){event.preventDefault();setFocus(false);}else if(screen==='battle'){event.preventDefault();suspend();}return;
    }
    const key=event.key.toLowerCase();if(screen==='battle'&&!paused&&['w','a','s','d','arrowup','arrowleft','arrowdown','arrowright'].includes(key)){event.preventDefault();keys.add(key);}
  });
  document.addEventListener('keyup',event=>keys.delete(event.key.toLowerCase()));
  window.addEventListener('blur',()=>{clearInput();if(screen==='battle'&&!paused)suspend();});
  document.addEventListener('visibilitychange',()=>{if(document.hidden){clearInput();if(screen==='battle'&&!paused)suspend();}});
  $('online-button').addEventListener('click',()=>$('online-dialog').showModal());$('online-close').addEventListener('click',()=>$('online-dialog').close());
  $('pause-button').addEventListener('click',suspend);$('resume-button').addEventListener('click',()=>pause.close());pause.addEventListener('close',()=>{if(!help.open)resume();});
  $('help-button').addEventListener('click',()=>{if(screen==='battle'){paused=true;clearInput();accumulator=0;}help.showModal();});
  for(const id of ['close-help','ack-help'])$(id).addEventListener('click',()=>help.close());help.addEventListener('close',()=>{if(!pause.open)resume();});
  $('abandon-button').addEventListener('click',home);$('home-button').addEventListener('click',()=>screen==='battle'?suspend():home());
  $('start-button').addEventListener('click',start);$('again-button').addEventListener('click',home);
  $('speed-button').addEventListener('click',()=>{speed=speed===1?4:1;$('speed-button').textContent=speed===1?'加速观看 ×4':'恢复常速 ×1';});
  $('focus-art').addEventListener('click',()=>setFocus(!focusArt));
  function download(canvas,name){canvas.toBlob(blob=>{if(window.YujiAndroid){if(blob)window.YujiSavePng(blob,name);return;}
    if(!blob){$('download-status').textContent='未能生成图片，请重试。';return;}
    const url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download=name;document.body.appendChild(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1500);$('download-status').textContent='已保存，不含坦克与界面。';
  },'image/png');}
  $('download-art').addEventListener('click',()=>{if(!artResult)return;viewer.stop();const image=viewer.image();if(image)download(image,`余迹_${game.seed}_${artResult.model.name}.png`);});
  $('download-original').addEventListener('click',()=>download(exported,`余迹_${game.seed}_原画.png`));
  function cleanReveal(){const mat=$('art-mat');mat.classList.remove('is-unfolding');mat.style.removeProperty('background-color');mat.style.removeProperty('--raw-opacity');$('reveal-skip').hidden=true;$('result-canvas').hidden=artMode==='sculpture';}
  function setArtView(mode){artMode=mode==='sculpture'&&artResult?'sculpture':'original';const is3D=artMode==='sculpture',revealing=artState==='revealing';$('result-canvas').hidden=is3D;$('sculpture-canvas').hidden=!is3D;$('art-gestures').hidden=!is3D||revealing;$('art-mat').classList.toggle('is-sculpture',is3D);$('toggle-art').innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M3 5h18v14H3zM5 16l5-5 4 4 3-3 3 4"/><circle cx="16" cy="9" r="1"/></svg><span>'+(is3D?'看原画':'看立体')+'</span>';$('toggle-art').disabled=!artResult;$('art-reset').disabled=!artResult||revealing;$('art-rise').disabled=!artResult||revealing;$('download-art').disabled=!artResult||revealing;$('art-caption').textContent=artResult&&!revealing?'本局作品 · '+artResult.model.name:revealing?'本局痕迹':'本局原画';if(is3D)viewer.request();else viewer.stop();}
  async function generateArt(){if(!artSource||screen!=='result')return;const token=++artToken,source=artSource;artAttempt++;artState='generating';$('retry-shape').disabled=true;$('shape-status').hidden=false;$('shape-status').textContent='正在让本局墨斑成形…';
    const seed=(source.seed+Math.imul(artAttempt+shapeHistory.length,2246822519))>>>0;
    try{const result=await InkChoose.generate(source,shapeHistory,seed,message=>{if(token===artToken)$('shape-status').textContent=message;},()=>token!==artToken||screen!=='result');if(!result||token!==artToken||screen!=='result')return;artResult=result;shapeHistory=InkChoose.commit(shapeHistory,result.descriptor);InkChoose.writeHistory(shapeHistory);viewer.set(source,result.model);gallery.setModel(artResult);await settlementWait;if(token!==artToken||screen!=='result')return;
      artState='revealing';setArtView('sculpture');$('shape-status').textContent='';$('shape-status').hidden=true;$('reveal-skip').hidden=viewer.reduced.matches;
      await viewer.rise({duration:3200,onFrame:t=>{if(token!==artToken)return;const mat=$('art-mat');if(t<1){mat.classList.add('is-unfolding');$('result-canvas').hidden=false;mat.style.setProperty('--raw-opacity',String(Math.max(0,1-t/.12)));const tone=Math.min(1,t/.65);mat.style.backgroundColor='rgb('+[238+(34-238)*tone,234+(42-234)*tone,221+(41-221)*tone].map(Math.round).join(',')+')';}else cleanReveal();}});
      if(token!==artToken||screen!=='result')return;artState='ready';cleanReveal();setArtView(artMode);gallery.flushMain();}
    catch(e){if(token!==artToken||screen!=='result')return;artState='fallback';if(!artResult)setArtView('original');$('shape-status').textContent=artResult?'这次未找到更合适的形态，先保留当前作品。':'这局先保留原画。你可以保存，或重试立体成形。';}
    finally{if(token===artToken)$('retry-shape').disabled=false;}
  }
  $('retry-shape').addEventListener('click',generateArt);$('toggle-art').addEventListener('click',()=>setArtView(artMode==='original'?'sculpture':'original'));$('art-reset').addEventListener('click',()=>{setArtView('sculpture');viewer.reset();});$('art-rise').addEventListener('click',()=>{setArtView('sculpture');viewer.rise();});$('art-zoom-in').addEventListener('click',()=>viewer.scale(1.15));$('art-zoom-out').addEventListener('click',()=>viewer.scale(1/1.15));
  $('reveal-skip').addEventListener('click',()=>viewer.reset());
  $('color-options').innerHTML=PALETTE.map((p,i)=>`<button type="button" class="color-swatch" data-color="${i}" style="--swatch:${p.color}" aria-label="选择${p.name}" aria-pressed="${i===selected}"><span class="swatch-tank" aria-hidden="true">${tankSVG(p.color)}</span><span class="swatch-name">${p.name}</span></button>`).join('');
  document.querySelectorAll('[data-color]').forEach(button=>button.addEventListener('click',()=>{selected=Number(button.dataset.color);identity();}));
  // The cover is a real, reproducible run with all five tanks controlled by the same bot rules.
  const cover=new Game({seed:80427,player:null,config:{supplies:false,botStyles:false}});for(let i=0;i<1020&&cover.phase!=='finished';i++)cover.step();
  const small=document.createElement('canvas');small.width=cover.paint.width;small.height=cover.paint.height;small.getContext('2d').putImageData(new ImageData(cover.paint.rgba,small.width,small.height),0,0);
  const coverContext=$('cover-canvas').getContext('2d');coverContext.imageSmoothingEnabled=false;coverContext.drawImage(small,0,0,1400,1000);drawCovers(coverContext,cover.arena.rects);
  $('battle-help').addEventListener('click',()=>$('help-button').click());
  $('pause-sound').addEventListener('click',()=>{$('sound-button').click();$('pause-sound').textContent=sound.enabled?'关闭声音':'开启声音';});
  $('pause-backdrop').addEventListener('click',()=>{backdropEnabled=!backdropEnabled;syncBackdrop();try{localStorage.setItem('yujiBattleBackdropV1',backdropEnabled?'on':'off');}catch{}});syncBackdrop();
  $('sound-button').addEventListener('click',()=>$('pause-sound').textContent=sound.enabled?'关闭声音':'开启声音');
  $('pause-fullscreen').addEventListener('click',()=>$('fullscreen-button').click());
  function panel(button,panel,close){function toggle(value){$(panel).hidden=!value;$(button).setAttribute('aria-expanded',String(value));if(value)$(close).focus();else $(button).focus();}$(button).addEventListener('click',()=>toggle($(panel).hidden));$(close).addEventListener('click',()=>toggle(false));}
  panel('rank-button','rank-panel','rank-close');
  $('fullscreen-button').addEventListener('click',async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen();}catch(e){$('status-message').textContent='当前窗口不支持切换全屏。';}});
  document.addEventListener('fullscreenchange',()=>$('fullscreen-button').textContent=document.fullscreenElement?'退出全屏 ⛶':'全屏 ⛶');
  window.addEventListener('resize',()=>{touch.clear();if(touch.enabled&&innerHeight>innerWidth&&screen==='battle')suspend();});
  if(touch.enabled){document.body.classList.add('has-touch');document.querySelector('.equal-note').innerHTML='横屏游玩 · 左侧移动 · 右侧瞄准射击';}
  $('tank-count').addEventListener('input',()=>{tankCount=Number($('tank-count').value);$('tank-count-value').value=tankCount;$('setup-roster').textContent='你与'+(tankCount-1)+'辆机器人 · 每局有白色';if(screen==='setup')$('session-label').textContent='你与'+(tankCount-1)+'辆机器人';});
  $('supply-toggle').checked=suppliesEnabled;$('supply-toggle').addEventListener('change',()=>suppliesEnabled=$('supply-toggle').checked);
  $('bot-difficulty').value=difficulty;$('bot-difficulty').addEventListener('change',()=>difficulty=$('bot-difficulty').value);
  const coverStage=$('cover-canvas').getContext('2d');for(const t of cover.tanks)if(t.alive){coverStage.save();coverStage.translate(t.x,t.y);coverStage.rotate(t.aim);coverStage.fillStyle=cover.palette[t.id].color;coverStage.strokeStyle='#30392c';coverStage.lineWidth=3;coverStage.fillRect(-19,-17,38,34);coverStage.strokeRect(-19,-17,38,34);coverStage.fillRect(0,-4,36,8);coverStage.strokeRect(0,-4,36,8);coverStage.restore();}for(const b of cover.bullets){coverStage.fillStyle='#30392c';coverStage.beginPath();coverStage.arc(b.x,b.y,7,0,Math.PI*2);coverStage.fill();}
  identity();show('setup');requestAnimationFrame(tick);
  window.TankCanvasPlay={snapshot:()=>({screen,paused,speed,selected:PALETTE[selected].id,tankCount,focusArt,backdrop:{enabled:backdropEnabled,status:backdropStatus,asset:backdropAssets[Math.max(0,backdropIndex)]},controls:touch.state(),sound:sound.snapshot(),ending:ending.snapshot(),settlement:settlement.snapshot(),arena:game?{width:game.config.width,height:game.config.height}:null,collection:gallery.snapshot(),game:game?.snapshot()??null,art:{state:artState,mode:artMode,sourceOrigin:artSource?.origin??null,sourceSeed:artSource?.seed??null,sourceMarks:artSource?.impacts.map(p=>({...p}))??[],modelMarks:artResult?.model.marks.map(p=>({...p}))??[],family:artResult?.descriptor.family??null,quality:artResult?.quality??null,attempt:artAttempt,viewer:viewer.snapshot(),historyCount:shapeHistory.length}})};
  if(new URLSearchParams(location.search).has('check'))window.TankCanvasPlay.advanceForCheck=seconds=>{
    if(!game)return;for(let n=0;n<Math.ceil(seconds/DEFAULTS.dt)&&game.phase!=='finished';n++)game.step(DEFAULTS.dt,input());
    render();hud();if(game.phase==='finished')finish();return window.TankCanvasPlay.snapshot();
  };
})();
