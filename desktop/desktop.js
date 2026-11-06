'use strict';
(() => {
  const api=window.YujiDesktop;if(!api)return;
  function status(text){for(const id of ['download-status','status-message','collection-status']){const el=document.getElementById(id);if(el)el.textContent=text;}}
  window.YujiSaveCanvas=async(canvas,name)=>{
    status('正在准备图片…');
    try{
      const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));
      if(!blob)throw new Error('PNG unavailable');
      status('请选择保存位置。');
      const result=await api.savePng(await blob.arrayBuffer(),name);
      status(result.state==='saved'?'图片已保存。':result.state==='canceled'?'已取消保存。':result.state==='busy'?'请先完成当前保存。':'保存失败，请重试。');
    }catch{status('保存失败，请重试。');}
  };
  document.getElementById('fullscreen-button').addEventListener('click',event=>{event.stopImmediatePropagation();api.toggleFullscreen();},true);
  api.onFullscreen(value=>{document.getElementById('fullscreen-button').textContent=value?'退出全屏 ⛶':'全屏 ⛶';});
  api.onSuspend(()=>window.dispatchEvent(new Event('blur')));
  document.getElementById('fullscreen-button').title='切换全屏（F11）';
})();
