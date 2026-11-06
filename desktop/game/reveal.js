'use strict';
window.YujiSettlement=class {
  constructor(){this.active=null;this.reduced=matchMedia('(prefers-reduced-motion: reduce)');
    document.addEventListener('visibilitychange',()=>this.pause(document.hidden));
    window.addEventListener('resize',()=>this.cancel());
    window.addEventListener('pagehide',()=>this.cancel());
  }
  run(battle,raw,target,background=null){
    this.cancel();if(this.reduced.matches)return Promise.resolve(true);
    const box=document.createElement('div');box.className='settlement-paper';box.setAttribute('aria-hidden','true');
    const paper=document.createElement('canvas'),actors=document.createElement('canvas');let scenery=null;
    if(background?.enabled&&background.image?.complete&&background.image.naturalWidth){scenery=document.createElement('canvas');scenery.className='settlement-background';scenery.width=raw.width;scenery.height=raw.height;const image=background.image,scale=Math.max(raw.width/image.naturalWidth,raw.height/image.naturalHeight),w=image.naturalWidth*scale,h=image.naturalHeight*scale;scenery.getContext('2d').drawImage(image,(raw.width-w)/2,(raw.height-h)/2,w,h);scenery.style.filter=background.filter;box.append(scenery);}
    for(const [canvas,source] of [[paper,raw],[actors,battle]]){canvas.width=source.width;canvas.height=source.height;canvas.getContext('2d').drawImage(source,0,0);box.append(canvas);}
    document.body.append(box);const end=target.getBoundingClientRect(),start={left:'0px',top:'0px',width:innerWidth+'px',height:innerHeight+'px'},last={left:end.left+'px',top:end.top+'px',width:end.width+'px',height:end.height+'px'};
    const move=box.animate([{...start,offset:0},{...start,offset:.3},{...last,offset:1}],{duration:1100,easing:'cubic-bezier(.4,0,.2,1)',fill:'both'}),fade=actors.animate([{opacity:1},{opacity:0}],{duration:360,fill:'both'});
    const animations=[move,fade];if(scenery)animations.push(scenery.animate([{opacity:background.opacity},{opacity:0}],{duration:360,fill:'both'}));
    return new Promise(resolve=>{const run={box,animations,resolve};this.active=run;this.pause(document.hidden);move.finished.then(()=>this.finish(run,true),()=>this.finish(run,false));});
  }
  pause(value){if(this.active)for(const animation of this.active.animations)if(animation.playState!=='finished')value?animation.pause():animation.play();}
  finish(run,completed){if(this.active!==run)return;this.active=null;run.box.remove();for(const animation of run.animations)animation.cancel();run.resolve(completed);}
  cancel(){if(this.active)this.finish(this.active,false);}
  snapshot(){return {active:!!this.active,paused:this.active?.animations[0].playState==='paused'};}
};
