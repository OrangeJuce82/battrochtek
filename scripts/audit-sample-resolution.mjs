import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const app = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'samples/manifest-v2.json'), 'utf8'));
const samples = manifest.samples;
const index = new Map(samples.map(s => [s.key, s]));
const m = app.match(/KITS:\s*Object\.freeze\((\[.*?\])\.map\(kit\s*=>\s*Object\.freeze/s);
if (!m) throw new Error('Impossible de lire CONFIG.KITS');
const kits = vm.runInNewContext(`(${m[1]})`);
const velocities = { ghost:24, soft:46, normal:76, strong:102, accent:122 };

const stem = sample => sample.key.replace(/_vl\d+_rr\d+$/u,'').replace(/_rr\d+$/u,'');
const group = sample => {
  const bank = sample.bank || 'general';
  const s = stem(sample);
  if (bank === 'jazz-club' || bank === 'vintage-rock') {
    if (sample.instrument === 'hihat') return `${bank}|hihat`;
    if (sample.instrument === 'ride') return `${bank}|ride`;
    if (sample.instrument === 'snare') return `${bank}|snare`;
    return `${bank}|${s}`;
  }
  if (sample.roundRobinGroup) return `${bank}|${String(sample.roundRobinGroup).replace(/_vl\d+$/u,'')}`;
  return `${bank}|${sample.key}`;
};
const groups = new Map();
for (const s of samples) {
  const g = group(s);
  if (!groups.has(g)) groups.set(g, []);
  groups.get(g).push(s);
}
const distance = (s,midi) => midi < s.velocity.min ? s.velocity.min-midi : midi > s.velocity.max ? midi-s.velocity.max : 0;
const errors=[]; const rows=[];
for (const kit of kits) {
  for (const [track,key] of kit.tracks.entries()) {
    const base=index.get(key);
    if (!base) { errors.push(`${kit.name}/${track}: base absente ${key}`); continue; }
    if (base.instrument === 'metronome') continue;
    const candidates=groups.get(group(base)) || [base];
    for (const [velocity,midi] of Object.entries(velocities)) {
      let ap=candidates.filter(c=>c.articulation===base.articulation);
      if (!ap.length) ap=candidates;
      let pool=ap.filter(c=>c.velocity.min<=midi && c.velocity.max>=midi);
      if(!pool.length){ const d=Math.min(...ap.map(c=>distance(c,midi))); pool=ap.filter(c=>distance(c,midi)===d); }
      for (const c of pool) {
        const file=path.join(root,c.file);
        if(!fs.existsSync(file)) errors.push(`${kit.name}/${key}/${velocity}: resolver -> fichier absent ${c.key}`);
        // A tom voice must never change pitch role because of velocity/RR.
        if(base.instrument==='tom' && stem(c)!==stem(base)) errors.push(`${kit.name}/${key}/${velocity}: TOM CROSSED ${stem(base)} -> ${stem(c)}`);
        // Generic/world percussion must stay the exact selected voice.
        if(base.instrument==='percussion' && stem(c)!==stem(base)) errors.push(`${kit.name}/${key}/${velocity}: PERC CROSSED ${stem(base)} -> ${stem(c)}`);
      }
      rows.push({kit:kit.name,track,key,velocity,group:group(base),candidates:pool.map(c=>c.key)});
    }
  }
}
for(const s of samples){
  if(s.sourceCollection==='legacy-import' && (s.roundRobinGroup || s.roundRobinIndex)) errors.push(`Legacy RR implicite interdit: ${s.key}`);
}
const report={generatedAt:new Date().toISOString(),kits:kits.length,samples:samples.length,checks:rows.length,errors,rows};
fs.writeFileSync(path.join(root,'samples/resolution-audit-v33.json'),JSON.stringify(report,null,2));
if(errors.length){ console.error(errors.join('\n')); process.exit(1); }
console.log(`Resolver audit OK: ${rows.length} scénarios, aucun changement de voix/pitch par vélocité, aucun RR legacy implicite.`);
