'use strict';
const {contextBridge,ipcRenderer}=require('electron');
contextBridge.exposeInMainWorld('YujiDesktop',Object.freeze({
  savePng:(bytes,name)=>ipcRenderer.invoke('yuji:save-png',bytes,name),
  toggleFullscreen:()=>ipcRenderer.invoke('yuji:fullscreen'),
  onFullscreen:callback=>{ipcRenderer.on('yuji:fullscreen',(_event,value)=>callback(Boolean(value)));},
  onSuspend:callback=>{ipcRenderer.on('yuji:suspend',()=>callback());}
}));
