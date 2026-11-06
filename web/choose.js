'use strict';
(()=>{
 const F=InkForms,S=InkSculpture,KEY='tankCanvasSculptureNoveltyV1',LIMIT=240;
 function sanitize(value){if(!Array.isArray(value))return [];return value.filter(h=>h&&F.FAMILIES.some(f=>f.id===h.family)&&typeof h.id==='string'&&h.id.length<80&&Number.isInteger(h.seed)&&Array.isArray(h.fingerprint)&&h.fingerprint.length===256&&h.fingerprint.every(n=>n===0||n===1)).slice(-LIMIT).map(h=>({id:h.id,family:h.family,seed:h.seed>>>0,fingerprint:[...h.fingerprint]}));}
 function readHistory(){try{return {entries:sanitize(JSON.parse(localStorage.getItem(KEY)||'[]')),persistent:true};}catch{return {entries:[],persistent:false};}}
 function writeHistory(entries){const clean=sanitize(entries);try{localStorage.setItem(KEY,JSON.stringify(clean));return true;}catch{return false;}}
 function measure(source,model,descriptor){
  const c=document.createElement('canvas');c.width=520;c.height=420;const ctx=c.getContext('2d',{willReadFrequently:true}),frame=InkRender.draw(ctx,c.width,c.height,{source,model,paddingX:110,paddingY:100}),pixels=ctx.getImageData(0,0,c.width,c.height).data,mask=new Uint8Array(c.width*c.height);
  let target=0,ink=0,inside=0,boundary=0,inkBoundary=0;
  for(let y=0;y<c.height;y++)for(let x=0;x<c.width;x++){const i=y*c.width+x,u=(x+.5-c.width/2)/frame.scale+frame.cx,v=(c.height/2-y-.5)/frame.scale+frame.cy,on=F.contains(descriptor,(u-model.fit.centerU)/model.fit.halfWidth,(v-model.fit.verticalOffset)/model.fit.halfHeight);if(on){mask[i]=1;target++;}if(pixels[i*4+3]>=128){ink++;if(on)inside++;}}
  for(let y=2;y<c.height-2;y++)for(let x=2;x<c.width-2;x++){const i=y*c.width+x;if(mask[i]&&(!mask[i-2]||!mask[i+2]||!mask[i-c.width*2]||!mask[i+c.width*2])){boundary++;let painted=false;for(let yy=-2;yy<=2&&!painted;yy++)for(let xx=-2;xx<=2;xx++)if(pixels[((y+yy)*c.width+x+xx)*4+3]>=128){painted=true;break;}if(painted)inkBoundary++;}}
  const coverage=inside/Math.max(1,target),spill=(ink-inside)/Math.max(1,ink),iou=inside/Math.max(1,target+ink-inside),edge=inkBoundary/Math.max(1,boundary);
  return {coverage,spill,iou,edge,score:coverage*.35+edge*.45+iou*.2-spill*.05};
 }
 const yieldFrame=()=>new Promise(resolve=>setTimeout(resolve,0));
 async function generate(source,history,seed,onProgress=()=>{},isCancelled=()=>false){
  if(source.impacts.length<3)throw new Error('这局先保留原画，你可以稍后重试。');
  const all=F.candidates(source,history,seed),ranked=[],rejected=[];
  // Limit expensive source fitting as the library grows. Prefer visibly distinct silhouettes.
  const diverse=all.filter(d=>d.novelty>=.16),pool=diverse.length>=6?diverse:all;
  const preferPainting=((Math.imul(seed^source.seed,1664525)>>>0)%3)===0,order=(a,b)=>b.novelty-a.novelty||a.seed-b.seed;
  const candidates=preferPainting?[...pool.filter(d=>d.kind==='painting').sort(order),...pool.filter(d=>d.kind!=='painting').sort(order)].slice(0,12):pool.sort(order).slice(0,12);
  for(let i=0;i<candidates.length;i++){if(isCancelled())return null;onProgress('正在寻找适合这段墨斑的构图…');const d=candidates[i];try{const preflight=S.preflight(source,d);ranked.push({descriptor:d,preflight,rank:preflight+(1-d.novelty)*.2});}catch(e){rejected.push({family:d.family,reason:e.message});}await yieldFrame();}
  ranked.sort((a,b)=>(preferPainting?Number(b.descriptor.kind==='painting')-Number(a.descriptor.kind==='painting'):0)||a.rank-b.rank);let best=null,painting=null;const evaluated=[];
  for(const candidate of ranked.slice(0,6)){if(isCancelled())return null;onProgress(evaluated.length>=3?'正在尝试另一种形态…':'正在安排墨斑高度和展示角度…');await yieldFrame();try{const model=await S.solveAsync(source,candidate.descriptor,isCancelled);if(!model)return null;const quality=measure(source,model,candidate.descriptor),score=quality.score+candidate.descriptor.novelty*.08;const result={model,descriptor:candidate.descriptor,quality,score};evaluated.push({family:candidate.descriptor.family,quality,score});if(!best||score>best.score)best=result;if(candidate.descriptor.kind==='painting'&&acceptable(quality)&&(!painting||score>painting.score))painting=result;if(evaluated.length>=3&&preferPainting&&painting){best=painting;break;}if(evaluated.length>=3&&acceptable(best.quality)&&(!preferPainting||candidate.descriptor.kind!=='painting'))break;}catch(e){rejected.push({family:candidate.descriptor.family,reason:e.message});}}
  if(preferPainting&&painting)best=painting;
  if(!best||!acceptable(best.quality))throw new Error('这局先保留原画，你可以重试立体成形。');return {...best,candidates:all.length,preflightCandidates:candidates.length,evaluated,rejected,seed:seed>>>0};
 }
 function commit(history,descriptor){return sanitize([...history,{id:descriptor.id,family:descriptor.family,seed:descriptor.seed,fingerprint:descriptor.fingerprint}]);}
 function acceptable(q){return q.coverage>=.32&&q.edge>=.42&&q.iou>=.24&&q.spill<=.5;}
 window.InkChoose={KEY,readHistory,writeHistory,sanitize,generate,measure,commit,acceptable};
})();
