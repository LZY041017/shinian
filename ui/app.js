import {dayKey,escapeHTML as h,stats,filterEntries,dailyEntry,shuffle,makeSeed} from './model.js';
import {botanical,icons} from './art.js';
import {openEditor,openTags,openSettings,openConfirm} from './dialogs.js';
import {openReader} from './reader.js';
import {renderPractice,renderHistory} from './practice.js';

const $=s=>document.querySelector(s);
let toastTimer;
const labels={today:'今日拾念',library:'全部记忆',starred:'珍藏片段',practice:'灵感碰撞',history:'回望足迹'};
const ctx={data:null,page:'today',tag:'',query:'',from:'',to:'',sort:'newest',daily:null,busy:false,session:null,
  h,$,toast,render,modal,close:()=>$('#modal').close(),openReader:e=>openReader(ctx,e),openEditor:e=>openEditor(ctx,e),
  async mutate(fn){
    if(ctx.busy){toast('正在保存，请稍候。');return false;}
    ctx.busy=true;$('#saved-status').textContent='◌ 保存中';
    try {const next=structuredClone(ctx.data);fn(next);await call('save',next);ctx.data=next;$('#saved-status').textContent='○ 已保存到本地';return true;}
    catch(e){toast('保存失败：'+e.message);$('#saved-status').textContent='! 保存失败';return false;}
    finally {ctx.busy=false;}
  },
  async star(id){if(await ctx.mutate(d=>{const e=d.entries.find(e=>e.id===id);e.starred=!e.starred;})){render();return true;}return false;},
  async remove(id){const e=ctx.data.entries.find(e=>e.id===id);openConfirm(ctx,'放下这个念头？',`将删除「${e.hook.replace(/\n/g,'')}」及其素材和复习记录。`,async()=>{if(await ctx.mutate(d=>{d.entries=d.entries.filter(e=>e.id!==id)})){ctx.close();render();toast('已删除这条记忆。');}},'删除记忆');},
  call
};

