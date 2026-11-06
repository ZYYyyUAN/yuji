'use strict';
class DualSticks {
  constructor(move,aim,active){this.enabled=navigator.maxTouchPoints>0;this.active=active;this.move={id:null,x:0,y:0};this.aim={id:null,x:0,y:0};this.bind(move,this.move);this.bind(aim,this.aim);}
  bind(element,s){s.element=element;const update=e=>{const r=element.getBoundingClientRect(),dx=e.clientX-r.left-r.width/2,dy=e.clientY-r.top-r.height/2,range=r.width*.34,d=Math.hypot(dx,dy),scale=Math.max(range,d);s.x=dx/scale;s.y=dy/scale;element.style.setProperty('--jx',s.x*range+'px');element.style.setProperty('--jy',s.y*range+'px');};
    element.addEventListener('pointerdown',e=>{if(!this.active()||s.id!==null||e.pointerType==='mouse')return;e.preventDefault();s.id=e.pointerId;element.setPointerCapture(e.pointerId);element.classList.add('held');update(e);});
    element.addEventListener('pointermove',e=>{if(e.pointerId!==s.id)return;e.preventDefault();if(!this.active()){this.reset(s);return;}update(e);});
    for(const name of ['pointerup','pointercancel','lostpointercapture'])element.addEventListener(name,e=>{if(e.pointerId===s.id)this.reset(s);});
  }
  reset(s){const id=s.id;s.id=null;s.x=0;s.y=0;s.element.style.setProperty('--jx','0px');s.element.style.setProperty('--jy','0px');s.element.classList.remove('held');if(id!==null&&s.element.hasPointerCapture(id))s.element.releasePointerCapture(id);}
  clear(){this.reset(this.move);this.reset(this.aim);}
  state(){const m=Math.hypot(this.move.x,this.move.y),a=Math.hypot(this.aim.x,this.aim.y),firing=this.aim.id!==null&&a>.18;return {enabled:this.enabled,x:m>.15?this.move.x:0,y:m>.15?this.move.y:0,ax:firing?this.aim.x/a:0,ay:firing?this.aim.y/a:0,firing};}
}
class RoomSound {
  constructor(button){this.enabled=true;this.ctx=null;this.button=button;this.count={shot:0,hit:0,confirm:0,reload:0,paper:0,wood:0};this.samples={paper:new Audio('assets/paper.wav'),wood:new Audio('assets/wood.wav')};for(const a of Object.values(this.samples)){a.preload='none';a.volume=.2;}button.addEventListener('click',()=>{this.enabled=!this.enabled;button.textContent=this.enabled?'声音 开':'声音 关';button.setAttribute('aria-pressed',String(this.enabled));button.setAttribute('aria-label',this.enabled?'关闭声音':'开启声音');if(this.enabled)this.unlock();else{this.stopSamples();this.ctx?.suspend().catch(()=>{});}});}
  unlock(){if(!this.enabled)return;try{const AC=window.AudioContext||window.webkitAudioContext;if(!this.ctx&&AC)this.ctx=new AC();this.ctx?.resume().catch(()=>{});}catch(e){}}
  sample(kind){if(!this.enabled)return;const audio=this.samples[kind];if(!audio)return;audio.currentTime=0;audio.play().then(()=>this.count[kind]++).catch(()=>{});}
  stopSamples(){for(const a of Object.values(this.samples))a.pause();this.movement(false);}
  movement(active){if(!this.enabled||!this.ctx||this.ctx.state!=='running')active=false;if(active&&!this.motor){const c=this.ctx,b=c.createBuffer(1,4096,c.sampleRate),d=b.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=Math.sin(i*127.1)*Math.sin(i*31.7);const n=c.createBufferSource(),filter=c.createBiquadFilter(),g=c.createGain();n.buffer=b;n.loop=true;filter.type='lowpass';filter.frequency.value=450;g.gain.value=0;n.connect(filter);filter.connect(g);g.connect(c.destination);n.start();this.motor=g;}if(this.motor)this.motor.gain.setTargetAtTime(active?.009:0,this.ctx.currentTime,.04);}
  effect(kind){if(!this.enabled||!this.ctx||this.ctx.state!=='running')return;
    const settings={shot:[360,100,.035,.1,'sine'],hit:[150,60,.075,.1,'triangle'],confirm:[880,620,.025,.055,'triangle'],reload:[450,560,.018,.07,'sine']}[kind];if(!settings)return;
    const c=this.ctx,now=c.currentTime,o=c.createOscillator(),gain=c.createGain();o.type=settings[4];o.frequency.setValueAtTime(settings[0],now);o.frequency.exponentialRampToValueAtTime(settings[1],now+settings[3]);gain.gain.setValueAtTime(.0001,now);gain.gain.exponentialRampToValueAtTime(settings[2],now+.004);gain.gain.exponentialRampToValueAtTime(.0001,now+settings[3]);o.connect(gain);gain.connect(c.destination);o.start(now);o.stop(now+settings[3]+.01);o.onended=()=>{o.disconnect();gain.disconnect();};this.count[kind]++;
  }
  snapshot(){return {enabled:this.enabled,state:this.ctx?.state??'idle',events:{...this.count}};}
}
// Adapt only the display framing; candidate evaluation and fixed mark data stay intact.
window.InkViewer=class extends window.InkViewer {
  frame(width,height){return {paddingX:Math.min(72,width*.1),paddingY:Math.min(112,height*.2)};}
  draw(){this.pending=false;if(!this.model)return;const r=this.canvas.getBoundingClientRect();if(r.width<=0||r.height<=0)return;this.frameSize={width:r.width,height:r.height};const dpr=Math.min(2,devicePixelRatio||1);if(this.canvas.width!==Math.round(r.width*dpr)||this.canvas.height!==Math.round(r.height*dpr)){this.canvas.width=Math.round(r.width*dpr);this.canvas.height=Math.round(r.height*dpr);}this.ctx.setTransform(dpr,0,0,dpr,0,0);InkRender.draw(this.ctx,r.width,r.height,{source:this.source,model:this.model,camera:this.camera,progress:this.progress,zoom:this.zoom,...this.frame(r.width,r.height)});}
  image(){if(!this.model)return null;const r=this.canvas.getBoundingClientRect(),width=r.width||this.frameSize?.width||1400,height=r.height||this.frameSize?.height||1000,k=1800/width,pad=this.frame(width,height),out=document.createElement('canvas');out.width=1800;out.height=Math.round(height*k);InkRender.draw(out.getContext('2d'),out.width,out.height,{source:this.source,model:this.model,camera:this.camera,progress:this.progress,zoom:this.zoom,background:true,paddingX:pad.paddingX*k,paddingY:pad.paddingY*k});return out;}
};
