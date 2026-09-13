const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs/promises');
const os=require('node:os');
const path=require('node:path');
const {Store,validateStore,mergeStores}=require('../core.cjs');
const base=()=>({version:1,tags:['数学'],entries:[{id:'test',hook:'局部线性化',text:'原文',tags:['数学'],images:[],createdAt:'2026-09-12T12:00:00+08:00',updatedAt:'2026-09-12T12:00:00+08:00',reviews:[],starred:false}]});
test('data validation rejects malformed entries and executable images',()=>{
  assert.deepEqual(validateStore(base()),base());
  for(const mutate of [d=>d.version=2,d=>d.entries[0].hook='',d=>d.entries.push(d.entries[0]),d=>d.entries[0].createdAt='bad',d=>d.entries[0].tags=['unknown'],d=>d.entries[0].images=[{data:'data:image/svg+xml;base64,AAAA'}],d=>d.entries[0].reviews=[{score:8,at:'2026-09-12'}]]){const d=base();mutate(d);assert.throws(()=>validateStore(d));}
});
test('merge is idempotent for identical records and preserves both conflicting versions',()=>{
  assert.equal(mergeStores(base(),base()).entries.length,1);
  const changed=base();changed.entries[0].text='新版';changed.tags.push('方法论');
  const merged=mergeStores(base(),changed);assert.equal(merged.entries.length,2);assert.equal(merged.entries[0].text,'原文');assert.equal(merged.entries[1].text,'新版');assert.notEqual(merged.entries[1].id,'test');assert.ok(merged.tags.includes('方法论'));
});
test('atomic serialized writes survive reload and recover from backup corruption',async()=>{
  const dir=await fs.mkdtemp(path.join(os.tmpdir(),'shinian-test-'));
  const store=new Store(dir);assert.equal((await store.read()).data,null);
  await store.save(base());const changed=base();changed.entries[0].text='second';
  const final=base();final.entries[0].text='third';await Promise.all([store.save(changed),store.save(final)]);
  assert.equal((await store.read()).data.entries[0].text,'third');
  assert.equal(JSON.parse(await fs.readFile(store.file+'.bak','utf8')).entries[0].text,'second');
  await fs.writeFile(store.file,'broken');const recovered=await store.read();assert.equal(recovered.data.entries[0].text,'second');assert.ok(recovered.notice);assert.ok((await fs.readdir(dir)).some(f=>f.includes('.damaged-')));
  await fs.rm(dir,{recursive:true,force:true});
});
test('unrecoverable corruption does not overwrite existing materials',async()=>{
  const dir=await fs.mkdtemp(path.join(os.tmpdir(),'shinian-test-'));const store=new Store(dir);await fs.writeFile(store.file,'broken');await assert.rejects(()=>store.read());assert.equal(await fs.readFile(store.file,'utf8'),'broken');await fs.rm(dir,{recursive:true,force:true});
});
test('local date filtering, stable daily selection, shuffle and interval schedule',async()=>{
  const source=await fs.readFile(path.join(__dirname,'../ui/model.js'),'utf8');const m=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
  const d=m.makeSeed();assert.equal(d.entries.length,6);assert.equal(m.filterEntries(d.entries,{tag:'数学'}).length,2);assert.equal(m.filterEntries(d.entries,{query:'内建'}).length,1);assert.equal(m.filterEntries(d.entries,{starred:true}).length,3);assert.equal(m.filterEntries(d.entries,{from:'2099-01-01'}).length,0);
  assert.equal(m.dailyEntry(d.entries).id,m.dailyEntry([...d.entries].reverse()).id);assert.equal(m.dailyEntry([]),null);
  const shuffled=m.shuffle(d.entries,()=>0);assert.equal(new Set(shuffled.map(e=>e.id)).size,6);assert.notEqual(shuffled[0].id,d.entries[0].id);
  const entry=d.entries[0];entry.reviews=[{score:2,at:'2026-09-12T12:00:00'}];assert.equal(m.due(entry,new Date('2026-09-18T23:59:00')),false);assert.equal(m.due(entry,new Date('2026-09-19T00:01:00')),true);
  assert.equal(m.escapeHTML('<img onerror="test">'),'&lt;img onerror=&quot;test&quot;&gt;');
});
