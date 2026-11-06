'use strict';
const api=typeof tap!=='undefined'?tap:GameGlobal.tap;
if(!api)throw new Error('请在 TapTap 小游戏环境运行。');
function call(name,args={}){return new Promise((resolve,reject)=>{if(typeof api[name]!=='function'){reject(new Error('当前客户端不支持此功能'));return;}api[name]({...args,success:resolve,fail:reject});});}
const storage={getItem(key){const v=api.getStorageSync(key);return v===undefined||v===null||v===''?null:typeof v==='string'?v:JSON.stringify(v);},setItem(key,value){api.setStorageSync(key,String(value));}};
function canvas(w,h){const c=api.createCanvas();if(w)c.width=w;if(h)c.height=h;return c;}
// TapTap Android 2.96.14 exposes tap.createImageData but its proxy throws Illegal invocation.
// The native 2D context factory was verified by a put/get pixel round trip on the device.
function imageData(w,h,ctx){return ctx&&typeof ctx.createImageData==='function'?ctx.createImageData(w,h):api.createImageData(w,h);}
function system(){return api.getSystemInfoSync();}
function launchQuery(){try{return api.getLaunchOptionsSync().query||{};}catch{return {};}}
function image(src){const i=api.createImage();const ready=new Promise(resolve=>{i.onload=()=>resolve(i);i.onerror=()=>resolve(null);});i.src=src;return {image:i,ready};}
function toast(text){if(api.showToast)api.showToast({title:text,icon:'none',duration:2200});}
function clone(value){return JSON.parse(JSON.stringify(value));}
function id(){return Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,9);}
async function saveCanvas(c){
 const result=await new Promise((resolve,reject)=>c.toTempFilePath({fileType:'png',destWidth:c.width,destHeight:c.height,success:resolve,fail:reject}));
 try{await call('saveImageToPhotosAlbum',{filePath:result.tempFilePath});toast('图片已保存到相册。');return true;}
 catch(error){const denied=/auth|deny|denied|permission/i.test(error.errMsg||error.message||'');if(denied)toast('未获相册权限，可在小游戏设置中开启后重试。');else toast('保存失败，请重试。');return false;}
}
function createSound(){
 let enabled=true;try{enabled=storage.getItem('yujiSoundV1')!=='off';}catch{}
 const pool=[];const last={};
 function sample(kind){if(!enabled||!api.createInnerAudioContext)return;const now=Date.now();if(now-(last[kind]||0)<(kind==='shot'?110:70))return;last[kind]=now;let player=pool.find(p=>p.free);if(!player&&pool.length<5){const audio=api.createInnerAudioContext();player={audio,free:true};pool.push(player);const done=()=>player.free=true;audio.onEnded(done);audio.onError(done);}if(!player)return;player.free=false;player.audio.stop();player.audio.src='assets/'+(kind==='paper'?'paper.wav':kind==='wood'?'wood.wav':kind+'.wav');player.audio.volume=kind==='shot'?.15:kind==='hit'?.3:.35;player.audio.play();}
 return {get enabled(){return enabled;},toggle(){enabled=!enabled;try{storage.setItem('yujiSoundV1',enabled?'on':'off');}catch{}if(!enabled)this.stop();},sample,stop(){for(const p of pool){p.audio.stop();p.free=true;}}};
}
module.exports={api,call,storage,canvas,imageData,system,launchQuery,image,toast,clone,id,saveCanvas,createSound};
