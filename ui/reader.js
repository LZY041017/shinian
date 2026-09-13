import {escapeHTML as h} from './model.js';

export function materialHTML(entry){
  return `<div class="material-content">${entry.text?`<div class="material-text">${h(entry.text)}</div>`:''}${entry.images.map(i=>`<figure><img src="${i.data}" alt="${h(i.name)}" draggable="false"><figcaption>${h(i.name)}</figcaption></figure>`).join('')}</div>`;
}
export function lensHTML(entry){
  const content=materialHTML(entry);
  return `<div class="lens-toolbar"><div class="segmented"><button class="selected" data-mode="lens">◉ 透视镜</button><button data-mode="full">完整阅读</button></div><label class="radius-label">视野 <input type="range" min="45" max="160" value="90" aria-label="透视镜半径"></label><span class="lens-hint">移动光圈，循线索回想</span></div><div class="lens-viewport" tabindex="0" role="region" aria-label="原始记忆素材；可以切换完整阅读"><div class="lens-stage masked" style="--lens-x:-500px;--lens-y:-500px;--lens-radius:90px"><div class="blur-layer" aria-hidden="true">${content}</div><div class="clear-layer" aria-hidden="true">${content}</div><div class="lens-ring" aria-hidden="true"></div></div></div>`;
}
export function bindLens(root){
  const stage=root.querySelector('.lens-stage'),viewport=root.querySelector('.lens-viewport'),clear=root.querySelector('.clear-layer'),blur=root.querySelector('.blur-layer');
  let radius=90,mode='lens',active=false,last=null;
  const update=(clientX,clientY)=>{if(mode!=='lens')return;const r=stage.getBoundingClientRect();const x=clientX-r.left,y=clientY-r.top;stage.style.setProperty('--lens-x',x+'px');stage.style.setProperty('--lens-y',y+'px');stage.classList.add('lens-active');};
  const hide=()=>{stage.classList.remove('lens-active');stage.style.setProperty('--lens-x','-500px');stage.style.setProperty('--lens-y','-500px');};
  viewport.addEventListener('pointermove',e=>{if(e.pointerType==='mouse'||active){last={x:e.clientX,y:e.clientY};update(e.clientX,e.clientY);}});
  viewport.addEventListener('pointerdown',e=>{active=true;last={x:e.clientX,y:e.clientY};update(e.clientX,e.clientY);});
  viewport.addEventListener('pointerup',e=>{active=false;if(e.pointerType!=='mouse')hide();});
  viewport.addEventListener('pointercancel',()=>{active=false;hide();});viewport.addEventListener('pointerleave',()=>{active=false;last=null;hide();});
  viewport.addEventListener('scroll',()=>{if(last)update(last.x,last.y);});
  root.querySelectorAll('[data-mode]').forEach(b=>b.onclick=()=>{mode=b.dataset.mode;stage.classList.toggle('masked',mode==='lens');clear.setAttribute('aria-hidden',String(mode==='lens'));blur.setAttribute('aria-hidden','true');root.querySelectorAll('[data-mode]').forEach(x=>x.classList.toggle('selected',x===b));root.querySelector('.radius-label').hidden=mode!=='lens';hide();root.querySelector('.lens-hint').textContent=mode==='lens'?'移动光圈，循线索回想':'让材料与你的回忆相互印证';});
  root.querySelector('[type="range"]').oninput=e=>{radius=Number(e.target.value);stage.style.setProperty('--lens-radius',radius+'px');};
  viewport.onkeydown=e=>{if(mode!=='lens'||!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key))return;e.preventDefault();const r=viewport.getBoundingClientRect();let x=last?.x??r.left+r.width/2,y=last?.y??r.top+r.height/2;if(e.key==='ArrowLeft')x-=25;if(e.key==='ArrowRight')x+=25;if(e.key==='ArrowUp')y-=25;if(e.key==='ArrowDown')y+=25;x=Math.max(r.left+10,Math.min(r.right-10,x));y=Math.max(r.top+10,Math.min(r.bottom-10,y));last={x,y};update(x,y);};
}
export function openReader(ctx,entry){
  if(!entry)return;
  ctx.modal(`<div class="modal-header reader-header"><div><div class="eyebrow">THE THOUGHT BEHIND THE WORDS</div><div class="reader-tags">${entry.tags.map(ctx.tagPill).join('')}<span class="muted">${new Date(entry.createdAt).toLocaleDateString('zh-CN')}</span></div></div><button class="icon-button" data-close aria-label="关闭">×</button></div><div class="reader-hook"><span>“</span><h2>${h(entry.hook).replace(/\n/g,'<br>')}</h2><p>停一会儿。你还记得，这句话背后的内容吗？</p></div><div class="reader-material">${lensHTML(entry)}</div><div class="modal-footer reader-footer"><button class="text-button danger" id="delete-entry">删除</button><span class="spacer"></span><button class="outline" id="reader-star">${entry.starred?'★ 已珍藏':'☆ 珍藏'}</button><button class="outline" id="edit-entry">编辑记忆 ↗</button></div>`,'reader-modal');
  bindLens(ctx.$('#modal-content'));
  ctx.$('#edit-entry').onclick=()=>ctx.openEditor(entry);
  ctx.$('#delete-entry').onclick=()=>ctx.remove(entry.id);
  ctx.$('#reader-star').onclick=async()=>{if(await ctx.star(entry.id)){entry=ctx.data.entries.find(e=>e.id===entry.id);ctx.$('#reader-star').textContent=entry.starred?'★ 已珍藏':'☆ 珍藏';}};
}
