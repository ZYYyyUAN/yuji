(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory(require('./forms.js'),require('./ink.js'));else root.InkSculpture=factory(root.InkForms,root.InkGeometry);})(typeof globalThis!=='undefined'?globalThis:this,function(F,Ink){
  'use strict';
  const RADIUS=38, DEG=Math.PI/180;
  const TARGETS=[{id:'mushroom',name:'蘑菇',aspect:.86},{id:'butterfly',name:'蝴蝶',aspect:.92},{id:'teapot',name:'茶壶',aspect:.77}];
  function ellipse(x,y,cx,cy,rx,ry,rotation=0){const c=Math.cos(rotation),s=Math.sin(rotation),dx=x-cx,dy=y-cy;return ((dx*c+dy*s)/rx)**2+((-dx*s+dy*c)/ry)**2<=1;}
  function polygon(x,y,points){let hit=false;for(let i=0,j=points.length-1;i<points.length;j=i++){const a=points[i],b=points[j];if((a[1]>y)!==(b[1]>y)&&x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0])hit=!hit;}return hit;}
  function contains(id,x,y){
    if(typeof id==='object'){if(id.parts)return F.contains(id,x,y);id=id.id;}
    if(id==='mushroom')return (ellipse(x,y,0,.22,1,.64)&&y>=.14)||polygon(x,y,[[-.17,.18],[.17,.18],[.15,-.58],[.27,-.82],[.22,-.88],[-.24,-.88],[-.27,-.8],[-.14,-.57]]);
    if(id==='butterfly'){const a=Math.abs(x);return polygon(a,y,[[0,.05],[.18,.62],[.7,1],[1,.86],[.97,.36],[.62,.04],[.25,-.1]])||polygon(a,y,[[0,-.1],[.48,-.05],[.8,-.4],[.66,-.88],[.3,-.82],[.1,-.4]])||ellipse(x,y,0,-.05,.065,.68);}
    if(id==='teapot')return ellipse(x,y,-.01,-.2,.61,.6)||polygon(x,y,[[.38,-.45],[.69,-.24],[1,.49],[.86,.55],[.68,.2],[.44,.13]])||(ellipse(x,y,-.63,-.02,.37,.43)&&!ellipse(x,y,-.64,0,.22,.27))||polygon(x,y,[[-.47,.35],[.43,.35],[.33,.48],[-.36,.48]])||ellipse(x,y,-.01,.56,.095,.1);
    throw new Error('Unknown target: '+id);
  }
  function intervals(id,x){const out=[];let start=null;for(let i=0;i<=640;i++){const y=-1.05+i*2.1/640,on=i<640&&contains(id,x,y);if(on&&start===null)start=y;if(!on&&start!==null){out.push([start,y]);start=null;}}return out;}
  function sample(ranges,q){const sum=ranges.reduce((s,r)=>s+r[1]-r[0],0);let d=Math.min(.999999,Math.max(.000001,q))*sum;for(const [a,b]of ranges){if(d<=b-a)return a+d;d-=b-a;}return ranges.at(-1)[1];}
  function hash(n){let x=Math.imul(n+1,374761393);x=Math.imul(x^(x>>>13),1274126177);return ((x^(x>>>16))>>>0)/4294967296;}
  function projectedXY(p,az){const x=p.x-700,y=500-p.y;return {u:x*Math.cos(az)+y*Math.sin(az),q:-x*Math.sin(az)+y*Math.cos(az)};}
  const sourceAngles=new WeakMap(),targetProfiles=new WeakMap();
  function angleStats(source){
    if(sourceAngles.has(source))return sourceAngles.get(source);const stats=[];
    for(let deg=0;deg<180;deg+=3){const az=deg*DEG,c=Math.cos(az),s=Math.sin(az);let low=Infinity,high=-Infinity;const u=source.impacts.map(p=>{const v=(p.x-700)*c+(500-p.y)*s;low=Math.min(low,v);high=Math.max(high,v);return v;}),hist=Array(15).fill(0);
      if(high>low)for(const v of u)hist[Math.min(14,Math.floor((v-low)/(high-low)*15))]++;stats.push({az,low,high,hist});
    }sourceAngles.set(source,stats);return stats;
  }
  function chooseAngle(source,target){
    const bins=15;let expected=typeof target==='object'?targetProfiles.get(target):null;
    if(!expected){expected=Array.from({length:bins},(_,i)=>intervals(target,-.94+(i+.5)/bins*1.88).reduce((s,r)=>s+r[1]-r[0],0));if(typeof target==='object')targetProfiles.set(target,expected);}
    const total=expected.reduce((a,b)=>a+b,0);let best=null;
    for(const entry of angleStats(source)){const score=entry.hist.reduce((s,n,i)=>s+(n/source.impacts.length-expected[i]/total)**2/(expected[i]/total+.015),0);if(!best||score<best.score)best={...entry,score};}
    return {...best,positions:source.impacts.map(p=>projectedXY(p,best.az))};
  }
  function* solveWork(source,id){
    if(source.impacts.length<3)throw new Error('Insufficient ink');
    const target=typeof id==='object'?id:TARGETS.find(t=>t.id===id);if(!target)throw new Error('Unknown target');
    const angle=chooseAngle(source,target),elevation=46*DEG,halfWidth=(angle.high-angle.low)/1.88,halfHeight=halfWidth*target.aspect,mid=(angle.high+angle.low)/2;
    if(!(halfWidth>1))throw new Error('Insufficient spread');
    const points=[];for(let i=0;i<source.impacts.length;i++){const p=source.impacts[i],pos=angle.positions[i],x=(pos.u-mid)/halfWidth,ranges=intervals(target,x);if(!ranges.length)throw new Error('Target has no permitted vertical position');points.push({id:p.id,x:p.x,y:p.y,angle:p.angle,owner:p.owner,time:p.time,radius:p.radius??38,u:pos.u,q:pos.q,nx:x,ranges,ny:0});if(i%64===63)yield;}
    for(let i=0;i<points.length;i++){const p=points[i];let below=0,total=0;for(const n of points){const w=Math.exp(-(((p.nx-n.nx)/.11)**2));total+=w;if(n.q<p.q||(n.q===p.q&&n.id<p.id))below+=w;}p.ny=sample(p.ranges,(below+.5)/total);if(i%32===31)yield;}
    // Move only the future height. Horizontal projected positions remain immutable.
    const rx=RADIUS*2.25/halfWidth,ry=RADIUS*1.6*Math.sin(elevation)/halfHeight;
    const near=[];for(let i=0;i<points.length;i++){const p=points[i];near.push(points.filter(n=>n!==p&&Math.abs(n.nx-p.nx)<rx*2));if(i%64===63)yield;}
    const gcd=(a,b)=>b?gcd(b,a%b):a;let stride=67;while(gcd(stride,points.length)!==1)stride+=2;
    for(let pass=0;pass<12;pass++)for(let k=0;k<points.length;k++){
      const i=(k*stride+pass*23)%points.length,p=points[i];
      const energy=y=>near[i].reduce((s,n)=>s+Math.exp(-(((p.nx-n.nx)/rx)**2)-((y-n.ny)/ry)**2),0);
      let y=p.ny,cost=energy(y);
      for(let j=0;j<32;j++){const v=sample(p.ranges,(j+hash(p.id*571+pass*31+j)*.8+.1)/32),c=energy(v);if(c<cost){y=v;cost=c;}}
      p.ny=y;
      if(k%64===63)yield;
    }
    let minZ=Infinity;
    for(const p of points){p.z=(p.ny*halfHeight-p.q*Math.sin(elevation))/Math.cos(elevation);minZ=Math.min(minZ,p.z);}
    const marks=points.map(p=>({id:p.id,x:p.x,y:p.y,angle:p.angle,owner:p.owner,time:p.time,radius:p.radius,z:p.z-minZ}));
    return {id:target.id,family:target.family,name:target.name,marks,camera:{az:angle.az,elevation},fit:{horizontalScore:angle.score,minHeight:0,maxHeight:Math.max(...marks.map(p=>p.z)),halfWidth,halfHeight,centerU:mid,verticalOffset:-minZ*Math.cos(elevation)},method:'local-procedural-contour-not-online-ai'};
  }
  // A separable Gaussian field keeps every mark while avoiding pairwise energy scans.
  function* densityWork(source,id){
    if(source.impacts.length<3)throw new Error('Insufficient ink');
    const target=typeof id==='object'?id:TARGETS.find(t=>t.id===id);if(!target)throw new Error('Unknown target');
    const angle=chooseAngle(source,target),elevation=46*DEG,halfWidth=(angle.high-angle.low)/1.88,halfHeight=halfWidth*target.aspect,mid=(angle.high+angle.low)/2;
    if(!(halfWidth>1))throw new Error('Insufficient spread');
    const points=[];
    for(let i=0;i<source.impacts.length;i++){const p=source.impacts[i],pos=angle.positions[i],nx=(pos.u-mid)/halfWidth,ranges=intervals(target,nx);if(!ranges.length)throw new Error('Target has no permitted vertical position');points.push({...p,radius:p.radius??38,u:pos.u,q:pos.q,nx,ranges,ny:0});if(i%64===63)yield;}
    const bins=256,all=new Float64Array(bins),below=new Float64Array(bins),at=x=>Math.max(0,Math.min(bins-1,(x+1.05)/2.1*(bins-1)));
    const put=(hist,x)=>{const f=at(x),i=Math.floor(f),w=f-i;hist[i]+=1-w;if(i+1<bins)hist[i+1]+=w;};
    for(const p of points)put(all,p.nx);
    const smooth=(hist,x)=>{const f=at(x),radius=.11/2.1*(bins-1);let sum=0;for(let i=Math.max(0,Math.floor(f-radius*4));i<=Math.min(bins-1,Math.ceil(f+radius*4));i++)sum+=hist[i]*Math.exp(-(((i-f)/radius)**2));return sum;};
    const ordered=[...points].sort((a,b)=>a.q-b.q||a.id-b.id);
    for(let i=0;i<ordered.length;i++){const p=ordered[i];p.ny=sample(p.ranges,(smooth(below,p.nx)+.5)/Math.max(1,smooth(all,p.nx)));put(below,p.nx);if(i%64===63)yield;}
    const rx=RADIUS*2.25/halfWidth,ry=RADIUS*1.6*Math.sin(elevation)/halfHeight,W=96,H=96,field=new Float64Array(W*H),sx=(W-1)/2.1,sy=(H-1)/2.1;
    for(const p of points){const fx=(p.nx+1.05)*sx;p.xKernel=[];for(let x=Math.max(0,Math.ceil(fx-rx*sx*3));x<=Math.min(W-1,Math.floor(fx+rx*sx*3));x++)p.xKernel.push([x,Math.exp(-(((x-fx)/(rx*sx))**2))]);}
    const add=(p,y,sign)=>{const fy=(y+1.05)*sy;for(let j=Math.max(0,Math.ceil(fy-ry*sy*3));j<=Math.min(H-1,Math.floor(fy+ry*sy*3));j++){const factor=sign*Math.exp(-(((j-fy)/(ry*sy))**2)),offset=j*W;for(const [x,w]of p.xKernel)field[offset+x]+=w*factor;}};
    const energy=(p,y)=>{const fx=Math.max(0,Math.min(W-1,(p.nx+1.05)*sx)),fy=Math.max(0,Math.min(H-1,(y+1.05)*sy)),x=Math.floor(fx),j=Math.floor(fy),xx=Math.min(W-1,x+1),jj=Math.min(H-1,j+1),dx=fx-x,dy=fy-j;return (field[j*W+x]*(1-dx)+field[j*W+xx]*dx)*(1-dy)+(field[jj*W+x]*(1-dx)+field[jj*W+xx]*dx)*dy;};
    for(let i=0;i<points.length;i++){add(points[i],points[i].ny,1);if(i%64===63)yield;}
    const gcd=(a,b)=>b?gcd(b,a%b):a;let stride=67;while(gcd(stride,points.length)!==1)stride+=2;
    for(let pass=0;pass<6;pass++)for(let k=0;k<points.length;k++){const p=points[(k*stride+pass*23)%points.length];add(p,p.ny,-1);let y=p.ny,cost=energy(p,y);
      for(let j=0;j<32;j++){const v=sample(p.ranges,(j+hash(p.id*571+pass*31+j)*.8+.1)/32),e=energy(p,v);if(e<cost){y=v;cost=e;}}p.ny=y;add(p,y,1);if(k%64===63)yield;
    }
    let minZ=Infinity;for(const p of points){p.z=(p.ny*halfHeight-p.q*Math.sin(elevation))/Math.cos(elevation);minZ=Math.min(minZ,p.z);}
    const marks=points.map(p=>({id:p.id,x:p.x,y:p.y,angle:p.angle,owner:p.owner,time:p.time,radius:p.radius,z:p.z-minZ}));
    return {id:target.id,family:target.family,name:target.name,marks,camera:{az:angle.az,elevation},fit:{horizontalScore:angle.score,minHeight:0,maxHeight:Math.max(...marks.map(p=>p.z)),halfWidth,halfHeight,centerU:mid,verticalOffset:-minZ*Math.cos(elevation)},method:'local-procedural-contour-not-online-ai',optimizer:'density-grid-v1'};
  }
  function solve(source,id,options={}){const work=options.legacy?solveWork(source,id):densityWork(source,id);let step;do{step=work.next();}while(!step.done);return step.value;}
  let workerUnavailable=false;
  function background(source,id,isCancelled){return new Promise((resolve,reject)=>{let worker,timer;const end=(error,value)=>{clearInterval(timer);worker?.terminate();error?reject(error):resolve(value);};try{worker=new Worker(new URL('sculpture-worker.js?v=paint15',location.href));}catch(e){workerUnavailable=true;reject(e);return;}
    timer=setInterval(()=>{if(isCancelled())end(null,null);},40);
    worker.onmessage=e=>e.data.error?end(new Error(e.data.error)):end(null,e.data.model);
    worker.onerror=event=>{event.preventDefault();workerUnavailable=true;end(new Error('Worker unavailable'));};worker.postMessage({source,target:id});
  });}
  async function solveAsync(source,id,isCancelled=()=>false,options={}){
    if(!options.legacy&&!options.mainThread&&!workerUnavailable&&typeof Worker!=='undefined'&&typeof location!=='undefined'){
      try{return await background(source,id,isCancelled);}catch(e){if(!workerUnavailable)throw e;}
    }
    const work=options.legacy?solveWork(source,id):densityWork(source,id);let started=Date.now();
    while(true){if(isCancelled())return null;const step=work.next();if(step.done)return step.value;if(Date.now()-started>8){await new Promise(resolve=>setTimeout(resolve,0));started=Date.now();}}
  }
  // Exact cubic outline used by the existing landing-blot comparison, in its XY plane.
  function outline(p){return Ink.outline(p);}
  function project(x,y,z,camera){const X=x-700,Y=500-y,c=Math.cos(camera.az),s=Math.sin(camera.az),q=-X*s+Y*c;return {u:X*c+Y*s,v:q*Math.sin(camera.elevation)+z*Math.cos(camera.elevation)};}
  return {RADIUS,TARGETS,contains,intervals,solve,solveAsync,outline,project,preflight:(source,target)=>chooseAngle(source,target).score};
});
