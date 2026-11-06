'use strict';
(()=>{
 const S=InkSculpture,outlineCache=new WeakMap();
 function geometry(source,model,camera,progress=1){if(!outlineCache.has(source))outlineCache.set(source,source.impacts.map(S.outline));const outlines=outlineCache.get(source);return model.marks.map((p,i)=>({id:p.id,z:p.z*progress,owner:p.owner,points:outlines[i].map(v=>S.project(v.x,v.y,p.z*progress,camera))}));}
 function bounds(marks){let lowU=Infinity,highU=-Infinity,lowV=Infinity,highV=-Infinity;for(const mark of marks)for(const p of mark.points){lowU=Math.min(lowU,p.u);highU=Math.max(highU,p.u);lowV=Math.min(lowV,p.v);highV=Math.max(highV,p.v);}return {lowU,highU,lowV,highV};}
 function draw(ctx,width,height,{source,model,camera=model.camera,progress=1,zoom=1,background=false,paddingX=72,paddingY=112,frameBlend=1}){
  ctx.clearRect(0,0,width,height);if(background){ctx.fillStyle='#222a29';ctx.fillRect(0,0,width,height);}
  const marks=geometry(source,model,camera,progress),b=bounds(marks);
  if(frameBlend<1){const plane=bounds([{points:[[0,0],[source.width,0],[source.width,source.height],[0,source.height]].map(([x,y])=>S.project(x,y,0,camera))}]);for(const key of ['lowU','highU','lowV','highV'])b[key]=plane[key]+(b[key]-plane[key])*frameBlend;paddingX*=frameBlend;paddingY*=frameBlend;}
  const scale=Math.min((width-paddingX)/(b.highU-b.lowU),(height-paddingY)/(b.highV-b.lowV))*zoom,cx=(b.lowU+b.highU)/2,cy=(b.lowV+b.highV)/2;
  marks.sort((a,b)=>(Math.sin(camera.elevation)>=0?a.z-b.z:b.z-a.z)||a.id-b.id);
  for(const mark of marks){const screen=v=>({x:width/2+(v.u-cx)*scale,y:height/2-(v.v-cy)*scale}),p=mark.points.map(screen),clip=[[0,0],[source.width,0],[source.width,source.height],[0,source.height]].map(([x,y])=>screen(S.project(x,y,mark.z,camera)));
   ctx.save();ctx.beginPath();clip.forEach((v,i)=>i?ctx.lineTo(v.x,v.y):ctx.moveTo(v.x,v.y));ctx.closePath();for(const rect of source.clipRects??[]){const cut=[[rect.x,rect.y],[rect.x+rect.width,rect.y],[rect.x+rect.width,rect.y+rect.height],[rect.x,rect.y+rect.height]].map(([x,y])=>screen(S.project(x,y,mark.z,camera)));cut.forEach((v,i)=>i?ctx.lineTo(v.x,v.y):ctx.moveTo(v.x,v.y));ctx.closePath();}ctx.clip('evenodd');ctx.fillStyle=source.palette[mark.owner].color;ctx.beginPath();ctx.moveTo(p[0].x,p[0].y);ctx.bezierCurveTo(p[1].x,p[1].y,p[2].x,p[2].y,p[3].x,p[3].y);ctx.bezierCurveTo(p[4].x,p[4].y,p[5].x,p[5].y,p[6].x,p[6].y);ctx.closePath();ctx.fill();ctx.restore();
  }return {scale,cx,cy,width,height};
 }
 window.InkRender={draw};
})();
