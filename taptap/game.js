'use strict';
// Keep the entry independent of module loading and modern syntax so startup errors remain visible.
(function () {
 var api=typeof tap!=='undefined'?tap:typeof GameGlobal!=='undefined'?GameGlobal.tap:null;
 var surface=null,context=null,stage='入口',failed=false,ready=false,watchdog=null;
 function paint(title,detail){
  if(!context)return;
  var w=surface.width||960,h=surface.height||540,unit=Math.max(1,Math.min(w/960,h/540));
  context.save();
  if(typeof context.setTransform==='function')context.setTransform(1,0,0,1,0,0);
  context.fillStyle='#f3f0e7';context.fillRect(0,0,w,h);context.fillStyle='#25332c';context.textAlign='left';context.textBaseline='top';
  context.font=Math.round(34*unit)+'px sans-serif';context.fillText(title,36*unit,42*unit);
  context.font=Math.round(18*unit)+'px sans-serif';
  var parts=String(detail||'').split('\n'),lines=[],limit=Math.max(24,Math.floor((w-72*unit)/(11*unit)));
  for(var i=0;i<parts.length;i++)for(var j=0;j<parts[i].length;j+=limit)lines.push(parts[i].slice(j,j+limit));
  for(var n=0;n<Math.min(lines.length,8);n++)context.fillText(lines[n],36*unit,(112+n*28)*unit);
  context.font=Math.round(15*unit)+'px sans-serif';context.fillText('余迹 · 启动检查 23.4 · '+stage,36*unit,h-42*unit);context.restore();
 }
 function fail(error){
  if(failed)return;failed=true;if(watchdog)clearTimeout(watchdog);
  var message=String(error&&error.message||error&&error.errMsg||error||'未知启动错误');
  if(typeof console!=='undefined'&&console.error)console.error('[Yuji boot 23.4] '+stage,error);
  try{paint('启动未完成',message+'\n请将此页截图发给开发者。');}catch(ignored){}
  if(!context&&api&&typeof api.showModal==='function')api.showModal({title:'余迹启动未完成',content:stage+'：'+message.slice(0,220),showCancel:false});
 }
 try{
  if(!api||typeof api.createCanvas!=='function')throw new Error('未找到 TapTap 画布接口');
  // The first native Canvas is the sole on-screen surface.
  surface=api.createCanvas();context=surface.getContext('2d');
  if(!context)throw new Error('无法创建二维画布');
  stage='画布已创建';paint('余迹','正在启动…');
  setTimeout(function(){
   try{
    stage='加载平台模块';paint('余迹','正在加载…');
    var Platform=require('./src/platform.js');
    stage='加载游戏模块';var GameApp=require('./src/app.js').GameApp;
    stage='初始化游戏';var app=new GameApp(surface);
    stage='绘制首页';paint('余迹','正在打开首页…');
    watchdog=setTimeout(function(){if(!ready&&!failed)fail(new Error('首页尚未完成首帧，请连接调试日志。'));},8000);
    app.run(fail,function(){ready=true;if(watchdog)clearTimeout(watchdog);stage='运行中';});
    if(Platform.launchQuery().yujiInspect==='1')GameGlobal.YujiInspect=function(){return app.snapshot();};
   }catch(error){fail(error);}
  },30);
 }catch(error){fail(error);}
})();