async function call(name,...args){
  if(window.shinian){const r=await window.shinian[name](...args);if(!r.ok)throw new Error(r.error);return r.value;}
  throw new Error('请从「拾念.exe」启动软件。');
}
function toast(message){clearTimeout(toastTimer);$('#toast').textContent=message;$('#toast').classList.add('visible');toastTimer=setTimeout(()=>$('#toast').classList.remove('visible'),4000);}
function modal(html,className=''){
  $('#modal-content').innerHTML=html;$('#modal').className=className;
  if(!$('#modal').open)$('#modal').showModal();
  $('#modal-content').querySelector('[data-close]')?.addEventListener('click',()=>ctx.close());
}
function tagPill(tag){return `<span class="tag ${ctx.data.tags.indexOf(tag)%3===1?'gold':ctx.data.tags.indexOf(tag)%3===2?'blue':''}">${h(tag)}</span>`;}
ctx.tagPill=tagPill;
function entryCard(e,i=0){
  const date=new Date(e.createdAt);
  return `<article class="memory-card" data-entry="${h(e.id)}" tabindex="0" role="button" aria-label="查看：${h(e.hook)}">
    <div class="card-top"><div>${e.tags.map(tagPill).join('')||'<span class="muted">未分类</span>'}</div><button class="icon-button star ${e.starred?'is-starred':''}" data-star="${h(e.id)}" aria-label="${e.starred?'取消珍藏':'珍藏'}" title="${e.starred?'取消珍藏':'珍藏'}">${e.starred?'★':'☆'}</button></div>
    <div class="card-quote-mark">“</div><h3>${h(e.hook).replace(/\n/g,'<br>')}</h3>
    <div class="card-bottom"><span>${String(date.getMonth()+1).padStart(2,'0')} / ${String(date.getDate()).padStart(2,'0')}<i>·</i>${e.images.length?`${e.images.length} 张图片`:'文字笔记'}</span><span class="card-arrow">↗</span></div>
  </article>`;
}
ctx.entryCard=entryCard;
function bindCards(root=$('#view')){
  root.querySelectorAll('[data-entry]').forEach(card=>{const open=()=>ctx.openReader(ctx.data.entries.find(e=>e.id===card.dataset.entry));card.addEventListener('click',open);card.addEventListener('keydown',e=>{if(e.target===card&&['Enter',' '].includes(e.key)){e.preventDefault();open();}});});
  root.querySelectorAll('[data-star]').forEach(b=>b.addEventListener('click',e=>{e.stopPropagation();ctx.star(b.dataset.star);}));
}
ctx.bindCards=bindCards;
function navigate(page,tag=''){if(ctx.session&&!ctx.session.done&&ctx.page==='practice'&&page!=='practice'){openConfirm(ctx,'暂时结束这次抽查？','已经提交的回忆结果会保留，尚未回答的题目不会计入。',()=>{ctx.session=null;ctx.close();go(page,tag);},'结束并离开');}else {if(ctx.session?.done)ctx.session=null;go(page,tag);}}
function go(page,tag){ctx.page=page;ctx.tag=tag;ctx.query='';ctx.from='';ctx.to='';render();$('main').scrollTop=0;}
ctx.navigate=navigate;
function renderNavigation(){
  const s=stats(ctx.data.entries);
  $('#navigation').innerHTML=Object.entries(labels).map(([key,label])=>`<button class="nav-item ${ctx.page===key&&!ctx.tag?'active':''} ${key==='practice'?'practice-nav':''}" data-page="${key}"><span class="nav-icon">${icons[key]}</span>${label}${key==='library'?`<small>${s.total}</small>`:key==='practice'?'<small class="nav-badge">BRAINSTORM</small>':''}</button>`).join('');
  $('#tag-navigation').innerHTML=ctx.data.tags.map((tag,i)=>`<button class="nav-item ${ctx.tag===tag?'active':''}" data-tag-index="${i}"><span class="tag-dot dot-${i%3}"></span><span class="truncate">${h(tag)}</span><small>${ctx.data.entries.filter(e=>e.tags.includes(tag)).length}</small></button>`).join('');
  $('#navigation').querySelectorAll('[data-page]').forEach(b=>b.onclick=()=>navigate(b.dataset.page));
  $('#tag-navigation').querySelectorAll('[data-tag-index]').forEach(b=>b.onclick=()=>navigate('library',ctx.data.tags[Number(b.dataset.tagIndex)]));
  $('#breadcrumb').innerHTML=`我的书房 <span>/</span> ${h(ctx.tag||labels[ctx.page])}`;
}
function render(){
  if(!ctx.data)return;
  renderNavigation();
  if(ctx.page==='today')renderToday();
  else if(ctx.page==='practice')renderPractice(ctx);
  else if(ctx.page==='history')renderHistory(ctx);
  else renderLibrary();
}
function renderToday(){
  const s=stats(ctx.data.entries),hour=new Date().getHours();
  const greeting=hour<6?'夜深了，留一盏心灯。':hour<12?'早安，给思想一点晨光。':hour<18?'午后，拾起一个念头。':'入夜，让念头慢慢沉淀。';
  const entry=ctx.data.entries.find(e=>e.id===ctx.daily)||dailyEntry(ctx.data.entries);
  $('#view').innerHTML=`<section class="page-heading"><div><div class="eyebrow">A LITTLE THOUGHT, EVERY DAY</div><h1>${greeting}</h1><p>不必记住所有，只让重要的事，一次次回来。</p></div><div class="chapter">卷一<span>日有所思</span></div></section>
  <section class="daily-quote"><div class="daily-left"><div class="eyebrow"><span class="tiny-sun">☼</span> ${ctx.daily?'偶然拾得':'今日一念'}<span class="line"></span> A MOMENT TO REMEMBER</div><div class="big-quote">“</div><h2>${entry?h(entry.hook).replace(/\n/g,'<br>'):'为值得记住的事，<br>留下一句引言。'}</h2><div class="quote-attribution"><span class="short-line"></span>${entry?entry.tags.map(h).join(' / ')||'未分类':'你的第一条记忆'}<span>·</span> ${entry?'我的记忆札记':'由此开始'}</div><div class="daily-actions"><button class="primary" id="open-daily">${entry?'展开这一念 <span>↗</span>':'写下第一念 <span>＋</span>'}</button><button class="text-button" id="shuffle-daily">⤨ &nbsp; 随机拾取</button></div></div><div class="daily-art">${botanical}<div class="art-caption">让念头生根，让记忆生长。</div></div></section>
  <section class="stats-strip"><div><span class="stat-number">${s.total.toString().padStart(2,'0')}</span><span>已收集的念头<small>THOUGHTS COLLECTED</small></span></div><div><span class="stat-number">${s.today.toString().padStart(2,'0')}</span><span>今日回想<small>RECALLED TODAY</small></span></div><div><span class="stat-number">${s.streak.toString().padStart(2,'0')}</span><span>连续温习天数<small>DAYS IN A ROW</small></span></div><button id="due-practice">还有 <strong>${s.due}</strong> 个念头，等你重逢 <span>→</span></button></section>
  <section class="section-heading"><div><h2>最近拾得 <small>RECENT NOTES</small></h2></div><button class="text-button" id="all-entries">翻阅全部 <span>→</span></button></section>
  <div class="card-grid">${[...ctx.data.entries].sort((a,b)=>Date.parse(b.createdAt)-Date.parse(a.createdAt)).slice(0,3).map(entryCard).join('')||'<div class="empty-state">书页尚空。点击左侧按钮，留下第一条记忆。</div>'}</div>
  <footer class="page-footer"><span>✳</span> 知识的意义，在于成为你的一部分。<span>拾念 · SHINIAN</span></footer>`;
  $('#open-daily').onclick=()=>entry?ctx.openReader(entry):ctx.openEditor();
  $('#shuffle-daily').onclick=()=>{const candidates=ctx.data.entries.filter(e=>e.id!==entry?.id);ctx.daily=shuffle(candidates)[0]?.id||entry?.id;renderToday();};
  $('#all-entries').onclick=()=>navigate('library');$('#due-practice').onclick=()=>navigate('practice');bindCards();
}
function renderLibrary(){
  $('#view').innerHTML=`<section class="page-heading"><div><div class="eyebrow">YOUR PERSONAL COMMONPLACE BOOK</div><h1>${h(ctx.tag||labels[ctx.page])}<span class="heading-dot">.</span></h1><p>${ctx.page==='starred'?'反复想起的片段，值得好好珍藏。':'把零散的知识，编织成自己的思想。'}</p></div><button class="outline" id="library-new">＋ 新的记忆</button></section>
  <div class="filters"><label class="search-box"><span>⌕</span><input id="search" type="search" placeholder="寻找一句引句、正文或标签…" value="${h(ctx.query)}" aria-label="搜索记忆"><kbd>/</kbd></label><select id="sort" aria-label="排序"><option value="newest">最新收录</option><option value="oldest">最早收录</option><option value="updated">最近修改</option></select><button class="outline" id="random-filtered">⤨ 随机一念</button></div>
  <div class="filter-details"><div class="tag-filters"><button class="filter-tag ${!ctx.tag?'selected':''}" data-filter-tag="-1">全部标签</button>${ctx.data.tags.map((t,i)=>`<button class="filter-tag ${ctx.tag===t?'selected':''}" data-filter-tag="${i}">${h(t)}</button>`).join('')}</div><div class="date-filter"><span>收录日期</span><input type="date" id="date-from" aria-label="起始日期" value="${h(ctx.from)}"><span>—</span><input type="date" id="date-to" aria-label="结束日期" value="${h(ctx.to)}"><button class="icon-button" id="clear-date" title="清除日期" aria-label="清除日期">×</button></div></div>
  <div class="results-line"><span id="results-count"></span><span>每一句，都是通向知识的一扇门</span></div><div id="library-cards" class="card-grid"></div>`;
  $('#sort').value=ctx.sort;
  $('#search').oninput=e=>{ctx.query=e.target.value;updateCards();};
  $('#sort').onchange=e=>{ctx.sort=e.target.value;updateCards();};
  for(const [id,key] of [['#date-from','from'],['#date-to','to']])$(id).onchange=e=>{ctx[key]=e.target.value;updateCards();};
  $('#clear-date').onclick=()=>{ctx.from='';ctx.to='';$('#date-from').value='';$('#date-to').value='';updateCards();};
  $('[data-filter-tag]');document.querySelectorAll('[data-filter-tag]').forEach(b=>b.onclick=()=>{ctx.tag=ctx.data.tags[Number(b.dataset.filterTag)]||'';render();});
  $('#library-new').onclick=()=>ctx.openEditor();
  $('#random-filtered').onclick=()=>{const entry=shuffle(getFiltered())[0];if(entry)ctx.openReader(entry);else toast('当前筛选下还没有记忆。');};updateCards();
}
function getFiltered(){return filterEntries(ctx.data.entries,{...ctx,starred:ctx.page==='starred'});}
function updateCards(){const entries=getFiltered();$('#results-count').textContent=`共 ${entries.length} 个念头`;
  $('#library-cards').innerHTML=entries.map(entryCard).join('')||`<div class="empty-state"><div>⌕</div><h3>还没有找到这个念头</h3><p>${ctx.from&&ctx.to&&ctx.from>ctx.to?'起始日期晚于结束日期，请调整日期范围。':'试试其他关键词、标签，或写下新的记忆。'}</p></div>`;bindCards($('#library-cards'));}

