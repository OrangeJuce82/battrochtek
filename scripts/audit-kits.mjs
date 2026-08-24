import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const app = fs.readFileSync(path.join(root,'app.js'),'utf8');
const manifest = JSON.parse(fs.readFileSync(path.join(root,'samples/manifest-v2.json'),'utf8'));
const sampleIndex = new Map(manifest.samples.map(s => [s.key,s]));

const m = app.match(/KITS:\s*Object\.freeze\((\[.*?\])\.map\(kit\s*=>\s*Object\.freeze/s);
if (!m) throw new Error('Impossible de lire CONFIG.KITS');
const kits = vm.runInNewContext(`(${m[1]})`);

const errors=[]; const rows=[];
for (const kit of kits) {
  if (!Array.isArray(kit.tracks) || kit.tracks.length !== 11) errors.push(`${kit.name}: tracks=${kit.tracks?.length}`);
  kit.tracks.forEach((key, i) => {
    const meta=sampleIndex.get(key);
    const row={kit:kit.name,category:kit.category,track:i,key,manifest:!!meta,file:false,size:0};
    if(!meta){errors.push(`${kit.name} track ${i}: clé absente du manifeste: ${key}`); rows.push(row); return;}
    const f=path.join(root,meta.file);
    row.file=fs.existsSync(f);
    if(row.file) row.size=fs.statSync(f).size;
    else errors.push(`${kit.name} track ${i}: fichier absent: ${meta.file}`);
    if(row.file && row.size<44) errors.push(`${kit.name} track ${i}: WAV trop petit: ${meta.file}`);
    rows.push(row);
  });
}

// Every manifest file must exist too, because the resolver may select hidden RR/velocity layers.
for (const s of manifest.samples) {
  const f=path.join(root,s.file);
  if(!fs.existsSync(f)) errors.push(`Manifest ${s.key}: fichier absent ${s.file}`);
}

const out={generatedAt:new Date().toISOString(),kitCount:kits.length,manifestSamples:manifest.samples.length,trackRefs:rows.length,errors,rows};
fs.writeFileSync(path.join(root,'samples/kit-audit-v33.json'),JSON.stringify(out,null,2));
if(errors.length){console.error(errors.join('\n')); process.exit(1);}
console.log(`Kit audit OK: ${kits.length} kits, ${rows.length} références de pistes, ${manifest.samples.length} samples manifeste, aucun fichier manquant.`);
