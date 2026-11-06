(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.TankArena=factory();})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
 function hit(x,y,nx,ny,rect,pad=0){
  let low=0,high=1;const d=[nx-x,ny-y],p=[x,y],lo=[rect.x-pad,rect.y-pad],hi=[rect.x+rect.width+pad,rect.y+rect.height+pad];
  for(let a=0;a<2;a++){if(Math.abs(d[a])<1e-10){if(p[a]<lo[a]||p[a]>hi[a])return null;}else{let near=(lo[a]-p[a])/d[a],far=(hi[a]-p[a])/d[a];if(near>far)[near,far]=[far,near];low=Math.max(low,near);high=Math.min(high,far);if(low>high)return null;}}
  return low<=1&&high>=0?Math.max(0,low):null;
 }
 class Arena {
  constructor(width,height,{cover=true,coverRects=null,tankRadius=23}={}){
   this.width=width;this.height=height;this.radius=tankRadius;
   const s=Math.min(width,height),cx=width/2,cy=height/2;
   this.rects=cover?(coverRects??[
    {x:cx-s*.22-s*.075,y:cy-s*.11-s*.028,width:s*.15,height:s*.056},
    {x:cx+s*.22-s*.075,y:cy+s*.11-s*.028,width:s*.15,height:s*.056},
    {x:cx+s*.11-s*.028,y:cy-s*.22-s*.075,width:s*.056,height:s*.15},
    {x:cx-s*.11-s*.028,y:cy+s*.22-s*.075,width:s*.056,height:s*.15}
   ]).map((r,i)=>({...r,id:i})):[];
   for(const r of this.rects)if(![r.x,r.y,r.width,r.height].every(Number.isFinite)||r.width<=0||r.height<=0||r.x<0||r.y<0||r.x+r.width>width||r.y+r.height>height)throw new Error('Invalid cover rectangle');
   const pad=tankRadius+5;this.nodes=this.rects.flatMap(r=>[{x:r.x-pad,y:r.y-pad},{x:r.x+r.width+pad,y:r.y-pad},{x:r.x+r.width+pad,y:r.y+r.height+pad},{x:r.x-pad,y:r.y+r.height+pad}]).filter(p=>this.free(p.x,p.y,tankRadius+1));
   this.edges=this.nodes.map((a,i)=>this.nodes.map((b,j)=>i!==j&&this.clear(a.x,a.y,b.x,b.y,tankRadius-.01)?Math.hypot(a.x-b.x,a.y-b.y):Infinity));
  }
  free(x,y,r=0){return x>=r&&y>=r&&x<=this.width-r&&y<=this.height-r&&!this.rects.some(o=>x>o.x-r&&x<o.x+o.width+r&&y>o.y-r&&y<o.y+o.height+r);}
  firstHit(x,y,nx,ny,pad=0){let at=null;for(const r of this.rects){const h=hit(x,y,nx,ny,r,pad);if(h!==null&&(at===null||h<at))at=h;}return at;}
  clear(x,y,nx,ny,pad=0){return this.firstHit(x,y,nx,ny,pad)===null;}
  resolve(p,r=this.radius){
   p.x=clamp(p.x,r,this.width-r);p.y=clamp(p.y,r,this.height-r);
   for(const o of this.rects)if(p.x>o.x-r&&p.x<o.x+o.width+r&&p.y>o.y-r&&p.y<o.y+o.height+r){
    const sides=[{d:p.x-o.x+r,x:o.x-r,y:p.y},{d:o.x+o.width+r-p.x,x:o.x+o.width+r,y:p.y},{d:p.y-o.y+r,x:p.x,y:o.y-r},{d:o.y+o.height+r-p.y,x:p.x,y:o.y+o.height+r}].sort((a,b)=>a.d-b.d);p.x=sides[0].x;p.y=sides[0].y;
   }return p;
  }
  move(p,dx,dy,r=this.radius){
   const before={x:p.x,y:p.y};let x=clamp(p.x+dx,r,this.width-r);
   for(const o of this.rects)if(p.y>o.y-r&&p.y<o.y+o.height+r){if(dx>0&&p.x<=o.x-r&&x>o.x-r)x=o.x-r;if(dx<0&&p.x>=o.x+o.width+r&&x<o.x+o.width+r)x=o.x+o.width+r;}
   p.x=x;let y=clamp(p.y+dy,r,this.height-r);
   for(const o of this.rects)if(p.x>o.x-r&&p.x<o.x+o.width+r){if(dy>0&&p.y<=o.y-r&&y>o.y-r)y=o.y-r;if(dy<0&&p.y>=o.y+o.height+r&&y<o.y+o.height+r)y=o.y+o.height+r;}
   p.y=y;this.resolve(p,r);return Math.hypot(p.x-before.x,p.y-before.y);
  }
  direction(p,gx,gy){
   const r=this.radius,goal=this.resolve({x:gx,y:gy},r+2),direct={x:goal.x-p.x,y:goal.y-p.y};
   if(this.clear(p.x,p.y,goal.x,goal.y,r-.01))return {...direct,routing:false};
   const n=this.nodes.length,dist=Array(n).fill(Infinity),first=Array(n).fill(-1),visited=new Set();
   for(let i=0;i<n;i++){const q=this.nodes[i];if(this.clear(p.x,p.y,q.x,q.y,r-.01)){dist[i]=Math.hypot(q.x-p.x,q.y-p.y);first[i]=dist[i]<3?-1:i;}}
   let best=Infinity,chosen=-1;
   for(let k=0;k<n;k++){let i=-1;for(let j=0;j<n;j++)if(!visited.has(j)&&(i<0||dist[j]<dist[i]))i=j;if(i<0||!Number.isFinite(dist[i]))break;visited.add(i);const q=this.nodes[i];
    if(this.clear(q.x,q.y,goal.x,goal.y,r-.01)){const cost=dist[i]+Math.hypot(q.x-goal.x,q.y-goal.y);if(cost<best){best=cost;chosen=first[i]<0?i:first[i];}}
    for(let j=0;j<n;j++){const cost=dist[i]+this.edges[i][j];if(cost<dist[j]){dist[j]=cost;first[j]=first[i]<0?j:first[i];}}
   }
   if(chosen>=0){const q=this.nodes[chosen];return {x:q.x-p.x,y:q.y-p.y,routing:true};}
   return {x:0,y:0,routing:true};
  }
 }
 return {Arena,hit};
});
