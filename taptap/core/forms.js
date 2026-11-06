(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.InkForms=factory();})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 const FAMILIES=[['sailboat','帆船'],['fish','鱼'],['house','小屋'],['pine','松树'],['bottle','长颈瓶'],['guitar','吉他'],['rocket','火箭'],['cactus','仙人掌'],['cat','猫'],['flower','花'],['umbrella','雨伞'],['cup','杯子'],['key','钥匙'],['lantern','灯笼'],['balloon','热气球'],['apple','苹果'],['swan','天鹅'],['castle','城堡'],['butterfly','蝴蝶'],['rabbit','兔子'],['turtle','海龟'],['elephant','大象'],['whale','鲸鱼'],['owl','猫头鹰'],['penguin','企鹅'],['octopus','章鱼'],['snail','蜗牛'],['crab','螃蟹'],['dog','小狗'],['dragonfly','蜻蜓'],['mushroom','蘑菇'],['leaf','叶子'],['lotus','荷花'],['bamboo','竹子'],['palm','棕榈树'],['coral','珊瑚'],['teapot','茶壶'],['wateringcan','洒水壶'],['bell','钟铃'],['candle','烛台'],['tablelamp','台灯'],['chair','椅子'],['book','书本'],['scissors','剪刀'],['hourglass','沙漏'],['anchor','船锚'],['crown','王冠'],['trophy','奖杯'],['planet','行星'],['crescent','弯月'],['star','海星'],['lighthouse','灯塔'],['bridge','拱桥'],['windmill','风车'],['pagoda','宝塔'],['torii','鸟居'],['airplane','飞机'],['helicopter','直升机'],['train','蒸汽机车'],['gear','齿轮']].map(([id,name])=>({id,name}));
 FAMILIES.push(...[['landscape','层峦'],['tidal','潮汐'],['starfield','星野'],['echoes','回响']].map(([id,name])=>({id,name,kind:'painting'})));
 function random(seed){let n=seed>>>0;return()=>{n=(Math.imul(n,1664525)+1013904223)>>>0;return n/4294967296;};}
 function polygon(x,y,p){let hit=false;for(let i=0,j=p.length-1;i<p.length;j=i++){const a=p[i],b=p[j];if((a[1]>y)!==(b[1]>y)&&x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0])hit=!hit;}return hit;}
 function primitive(p,x,y){if(p.type==='ellipse')return ((x-p.x)/p.rx)**2+((y-p.y)/p.ry)**2<=1;return polygon(x,y,p.points);}
 function rawContains(parts,holes,x,y){return parts.some(p=>primitive(p,x,y))&&!holes.some(p=>primitive(p,x,y));}
 function make(family,seed){
  const definition=FAMILIES.find(f=>f.id===family);if(!definition)throw new Error('Unknown family');const rng=random(seed),a=.86+rng()*.28,b=.86+rng()*.28,c=rng(),parts=[],holes=[];
  const poly=p=>parts.push({type:'polygon',points:p}),ell=(x,y,rx,ry)=>parts.push({type:'ellipse',x,y,rx,ry}),rect=(x1,y1,x2,y2)=>poly([[x1,y1],[x2,y1],[x2,y2],[x1,y2]]),hole=(x,y,rx,ry)=>holes.push({type:'ellipse',x,y,rx,ry});
  if(family==='sailboat'){poly([[-1,-.45],[1,-.45],[.65,-.85],[-.65,-.85]]);rect(-.035,-.5,.035,.95);poly([[-.09,.9],[-.09,-.3],[-.85,-.3]]);poly([[.1,.74],[.1,-.3],[.75*a,-.3]]);}
  if(family==='fish'){ell(-.18,0,.72,.43*b);poly([[.36,0],[1,.52*a],[1,-.52*a]]);poly([[-.3,.2],[.05,.7*a],[.25,.2]]);poly([[-.12,-.25],[.18,-.61*b],[.27,-.23]]);hole(-.59,.12,.065,.065);}
  if(family==='house'){rect(-.7,-.85,.7,.2);poly([[-1,.13],[0,.94*a],[1,.13]]);rect(.41,.42,.59,.9);holes.push({type:'polygon',points:[[-.15,-.86],[.17,-.86],[.17,-.34],[-.15,-.34]]});}
  if(family==='pine'){for(const [y,w,h]of [[.85,.55,.65],[.36,.8,.67],[-.15,1,.65]])poly([[0,y*a],[-w,y*a-h*b],[w,y*a-h*b]]);rect(-.13,-1,.13,-.65);}
  if(family==='bottle'){poly([[-.65,-.9],[.65,-.9],[.65,.04],[.25,.49],[.23,.98],[-.23,.98],[-.25,.49],[-.65,.04]]);rect(-.28,.88,.28,1.04);}
  if(family==='guitar'){ell(0,-.55,.66,.45);ell(0,.02,.49,.4);rect(-.1,.1,.1,1.08*a);poly([[-.17,1.0*a],[.18,1.0*a],[.23,1.42*a],[-.13,1.42*a]]);hole(0,-.03,.15,.15);}
  if(family==='rocket'){poly([[-.32,-.55],[.32,-.55],[.32,.54],[0,1.05*a],[-.32,.54]]);poly([[-.29,-.15],[-.65,-.69],[-.29,-.56]]);poly([[.29,-.15],[.65,-.69],[.29,-.56]]);poly([[-.2,-.59],[0,-1.04*b],[.2,-.59]]);hole(0,.36,.13,.15);}
  if(family==='cactus'){rect(-.14,-.9,.14,.72);ell(0,.72,.14,.15);rect(-.67,-.13,-.44,.48*a);ell(-.555,.48*a,.115,.12);rect(-.56,-.18,0,.05);rect(.41,.12,.65,.73*b);ell(.53,.73*b,.12,.12);rect(.07,.07,.56,.29);rect(-.28,-1,.28,-.85);}
  if(family==='cat'){ell(-.06,-.43,.42,.56);ell(-.06,.35,.42,.39);poly([[-.46,.42],[-.38,.95*a],[-.05,.58]]);poly([[.05,.58],[.32,.95*a],[.37,.42]]);ell(.42,-.65,.5,.28);hole(.51,-.48,.3,.2);}
  if(family==='flower'){for(let i=0;i<5;i++){const theta=i*Math.PI*2/5+Math.PI/2;ell(Math.cos(theta)*.47,.4+Math.sin(theta)*.43,.3*a,.29*b);}ell(0,.4,.24,.24);rect(-.045,-1,.045,.3);poly([[0,-.55],[-.57,-.3],[-.37,-.7],[0,-.76]]);poly([[0,-.7],[.5,-.45],[.32,-.82],[0,-.88]]);}
  if(family==='umbrella'){const arc=[];for(let i=0;i<=40;i++){const t=Math.PI*i/40;arc.push([Math.cos(t),.1+Math.sin(t)*.75*b]);}poly(arc);rect(-.035,-.82,.035,.2);ell(.13,-.81,.165,.18);hole(.13,-.76,.09,.12);rect(.22,-.81,.29,-.65);}
  if(family==='cup'){poly([[-.75,.65],[.51,.65],[.35,-.67],[-.57,-.67]]);ell(.56,.05,.42,.49*b);hole(.64,.1,.23,.29*b);rect(-.92,-.83,.84,-.73);}
  if(family==='key'){ell(-.58,.05,.43,.46*b);hole(-.58,.05,.22,.24*b);rect(-.27,-.04,1,.15);rect(.5,-.4,.69,.08);rect(.84,-.29,1,.08);}
  if(family==='lantern'){ell(0,.05,.72,.72*a);rect(-.47,.65,.47,.8);rect(-.47,-.69,.47,-.56);rect(-.025,-1.03,.025,-.64);poly([[-.18,-1.04],[.18,-1.04],[.09,-.86],[-.09,-.86]]);}
  if(family==='balloon'){ell(0,.35,.68,.7*a);poly([[-.57,.03],[-.23,-.57],[.23,-.57],[.57,.03]]);poly([[-.27,-.78],[.27,-.78],[.19,-1.04],[-.19,-1.04]]);rect(-.21,-.84,-.18,-.5);rect(.18,-.84,.21,-.5);}
  if(family==='apple'){ell(-.23,-.06,.51,.67*b);ell(.23,-.06,.51,.67*b);rect(-.025,.5,.05,.94);ell(.23,.81,.25,.105);}
  if(family==='swan'){ell(-.18,-.32,.7,.37);poly([[-.81,-.38],[-1,.05],[-.4,-.28]]);poly([[.19,-.36],[.59,-.3],[.63,.64],[.38,.62],[.33,.07]]);ell(.43,.67,.27,.22*b);poly([[.61,.75],[1,.59],[.61,.58]]);}
  if(family==='castle'){rect(-.71,-.85,.71,.15);rect(-.91,-.85,-.48,.64*a);rect(.48,-.85,.91,.64*a);rect(-.22,.03,.22,.93*b);for(const x of [-.91,-.69,.48,.7])rect(x,.6*a,x+.2,.83*a);rect(-.25,.91*b,-.04,1.1*b);rect(.05,.91*b,.25,1.1*b);holes.push({type:'polygon',points:[[-.16,-.86],[.16,-.86],[.16,-.34],[0,-.2],[-.16,-.34]]});}
  if(family==='butterfly'){ell(-.47,.36,.49,.6*a);ell(.47,.36,.49,.6*a);ell(-.4,-.43,.36,.42*b);ell(.4,-.43,.36,.42*b);rect(-.075,-.76,.075,.75);poly([[-.04,.66],[-.32,1],[-.21,1.03],[.04,.68]]);poly([[.04,.66],[.32,1],[.21,1.03],[-.04,.68]]);}
  if(family==='rabbit'){ell(0,-.4,.52,.57);ell(0,.27,.42,.38);ell(-.25,.86,.15,.47*a);ell(.19,.9,.15,.51*b);ell(-.41,-.85,.32,.14);ell(.41,-.85,.32,.14);}
  if(family==='turtle'){ell(-.08,0,.65,.48);ell(.72,.04,.29,.2);poly([[-.65,.16],[-1,.51],[-.48,.4]]);poly([[.18,.39],[.46,.68],[.52,.29]]);poly([[-.58,-.28],[-.93,-.62],[-.35,-.39]]);poly([[.18,-.38],[.5,-.63],[.52,-.22]]);poly([[-.62,0],[-.99,-.13],[-.67,-.16]]);}
  if(family==='elephant'){ell(-.12,.03,.72,.52);ell(.52,.24,.43,.4);ell(.24,.23,.32,.36);rect(-.63,-.85,-.34,-.18);rect(.12,-.85,.4,-.19);poly([[.74,.22],[1,.17],[.99,-.54],[.77,-.75],[.58,-.63],[.79,-.48]]);poly([[-.74,.2],[-.99,-.32],[-.85,-.36],[-.56,.1]]);}
  if(family==='whale'){ell(-.16,0,.78,.44);poly([[.43,-.02],[.82,.29],[1,.71],[.59,.52],[.65,.14]]);poly([[.67,.29],[1,.11],[.97,.43],[.82,.52]]);poly([[-.14,-.18],[.12,-.76],[.32,-.48],[.22,-.2]]);rect(-.57,.37,-.5,.84);poly([[-.54,.73],[-.85,1],[-.48,.89],[-.25,1],[-.39,.72]]);}
  if(family==='owl'){ell(0,-.19,.58,.72);poly([[-.55,.28],[-.52,.95],[-.15,.65],[.15,.65],[.52,.95],[.55,.28]]);poly([[-.43,.2],[-.88,-.63],[-.39,-.48]]);poly([[.43,.2],[.88,-.63],[.39,-.48]]);hole(-.23,.4,.13,.16);hole(.23,.4,.13,.16);rect(-.28,-1,-.1,-.75);rect(.1,-1,.28,-.75);}
  if(family==='penguin'){ell(0,-.25,.5,.69);ell(0,.56,.35,.4);poly([[-.36,.14],[-.85,-.45],[-.46,-.31]]);poly([[.36,.14],[.85,-.45],[.46,-.31]]);poly([[-.16,.61],[.38,.51],[-.16,.41]]);poly([[-.37,-.82],[-.63,-1],[-.05,-1],[-.05,-.82]]);poly([[.07,-.82],[.05,-1],[.63,-1],[.36,-.82]]);}
  if(family==='octopus'){ell(0,.4,.51,.57);for(const side of [-1,1]){poly([[side*.33,.03],[side*.61,-.48],[side*.98,-.64],[side*1,-.84],[side*.49,-.68],[side*.2,-.14]]);poly([[side*.12,-.02],[side*.27,-.74],[side*.47,-.88],[side*.4,-1.04],[side*.11,-.88],[side*.025,-.13]]);}hole(-.2,.43,.12,.15);hole(.2,.43,.12,.15);}
  if(family==='snail'){ell(-.25,-.13,.53,.62*a);ell(.04,-.76,.93,.16);poly([[.37,-.68],[.45,.27],[.72,.3],[.87,-.51],[.7,-.77]]);rect(.49,.13,.56,.69);rect(.68,.15,.75,.75);ell(.525,.72,.1,.1);ell(.715,.78,.1,.1);hole(-.25,-.13,.2,.24);}
  if(family==='crab'){ell(0,-.07,.58,.36);for(const side of [-1,1]){poly([[side*.4,.1],[side*.7,.52],[side*.56,.82],[side*.78,.62],[side*.98,.91],[side*.96,.37],[side*.52,-.13]]);for(let i=0;i<3;i++)poly([[side*.4,-.1-i*.1],[side*(.88-i*.07),-.22-i*.2],[side*.96,-.37-i*.22],[side*.74,-.32-i*.2]]);}rect(-.23,.15,-.14,.47);rect(.14,.15,.23,.47);}
  if(family==='dog'){ell(-.19,-.17,.57,.38);ell(.52,.3,.32,.36);rect(.55,.09,1,.3);poly([[.23,.5],[.29,.9],[.62,.51]]);rect(-.57,-.9,-.34,-.3);rect(.18,-.9,.39,-.25);poly([[-.62,-.13],[-1,.35],[-.84,.48],[-.45,.02]]);}
  if(family==='dragonfly'){rect(-.055,-.94,.055,.78);ell(0,.83,.14,.16);poly([[-.03,.47],[-.99,.88],[-.8,.29],[-.02,.1]]);poly([[.03,.47],[.99,.88],[.8,.29],[.02,.1]]);poly([[-.03,.02],[-.88,-.18],[-.74,-.64],[-.02,-.31]]);poly([[.03,.02],[.88,-.18],[.74,-.64],[.02,-.31]]);}
  if(family==='mushroom'){const cap=[];for(let i=0;i<=32;i++){const t=Math.PI*i/32;cap.push([Math.cos(t),.08+Math.sin(t)*.82*a]);}poly(cap);poly([[-.2,.13],[.2,.13],[.14,-.77],[.37,-.97],[-.37,-.97],[-.14,-.77]]);}
  if(family==='leaf'){poly([[0,1],[-.52,.68],[-.83,.17],[-.66,-.4],[-.16,-.82],[.46,-.58],[.78,-.08],[.63,.5]]);poly([[-.11,-.6],[.05,-.57],[.45,-1],[.27,-1.06]]);}
  if(family==='lotus'){ell(0,-.8,.85,.16);poly([[0,-.48],[-.3,.13],[0,1],[.3,.13]]);poly([[-.05,-.49],[-.65,-.07],[-.82,.68],[-.24,.41],[.12,-.17]]);poly([[.05,-.49],[.65,-.07],[.82,.68],[.24,.41],[-.12,-.17]]);poly([[0,-.56],[-.76,-.4],[-1,.17],[-.43,.03]]);poly([[0,-.56],[.76,-.4],[1,.17],[.43,.03]]);}
  if(family==='bamboo'){rect(-.12,-1,.12,1);rect(.4,-.96,.56,.57);for(const y of [-.65,-.1,.46])rect(-.17,y,.17,y+.07);poly([[0,.4],[-.76,.78],[-.49,.29]]);poly([[.07,-.03],[.84,.32],[.52,-.16]]);poly([[.46,.32],[.95,.68],[.79,.22]]);}
  if(family==='palm'){poly([[-.25,-1],[.12,-1],[.2,.71],[-.01,.71]]);for(const side of [-1,1]){poly([[0,.67],[side*.65,1],[side*1.03,.62],[side*.53,.71]]);poly([[0,.67],[side*.73,.56],[side*.94,.12],[side*.41,.4]]);}poly([[-.02,.66],[-.22,1.14],[.2,1.02],[.36,.7]]);}
  if(family==='coral'){rect(-.15,-1,.15,.63);for(const side of [-1,1]){poly([[0,-.55],[side*.65,-.26],[side*.84,.31],[side*.65,.35],[side*.51,-.12],[0,-.25]]);poly([[0,.01],[side*.39,.34],[side*.57,.9],[side*.4,1],[side*.24,.45],[0,.27]]);rect(side<0?-.82:.64,.19,side<0?-.63:.84,.7);}rect(-.42,-1,.42,-.82);}
  if(family==='teapot'){ell(-.04,-.23,.64,.57);ell(-.69,-.08,.37,.43);hole(-.73,-.06,.2,.26);poly([[.38,-.46],[.73,-.1],[1,.6],[.78,.47],[.56,.14],[.35,.06]]);rect(-.45,.31,.43,.44);ell(0,.59,.13,.15);}
  if(family==='wateringcan'){poly([[-.65,-.75],[.45,-.75],[.55,.34],[-.5,.34]]);ell(-.56,.19,.42,.55);hole(-.61,.26,.24,.34);poly([[.32,-.42],[.65,-.11],[.91,.63],[1,.61],[.85,.83],[.71,.7],[.45,.07]]);rect(-.29,.31,.2,.47);}
  if(family==='bell'){poly([[-.87,-.57],[-.54,-.2],[-.42,.57],[-.2,.85],[.2,.85],[.42,.57],[.54,-.2],[.87,-.57]]);rect(-.9,-.7,.9,-.55);ell(0,-.79,.19,.16);ell(0,.94,.15,.16);}
  if(family==='candle'){rect(-.27,-.47,.27,.55);poly([[0,.58],[-.2,.85],[-.08,1.2],[.14,1],[.21,.79]]);rect(-.47,-.61,.47,-.46);rect(-.07,-.94,.07,-.51);ell(0,-1,.57,.11);}
  if(family==='tablelamp'){poly([[-.54,.92],[.54,.92],[.95,.07],[-.95,.07]]);rect(-.065,-.81,.065,.25);ell(0,-.89,.58,.13);}
  if(family==='chair'){rect(-.61,-1,-.45,.82);rect(.44,-1,.6,.82);rect(-.61,-.14,.6,.03);rect(-.61,.65,.6,.9);rect(-.42,.2,-.26,.72);rect(-.08,.2,.08,.72);rect(.26,.2,.42,.72);}
  if(family==='book'){poly([[-1,-.64],[-1,.76],[-.27,.83],[0,.58],[.27,.83],[1,.76],[1,-.64],[.26,-.71],[0,-.9],[-.26,-.71]]);holes.push({type:'polygon',points:[[-.03,-.62],[.03,-.62],[.03,.4],[-.03,.4]]});}
  if(family==='scissors'){ell(-.45,-.56,.39,.35);ell(.45,-.56,.39,.35);hole(-.45,-.56,.2,.18);hole(.45,-.56,.2,.18);poly([[-.41,-.32],[.02,.24],[.89,1],[-.11,.46],[-.58,-.19]]);poly([[.41,-.32],[-.02,.24],[-.89,1],[.11,.46],[.58,-.19]]);}
  if(family==='hourglass'){rect(-.65,.82,.65,1);rect(-.65,-1,.65,-.82);poly([[-.52,.84],[.52,.84],[.44,.52],[.14,0],[.44,-.52],[.52,-.84],[-.52,-.84],[-.44,-.52],[-.14,0],[-.44,.52]]);}
  if(family==='anchor'){ell(0,.74,.24,.26);hole(0,.74,.105,.12);rect(-.065,-.61,.065,.65);rect(-.48,.2,.48,.34);poly([[0,-.55],[-.65,-.3],[-.95,.03],[-.91,-.48],[-.57,-.81],[0,-1],[.57,-.81],[.91,-.48],[.95,.03],[.65,-.3]]);}
  if(family==='crown'){poly([[-.8,-.68],[-1,.74],[-.48,.2],[0,1],[.48,.2],[1,.74],[.8,-.68]]);rect(-.8,-.86,.8,-.66);for(const x of [-1,0,1])ell(x,x===0?1:.76,.1,.1);}
  if(family==='trophy'){poly([[-.58,.91],[.58,.91],[.47,.04],[.15,-.34],[-.15,-.34],[-.47,.04]]);for(const side of [-1,1]){ell(side*.59,.39,.38,.42);hole(side*.69,.43,.18,.23);}rect(-.08,-.79,.08,-.23);rect(-.45,-1,.45,-.81);}
  if(family==='planet'){ell(0,0,.59,.62);poly([[-.99,-.31],[-.73,.19],[.68,.58],[1,.32],[.82,-.03],[-.67,-.53]]);holes.push({type:'polygon',points:[[-.76,-.31],[-.65,-.16],[.73,.28],[.79,.37],[.62,.32],[-.71,-.42]]});}
  if(family==='crescent'){const points=[];for(let i=0;i<=48;i++){const t=Math.PI/3+i*(Math.PI*4/3)/48;points.push([.82*Math.cos(t),Math.sin(t)]);}for(let i=1;i<24;i++){const t=i/24;points.push([.41*((1-t)**2+t*t)-1.1*t*(1-t),-.866*(1-t)**2+.866*t*t]);}poly(points);}
  if(family==='star'){const points=[];for(let i=0;i<10;i++){const t=Math.PI/2+i*Math.PI/5,r=i%2?.43:1;points.push([Math.cos(t)*r,Math.sin(t)*r]);}poly(points);}
  if(family==='lighthouse'){poly([[-.49,-.9],[.49,-.9],[.29,.56],[-.29,.56]]);rect(-.37,.54,.37,.88);poly([[-.51,.87],[0,1.17],[.51,.87]]);rect(-.68,-1,.68,-.86);hole(0,.72,.13,.1);}
  if(family==='bridge'){rect(-1,.1,1,.35);rect(-.88,-.77,-.59,.28);rect(.59,-.77,.88,.28);poly([[-.73,-.43],[-.56,-.03],[-.29,.2],[.29,.2],[.56,-.03],[.73,-.43],[.61,-.5],[.44,-.16],[.24,.01],[-.24,.01],[-.44,-.16],[-.61,-.5]]);for(const x of [-.88,-.46,-.05,.36,.77])rect(x,.34,x+.1,.68);rect(-1,.63,1,.75);}
  if(family==='windmill'){poly([[-.43,-1],[.43,-1],[.23,.24],[-.23,.24]]);for(let i=0;i<4;i++){const t=i*Math.PI/2,points=[[.07,-.04],[.17,.93],[-.06,.93],[-.12,.07]].map(([x,y])=>[x*Math.cos(t)-y*Math.sin(t),.3+x*Math.sin(t)+y*Math.cos(t)]);poly(points);}ell(0,.3,.15,.15);}
  if(family==='pagoda'){rect(-.39,-1,.39,.69);for(const [y,w]of [[.58,.64],[.05,.82],[-.48,1]])poly([[-w,y-.16],[-w*.67,y+.07],[0,y+.32],[w*.67,y+.07],[w,y-.16]]);rect(-.08,.73,.08,1.05);rect(-.59,-1.08,.59,-.94);}
  if(family==='torii'){rect(-.65,-1,-.46,.83);rect(.46,-1,.65,.83);rect(-.9,.25,.9,.4);poly([[-1,.75],[-1,.98],[-.65,.87],[.65,.87],[1,.98],[1,.75],[.67,.65],[-.67,.65]]);}
  if(family==='airplane'){poly([[0,1.1],[.13,.86],[.14,.13],[.99,-.42],[.99,-.59],[.13,-.34],[.11,-.75],[.42,-1],[.42,-1.12],[0,-.97],[-.42,-1.12],[-.42,-1],[-.11,-.75],[-.13,-.34],[-.99,-.59],[-.99,-.42],[-.14,.13],[-.13,.86]]);}
  if(family==='helicopter'){ell(-.16,-.12,.59,.34);poly([[.26,-.16],[1,.02],[1,.2],[.27,.05]]);rect(.86,.07,.99,.48);rect(-.22,.14,-.12,.58);rect(-.94,.54,.56,.64);rect(-.5,-.68,.38,-.58);rect(-.37,-.61,-.27,-.3);rect(.17,-.61,.27,-.3);}
  if(family==='train'){rect(-.82,-.37,.27,.24);rect(-.73,.21,-.48,.74);rect(.13,-.37,.79,.59);rect(.02,.56,.91,.72);poly([[-.87,-.36],[-1,-.67],[-.61,-.67],[-.4,-.35]]);for(const x of [-.55,-.05,.52])ell(x,-.53,.23,.24);hole(.46,.28,.16,.15);}
  if(family==='gear'){const points=[];for(let i=0;i<48;i++){const t=i*Math.PI/24,r=i%4<2?1:.8;points.push([Math.cos(t)*r,Math.sin(t)*r]);}poly(points);hole(0,0,.31,.31);}
  if(family==='landscape'){
   poly([[-1,-.12],[-.78,.17],[-.52,.62*a],[-.28,.25],[.02,.77*b],[.3,.22],[.6,.49],[.83,.14],[1,.02],[1,-.17],[-1,-.3]]);
   poly([[-1,-.49],[-.72,-.28],[-.42,-.13],[-.1,-.32],[.22,-.06],[.55,-.21],[.8,-.36],[1,-.28],[1,-.55],[-1,-.66]]);
   poly([[-1,-.88],[-.65,-.67],[-.19,-.72],[.18,-.59],[.63,-.7],[1,-.63],[1,-.9],[-1,-1]]);ell(-.69,.69,.12,.12);
  }
  if(family==='tidal'){
   for(let band=0;band<3;band++){const upper=[],lower=[];for(let i=0;i<=36;i++){const x=-1+2*i/36,y=(band-1)*.55+.13*Math.sin(x*3+band*.9+c*2);upper.push([x,y+.12+.035*Math.cos(x*2+band)]);lower.unshift([x,y-.1]);}poly([...upper,...lower]);}
   ell(.73,.95,.11,.09);
  }
  if(family==='starfield'){
   for(const [x,y,r] of [[-.76,.66,.22],[-.16,.86,.09],[.52,.55,.29],[-.45,.13,.11],[.11,.05,.18],[.84,.02,.1],[-.8,-.46,.13],[-.12,-.6,.28],[.55,-.62,.16],[.89,-.89,.06]])ell(x+(rng()-.5)*.08,y+(rng()-.5)*.08,r*a,r*b);
  }
  if(family==='echoes'){
   for(const [radius,start,end,width] of [[.94,-.4,2.8,.18],[.63,.35,4.2,.17],[.32,1.4,5.5,.14]]){const outer=[],inner=[];for(let i=0;i<=44;i++){const angle=start+(end-start)*i/44;outer.push([Math.cos(angle)*radius,Math.sin(angle)*radius]);inner.unshift([Math.cos(angle)*(radius-width),Math.sin(angle)*(radius-width)]);}poly([...outer,...inner]);}
   ell(.63,-.74,.14,.14);ell(-.72,-.62,.065,.065);
  }
  // Variation changes component proportions; it does not modify the original ink geometry.
  const lean=(c-.5)*.15;
  const vertices=parts.flatMap(p=>p.type==='ellipse'?[[p.x-p.rx,p.y-p.ry],[p.x+p.rx,p.y+p.ry]]:p.points),minX=Math.min(...vertices.map(p=>p[0])),maxX=Math.max(...vertices.map(p=>p[0])),minY=Math.min(...vertices.map(p=>p[1])),maxY=Math.max(...vertices.map(p=>p[1]));
  const descriptor={id:family+'-'+(seed>>>0),family,name:definition.name,kind:definition.kind??'object',seed:seed>>>0,parts,holes,bounds:{minX,maxX,minY,maxY},aspect:(maxY-minY)/(maxX-minX),lean};
  // Retain a compact outline fingerprint independent of color and camera.
  descriptor.fingerprint=[];for(let j=0;j<16;j++)for(let i=0;i<16;i++)descriptor.fingerprint.push(contains(descriptor,-1+(i+.5)/8,-1+(j+.5)/8)?1:0);
  return descriptor;
 }
 function contains(d,x,y){const b=d.bounds,rawY=(b.minY+b.maxY)/2+y*(b.maxY-b.minY)/2,rawX=(b.minX+b.maxX)/2+(x-d.lean*y)*(b.maxX-b.minX)/2;return rawContains(d.parts,d.holes,rawX,rawY);}
 function difference(a,b){let both=0,either=0;for(let i=0;i<a.length;i++){if(a[i]&&b[i])both++;if(a[i]||b[i])either++;}return either?1-both/either:0;}
 const RECENT=48;
 function candidates(source,history,seed){
  const recent=new Set(history.slice(-RECENT).map(h=>h.family)),available=FAMILIES.filter(f=>!recent.has(f.id)),pool=available.filter(f=>!history.some(h=>h.family===f.id));
  const chosen=pool.length?pool:available,lastSeed=history.at(-1)?.seed??0;
  return chosen.map((f,i)=>make(f.id,(seed+Math.imul(i+1,2654435761)+source.seed+Math.imul(lastSeed,1597334677))>>>0)).filter(d=>!history.some(h=>h.id===d.id)).map(d=>({...d,novelty:Math.min(1,...history.slice(-RECENT).map(h=>difference(d.fingerprint,h.fingerprint||[])))}));
 }

 return {FAMILIES,RECENT,make,contains,difference,candidates};
});
