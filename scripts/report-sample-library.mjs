import { readFile, writeFile } from "node:fs/promises";
const m=JSON.parse(await readFile("samples/manifest-v2.json","utf8"));
const countBy=fn=>Object.entries(m.samples.reduce((a,s)=>{const k=fn(s)||"<none>";a[k]=(a[k]||0)+1;return a;},{})).sort((a,b)=>b[1]-a[1]);
const banks={};
for(const s of m.samples){
  const b=banks[s.bank] ||= {count:0,instruments:new Set(),articulations:new Set(),licenses:new Set()};
  b.count++; b.instruments.add(s.instrument); b.articulations.add(`${s.instrument}:${s.articulation}`); b.licenses.add(s.license||"unspecified");
}
const report={generatedAt:new Date().toISOString(),totalSamples:m.samples.length,totalKits:(m.kits||[]).length,byInstrument:Object.fromEntries(countBy(s=>s.instrument)),byLicense:Object.fromEntries(countBy(s=>s.license||"unspecified")),banks:Object.fromEntries(Object.entries(banks).sort().map(([k,v])=>[k,{count:v.count,instruments:[...v.instruments].sort(),articulations:[...v.articulations].sort(),licenses:[...v.licenses].sort()}]))};
await writeFile("samples/library-report.json",JSON.stringify(report,null,2)+"\n");
console.log(`Samples: ${report.totalSamples} | kits: ${report.totalKits} | banks: ${Object.keys(report.banks).length}`);
for(const [bank,v] of Object.entries(report.banks)) console.log(`${bank.padEnd(20)} ${String(v.count).padStart(3)}  ${v.licenses.join(", ")}`);
