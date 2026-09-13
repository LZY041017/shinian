const {app,BrowserWindow,ipcMain,dialog,shell,Menu}=require('electron');
const fs=require('node:fs/promises');
const path=require('node:path');
const {Store,validateStore,mergeStores}=require('./core.cjs');
if(process.env.SHINIAN_DATA_DIR) app.setPath('userData',process.env.SHINIAN_DATA_DIR);
app.setAppUserModelId('local.shinian.memory');
let win,store;
const safe=fn=>async(event,...args)=>{
  if(event.sender!==win?.webContents || event.senderFrame!==win.webContents.mainFrame) return {ok:false,error:'无法识别的请求。'};
  try{return {ok:true,value:await fn(...args)}}catch(e){return {ok:false,error:e.message}}
};
if(!app.requestSingleInstanceLock()) app.quit();
else {
  app.on('second-instance',()=>{if(win){if(win.isMinimized())win.restore();win.show();win.focus();}});
  app.whenReady().then(()=>{
    store=new Store(path.join(app.getPath('userData'),'library'));
    Menu.setApplicationMenu(null);
    win=new BrowserWindow({width:1440,height:980,minWidth:820,minHeight:640,show:false,title:'拾念 · 让知识成为自己的思想',backgroundColor:'#f7f6f2',icon:path.join(__dirname,'ui/icon.png'),webPreferences:{preload:path.join(__dirname,'preload.cjs'),nodeIntegration:false,contextIsolation:true,sandbox:true}});
    win.webContents.setWindowOpenHandler(()=>({action:'deny'}));
    win.webContents.on('will-navigate',e=>e.preventDefault());
    win.webContents.session.setPermissionRequestHandler((wc,permission,callback)=>callback(false));
    ipcMain.handle('read',safe(()=>store.read()));
    ipcMain.handle('save',safe(data=>store.save(data)));
    ipcMain.handle('export',safe(async raw=>{
      const data=validateStore(raw);
      const result=await dialog.showSaveDialog(win,{title:'导出完整记忆备份',defaultPath:'拾念备份-'+new Date().toISOString().slice(0,10)+'.json',filters:[{name:'拾念备份',extensions:['json']}]});
      if(result.canceled)return false;
      await fs.writeFile(result.filePath,JSON.stringify(data,null,2));return true;
    }));
    ipcMain.handle('import',safe(async current=>{
      const result=await dialog.showOpenDialog(win,{title:'合并导入拾念备份',properties:['openFile'],filters:[{name:'拾念备份',extensions:['json']}]});
      if(result.canceled)return null;
      const stat=await fs.stat(result.filePaths[0]);if(stat.size>250*1024*1024)throw new Error('备份文件超过 250 MB，请拆分后导入。');
      const incoming=JSON.parse(await fs.readFile(result.filePaths[0],'utf8'));
      return store.save(mergeStores(validateStore(current),incoming));
    }));
    ipcMain.handle('folder',safe(()=>shell.openPath(store.dir)));
    win.loadFile(path.join(__dirname,'ui/index.html'));
    win.once('ready-to-show',()=>win.show());
    let closing=false;
    win.on('close',e=>{if(!closing){e.preventDefault();store.queue.catch(()=>{}).finally(()=>{closing=true;win.close();});}});
  });
}
app.on('window-all-closed',()=>app.quit());