document.querySelectorAll('[data-action]').forEach(b=>b.onclick=()=>{
  if(!ctx.data)return;
  if(b.dataset.action==='new')ctx.openEditor();
  if(b.dataset.action==='tags')openTags(ctx);
  if(b.dataset.action==='settings')openSettings(ctx);
});
$('.brand').onclick=e=>{e.preventDefault();navigate('today');};
$('#modal').addEventListener('click',e=>{if(e.target===$('#modal')){const r=$('#modal-content').getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom){if($('#entry-form'))return;ctx.close();}}});
document.addEventListener('keydown',e=>{if(e.ctrlKey||e.metaKey||e.altKey||['INPUT','TEXTAREA','SELECT'].includes(e.target.tagName))return;if(!$('#modal').open&&e.key.toLowerCase()==='n'){e.preventDefault();ctx.openEditor();}if(!$('#modal').open&&e.key==='/'){e.preventDefault();if(!$('#search'))navigate('library');$('#search')?.focus();}});
$('#top-date').textContent=new Date().toLocaleDateString('zh-CN',{year:'numeric',month:'long',day:'numeric',weekday:'long'});
try {
  const loaded=await call('read');
  if(loaded.data)ctx.data=loaded.data;
  else {
    const seed=makeSeed();
    const img=new Image();img.src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(seed.sampleCurve);await img.decode();
    const canvas=document.createElement('canvas');canvas.width=960;canvas.height=420;canvas.getContext('2d').drawImage(img,0,0);
    seed.entries[0].images=[{name:'局部线性化 · 示例图',data:canvas.toDataURL('image/png')}];delete seed.sampleCurve;
    ctx.data=await call('save',seed);
  }
  render();if(loaded.notice)toast(loaded.notice);
}catch(e){$('#view').innerHTML=`<div class="empty-state"><h1>暂时无法打开书房</h1><p>${h(e.message)}</p><p>记忆数据未被覆盖。可关闭软件后检查本地备份。</p></div>`;}
