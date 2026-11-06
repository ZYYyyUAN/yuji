'use strict';
document.addEventListener('DOMContentLoaded',()=>{
  const copy=document.querySelector('.setup-copy'),start=document.getElementById('start-button');
  if(!copy||!start)return;
  const options=document.createElement('div'),launch=document.createElement('div'),note=copy.querySelector('.equal-note');
  options.className='setup-options';options.setAttribute('aria-label','交战设置');
  launch.className='setup-launch';
  for(const child of [...copy.children])if(child!==start&&child!==note)options.append(child);
  launch.append(start);if(note)launch.append(note);copy.append(options,launch);
});
// The native activity already owns immersive fullscreen. A second element
// fullscreen would move the WebView into a custom view and suspend its frames.
document.documentElement.requestFullscreen=()=>Promise.resolve();
document.exitFullscreen=()=>Promise.resolve();
document.addEventListener('DOMContentLoaded',()=>{for(const id of ['fullscreen-button','pause-fullscreen']){const button=document.getElementById(id);if(button)button.hidden=true;}});
window.YujiNativeVideo={active:false,time:0,duration:0,paused:true,error:null};
window.YujiNativeFilmState=state=>Object.assign(window.YujiNativeVideo,state);
window.YujiSaveResult=message=>{const label=document.getElementById('download-status');if(label)label.textContent=message;};
window.YujiSavePng=(blob,name)=>{
  const reader=new FileReader();
  reader.onload=()=>{window.YujiSaveResult('请选择保存位置。');window.YujiAndroid.savePng(reader.result,name);};
  reader.onerror=()=>window.YujiSaveResult('未能生成图片，请重试。');
  reader.readAsDataURL(blob);
};
window.YujiAndroidBack=()=>{
  const dialog=[...document.querySelectorAll('dialog[open]')].at(-1);
  if(dialog){if(dialog.dispatchEvent(new Event('cancel',{cancelable:true})))dialog.close();return true;}
  const before=window.TankCanvasPlay?.snapshot();
  if(before?.screen==='battle'||before?.focusArt){document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}));return true;}
  return false;
};
