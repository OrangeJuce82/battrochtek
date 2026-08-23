import { readdir, readFile, writeFile } from 'node:fs/promises';

const dir=new URL('../musicology/canonical-grooves/',import.meta.url);
const outJson=new URL('../musicology/completeness-report.json',import.meta.url);
const outCsv=new URL('../musicology/completeness-report.csv',import.meta.url);
const files=(await readdir(dir)).filter(x=>x.endsWith('.json')).sort();
const rows=[];
const has=(g,instrument,arts=[])=>g.events.some(e=>e.instrument===instrument&&(!arts.length||arts.includes(e.articulation)));
const countRole=(g,role)=>g.events.filter(e=>e.role===role).length;
for(const file of files){
  const g=JSON.parse(await readFile(new URL(file,dir),'utf8'));
  const family=g.family||'', name=g.name||'';
  const time=has(g,'hihat')||has(g,'cymbal',['ride-bow','ride-bell']);
  const kick=has(g,'kick'); const snare=has(g,'snare');
  const issues=[];
  const grooveFamily=/Rock|Pop|Funk|Soul|R&B|Hip-Hop|Electronic|Country|Blues/i.test(family);
  if(grooveFamily&&!time)issues.push('missing-time-voice');
  if(grooveFamily&&!kick)issues.push('missing-kick-role');
  if(grooveFamily&&!snare)issues.push('missing-snare-backbeat-role');
  if(family==='Jazz'&&!time)issues.push('missing-jazz-time-voice');
  if(family==='Jazz'&&!snare&&!/solo|brush sweep/i.test(name))issues.push('missing-jazz-comping-voice');
  if((g.events||[]).length<6)issues.push('too-few-events');
  if(countRole(g,'time')===0&&time)issues.push('time-not-labelled');
  rows.push({id:g.id,name,family,events:g.events.length,time,kick,snare,status:issues.length?'REVIEW':'PASS',issues:issues.join('|')});
}
await writeFile(outJson,JSON.stringify({generatedAt:new Date().toISOString(),total:rows.length,pass:rows.filter(x=>x.status==='PASS').length,review:rows.filter(x=>x.status==='REVIEW').length,rows},null,2));
const q=v=>`"${String(v??'').replaceAll('"','""')}"`;
await writeFile(outCsv,['id,name,family,events,time,kick,snare,status,issues',...rows.map(r=>[r.id,r.name,r.family,r.events,r.time,r.kick,r.snare,r.status,r.issues].map(q).join(','))].join('\n')+'\n');
console.log(`Completeness: ${rows.filter(x=>x.status==='PASS').length}/${rows.length} PASS; ${rows.filter(x=>x.status==='REVIEW').length} REVIEW`);
