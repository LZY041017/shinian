import {shuffle,due,stats,dayKey,escapeHTML as h} from './model.js';
import {lensHTML,bindLens} from './reader.js';
import {botanical} from './art.js';

export function renderPractice(ctx){
  if(ctx.session){renderSession(ctx);return;}
  const s=stats(ctx.data.entries);
  ctx.$('#view').innerHTML=`<section class="page-heading"><div><div class="eyebrow">BRAINSTORMING · MAKE CONNECTIONS</div><h1>让旧知，遇见新念<span class="heading-dot">.</span></h1><p>打乱顺序，跨越学科。从一句引句，找回一整段记忆。</p></div><span class="large-spark">✧</span></section><div class="practice-setup"><section class="practice-intro"><span class="eyebrow">A QUIET CHALLENGE</span><h2>给记忆，<br>一场不期而遇。</h2><p>先回想，再探看，最后诚实地评价自己。<br>记不起来的地方，正是下一次生长的起点。</p>${botanical}<div class="practice-steps"><span>01 看引句</span><span>02 想一想</span><span>03 找回记忆</span></div></section><section class="practice-options"><h3>准备一次灵感碰撞</h3><p class="muted">选择范围，留出片刻专注。</p><label class="field-label">从哪些领域抽取 <span>不选则包含全部</span></label><div class="editor-tags">${ctx.data.tags.map((t,i)=>`<label class="check-tag"><input type="checkbox" name="practice-tag" value="${i}"><span>${h(t)}</span></label>`).join('')}</div><label class="field-label" for="practice-count">这一组，回想多少念</label><div class="count-options"><button data-count="3">3 念</button><button class="selected" data-count="5">5 念</button><button data-count="10">10 念</button><input type="number" id="practice-count" min="1" max="50" value="5" aria-label="自定义抽查数量"></div><label class="due-toggle"><input type="checkbox" id="due-only"><span><strong>只抽取待温习的记忆</strong><small>按上一次自评安排的 1 / 3 / 7 天间隔</small></span><span class="switch"></span></label><div class="available-count"><span id="available-count"></span><small>组内不重复 · 顺序随机</small></div><button class="primary start-practice" id="start-practice">开始这次碰撞 <span>→</span></button><p class="practice-footnote">没有倒计时，也无需赶路。按自己的节奏来。</p></section></div><div class="practice-bottom-note"><span>✧</span><div>今日已回想 <strong>${s.today}</strong> 次。每一次主动寻找，都让记忆多一条回家的路。</div></div>`;
  const eligible=()=>{const tags=[...document.querySelectorAll('[name="practice-tag"]:checked')].map(i=>ctx.data.tags[Number(i.value)]);return ctx.data.entries.filter(e=>(!tags.length||e.tags.some(t=>tags.includes(t)))&&(!ctx.$('#due-only').checked||due(e)));};
  const update=()=>{const n=eligible().length;ctx.$('#available-count').textContent=`${n} 个念头可供抽取`;ctx.$('#start-practice').disabled=n===0;};
  document.querySelectorAll('[data-count]').forEach(b=>b.onclick=()=>{ctx.$('#practice-count').value=b.dataset.count;document.querySelectorAll('[data-count]').forEach(x=>x.classList.toggle('selected',x===b));});
  ctx.$('#practice-count').oninput=()=>document.querySelectorAll('[data-count]').forEach(x=>x.classList.toggle('selected',x.dataset.count===ctx.$('#practice-count').value));
  document.querySelectorAll('[name="practice-tag"],#due-only').forEach(i=>i.onchange=update);
  ctx.$('#start-practice').onclick=()=>{
    const count=Number(ctx.$('#practice-count').value);if(!Number.isInteger(count)||count<1||count>50){ctx.toast('抽查数量请填写 1 到 50 的整数。');return;}
    const ids=shuffle(eligible()).slice(0,count).map(e=>e.id);if(!ids.length)return;
    ctx.session={ids,index:0,results:[],revealed:false,startedAt:Date.now()};ctx.render();ctx.$('main').scrollTop=0;
  };update();
}
function renderSession(ctx){
  const session=ctx.session;
  if(session.index>=session.ids.length){renderSummary(ctx);return;}
  const entry=ctx.data.entries.find(e=>e.id===session.ids[session.index]);
  if(!entry){session.index++;renderSession(ctx);return;}
  const number=session.index+1,total=session.ids.length;
  ctx.$('#view').innerHTML=`<div class="session-top"><button class="text-button" id="end-session">← 结束抽查</button><span class="eyebrow">STAY CURIOUS, STAY WITH IT</span><span class="session-number">${String(number).padStart(2,'0')} <small>/ ${String(total).padStart(2,'0')}</small></span></div><div class="session-progress"><span style="width:${session.index/total*100}%"></span></div><section class="recall-card"><div class="reader-tags">${entry.tags.map(ctx.tagPill).join('')}</div><span class="recall-quote">“</span><h2>${h(entry.hook).replace(/\n/g,'<br>')}</h2><p>顺着这句引言，你能回想起哪些细节？</p><textarea id="recall-draft" placeholder="也可以在这里写下你的回忆…（草稿仅用于本题，不保存）" aria-label="本题回忆草稿">${h(session.draft||'')}</textarea>${!session.revealed?'<button class="primary" id="reveal-material">让我循着线索看看 <span>◉</span></button>':''}</section>${session.revealed?`<section class="session-material">${lensHTML(entry)}</section><div class="rating-section"><div><h3>这一次，回想得怎么样？</h3><p>如实记录，给下一次重逢留个日期。</p></div><div class="rating-buttons"><button data-rating="0"><span>◌</span><strong>未想起</strong><small>1 天后再会</small></button><button data-rating="1"><span>◐</span><strong>有印象</strong><small>3 天后再会</small></button><button data-rating="2"><span>●</span><strong>已掌握</strong><small>7 天后再会</small></button></div></div>`:'<p class="recall-hint">不急着翻看答案，先给自己一点时间。</p>'}`;
  ctx.$('#recall-draft').oninput=e=>session.draft=e.target.value;
  ctx.$('#end-session').onclick=()=>ctx.navigate('today');
  if(!session.revealed)ctx.$('#reveal-material').onclick=()=>{session.revealed=true;renderSession(ctx);ctx.$('.session-material').scrollIntoView({block:'start',behavior:'smooth'});};
  else{
    bindLens(ctx.$('#view'));
    ctx.$('#view').querySelectorAll('[data-rating]').forEach(b=>b.onclick=async()=>{
      if(ctx.busy)return;const score=Number(b.dataset.rating),at=new Date().toISOString();
      ctx.$('#view').querySelectorAll('[data-rating]').forEach(x=>x.disabled=true);
      if(await ctx.mutate(d=>{const e=d.entries.find(e=>e.id===entry.id);e.reviews.push({score,at});e.reviews=e.reviews.slice(-2000);})){session.results.push({id:entry.id,hook:entry.hook,score});session.index++;session.revealed=false;session.draft='';ctx.render();ctx.$('main').scrollTop=0;}
      else ctx.$('#view').querySelectorAll('[data-rating]').forEach(x=>x.disabled=false);
    });
  }
}
function renderSummary(ctx){
  const session=ctx.session;session.done=true;
  const counts=[0,1,2].map(n=>session.results.filter(r=>r.score===n).length);
  ctx.$('#view').innerHTML=`<div class="session-summary"><div class="summary-flower">✳</div><div class="eyebrow">A LITTLE CLEARER THAN BEFORE</div><h1>又与 ${session.results.length} 个念头重逢。</h1><p>记住的，慢慢沉淀；模糊的，留待再会。</p><div class="summary-stats"><div><strong>${counts[0]}</strong><span>未想起 · 1 天后</span></div><div><strong>${counts[1]}</strong><span>有印象 · 3 天后</span></div><div><strong>${counts[2]}</strong><span>已掌握 · 7 天后</span></div></div><div class="summary-list">${session.results.map(r=>`<button data-summary-entry="${h(r.id)}"><span>${h(r.hook.replace(/\n/g,''))}</span><small>${['未想起','有印象','已掌握'][r.score]} ↗</small></button>`).join('')}</div><div class="summary-actions"><button class="outline" id="back-home">回到书房</button><button class="primary" id="again">再拾一组 →</button></div></div>`;
  ctx.$('#again').onclick=()=>{ctx.session=null;ctx.render();};ctx.$('#back-home').onclick=()=>{ctx.session=null;ctx.navigate('today');};
  ctx.$('#view').querySelectorAll('[data-summary-entry]').forEach(b=>b.onclick=()=>ctx.openReader(ctx.data.entries.find(e=>e.id===b.dataset.summaryEntry)));
}
export function renderHistory(ctx){
  const s=stats(ctx.data.entries);
  const history=ctx.data.entries.flatMap(e=>e.reviews.map(r=>({...r,entry:e}))).sort((a,b)=>Date.parse(b.at)-Date.parse(a.at));
  const days=Array.from({length:28},(_,i)=>{const d=new Date();d.setDate(d.getDate()-27+i);const key=dayKey(d);return {key,count:history.filter(r=>dayKey(r.at)===key).length};});
  ctx.$('#view').innerHTML=`<section class="page-heading"><div><div class="eyebrow">TRACES OF THOUGHT</div><h1>走过的路，都算数<span class="heading-dot">.</span></h1><p>回望每一次主动回忆，看看知识如何慢慢生根。</p></div></section><div class="history-overview"><div><strong>${history.length}</strong><span>累计回想</span></div><div><strong>${s.mastered}</strong><span>最近自评已掌握</span></div><div><strong>${s.streak}</strong><span>连续温习天数</span></div><div><strong>${s.due}</strong><span>等待重逢</span></div></div><section class="activity-section"><div class="section-heading"><h2>近四周的微光</h2><span class="muted">${days[0].key} — ${days.at(-1).key}</span></div><div class="activity-grid">${days.map(d=>`<div class="activity-day level-${Math.min(d.count,3)}" title="${d.key} · ${d.count} 次回想"><span>${d.key.slice(8)}</span><small>${d.count||'·'}</small></div>`).join('')}</div></section><div class="section-heading"><h2>回忆札记 <small>RECALL JOURNAL</small></h2><span class="muted">最近 100 条</span></div><div class="history-list">${history.slice(0,100).map(r=>`<button class="history-row" data-history-entry="${h(r.entry.id)}"><time>${new Date(r.at).toLocaleDateString('zh-CN')}<small>${new Date(r.at).toLocaleTimeString('zh-CN',{hour:'2-digit',minute:'2-digit'})}</small></time><span>${h(r.entry.hook.replace(/\n/g,''))}</span><small class="score score-${r.score}">${['未想起','有印象','已掌握'][r.score]}</small><span>↗</span></button>`).join('')||'<div class="empty-state"><span>◷</span><h3>第一束微光，等你点亮。</h3><p>完成一次灵感碰撞，这里便会留下你的回忆足迹。</p><button class="primary" id="history-start">开始回想 →</button></div>'}</div>`;
  ctx.$('#history-start')?.addEventListener('click',()=>ctx.navigate('practice'));
  ctx.$('#view').querySelectorAll('[data-history-entry]').forEach(b=>b.onclick=()=>ctx.openReader(ctx.data.entries.find(e=>e.id===b.dataset.historyEntry)));
}
