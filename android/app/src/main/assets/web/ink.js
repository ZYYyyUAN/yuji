(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.InkGeometry=factory();})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';const controls=[[-1.1,0],[-1.1,-.7],[.25,-.95],[1,-.15],[1.2,.5],[-.35,.95],[-1.1,0]];
 function outline(mark){const radius=mark.radius??38,c=Math.cos(mark.angle),s=Math.sin(mark.angle);return controls.map(([x,y])=>({x:mark.x+radius*(x*c-y*s),y:mark.y+radius*(x*s+y*c)}));}
 function curve(a,b,c,d,t){const q=1-t;return {x:q*q*q*a.x+3*q*q*t*b.x+3*q*t*t*c.x+t*t*t*d.x,y:q*q*q*a.y+3*q*q*t*b.y+3*q*t*t*c.y+t*t*t*d.y};}
 function polygon(mark){const p=outline(mark),out=[];for(let i=0;i<16;i++)out.push(curve(p[0],p[1],p[2],p[3],i/16));for(let i=0;i<16;i++)out.push(curve(p[3],p[4],p[5],p[6],i/16));return out;}
 function along({x1,y1,x2,y2,carry=0,spacing=90}){if(!(spacing>0))throw new Error('Spacing must be positive');const dx=x2-x1,dy=y2-y1,length=Math.hypot(dx,dy),marks=[];if(length<1e-9)return {marks,carry};let at=spacing-carry;for(;at<=length+1e-8;at+=spacing){const fraction=Math.min(1,at/length);marks.push({x:x1+dx*fraction,y:y1+dy*fraction,angle:Math.atan2(dy,dx),fraction});}return {marks,carry:Math.max(0,(carry+length-marks.length*spacing)%spacing)};}
 return {outline,polygon,along};
});
