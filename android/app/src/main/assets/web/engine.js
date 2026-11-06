(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./ink.js'),require('./arena.js'));
  else root.TankPaint = factory(root.InkGeometry,root.TankArena);
})(typeof globalThis !== 'undefined' ? globalThis : this, function (Ink,ArenaGeometry) {
  'use strict';
  const PALETTE = [
    { id: 'blue', name: '灰蓝', color: '#55777c' },
    { id: 'clay', name: '陶红', color: '#b9634d' },
    { id: 'sage', name: '灰绿', color: '#929b7d' },
    { id: 'ochre', name: '赭黄', color: '#d2ab62' },
    { id: 'white', name: '白色', color: '#ffffff' },
    { id: 'plum', name: '灰紫', color: '#9e7d98' },
    { id: 'indigo', name: '靛蓝', color: '#6d80a4' },
    { id: 'umber', name: '棕褐', color: '#816449' }
  ];
  const DEFAULTS = Object.freeze({ width: 1400, height: 1000, cell: 2, dt: 1 / 60,
    health: 400, armor: 24, damage: 18, speed: 170, bulletSpeed: 650,
    fireInterval: .65, inkSpacing:90, inkRadius:38, tankRadius: 23, bulletRadius: 5,
    tankCount:5, timeLimit: 600, regenMax: 5, regenKnee: .12, vision: 460,
    reaction: .26, aimError: .085, cover:true, magazine:true, ammoCapacity:3, reloadInterval:.85,
    supplies:true,supplyFirst:12,supplyWarning:3,supplyLifetime:12,supplyCycle:32,supplyRadius:16,boostDuration:7,boostMultiplier:1.25,
    botDifficulty:'standard',botStyles:true });
  const BOT_DIFFICULTIES=Object.freeze({easy:Object.freeze({name:'轻松',reaction:.42,aimError:.15}),standard:Object.freeze({name:'标准',reaction:.26,aimError:.085}),challenge:Object.freeze({name:'挑战',reaction:.18,aimError:.045})});
  const BOT_STYLES=Object.freeze({
    aggressive:Object.freeze({name:'追击',near:110,far:205,retreat:.25,strafe:.35,pursuit:3,supplyDanger:165,supplyRisk:.45,supplyRatio:1.45}),
    balanced:Object.freeze({name:'游走',near:130,far:240,retreat:.3,strafe:.5,pursuit:3,supplyDanger:185,supplyRisk:.55,supplyRatio:1.25}),
    cautious:Object.freeze({name:'谨慎',near:170,far:300,retreat:.4,strafe:.65,pursuit:1.7,supplyDanger:230,supplyRisk:.65,supplyRatio:1})
  });
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  function rng(seed) { let state = seed >>> 0; return () => {state=(Math.imul(state,1664525)+1013904223)>>>0;return state/4294967296;}; }
  function normal(x, y) { const n=Math.hypot(x,y); return n>1e-9 ? {x:x/n,y:y/n} : {x:0,y:0}; }
  function wrap(a) {return Math.atan2(Math.sin(a),Math.cos(a));}
  function roster(count,color=0){if(!Number.isInteger(count)||count<2||count>PALETTE.length)throw new Error('Tank count outside playable range');if(!Number.isInteger(color)||!PALETTE[color])throw new Error('Unknown player color');const ids=new Set([4,color]);for(let i=0;ids.size<count;i++)ids.add(i);return PALETTE.filter((p,i)=>ids.has(i)).map(p=>({...p}));}

  class Paint {
    constructor(width, height, cell=2, palette=PALETTE.slice(0,5),clipRects=[]) {
      this.palette=palette;this.rgb=palette.map(p=>[1,3,5].map(i=>parseInt(p.color.slice(i,i+2),16)));
      this.cell=cell;this.width=Math.ceil(width/cell);this.height=Math.ceil(height/cell);
      this.owner=new Uint8Array(this.width*this.height);
      this.rgba=new Uint8ClampedArray(this.owner.length*4);
      this.counts=new Int32Array(palette.length);this.covered=0;this.dirty=true;
      this.blocked=new Uint8Array(this.owner.length);
      for(const r of clipRects)for(let y=Math.max(0,Math.ceil(r.y/cell-.5));y<Math.min(this.height,Math.ceil((r.y+r.height)/cell-.5));y++)for(let x=Math.max(0,Math.ceil(r.x/cell-.5));x<Math.min(this.width,Math.ceil((r.x+r.width)/cell-.5));x++)this.blocked[y*this.width+x]=1;
    }
    set(index,color) {
      const previous=this.owner[index];if(this.blocked[index]||previous===color+1)return;
      if(previous)this.counts[previous-1]--;else this.covered++;
      this.owner[index]=color+1;this.counts[color]++;
      const offset=index*4,rgb=this.rgb[color];
      this.rgba[offset]=rgb[0];this.rgba[offset+1]=rgb[1];this.rgba[offset+2]=rgb[2];this.rgba[offset+3]=255;
      this.dirty=true;
    }
    segment(x1,y1,x2,y2,width,color) {
      const r=width/2, cell=this.cell;
      const left=clamp(Math.floor((Math.min(x1,x2)-r)/cell),0,this.width-1);
      const right=clamp(Math.floor((Math.max(x1,x2)+r)/cell),0,this.width-1);
      const top=clamp(Math.floor((Math.min(y1,y2)-r)/cell),0,this.height-1);
      const bottom=clamp(Math.floor((Math.max(y1,y2)+r)/cell),0,this.height-1);
      const dx=x2-x1,dy=y2-y1,length2=dx*dx+dy*dy;
      for(let y=top;y<=bottom;y++)for(let x=left;x<=right;x++){
        const px=(x+.5)*cell,py=(y+.5)*cell;
        const t=length2 ? clamp(((px-x1)*dx+(py-y1)*dy)/length2,0,1):0;
        if((px-x1-dx*t)**2+(py-y1-dy*t)**2<=r*r)this.set(y*this.width+x,color);
      }
    }
    at(x,y) {const ix=clamp(Math.floor(x/this.cell),0,this.width-1),iy=clamp(Math.floor(y/this.cell),0,this.height-1);return this.owner[iy*this.width+ix];}
    share(color) {return this.counts[color]/this.owner.length;}
    get coverage(){return this.covered/this.owner.length;}
    stamp(mark) {
      const vertices=Ink.polygon(mark),cell=this.cell,minY=clamp(Math.ceil(Math.min(...vertices.map(p=>p.y))/cell-.5),0,this.height-1),maxY=clamp(Math.floor(Math.max(...vertices.map(p=>p.y))/cell-.5),0,this.height-1);
      for(let row=minY;row<=maxY;row++){
        const y=(row+.5)*cell,cuts=[];
        for(let i=0,j=vertices.length-1;i<vertices.length;j=i++){const a=vertices[i],b=vertices[j];if((a.y>y)!==(b.y>y))cuts.push(a.x+(b.x-a.x)*(y-a.y)/(b.y-a.y));}
        cuts.sort((a,b)=>a-b);for(let k=0;k+1<cuts.length;k+=2){const left=Math.max(0,Math.ceil(cuts[k]/cell-.5)),right=Math.min(this.width-1,Math.floor(cuts[k+1]/cell-.5));for(let x=left;x<=right;x++)this.set(row*this.width+x,mark.owner);}
      }
    }
  }

  function intersection(x,y,nx,ny,cx,cy,r) {
    const dx=nx-x,dy=ny-y,px=x-cx,py=y-cy,a=dx*dx+dy*dy;
    if(px*px+py*py<=r*r)return 0;
    if(a===0)return null;
    const b=2*(px*dx+py*dy),c=px*px+py*py-r*r,d=b*b-4*a*c;
    if(d<0)return null;
    const t=(-b-Math.sqrt(d))/(2*a);return t>=0&&t<=1?t:null;
  }

  class Game {
    constructor({seed=Date.now(),player=0,color=player??0,config={},bots=true}={}) {
      this.config={...DEFAULTS,...config};this.seed=seed>>>0;this.random=rng(this.seed);this.palette=roster(this.config.tankCount,color);this.selected=this.palette.findIndex(p=>p.id===PALETTE[color].id);this.player=player===null?null:this.selected;this.botEnabled=bots;
      const c=this.config,difficulty=BOT_DIFFICULTIES[c.botDifficulty];if(!difficulty)throw new Error('Unknown bot difficulty');if(config.reaction===undefined)c.reaction=difficulty.reaction;if(config.aimError===undefined)c.aimError=difficulty.aimError;
      this.arena=new ArenaGeometry.Arena(c.width,c.height,c);this.paint=new Paint(c.width,c.height,c.cell,this.palette,this.arena.rects);this.time=0;this.phase='running';this.reason=null;this.winners=[];
      if(!(c.inkSpacing>0&&c.inkRadius>0))throw new Error('Invalid ink geometry');
      if(!Number.isInteger(c.ammoCapacity)||c.ammoCapacity<1||!(c.reloadInterval>0))throw new Error('Invalid magazine');
      this.bullets=[];this.marks=[];this.ticks=0;this.events=[];this.shotCount=0;this.hits=new Uint32Array(this.palette.length);this.hitEvents=[];
      this.supplyRandom=rng(this.seed^0x75b9a321);this.supply={state:c.supplies?'idle':'disabled',serial:0,nextAt:c.supplies?c.supplyFirst:null,x:null,y:null,until:null,site:-1,lastPickup:null};
      this.supplySites=[[.5,.5],[.24,.3],[.76,.7],[.7,.26],[.3,.74],[.5,.19],[.5,.81]].map(([x,y])=>this.arena.resolve({x:x*c.width,y:y*c.height},c.tankRadius+c.supplyRadius+8)).filter(p=>this.arena.free(p.x,p.y,c.tankRadius+c.supplyRadius+4));
      if(c.supplies&&(!(c.supplyFirst>=0)||!(c.supplyWarning>0)||!(c.supplyLifetime>0)||!(c.supplyCycle>c.supplyWarning+c.supplyLifetime)||!(c.supplyRadius>0)||!(c.boostDuration>0)||!(c.boostMultiplier>=1)||!this.supplySites.length))throw new Error('Invalid supply settings');
      const slots=this.palette.map((_,i)=>i);for(let i=slots.length-1;i>0;i--){const j=Math.floor(this.random()*(i+1));[slots[i],slots[j]]=[slots[j],slots[i]];}
      const rotation=this.random()*Math.PI*2,styleOffset=Math.floor(rng(this.seed^0x19d53b71)()*3),styles=['aggressive','balanced','cautious'];
      this.tanks=this.palette.map((p,i)=>{
        const angle=rotation+slots[i]*Math.PI*2/this.palette.length;
        return {id:i,x:c.width/2+Math.cos(angle)*Math.min(c.width,c.height)*.335,y:c.height/2+Math.sin(angle)*Math.min(c.width,c.height)*.335,
          health:c.health,armor:c.armor,alive:true,body:angle,aim:angle+Math.PI,cooldown:.35,boostUntil:0,supplyPickups:0,seekingSupply:false,botStyle:i===this.player?'player':c.botStyles?styles[((this.player!==null&&i>this.player?i-1:i)+styleOffset)%3]:'balanced',
          ammo:c.magazine?c.ammoCapacity:null,reload:0,rearming:false,memory:null,roam:null,aiState:'搜索',decision:this.random()*c.reaction,moveX:0,moveY:0,shoot:false,shots:0,target:-1,strafe:this.random()>.5?1:-1,error:0,lastHit:-10,lastHitAngle:null,inkCarry:0};
      });
      for(const t of this.tanks)this.arena.resolve(t);
    }
    regeneration(id){const a=this.paint.share(id),c=this.config;return Math.min(c.regenMax,c.regenMax*a/(a+c.regenKnee));}
    speedFactor(t){return this.config.supplies&&this.phase==='running'&&t.alive&&this.time<t.boostUntil?this.config.boostMultiplier:1;}
    updateSupply(){
      const s=this.supply,c=this.config;if(!c.supplies||this.time>=c.timeLimit)return;
      if(s.state==='idle'&&this.time+1e-8>=s.nextAt){
        const alive=this.tanks.filter(t=>t.alive),offset=Math.floor(this.supplyRandom()*this.supplySites.length),choices=this.supplySites.map((p,i)=>({p,i})).filter(q=>q.i!==s.site),pool=choices.length?choices:this.supplySites.map((p,i)=>({p,i}));
        let chosen=null;for(let k=0;k<pool.length;k++){const q=pool[(offset+k)%pool.length];if(alive.every(t=>Math.hypot(t.x-q.p.x,t.y-q.p.y)>c.tankRadius+c.supplyRadius+60)){chosen=q;break;}}
        if(!chosen)chosen=pool.slice().sort((a,b)=>Math.min(...alive.map(t=>Math.hypot(t.x-b.p.x,t.y-b.p.y)))-Math.min(...alive.map(t=>Math.hypot(t.x-a.p.x,t.y-a.p.y))))[0];
        s.serial++;s.site=chosen.i;s.x=chosen.p.x;s.y=chosen.p.y;s.state='warning';s.until=s.nextAt+c.supplyWarning;s.nextAt+=c.supplyCycle;this.events.push({type:'supply-warning',serial:s.serial,time:this.time,x:s.x,y:s.y});
      }
      if(s.state==='warning'&&this.time+1e-8>=s.until){s.state='active';s.until+=c.supplyLifetime;this.events.push({type:'supply-ready',serial:s.serial,time:this.time});}
      if(s.state==='active'&&this.time+1e-8>=s.until){s.state='idle';s.x=null;s.y=null;s.until=null;this.events.push({type:'supply-expired',serial:s.serial,time:this.time});}
    }
    collectSupply(previous){
      const s=this.supply,c=this.config;if(!c.supplies||s.state!=='active'||this.phase!=='running')return;
      const candidates=this.tanks.filter(t=>t.alive).map(t=>({t,at:intersection(previous[t.id].x,previous[t.id].y,t.x,t.y,s.x,s.y,c.tankRadius+c.supplyRadius)})).filter(p=>p.at!==null);
      candidates.sort((a,b)=>a.at-b.at||((a.t.id+this.ticks)%this.tanks.length)-((b.t.id+this.ticks)%this.tanks.length));if(!candidates.length)return;
      const t=candidates[0].t;t.boostUntil=this.time+c.boostDuration;t.supplyPickups++;s.lastPickup={owner:t.id,time:this.time,serial:s.serial};s.state='idle';s.x=null;s.y=null;s.until=null;for(const tank of this.tanks)tank.seekingSupply=false;
      this.events.push({type:'supply-pickup',owner:t.id,serial:s.serial,time:this.time});
    }
    visible(a,b){return Math.hypot(a.x-b.x,a.y-b.y)<this.config.vision&&this.arena.clear(a.x,a.y,b.x,b.y,1);}
    botPolicy(t){return BOT_STYLES[t.botStyle]??BOT_STYLES.balanced;}
    decide(t) {
      const c=this.config,p=this.botPolicy(t);let enemy=null,distance=Infinity,supplyGoal=null;t.seekingSupply=false;
      for(const other of this.tanks)if(other.alive&&other.id!==t.id&&this.visible(t,other)){const d=Math.hypot(t.x-other.x,t.y-other.y);if(d<distance){enemy=other;distance=d;}}
      if(c.magazine&&t.ammo===0)t.rearming=true;
      if(!c.magazine||t.ammo>=1)t.rearming=false;
      let mx=0,my=0;
      if(enemy){
        t.memory={id:enemy.id,x:enemy.x,y:enemy.y,vx:enemy.moveX*c.speed*this.speedFactor(enemy),vy:enemy.moveY*c.speed*this.speedFactor(enemy),at:this.time};
        const dir=normal(enemy.x-t.x,enemy.y-t.y),retreat=(t.rearming&&distance<150)||t.health<c.health*p.retreat;
        const toward=retreat?-.85:distance>p.far?1:distance<p.near?-1:.18;
        mx=dir.x*toward-dir.y*t.strafe*p.strafe;my=dir.y*toward+dir.x*t.strafe*p.strafe;t.target=enemy.id;t.shoot=!t.rearming;
        t.error=(this.random()-.5)*2*c.aimError;t.aiState=retreat?'撤离恢复':t.botStyle==='aggressive'?'追击':t.botStyle==='cautious'?'谨慎换位':'交锋';
      }else{
        t.target=-1;t.shoot=false;
        if(t.memory&&this.time-t.memory.at<p.pursuit&&!t.rearming&&Math.hypot(t.x-t.memory.x,t.y-t.memory.y)>55){mx=t.memory.x-t.x;my=t.memory.y-t.y;t.aiState='绕行搜索';}
        else{
          if(t.memory&&this.time-t.memory.at>=p.pursuit)t.memory=null;
          if(!t.roam||this.time>t.roam.until||Math.hypot(t.x-t.roam.x,t.y-t.roam.y)<45){
            let best=-Infinity,goal={x:c.width/2,y:c.height/2};
            for(let k=0;k<16;k++){
              const angle=k*Math.PI/8,tx=clamp(t.x+Math.cos(angle)*320,45,c.width-45),ty=clamp(t.y+Math.sin(angle)*320,45,c.height-45);
              if(!this.arena.free(tx,ty,c.tankRadius+3))continue;
              let blank=0;for(const d of [100,200,300])if(!this.paint.at(t.x+Math.cos(angle)*d,t.y+Math.sin(angle)*d))blank++;
              const score=blank+this.random()*2;if(score>best){best=score;goal={x:tx,y:ty};}
            }t.roam={...goal,until:this.time+2.4};
          }
          mx=t.roam.x-t.x;my=t.roam.y-t.y;t.aim=Math.atan2(my,mx);t.aiState=t.rearming?'恢复弹药':'搜索';
        }
      }
      const supply=this.supply;
      if(c.supplies&&['warning','active'].includes(supply.state)&&this.speedFactor(t)===1&&!t.rearming&&t.health>=c.health*p.retreat){const d=Math.hypot(t.x-supply.x,t.y-supply.y),remaining=supply.until-this.time+(supply.state==='warning'?c.supplyLifetime:0),danger=enemy&&(distance<p.supplyDanger||t.health<c.health*p.supplyRisk);if(!danger&&d/c.speed<remaining&&(!enemy||d<distance*p.supplyRatio)){mx=supply.x-t.x;my=supply.y-t.y;supplyGoal={x:supply.x,y:supply.y};t.seekingSupply=true;t.aiState=supply.state==='warning'?'赶往补给':'争夺补给';}}
      let urgency=Infinity,avoid=null;
      for(const b of this.bullets){
        if(b.owner===t.id||Math.hypot(b.x-t.x,b.y-t.y)>300||!this.arena.clear(t.x,t.y,b.x,b.y,0))continue;
        const bx=b.x-t.x,by=b.y-t.y,v2=b.vx*b.vx+b.vy*b.vy,soon=-(bx*b.vx+by*b.vy)/v2;if(soon<0||soon>.65)continue;
        if(Math.hypot(bx+b.vx*soon,by+b.vy*soon)<c.tankRadius+c.bulletRadius+18&&soon<urgency){urgency=soon;const side=(bx*b.vy-by*b.vx)>=0?1:-1;avoid=normal(-b.vy*side,b.vx*side);}
      }
      if(avoid){mx=avoid.x;my=avoid.y;supplyGoal=null;t.seekingSupply=false;t.aiState='躲避';}
      if(t.x<65)mx+=1.8;if(t.x>c.width-65)mx-=1.8;if(t.y<65)my+=1.8;if(t.y>c.height-65)my-=1.8;
      const desired=normal(mx,my),goal=supplyGoal??(enemy?{x:t.x+desired.x*150,y:t.y+desired.y*150}:{x:t.x+mx,y:t.y+my});
      const route=this.arena.direction(t,goal.x,goal.y),n=normal(route.x,route.y);t.moveX=n.x;t.moveY=n.y;
      if(route.routing)t.aiState='绕行';
    }
    fire(t) {
      const c=this.config;if(!t.alive||this.phase!=='running'||t.cooldown>1e-8||(c.magazine&&t.ammo<=0))return false;
      t.cooldown=c.fireInterval;if(c.magazine)t.ammo--;this.shotCount++;t.shots++;
      const dx=Math.cos(t.aim),dy=Math.sin(t.aim),offset=c.tankRadius+c.bulletRadius+2,x=t.x+dx*offset,y=t.y+dy*offset;
      // A barrel crossing a wall still expends its shot; it cannot fire from the far side.
      if(x<=0||x>=c.width||y<=0||y>=c.height||!this.arena.clear(t.x,t.y,x,y,c.bulletRadius))return true;
      this.bullets.push({x,y,vx:dx*c.bulletSpeed,vy:dy*c.bulletSpeed,owner:t.id});return true;
    }
    damage(t,amount,from=null) {
      if(!t.alive||this.phase!=='running')return;
      const absorbed=Math.min(t.armor,amount);t.armor-=absorbed;t.health=Math.max(0,t.health-(amount-absorbed));t.lastHit=this.time;t.lastHitAngle=from?Math.atan2(-from.vy,-from.vx):null;
      if(from&&Number.isInteger(from.owner)&&from.owner>=0&&from.owner<this.hits.length&&from.owner!==t.id){this.hits[from.owner]++;this.hitEvents.push({owner:from.owner,victim:t.id,x:t.x,y:t.y,time:this.time});this.hitEvents=this.hitEvents.slice(-24);}
      if(t.health===0){
        t.alive=false;t.shoot=false;
        this.events.push({type:'death',owner:t.id,time:this.time});
      }
    }
    freeze(reason) {
      if(this.phase!=='running')return;
      this.reason=reason;this.bullets=[];
      if(this.config.supplies){Object.assign(this.supply,{state:'ended',nextAt:null,x:null,y:null,until:null});for(const t of this.tanks){t.boostUntil=0;t.seekingSupply=false;}}
      if(reason==='survivor')this.winners=this.tanks.filter(t=>t.alive).map(t=>t.id);
      this.events.push({type:'stop',reason,time:this.time});
      this.finish();
    }
    finish() {
      if(this.reason!=='survivor'){
        const max=Math.max(...this.paint.counts);this.winners=Array.from(this.paint.counts,(n,i)=>n===max?i:-1).filter(i=>i>=0);
      }
      this.phase='finished';this.events.push({type:'finish',time:this.time});
    }
    step(dt=this.config.dt,input={}) {
      if(this.phase==='finished')return;
      this.ticks++;this.hitEvents=this.hitEvents.filter(e=>this.time-e.time<.3);
      const c=this.config;this.time=Math.min(c.timeLimit,this.time+dt);
      this.updateSupply();
      const previous=this.tanks.map(t=>({x:t.x,y:t.y}));
      const order=this.tanks.slice(),shift=this.ticks%this.tanks.length;order.push(...order.splice(0,shift));
      for(const t of order){
        if(!t.alive)continue;
        t.cooldown-=dt;
        if(c.magazine&&t.ammo<c.ammoCapacity){t.reload+=dt;while(t.reload+1e-8>=c.reloadInterval&&t.ammo<c.ammoCapacity){t.ammo++;t.reload=Math.max(0,t.reload-c.reloadInterval);}if(t.ammo===c.ammoCapacity)t.reload=0;}
        if(t.id===this.player){
          const n=normal(Number(input.x)||0,Number(input.y)||0);t.moveX=n.x;t.moveY=n.y;t.shoot=!!input.shoot;
          if(Number.isFinite(input.aimX)&&Number.isFinite(input.aimY))t.aim=Math.atan2(input.aimY-t.y,input.aimX-t.x);
        }else if(this.botEnabled){
          t.decision-=dt;if(t.decision<=0){this.decide(t);t.decision=c.reaction*(.8+this.random()*.4);}
          const target=this.tanks[t.target];
          if(target&&target.alive&&this.visible(t,target)&&t.memory){
            const seen=t.memory,lead=Math.min(.6,Math.hypot(seen.x-t.x,seen.y-t.y)/c.bulletSpeed)*.65,age=Math.min(.4,this.time-seen.at);
            t.aim=Math.atan2(seen.y+seen.vy*(lead+age)-t.y,seen.x+seen.vx*(lead+age)-t.x)+t.error;
          }else t.shoot=false;
        }else{t.moveX=0;t.moveY=0;t.shoot=false;}
        this.arena.move(t,t.moveX*c.speed*this.speedFactor(t)*dt,t.moveY*c.speed*this.speedFactor(t)*dt,c.tankRadius);
        if(Math.hypot(t.moveX,t.moveY)>.01){const desired=Math.atan2(t.moveY,t.moveX)+Math.PI/2;t.body+=clamp(wrap(desired-t.body),-8*dt,8*dt);}
      }
      // Body contact separates tanks without causing damage.
      for(let i=0;i<this.tanks.length;i++)for(let j=i+1;j<this.tanks.length;j++){
        const a=this.tanks[i],b=this.tanks[j];if(!a.alive||!b.alive)continue;
        let dx=b.x-a.x,dy=b.y-a.y,d=Math.hypot(dx,dy);if(d>=2*c.tankRadius)continue;
        if(d<.001){dx=1;dy=0;d=1;}
        const push=(2*c.tankRadius-d)/2;
        a.x=clamp(a.x-dx/d*push,c.tankRadius,c.width-c.tankRadius);a.y=clamp(a.y-dy/d*push,c.tankRadius,c.height-c.tankRadius);
        b.x=clamp(b.x+dx/d*push,c.tankRadius,c.width-c.tankRadius);b.y=clamp(b.y+dy/d*push,c.tankRadius,c.height-c.tankRadius);
      }
      for(const t of this.tanks)if(t.alive)this.arena.resolve(t);
      const pending=[];
      for(const t of order)if(t.alive){const before=previous[t.id],result=Ink.along({x1:before.x,y1:before.y,x2:t.x,y2:t.y,carry:t.inkCarry,spacing:c.inkSpacing});t.inkCarry=result.carry;for(const mark of result.marks)pending.push({owner:t.id,x:mark.x,y:mark.y,angle:mark.angle,radius:c.inkRadius,time:this.time-dt+mark.fraction*dt});}
      pending.sort((a,b)=>a.time-b.time);for(const mark of pending){mark.id=this.marks.length;this.marks.push(mark);this.paint.stamp(mark);}
      for(const t of order)if(t.alive&&t.shoot&&t.cooldown<=1e-8)this.fire(t);
      const retained=[];
      for(const b of this.bullets){
        const dx=b.vx*dt,dy=b.vy*dt;
        let edge=1;
        if(dx>0)edge=Math.min(edge,(c.width-b.x)/dx);else if(dx<0)edge=Math.min(edge,-b.x/dx);
        if(dy>0)edge=Math.min(edge,(c.height-b.y)/dy);else if(dy<0)edge=Math.min(edge,-b.y/dy);
        edge=clamp(edge,0,1);const nx=b.x+dx*edge,ny=b.y+dy*edge;
        const wall=this.arena.firstHit(b.x,b.y,nx,ny,c.bulletRadius);let hit=null,hitTime=wall??Infinity;
        for(const t of this.tanks)if(t.alive&&t.id!==b.owner){
          const at=intersection(b.x,b.y,nx,ny,t.x,t.y,c.tankRadius+c.bulletRadius);
          if(at!==null&&at<hitTime){hitTime=at;hit=t;}
        }
        const endX=hit?b.x+(nx-b.x)*hitTime:nx,endY=hit?b.y+(ny-b.y)*hitTime:ny;
        b.x=endX;b.y=endY;
        if(hit)this.damage(hit,c.damage,{owner:b.owner,vx:b.vx,vy:b.vy});
        else if(wall===null&&edge===1&&b.x>0&&b.x<c.width&&b.y>0&&b.y<c.height)retained.push(b);
      }
      this.bullets=retained;
      for(const t of this.tanks)if(t.alive)t.health=Math.min(c.health,t.health+this.regeneration(t.id)*dt);
      const alive=this.tanks.filter(t=>t.alive).length;
      if(alive===0)this.freeze('all-dead');else if(alive===1)this.freeze('survivor');
      else if(this.time>=c.timeLimit)this.freeze('timeout');
      if(this.phase==='running')this.collectSupply(previous);
    }
    snapshot(){const c=this.config;return {tankCount:this.tanks.length,selected:this.selected,palette:this.palette.map(p=>({...p})),seed:this.seed,phase:this.phase,reason:this.reason,time:this.time,player:this.player,shots:this.shotCount,hits:Array.from(this.hits),bots:{difficulty:c.botDifficulty,name:BOT_DIFFICULTIES[c.botDifficulty].name,reaction:c.reaction,aimError:c.aimError,mixedStyles:c.botStyles},
      coverage:this.paint.coverage,shares:Array.from(this.paint.counts,(_,i)=>this.paint.share(i)),counts:Array.from(this.paint.counts),winners:[...this.winners],
      bullets:this.bullets.length,marks:this.marks.length,covers:this.arena.rects.map(r=>({...r})),supply:{...this.supply,lastPickup:this.supply.lastPickup?{...this.supply.lastPickup}:null,enabled:c.supplies,boostMultiplier:c.boostMultiplier,boostDuration:c.boostDuration},weapon:{magazine:c.magazine,capacity:c.ammoCapacity,reloadInterval:c.reloadInterval,fireInterval:c.fireInterval},tanks:this.tanks.map(t=>({id:t.id,x:t.x,y:t.y,health:t.health,armor:t.armor,alive:t.alive,aim:t.aim,shots:t.shots,ammo:t.ammo,reloadProgress:t.ammo===null||t.ammo===c.ammoCapacity?1:t.reload/c.reloadInterval,aiState:t.aiState,botStyle:t.botStyle,botName:BOT_STYLES[t.botStyle]?.name??'玩家',lastHit:t.lastHit,lastHitAngle:t.lastHitAngle,regen:this.regeneration(t.id),boostRemaining:this.speedFactor(t)>1?Math.max(0,t.boostUntil-this.time):0,speedFactor:this.speedFactor(t),supplyPickups:t.supplyPickups,seekingSupply:t.seekingSupply}))};}
    sourceForArt(){return {seed:this.seed,width:this.config.width,height:this.config.height,radius:this.config.inkRadius,palette:this.palette.map(p=>({...p})),impacts:this.marks.map(p=>({...p})),clipRects:this.arena.rects.map(({x,y,width,height})=>({x,y,width,height})),origin:'this-match-distance-movement-marks'};}
  }
  return {PALETTE,DEFAULTS,BOT_DIFFICULTIES,BOT_STYLES,Paint,Game,intersection,roster};
});
