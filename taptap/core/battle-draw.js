'use strict';
const {DEFAULTS}=require('./engine.js');
function strokeDashArc(ctx,x,y,r,start,end,dash,gap){for(let a=start;a<end;a+=(dash+gap)/r){ctx.beginPath();ctx.arc(x,y,r,a,Math.min(end,a+dash/r));ctx.stroke();}}
module.exports=function(context,game){
  function drawCovers(ctx,rects){
    ctx.save();for(const r of rects){ctx.fillStyle='rgba(48,61,48,0.188235)';ctx.fillRect(r.x+4,r.y+5,r.width,r.height);ctx.fillStyle='#b6b4a3';ctx.fillRect(r.x,r.y,r.width,r.height);ctx.strokeStyle='#566052';ctx.lineWidth=2;ctx.strokeRect(r.x,r.y,r.width,r.height);ctx.strokeStyle='#d7d3bf';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(r.x+5,r.y+r.height-5);ctx.lineTo(r.x+5,r.y+5);ctx.lineTo(r.x+r.width-5,r.y+5);ctx.stroke();}ctx.restore();ctx.globalAlpha=1;
  }
  function drawSupply(){
    const s=game.supply;if(!game.config.supplies||!['warning','active'].includes(s.state))return;
    const waiting=s.state==='warning',seconds=Math.max(0,Math.ceil(s.until-game.time));context.save();context.translate(s.x,s.y);context.lineWidth=3;
    context.strokeStyle=waiting?'#535e48':'#85652b';if(waiting)strokeDashArc(context,0,0,31,0,Math.PI*2,6,5);else{context.beginPath();context.arc(0,0,27,0,Math.PI*2);context.stroke();}
    if(!waiting){context.fillStyle='#f3f0e7';context.beginPath();for(let i=0;i<6;i++){const a=i*Math.PI/3;const x=Math.cos(a)*21,y=Math.sin(a)*21;i?context.lineTo(x,y):context.moveTo(x,y);}context.closePath();context.fill();context.strokeStyle='#85652b';context.stroke();}
    context.strokeStyle='#584719';context.lineWidth=3.5;context.beginPath();for(const y of [-7,5]){context.moveTo(-8,y+6);context.lineTo(0,y-2);context.lineTo(8,y+6);}context.stroke();
    context.textAlign='center';context.font='18px "Microsoft YaHei",sans-serif';context.strokeStyle='#eeeadd';context.lineWidth=5;const text=waiting?seconds+'秒后出现':'机动补给';context.strokeText(text,0,55);context.fillStyle='#30392c';context.fillText(text,0,55);context.restore();context.globalAlpha=1;
  }
  function renderTank(t){
    context.save();context.shadowColor='#f3f0e7';context.shadowBlur=4;context.translate(t.x,t.y);context.rotate(t.body);
    context.fillStyle=game.palette[t.id].color;context.strokeStyle='#30392c';context.lineWidth=1.8;
    for(const [x,y,w,h] of [[-22,-24,9,48],[13,-24,9,48],[-15,-24,30,48]]){context.beginPath();context.rect(x,y,w,h);context.fill();context.stroke();}
    context.restore();context.globalAlpha=1;context.save();context.translate(t.x,t.y);context.rotate(t.aim);
    context.fillStyle=game.palette[t.id].color;context.strokeStyle='#30392c';context.lineWidth=1.8;
    context.fillRect(0,-3.5,34,7);context.strokeRect(0,-3.5,34,7);context.beginPath();context.arc(0,0,10,0,Math.PI*2);context.fill();context.stroke();if(t.shots>0&&t.cooldown>DEFAULTS.fireInterval-.05){context.fillStyle='#d2ab62';context.beginPath();context.moveTo(35,-4);context.lineTo(48,0);context.lineTo(35,4);context.fill();}context.restore();context.globalAlpha=1;
    if(t.id===game.selected){
      context.save();context.beginPath();context.arc(t.x,t.y,36,0,Math.PI*2);context.strokeStyle='#f3f0e7';context.lineWidth=5;context.stroke();context.strokeStyle='#30392c';context.lineWidth=2;strokeDashArc(context,t.x,t.y,36,0,Math.PI*2,5,4);context.restore();context.globalAlpha=1;
      if(t.lastHitAngle!==null&&game.time-t.lastHit<.65){context.save();context.globalAlpha=1-(game.time-t.lastHit)/.65;context.beginPath();context.arc(t.x,t.y,48,t.lastHitAngle-.42,t.lastHitAngle+.42);context.strokeStyle='#f3f0e7';context.lineWidth=8;context.stroke();context.strokeStyle='#b9634d';context.lineWidth=4;context.stroke();context.restore();context.globalAlpha=1;}
      context.fillStyle='#f3f0e7';context.fillRect(t.x-12,t.y+39,24,22);context.fillStyle='#252923';context.font='14px "Microsoft YaHei",sans-serif';context.textAlign='center';context.fillText('你',t.x,t.y+55);
    }
    context.fillStyle='#f3f0e7';context.fillRect(t.x-24,t.y-39,48,5);context.fillStyle='#30392c';context.fillRect(t.x-24,t.y-39,48*t.health/DEFAULTS.health,5);
    if(game.config.magazine){for(let i=0;i<game.config.ammoCapacity;i++){context.fillStyle='#f3f0e7';context.fillRect(t.x-23+i*16,t.y-58,13,5);context.fillStyle=i<t.ammo?'#75653b':'rgba(82,96,78,0.333333)';context.fillRect(t.x-22+i*16,t.y-57,11,3);}if(t.ammo<game.config.ammoCapacity){context.fillStyle='#75653b';context.fillRect(t.x-23,t.y-64,45*t.reload/game.config.reloadInterval,2);}}
    if(t.armor>0){context.fillStyle='#70877d';context.fillRect(t.x-24,t.y-46,48*t.armor/DEFAULTS.armor,3);}
    if(game.speedFactor(t)>1){context.save();context.strokeStyle='#b58c36';context.lineWidth=3;context.beginPath();context.arc(t.x,t.y,43,.2,Math.PI-.2);context.stroke();context.beginPath();for(const y of [-77,-69]){context.moveTo(t.x-7,t.y+y+5);context.lineTo(t.x,t.y+y);context.lineTo(t.x+7,t.y+y+5);}context.stroke();context.restore();context.globalAlpha=1;}
    if(game.time-t.lastHit<.12){context.strokeStyle='#f3f0e7';context.lineWidth=4;context.beginPath();context.arc(t.x,t.y,30,0,Math.PI*2);context.stroke();}
  }

drawCovers(context,game.arena.rects);drawSupply();for(const t of game.tanks)if(t.alive)renderTank(t);for(const b of game.bullets){context.fillStyle='#30392c';context.beginPath();context.arc(b.x,b.y,8,0,Math.PI*2);context.fill();context.fillStyle=game.palette[b.owner].color;context.beginPath();context.arc(b.x,b.y,5,0,Math.PI*2);context.fill();}
};
