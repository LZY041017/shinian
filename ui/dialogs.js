import {escapeHTML as h,dayKey} from './model.js';

export function openConfirm(ctx,title,body,action,label='确定'){
  ctx.modal(`<div class="modal-header"><div><div class="eyebrow">A MOMENT OF PAUSE</div><h2>${h(title)}</h2></div><button class="icon-button" data-close aria-label="关闭">×</button></div><p class="confirm-body">${h(body)}</p><div class="modal-footer"><button class="outline" id="confirm-cancel">取消</button><button class="primary" id="confirm-ok">${h(label)}</button></div>`,'small-modal');
  ctx.$('#confirm-cancel').onclick=ctx.close;ctx.$('#confirm-ok').onclick=async()=>{ctx.$('#confirm-ok').disabled=true;try{await action();}finally{if(ctx.$('#confirm-ok'))ctx.$('#confirm-ok').disabled=false;}};
}

export function openEditor(ctx,entry){
  let images=structuredClone(entry?.images||[]),processing=0;
  let dirty=false;const originalDate=entry?dayKey(entry.createdAt):dayKey();
  ctx.modal(`<form id="entry-form"><div class="modal-header"><div><div class="eyebrow">PLANT A THOUGHT</div><h2>${entry?'再打磨一个念头':'写下一个念头'}<span class="heading-dot">.</span></h2><p>一句引句，是一整片知识的入口。</p></div><button type="button" class="icon-button" data-close aria-label="关闭">×</button></div>
    <div class="editor-body"><label class="field-label" for="hook">记忆引句 <span>HOOK</span><small id="hook-count">0 / 300</small></label><textarea id="hook" class="hook-input" maxlength="300" required rows="2" placeholder="例如：把复杂留给整体，把简单留给局部。">${h(entry?.hook||'')}</textarea>
    <label class="field-label" for="memory-text">想记住的内容 <span>THE THOUGHT BEHIND IT</span></label><textarea id="memory-text" rows="7" maxlength="100000" placeholder="写下解释、推导、灵感，或那些不想忘记的细节…">${h(entry?.text||'')}</textarea>
    <div class="field-label">图片素材 <span>可拖入、粘贴或选择图片</span><small id="image-count"></small></div><div id="image-preview" class="image-preview"></div><label class="upload-zone" id="drop-zone"><span>＋</span><div>为记忆添一张图<small>PNG / JPG / WebP / GIF · 单张最大 10 MB · 最多 12 张</small></div><input id="image-input" type="file" accept="image/png,image/jpeg,image/webp,image/gif" multiple></label>
    <div class="field-label">知识标签 <span>可多选</span></div><div class="editor-tags">${ctx.data.tags.map((t,i)=>`<label class="check-tag"><input type="checkbox" name="entry-tag" value="${i}" ${entry?.tags.includes(t)?'checked':''}><span>${h(t)}</span></label>`).join('')}</div>
    <div class="editor-meta"><label>新标签<input id="new-tags" placeholder="逗号分隔，如：线性代数，灵感" maxlength="200"></label><label>收录日期<input id="entry-date" type="date" required value="${originalDate}"></label></div>
    <div id="editor-error" class="form-error" role="alert"></div><div id="discard-row" hidden class="discard-row">尚有未保存的内容。<button type="button" class="text-button" id="keep-editing">继续编辑</button><button type="button" class="text-button danger" id="discard">放弃修改</button></div></div>
    <div class="modal-footer"><span class="muted">○ 只保存在本机</span><button type="button" class="outline" id="editor-cancel">暂且放下</button><button class="primary" id="save-entry" type="submit">${entry?'保存修改':'收好这一念'} <span>↗</span></button></div></form>`,'editor-modal');
  const form=ctx.$('#entry-form'),error=ctx.$('#editor-error'),dialog=ctx.$('#modal');
  const count=()=>ctx.$('#hook-count').textContent=`${ctx.$('#hook').value.length} / 300`;count();
  form.oninput=()=>{dirty=true;count();};
  const requestClose=()=>{if(dirty){ctx.$('#discard-row').hidden=false;ctx.$('#discard-row').scrollIntoView({block:'nearest'});}else ctx.close();};
  ctx.$('[data-close]').onclick=requestClose;ctx.$('#editor-cancel').onclick=requestClose;
  ctx.$('#keep-editing').onclick=()=>ctx.$('#discard-row').hidden=true;
  ctx.$('#discard').onclick=ctx.close;
  const onCancel=e=>{e.preventDefault();requestClose();};dialog.addEventListener('cancel',onCancel);
  dialog.addEventListener('close',()=>{dialog.removeEventListener('cancel',onCancel);document.removeEventListener('paste',onPaste);},{once:true});
  function drawImages(){ctx.$('#image-count').textContent=`${images.length} / 12`;ctx.$('#image-preview').innerHTML=images.map((img,i)=>`<div class="image-thumb"><img src="${img.data}" alt="${h(img.name)}"><button type="button" data-remove-image="${i}" aria-label="移除图片 ${h(img.name)}">×</button><small>${h(img.name)}</small></div>`).join('');ctx.$('#image-preview').querySelectorAll('[data-remove-image]').forEach(b=>b.onclick=()=>{images.splice(Number(b.dataset.removeImage),1);dirty=true;drawImages();});}
  async function addFiles(files){
    processing++;ctx.$('#save-entry').disabled=true;
    try{for(const file of files){
      if(images.length>=12)throw new Error('每条记忆最多放入 12 张图片。');
      if(!['image/png','image/jpeg','image/webp','image/gif'].includes(file.type))throw new Error('请选择 PNG、JPEG、WebP 或 GIF 图片。');
      if(file.size>10*1024*1024)throw new Error('单张图片不能超过 10 MB。');
      const data=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=()=>reject(new Error('无法读取图片。'));reader.readAsDataURL(file);});
      const test=new Image();test.src=data;await test.decode();
      if(!dialog.open||!form.isConnected)return;
      images.push({name:file.name||'粘贴的图片.png',data});dirty=true;drawImages();
    }error.textContent='';}catch(e){error.textContent=e.message||'无法读取这张图片。';}finally{processing--;if(form.isConnected)ctx.$('#save-entry').disabled=processing>0;}
  }
  function onPaste(e){const files=[...e.clipboardData.items].filter(i=>i.kind==='file').map(i=>i.getAsFile()).filter(Boolean);if(files.length){e.preventDefault();addFiles(files);}}
  document.addEventListener('paste',onPaste);
  ctx.$('#image-input').onchange=e=>{addFiles([...e.target.files]);e.target.value='';};
  const drop=ctx.$('#drop-zone');drop.ondragover=e=>{e.preventDefault();drop.classList.add('dragging');};drop.ondragleave=()=>drop.classList.remove('dragging');drop.ondrop=e=>{e.preventDefault();drop.classList.remove('dragging');addFiles([...e.dataTransfer.files]);};
  form.onsubmit=async e=>{
    e.preventDefault();if(processing)return;
    const hook=ctx.$('#hook').value.trim(),text=ctx.$('#memory-text').value;
    const newTags=[...new Set(ctx.$('#new-tags').value.split(/[,，]/).map(t=>t.trim()).filter(Boolean))];
    if(!hook){error.textContent='先写下一句引句。';return;}
    if(!text.trim()&&!images.length){error.textContent='请添加一些正文或至少一张图片，给记忆留下可以回看的材料。';return;}
    if(newTags.some(t=>t.length>30)){error.textContent='每个标签最多 30 字。';return;}
    const date=ctx.$('#entry-date').value;if(!date){error.textContent='请选择有效的收录日期。';return;}
    const tags=[...new Set([...form.querySelectorAll('[name="entry-tag"]:checked')].map(i=>ctx.data.tags[Number(i.value)]).concat(newTags))];
    const saved={id:entry?.id||crypto.randomUUID(),hook,text,images,tags,createdAt:entry&&date===originalDate?entry.createdAt:new Date(date+'T12:00:00').toISOString(),updatedAt:new Date().toISOString(),reviews:entry?.reviews||[],starred:entry?.starred||false};
    ctx.$('#save-entry').disabled=true;
    const ok=await ctx.mutate(d=>{d.tags=[...new Set([...d.tags,...newTags])];const index=d.entries.findIndex(e=>e.id===saved.id);if(index<0)d.entries.unshift(saved);else d.entries[index]=saved;});
    if(ok){ctx.close();ctx.render();ctx.toast(entry?'这一念，已更新。':'已收好这个念头。');}else if(form.isConnected)ctx.$('#save-entry').disabled=false;
  };
  drawImages();ctx.$('#hook').focus();
}

