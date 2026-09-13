const {contextBridge,ipcRenderer}=require('electron');
contextBridge.exposeInMainWorld('shinian',Object.fromEntries(['read','save','export','import','folder'].map(name=>[name,(...args)=>ipcRenderer.invoke(name,...args)])));
