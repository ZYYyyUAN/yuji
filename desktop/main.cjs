'use strict';
const {app,BrowserWindow,Menu,protocol,net,session,ipcMain,dialog}=require('electron');
const path=require('node:path'),fs=require('node:fs/promises'),{pathToFileURL}=require('node:url');
const origin='yuji://game',contentRoot=path.join(__dirname,'game');
const csp="default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; media-src 'self' blob:; connect-src 'self'; worker-src 'self'; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'";
protocol.registerSchemesAsPrivileged([{scheme:'yuji',privileges:{standard:true,secure:true,supportFetchAPI:true,corsEnabled:true,stream:true}}]);
app.setName('Yuji');
app.setAppUserModelId('com.yuji.game');
// --user-data-dir permits isolated QA profiles; the normal path remains stable across updates.
app.setPath('userData',app.commandLine.getSwitchValue('user-data-dir')||path.join(app.getPath('appData'),'Yuji'));
let win,exportBusy=false;
if(!app.requestSingleInstanceLock())app.quit();
else {
  app.on('second-instance',()=>{if(win){if(win.isMinimized())win.restore();win.show();win.focus();}});
  app.whenReady().then(async()=>{
    Menu.setApplicationMenu(null);
    protocol.handle('yuji',async request=>{
      try{
        const u=new URL(request.url);
        if(u.protocol!=='yuji:'||u.hostname!=='game'||u.port||u.username||u.password||!['GET','HEAD'].includes(request.method))return new Response('Forbidden',{status:403});
        const name=decodeURIComponent(u.pathname==='/'?'/index.html':u.pathname),target=path.resolve(contentRoot,'.'+name),rel=path.relative(contentRoot,target);
        if(!rel||rel.startsWith('..')||path.isAbsolute(rel))return new Response('Forbidden',{status:403});
        const response=await net.fetch(pathToFileURL(target).toString());
        const headers=new Headers(response.headers);headers.set('Content-Security-Policy',csp);headers.set('X-Content-Type-Options','nosniff');
        return new Response(response.body,{status:response.status,headers});
      }catch{return new Response('Not found',{status:404});}
    });
    session.defaultSession.setPermissionRequestHandler((_wc,_permission,callback)=>callback(false));
    session.defaultSession.setPermissionCheckHandler(()=>false);
    session.defaultSession.webRequest.onBeforeRequest({urls:['http://*/*','https://*/*','ws://*/*','wss://*/*']},(_details,callback)=>callback({cancel:true}));
    win=new BrowserWindow({width:1440,height:900,minWidth:800,minHeight:500,title:'余迹',backgroundColor:'#f3f0e7',show:false,autoHideMenuBar:true,icon:path.join(__dirname,'app.ico'),webPreferences:{preload:path.join(__dirname,'preload.cjs'),nodeIntegration:false,contextIsolation:true,sandbox:true,webSecurity:true,spellcheck:false,devTools:false}});
    win.webContents.setWindowOpenHandler(()=>({action:'deny'}));
    win.webContents.on('will-navigate',(event,url)=>{if(!url.startsWith(origin+'/'))event.preventDefault();});
    win.webContents.on('will-attach-webview',event=>event.preventDefault());
    const syncFullscreen=()=>{if(!win.isDestroyed())win.webContents.send('yuji:fullscreen',win.isFullScreen());};
    win.on('enter-full-screen',syncFullscreen);win.on('leave-full-screen',syncFullscreen);
    for(const event of ['blur','minimize','hide'])win.on(event,()=>{if(!win.isDestroyed())win.webContents.send('yuji:suspend');});
    win.webContents.on('before-input-event',(event,input)=>{
      if(input.type==='keyDown'&&input.key==='F11'){event.preventDefault();if(!input.isAutoRepeat)win.setFullScreen(!win.isFullScreen());}
      if((input.control||input.meta)&&['r','R','w','W','+','-','0'].includes(input.key))event.preventDefault();
    });
    const trusted=event=>event.sender===win.webContents&&event.senderFrame===win.webContents.mainFrame&&event.senderFrame.url.startsWith(origin+'/');
    ipcMain.handle('yuji:fullscreen',event=>{if(!trusted(event))return false;win.setFullScreen(!win.isFullScreen());return win.isFullScreen();});
    ipcMain.handle('yuji:save-png',async(event,bytes,name)=>{
      if(!trusted(event)||exportBusy)return {state:'busy'};
      exportBusy=true;
      try{
        const buffer=Buffer.from(bytes);
        if(buffer.length<24||buffer.length>64*1024*1024||!buffer.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])))return {state:'failed'};
        const filename=String(name||'余迹.png').replace(/[<>:"/\\|?*\x00-\x1f]/g,'_').slice(0,160).replace(/(?:\.png)?$/i,'.png');
        const choice=await dialog.showSaveDialog(win,{title:'保存图片',defaultPath:path.join(app.getPath('pictures'),filename),filters:[{name:'PNG 图片',extensions:['png']}],properties:['showOverwriteConfirmation','createDirectory']});
        if(choice.canceled||!choice.filePath)return {state:'canceled'};
        await fs.writeFile(choice.filePath,buffer);
        return {state:'saved'};
      }catch{return {state:'failed'};}
      finally{exportBusy=false;}
    });
    win.once('ready-to-show',()=>{win.maximize();win.show();});
    win.webContents.on('did-fail-load',(_event,code,description)=>{if(code!==-3)dialog.showErrorBox('余迹无法启动',description);});
    await win.loadURL(origin+'/index.html');
  }).catch(error=>{dialog.showErrorBox('余迹无法启动',error.message);app.quit();});
  app.on('window-all-closed',()=>app.quit());
}