export function openTags(ctx){
  ctx.modal(`<div class="modal-header"><div><div class="eyebrow">THREADS OF KNOWLEDGE</div><h2>整理知识的经纬<span class="heading-dot">.</span></h2><p>标签可以交叠，思想无需划定边界。</p></div><button class="icon-button" data-close aria-label="关闭">×</button></div><div class="tag-manager">${ctx.data.tags.map((t,i)=>`<div class="tag-edit-row"><span class="tag-dot dot-${i%3}"></span><input aria-label="标签名称 ${h(t)}" value="${h(t)}" maxlength="30" data-tag-input="${i}"><small>${ctx.data.entries.filter(e=>e.tags.includes(t)).length} 念</small><button class="text-button" data-rename="${i}">保存</button><button class="icon-button danger" data-delete-tag="${i}" aria-label="删除标签 ${h(t)}">×</button></div>`).join('')}<form id="add-tag-form" class="tag-edit-row"><input id="add-tag" maxlength="30" placeholder="一个新的分类…" required><button class="primary" type="submit">＋ 添加</button></form><p class="muted">删除标签会解除关联，记忆和素材仍会保留。</p><p class="form-error" id="tag-error" role="alert"></p></div>`,'small-modal');
  ctx.$('#add-tag-form').onsubmit=async e=>{e.preventDefault();const t=ctx.$('#add-tag').value.trim();if(!t)return;if(ctx.data.tags.includes(t)){ctx.$('#tag-error').textContent='这个标签已经存在。';return;}if(await ctx.mutate(d=>d.tags.push(t))){ctx.render();openTags(ctx);}};
  ctx.$('#modal-content').querySelectorAll('[data-rename]').forEach(b=>b.onclick=async()=>{const i=Number(b.dataset.rename),old=ctx.data.tags[i],t=ctx.$(`[data-tag-input="${i}"]`).value.trim();if(!t||ctx.data.tags.some((x,j)=>x===t&&i!==j)){ctx.$('#tag-error').textContent='标签不能为空或重名。';return;}if(await ctx.mutate(d=>{d.tags[i]=t;d.entries.forEach(e=>e.tags=e.tags.map(x=>x===old?t:x));})){if(ctx.tag===old)ctx.tag=t;ctx.render();openTags(ctx);}});
  ctx.$('#modal-content').querySelectorAll('[data-delete-tag]').forEach(b=>b.onclick=()=>{const old=ctx.data.tags[Number(b.dataset.deleteTag)];openConfirm(ctx,'删除这个标签？',`「${old}」将从分类中移除，相关记忆不会删除。`,async()=>{if(await ctx.mutate(d=>{d.tags=d.tags.filter(t=>t!==old);d.entries.forEach(e=>e.tags=e.tags.filter(t=>t!==old));})){if(ctx.tag===old)ctx.tag='';ctx.render();openTags(ctx);}},'删除标签');});
}

