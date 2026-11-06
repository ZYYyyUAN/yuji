'use strict';
window.InkViewer=class {
 constructor(canvas){this.canvas=canvas;this.ctx=canvas.getContext('2d');this.source=null;this.model=null;this.camera=null;this.progress=1;this.frameBlend=1;this.zoom=1;this.animation=null;this.pending=false;this.drag=null;this.pointers=new Map();this.pinch=null;this.reduced=matchMedia('(prefers-reduced-motion: reduce)');
  new ResizeObserver(()=>this.request()).observe(canvas);
  canvas.addEventListener('pointerdown',e=>{if(!this.model)return;this.stop();canvas.setPointerCapture(e.pointerId);this.pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});this.drag={id:e.pointerId,x:e.clientX,y:e.clientY};canvas.focus({preventScroll:true});});
  canvas.addEventListener('pointermove',e=>{if(!this.pointers.has(e.pointerId))return;this.pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});if(this.pointers.size===2){const p=[...this.pointers.values()],d=Math.hypot(p[0].x-p[1].x,p[0].y-p[1].y);if(this.pinch)this.scale(d/this.pinch);this.pinch=d;this.drag=null;}else if(this.drag?.id===e.pointerId){this.rotate((this.drag.x-e.clientX)*.008,(e.clientY-this.drag.y)*.007);this.drag={id:e.pointerId,x:e.clientX,y:e.clientY};}});
  const release=e=>{this.pointers.delete(e.pointerId);this.pinch=null;this.drag=null;};for(const type of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(type,release);
  canvas.addEventListener('wheel',e=>{if(this.model){e.preventDefault();this.scale(Math.exp(-e.deltaY*.001));}},{passive:false});
  canvas.addEventListener('keydown',e=>{if(!this.model)return;if(e.key==='Home'){e.preventDefault();this.reset();}else if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','+','=','-'].includes(e.key)){e.preventDefault();if(e.key==='+'||e.key==='=')this.scale(1.15);else if(e.key==='-')this.scale(1/1.15);else this.rotate(e.key==='ArrowLeft'?.1:e.key==='ArrowRight'?-.1:0,e.key==='ArrowUp'?.08:e.key==='ArrowDown'?-.08:0);}});
 }
 set(source,model){this.source=source;this.model=model;this.reset();}
 clear(){this.stop();this.model=null;this.source=null;this.pointers.clear();this.drag=null;}
 stop(){const run=this.animation;this.animation=null;if(run){this.progress=1;this.frameBlend=1;this.camera={...this.model.camera};this.zoom=1;run.onFrame?.(1);run.resolve(false);this.request();}}
 reset(){if(!this.model)return;this.stop();this.camera={...this.model.camera};this.zoom=1;this.progress=1;this.request();}
 rotate(dx,dy){if(!this.model)return;this.stop();this.camera.az+=dx;this.camera.elevation=Math.max(-Math.PI/2+.01,Math.min(Math.PI/2,this.camera.elevation+dy));this.request();}
 scale(factor){if(!this.model)return;this.stop();this.zoom=Math.max(.4,Math.min(3,this.zoom*factor));this.request();}
 request(){if(!this.pending){this.pending=true;requestAnimationFrame(()=>this.draw());}}
 draw(){this.pending=false;if(!this.model)return;const r=this.canvas.getBoundingClientRect();if(r.width<=0||r.height<=0)return;const dpr=Math.min(2,devicePixelRatio||1);if(this.canvas.width!==Math.round(r.width*dpr)||this.canvas.height!==Math.round(r.height*dpr)){this.canvas.width=Math.round(r.width*dpr);this.canvas.height=Math.round(r.height*dpr);}this.ctx.setTransform(dpr,0,0,dpr,0,0);InkRender.draw(this.ctx,r.width,r.height,{source:this.source,model:this.model,camera:this.camera,progress:this.progress,zoom:this.zoom,frameBlend:this.frameBlend});}
 rise({duration=2400,onFrame}={}){
  if(!this.model)return Promise.resolve(false);this.stop();if(this.reduced.matches){this.reset();onFrame?.(1);return Promise.resolve(true);}
  this.zoom=1;this.progress=0;this.frameBlend=0;this.camera={az:0,elevation:Math.PI/2};onFrame?.(0);this.draw();
  const smooth=value=>{const t=Math.max(0,Math.min(1,value));return t*t*(3-2*t);};
  return new Promise(resolve=>{const run={last:performance.now(),elapsed:0,onFrame,resolve};this.animation=run;const animate=now=>{
   if(this.animation!==run)return;const dt=Math.min(80,now-run.last);run.last=now;
   if(document.hidden||document.querySelector('dialog[open]')||this.canvas.hidden){requestAnimationFrame(animate);return;}
   run.elapsed+=dt;const t=Math.min(1,run.elapsed/duration),turn=smooth((t-.12)/.88);this.progress=smooth((t-.1)/.75);this.frameBlend=smooth(t);this.camera={az:this.model.camera.az*turn,elevation:Math.PI/2+(this.model.camera.elevation-Math.PI/2)*turn};onFrame?.(t);this.draw();
   if(t<1)requestAnimationFrame(animate);else{this.animation=null;this.reset();resolve(true);}
  };requestAnimationFrame(animate);});
 }
 image(){if(!this.model)return null;const r=this.canvas.getBoundingClientRect(),out=document.createElement('canvas');out.width=1800;out.height=Math.round(1800*(r.height||1000)/(r.width||1400));InkRender.draw(out.getContext('2d'),out.width,out.height,{source:this.source,model:this.model,camera:this.camera,progress:this.progress,zoom:this.zoom,background:true});return out;}
 snapshot(){return {camera:this.camera?{...this.camera}:null,bestCamera:this.model?{...this.model.camera}:null,zoom:this.zoom,progress:this.progress,frameBlend:this.frameBlend,animating:!!this.animation};}
};
