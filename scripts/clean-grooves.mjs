import { readFile, writeFile } from "node:fs/promises";
import { importGrooveRoot, writeGrooveBundle, slug } from "./groove-import-lib.mjs";

function readArg(name,fallback) {
  const args=process.argv.slice(2);
  const direct=args.find(arg=>arg.startsWith(`--${name}=`));
  if (direct) return direct.split("=").slice(1).join("=");
  const index=args.indexOf(`--${name}`);
  return index>=0 ? args[index+1] : fallback;
}
let configDifference=10;
try {
  const config=JSON.parse(await readFile(new URL("../.groovesrc.json",import.meta.url),"utf8"));
  if (Number.isFinite(Number(config.minimumDifference))) configDifference=Number(config.minimumDifference);
} catch { /* optional config */ }
const minimumDifference=Math.max(0,Math.min(100,Number(readArg("difference",configDifference))||configDifference));

function activeSet(pattern) { return new Set(Array.isArray(pattern?.[0]) ? pattern[0] : []); }
function velocityMap(pattern) {
  const map=new Map();
  for (const cell of pattern?.[9]||[]) map.set(cell,"ghost");
  for (const cell of pattern?.[7]||[]) map.set(cell,"soft");
  for (const cell of pattern?.[8]||[]) map.set(cell,"strong");
  for (const cell of pattern?.[6]||[]) map.set(cell,"accent");
  for (const cell of pattern?.[0]||[]) if (!map.has(cell)) map.set(cell,"normal");
  return map;
}
function memorySimilarity(a,b) {
  if (!a||!b||String(a.signature)!==String(b.signature)) return 0;
  const A=activeSet(a.pattern), B=activeSet(b.pattern);
  if (!A.size&&!B.size) return 1;
  let intersection=0;
  for (const cell of A) if (B.has(cell)) intersection++;
  const dice=(2*intersection)/(A.size+B.size||1);
  if (!intersection) return 0;
  const va=velocityMap(a.pattern), vb=velocityMap(b.pattern);
  let velocityMatches=0;
  for (const cell of A) if (B.has(cell)&&va.get(cell)===vb.get(cell)) velocityMatches++;
  const velocity=velocityMatches/intersection;
  return dice*0.88+velocity*0.12;
}
function memories(groove) {
  const list=Array.isArray(groove.memories)&&groove.memories.length ? groove.memories : [{signature:groove.signature||"4/4",pattern:groove.pattern}];
  return list.filter(memory=>Array.isArray(memory?.pattern));
}
function grooveSimilarity(a,b) {
  const A=memories(a),B=memories(b);
  if (!A.length||!B.length) return 0;
  const bestAverage=(left,right)=>left.reduce((sum,memory)=>sum+Math.max(0,...right.map(other=>memorySimilarity(memory,other))),0)/left.length;
  return (bestAverage(A,B)+bestAverage(B,A))/2;
}

const {grooves}=await importGrooveRoot("grooves");
const kept=[],removed=[];
for (const groove of grooves) {
  let closest=null,similarity=-1;
  for (const candidate of kept) {
    const value=grooveSimilarity(groove,candidate);
    if (value>similarity) { similarity=value; closest=candidate; }
  }
  const difference=(1-Math.max(0,similarity))*100;
  if (closest && difference<minimumDifference) {
    removed.push({
      source:groove.sourceLabel,name:groove.name,origin:groove.origin,
      matchedSource:closest.sourceLabel,matchedName:closest.name,matchedOrigin:closest.origin,
      similarity:Number((similarity*100).toFixed(1)),difference:Number(difference.toFixed(1))
    });
  } else kept.push(groove);
}
const counts=new Map();
for (const groove of kept) {
  const id=slug(groove.sourceLabel||groove.source);
  if (!counts.has(id)) counts.set(id,{id,label:groove.sourceLabel||groove.source,available:true,count:0});
  counts.get(id).count++;
}
const sourceInfo=[...counts.values()];
await writeGrooveBundle(new URL("../grooves/external-grooves.js",import.meta.url),kept,sourceInfo);
const report={minimumDifference,input:grooves.length,kept:kept.length,removed:removed.length,removedGrooves:removed};
await writeFile(new URL("../grooves/clean-report.json",import.meta.url),JSON.stringify(report,null,2)+"\n","utf8");
console.log(`✓ Nettoyage global: ${grooves.length} → ${kept.length} grooves (${removed.length} retirés)`);
console.log(`✓ Différence minimale: ${minimumDifference}%`);
if (removed.length) console.log(`✓ Rapport: grooves/clean-report.json`);