export function openSettings(ctx){
  ctx.modal(`<div class="modal-header"><div><div class="eyebrow">A ROOM OF YOUR OWN</div><h2>数据与设置<span class="heading-dot">.</span></h2></div><button class="icon-button" data-close aria-label="关闭">×</button></div><div class="settings-body"><div class="privacy-note"><span>✳</span><div><h3>这间书房，只属于你。</h3><p>引句、文字、图片与复习记录都保存在本机。无需登录，无需联网。</p></div></div><button class="setting-row" id="export-backup"><span><strong>导出完整备份</strong><small>包含全部素材、标签和复习记录 · JSON</small></span><span>↗</span></button><button class="setting-row" id="import-backup"><span><strong>合并导入备份</strong><small>保留现有记忆；相同编号但内容不同的条目另存为一条</small></span><span>↙</span></button><button class="setting-row" id="open-folder"><span><strong>打开本地数据文件夹</strong><small>自动保留上一次保存的副本 memories.json.bak</small></span><span>→</span></button><div class="settings-help"><h3>一点使用提示</h3><p><kbd>N</kbd> 新建记忆 &nbsp; <kbd>/</kbd> 搜索 &nbsp; <kbd>Esc</kbd> 关闭阅读</p><p>透视镜：移动鼠标或按住拖动触屏，局部查看素材；也可切换完整阅读。</p><p>抽查采用简单间隔：未想起 1 天、有印象 3 天、已掌握 7 天后再提示。这是练习节奏，不是记忆效果保证。</p><p>首次提供 6 条可编辑示例，所有引句均为示例写作。图片保持原始尺寸与格式。</p></div><div class="settings-version">拾念 SHINIAN <span>v1.0.0 · 慢一点，记得更深一点。</span></div></div>`,'settings-modal');
  const perform=async(button,fn)=>{button.disabled=true;try{await fn();}catch(e){ctx.toast(e.message);}finally{button.disabled=false;}};
  ctx.$('#export-backup').onclick=e=>perform(e.currentTarget,async()=>{if(await ctx.call('export',ctx.data))ctx.toast('完整备份已导出。');});
  ctx.$('#import-backup').onclick=e=>perform(e.currentTarget,async()=>{const data=await ctx.call('import',ctx.data);if(data){ctx.data=data;ctx.daily=null;ctx.session=null;ctx.render();ctx.toast('已合并导入，现有记忆已保留。');}});
  ctx.$('#open-folder').onclick=e=>perform(e.currentTarget,async()=>{const error=await ctx.call('folder');if(error)throw new Error(error);});
}
