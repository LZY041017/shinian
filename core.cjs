const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');

function validateStore(raw) {
  if (!raw || raw.version !== 1 || !Array.isArray(raw.entries) || !Array.isArray(raw.tags)) throw new Error('这不是有效的拾念备份（需要版本 1）。');
  if (raw.entries.length > 20000 || raw.tags.length > 200) throw new Error('素材或标签数量超出限制。');
  const tags = [...new Set(raw.tags.map(t => {
    if (typeof t !== 'string' || !t.trim() || t.trim().length > 30) throw new Error('标签格式不正确。');
    return t.trim();
  }))];
  const ids = new Set();
  const entries = raw.entries.map(e => {
    if (!e || typeof e.id !== 'string' || !e.id || e.id.length > 100 || ids.has(e.id)) throw new Error('记忆编号缺失或重复。');
    ids.add(e.id);
    if (typeof e.hook !== 'string' || !e.hook.trim() || e.hook.length > 300) throw new Error('记忆引句不能为空，且最多 300 字。');
    if (typeof e.text !== 'string' || e.text.length > 100000) throw new Error('正文格式不正确或超过 10 万字。');
    if (!Array.isArray(e.tags) || e.tags.some(t => !tags.includes(t))) throw new Error('记忆包含未定义的标签。');
    if (!Array.isArray(e.images) || e.images.length > 12) throw new Error('每条记忆最多包含 12 张图片。');
    const images = e.images.map(i => {
      if (typeof i?.data !== 'string' || !/^data:image\/(png|jpeg|webp|gif);base64,[A-Za-z0-9+/=]+$/.test(i.data) || i.data.length > 16000000) throw new Error('图片无效，请使用 PNG、JPEG、WebP 或 GIF。');
      return {name: String(i.name || '图片').slice(0,200), data: i.data};
    });
    for (const field of ['createdAt','updatedAt']) if (typeof e[field] !== 'string' || !Number.isFinite(Date.parse(e[field]))) throw new Error('记忆日期格式不正确。');
    const reviews = Array.isArray(e.reviews) ? e.reviews.slice(-2000).map(r => {
      if (![0,1,2].includes(r.score) || !Number.isFinite(Date.parse(r.at))) throw new Error('复习记录格式不正确。');
      return {score:r.score,at:r.at};
    }) : [];
    return {id:e.id,hook:e.hook.trim(),text:e.text,tags:[...new Set(e.tags)],images,createdAt:e.createdAt,updatedAt:e.updatedAt,starred:!!e.starred,reviews};
  });
  return {version:1,tags,entries};
}

function mergeStores(current, incoming) {
  current = validateStore(current);
  const imported = validateStore(incoming);
  const tags = [...new Set([...current.tags,...imported.tags])];
  const entries = [...current.entries];
  const signature = e => JSON.stringify({...e,id:''});
  const existingContent = new Set(entries.map(signature));
  for (const entry of imported.entries) {
    const old = entries.find(e => e.id === entry.id);
    if (!old) entries.push(entry);
    else if (signature(old) !== signature(entry) && !existingContent.has(signature(entry))) entries.push({...entry,id:crypto.randomUUID()});
    existingContent.add(signature(entry));
  }
  return validateStore({version:1,tags,entries});
}

class Store {
  constructor(dir) { this.dir=dir; this.file=path.join(dir,'memories.json'); this.queue=Promise.resolve(); }
  async read() {
    await fs.mkdir(this.dir,{recursive:true});
    try { return {data:validateStore(JSON.parse(await fs.readFile(this.file,'utf8')))}; }
    catch (err) {
      if (err.code==='ENOENT') return {data:null};
      try {
        const data=validateStore(JSON.parse(await fs.readFile(this.file+'.bak','utf8')));
        await fs.copyFile(this.file,this.file+'.damaged-'+Date.now());
        await fs.writeFile(this.file,JSON.stringify(data,null,2));
        return {data,notice:'已从上一次自动备份恢复；原文件已保留。'};
      } catch { throw new Error('记忆文件暂时无法读取。原文件未覆盖，请从备份恢复，或联系维护者。'); }
    }
  }
  save(raw) {
    const data=validateStore(raw);
    const operation=this.queue.catch(()=>{}).then(async()=>{
      await fs.mkdir(this.dir,{recursive:true});
      const tmp=this.file+'.tmp';
      const handle=await fs.open(tmp,'w');
      try { await handle.writeFile(JSON.stringify(data,null,2)); await handle.sync(); } finally { await handle.close(); }
      try { await fs.copyFile(this.file,this.file+'.bak'); } catch(e) { if(e.code!=='ENOENT') throw e; }
      await fs.rename(tmp,this.file);
      return data;
    });
    this.queue=operation;
    return operation;
  }
}
module.exports={validateStore,mergeStores,Store};
