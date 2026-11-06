'use strict';
const P=require('./platform.js');
class Works{
 constructor(){this.items=[];this.memory=new Map();this.error='';this.fs=null;this.unsaved=new Set();try{this.fs=P.api.getFileSystemManager();this.dir=P.api.env.USER_DATA_PATH+'/yuji-works-v1';try{this.fs.mkdirSync(this.dir,true);}catch{}for(const file of this.fs.readdirSync(this.dir)){if(!/^work-[a-z0-9-]+\.json$/.test(file))continue;try{const r=JSON.parse(this.fs.readFileSync(this.dir+'/'+file,'utf8'));if(this.valid(r))this.items.push(this.meta(r));}catch{}}this.sort();}catch{this.error='历史存储暂不可用，本次记录只留在当前页面。';}}
 valid(r){return r&&r.schema===1&&typeof r.id==='string'&&/^[a-z0-9-]+$/.test(r.id)&&Array.isArray(r.source?.impacts)&&Array.isArray(r.source?.palette)&&Array.isArray(r.versions)&&Array.isArray(r.views);}
 meta(r){return {id:r.id,time:r.time,name:r.versions[r.latest]?.model.name||'原画',views:r.views.length};}
 sort(){this.items.sort((a,b)=>b.time-a.time);}
 trim(){for(const id of this.memory.keys()){if(this.memory.size<=4)break;if(!this.unsaved.has(id))this.memory.delete(id);}}
 read(id){if(this.memory.has(id))return this.memory.get(id);if(!/^[a-z0-9-]+$/.test(id))return null;try{const r=JSON.parse(this.fs.readFileSync(this.dir+'/work-'+id+'.json','utf8'));if(!this.valid(r))return null;this.memory.set(id,r);this.trim();return r;}catch{return null;}}
 write(r){this.memory.set(r.id,r);const i=this.items.findIndex(m=>m.id===r.id);if(i<0)this.items.push(this.meta(r));else this.items[i]=this.meta(r);this.sort();try{if(!this.fs)throw Error('Storage unavailable');const file=this.dir+'/work-'+r.id+'.json',temp=file+'.tmp';this.fs.writeFileSync(temp,JSON.stringify(r),'utf8');this.fs.renameSync(temp,file);this.unsaved.delete(r.id);this.trim();this.error='';return true;}catch{this.unsaved.add(r.id);this.error='未能写入本机历史，本次仍可查看和保存图片。';return false;}}
 create(source,game){const r={schema:1,id:P.id(),time:Date.now(),source:P.clone(source),game:P.clone(game),versions:[],latest:-1,views:[],lastView:null,nextView:1};this.write(r);return r;}
 addVersion(r,result){r.versions.push(P.clone(result));r.latest=r.versions.length-1;this.write(r);}
 view(r,index,camera,zoom){const existing=r.views.find(v=>v.version===index&&Math.abs(v.camera.az-camera.az)<.0001&&Math.abs(v.camera.elevation-camera.elevation)<.0001&&Math.abs(v.zoom-zoom)<.001);if(existing)return '这个视角已在收藏中。';if(r.views.length>=12)return '每件作品可收藏12个视角。';r.views.push({name:'视角 '+r.nextView++,version:index,camera:P.clone(camera),zoom});this.write(r);return this.error||'视角已收藏。';}
 remove(id){try{this.fs.unlinkSync(this.dir+'/work-'+id+'.json');}catch{this.error='删除失败，原记录已保留。';return false;}this.items=this.items.filter(m=>m.id!==id);this.memory.delete(id);return true;}
}
module.exports={Works};
