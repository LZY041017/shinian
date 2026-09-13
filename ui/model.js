export const dayKey=(d=new Date())=>{const t=new Date(d);return `${t.getFullYear()}-${String(t.getMonth()+1).padStart(2,'0')}-${String(t.getDate()).padStart(2,'0')}`};
export const escapeHTML=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function shuffle(items,random=Math.random){const result=[...items];for(let i=result.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[result[i],result[j]]=[result[j],result[i]];}return result;}
export function due(entry,now=new Date()){
  const last=entry.reviews.at(-1);if(!last)return true;
  const days=[1,3,7][last.score];
  const next=new Date(last.at);next.setDate(next.getDate()+days);
  return dayKey(next)<=dayKey(now);
}
export function filterEntries(entries,{query='',tag='',from='',to='',starred=false,sort='newest'}={}){
  const q=query.toLocaleLowerCase().trim();
  return entries.filter(e=>(!q||`${e.hook} ${e.text} ${e.tags.join(' ')}`.toLocaleLowerCase().includes(q))&&(!tag||e.tags.includes(tag))&&(!starred||e.starred)&&(!from||dayKey(e.createdAt)>=from)&&(!to||dayKey(e.createdAt)<=to)).sort((a,b)=>sort==='oldest'?Date.parse(a.createdAt)-Date.parse(b.createdAt):sort==='updated'?Date.parse(b.updatedAt)-Date.parse(a.updatedAt):Date.parse(b.createdAt)-Date.parse(a.createdAt));
}
export function dailyEntry(entries,date=dayKey()){
  if(!entries.length)return null;
  let hash=0;for(const c of date)hash=(Math.imul(hash,31)+c.charCodeAt(0))>>>0;
  return [...entries].sort((a,b)=>a.id.localeCompare(b.id))[hash%entries.length];
}
export function stats(entries){
  const reviews=entries.flatMap(e=>e.reviews);
  const today=dayKey();
  const activeDays=new Set(reviews.map(r=>dayKey(r.at)));
  let streak=0;const d=new Date();if(!activeDays.has(today))d.setDate(d.getDate()-1);
  while(activeDays.has(dayKey(d))){streak++;d.setDate(d.getDate()-1);}
  return {total:entries.length,due:entries.filter(e=>due(e)).length,today:reviews.filter(r=>dayKey(r.at)===today).length,mastered:entries.filter(e=>e.reviews.at(-1)?.score===2).length,streak};
}
export function makeSeed(){
  const ago=(n)=>{const d=new Date();d.setDate(d.getDate()-n);return d.toISOString()};
  const curve=`<svg xmlns="http://www.w3.org/2000/svg" width="960" height="420" viewBox="0 0 960 420"><rect width="960" height="420" fill="#f5f3ec"/><g stroke="#dddcd2" stroke-width="1"><path d="M80 80H880M80 160H880M80 240H880M80 320H880M240 50V350M400 50V350M560 50V350M720 50V350"/></g><path d="M80 350H895M100 370V45" stroke="#7a8170" stroke-width="2"/><path d="M110 330C240 328 270 300 360 240S510 80 620 72S810 190 870 180" fill="none" stroke="#56715c" stroke-width="4"/><path d="M370 274L625 26" stroke="#b2935c" stroke-width="2" stroke-dasharray="7 7"/><circle cx="490" cy="157" r="7" fill="#56715c"/><text x="540" y="235" font-size="27" font-family="Georgia" fill="#59634e">f(x + Δx) ≈ f(x) + f′(x) Δx</text><text x="120" y="47" font-size="20" font-family="Georgia" fill="#7a8170">f(x)</text><text x="890" y="382" font-size="20" fill="#7a8170">x</text></svg>`;
  const rows=[
    ['把复杂留给整体，\n把简单留给局部。','微分的本质，是局部线性化。\n\n当 Δx 足够小时，\nf(x + Δx) ≈ f(x) + f′(x) · Δx。\n\n导数告诉我们：在这一点附近，函数如何变化。切线不是曲线，却能在足够小的邻域内成为它的近似。\n\n回忆练习\n1. 写出可微的定义。\n2. 为什么可微一定连续，而连续未必可微？\n3. 用局部线性化估算 √(4.04)。',['数学'],true],
    ['平衡不是静止，\n而是相反过程的相互抵消。','PN 结热平衡的关键：扩散电流与漂移电流相互抵消。\n\n多数载流子因浓度梯度而扩散；空间电荷区形成内建电场，驱动漂移运动。热平衡下，对电子与空穴分别有净电流为零。\n\n在非简并、完全电离近似下：\nV_bi = (kT/q) ln(N_A N_D / n_i²)\n\n回忆练习\n画出电场方向，解释耗尽层如何形成，并指出内建电势不等于可直接测得的外部端电压。',['专业课'],true],
    ['合上书以后，\n学习才真正开始。','主动回忆练习\n\n读完一小节，暂时合上材料，只凭记忆解释：\n• 核心结论是什么？\n• 为什么成立？用了哪些前提？\n• 我能给出一个具体例子吗？\n\n再打开材料，查漏补缺。把想不起来的连接写成一个短小的记忆引句。\n\n这里提供的是练习建议，复习间隔可随个人状态调整。',['方法论'],false],
    ['选择一组基，\n就是选择理解世界的坐标。','向量本身与描述它的坐标要区分。\n\n设一组基为 b₁, …, bₙ，则向量 v 可唯一表示为\nv = c₁b₁ + … + cₙbₙ。\n\n换基时坐标会改变，向量代表的几何对象不变。相似变换描述同一线性变换在不同基下的矩阵表示。\n\n回忆练习\n用二维向量亲手做一次换基，说明 P⁻¹AP 中 P 的每一列代表什么。',['数学'],false],
    ['先问边界在哪里，\n再问公式怎么用。','求解问题前，先写下三件事：\n\n01 研究对象：系统包含什么、排除了什么？\n02 前提条件：稳态还是瞬态？线性还是非线性？\n03 极限检验：变量趋于零或无穷大时，答案是否合理？\n\n最后检查量纲、符号、守恒与边界条件。',['方法论'],true],
    ['栅压改变表面，\n表面决定通道。','MOS 电容的三种典型状态（以 p 型衬底为例）：\n\n积累：负栅压吸引空穴到界面。\n耗尽：适当正栅压排斥空穴，形成耗尽区。\n反型：更大的正栅压使表面电子浓度升高，形成反型层。\n\n回忆练习\n画出各状态的电荷分布与能带弯曲方向。讨论氧化层电容、平带电压和阈值电压各自的物理含义。',['专业课'],false],
  ];
  return {version:1,tags:['数学','专业课','方法论'],entries:rows.map((r,i)=>({id:'seed-'+i,hook:r[0],text:r[1],tags:r[2],starred:r[3],images:[],createdAt:ago(i),updatedAt:ago(i),reviews:[]})),sampleCurve:curve};
}
