import { readFile, readdir, stat, writeFile } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseMidi, TRACK_NAMES } from './groove-import-lib.mjs';

const root = new URL('../grooves/Groove MIDI Dataset/', import.meta.url);
const out = new URL('../musicology/human-feel-profiles.json', import.meta.url);
const dirs = await readdir(root, { withFileTypes: true });
const files=[];
async function walk(dir){
  for(const ent of await readdir(dir,{withFileTypes:true})){
    const p=join(dir,ent.name); if(ent.isDirectory()) await walk(p); else if(ent.name.toLowerCase().endsWith('.mid')) files.push(p);
  }
}
const rootPath=fileURLToPath(root);
await walk(rootPath);
const stats = new Map();
const push=(obj,key,v)=>{ (obj[key]??=[]).push(v); };
function median(a){ if(!a.length)return 0; const b=[...a].sort((x,y)=>x-y),m=Math.floor(b.length/2); return b.length%2?b[m]:(b[m-1]+b[m])/2; }
function summarize(a){ if(!a.length)return {n:0,mean:0,median:0,std:0}; const mean=a.reduce((x,y)=>x+y,0)/a.length; const variance=a.reduce((x,y)=>x+(y-mean)**2,0)/a.length; return {n:a.length,mean:+mean.toFixed(2),median:+median(a).toFixed(2),std:+Math.sqrt(variance).toFixed(2)}; }
for(const path of files){
  const rel=relative(rootPath,path), genre=rel.split('/')[0]||'Unknown';
  const parsed=parseMidi(await readFile(path)); if(!parsed.notes.length) continue;
  if(!stats.has(genre)) stats.set(genre,{files:0,bpms:[],tracks:{}}); const g=stats.get(genre); g.files++; g.bpms.push(parsed.bpm);
  const grid=parsed.ppq/4;
  for(const n of parsed.notes){
    const t=TRACK_NAMES[n.track]||`Track ${n.track}`; g.tracks[t]??={velocity:[],offsetMs:[]};
    push(g.tracks[t],'velocity',n.velocity);
    const nearest=Math.round(n.tick/grid)*grid, offsetTicks=n.tick-nearest, ms=offsetTicks/parsed.ppq*(60000/parsed.bpm);
    // Ignore notes clearly intended as triplet/non-16th subdivisions when estimating pocket.
    if(Math.abs(offsetTicks)<=grid*.34) push(g.tracks[t],'offsetMs',ms);
  }
}
const genres={};
for(const [name,g] of [...stats].sort()){
  const tracks={}; for(const [track,v] of Object.entries(g.tracks)) tracks[track]={velocity:summarize(v.velocity),microTimingMs:summarize(v.offsetMs)};
  genres[name]={files:g.files,bpm:summarize(g.bpms),tracks};
}
const aliases={
  funk:['Funk','Soul','Gospel','New Orleans'], hiphop:['Hip Hop'], jazz:['Jazz'], reggae:['Reggae'],
  afrobeat:['Afrobeat','High Life'], latin:['Latin','Afro-Cuban'], rock:['Rock','Pop','Punk'], generic:[]
};
function aggregate(names){
  const chosen=Object.entries(genres).filter(([name])=>names.some(x=>name.toLowerCase().includes(x.toLowerCase()))); const tracks={}; let files=0;
  for(const [,g] of chosen){ files+=g.files; for(const [t,v] of Object.entries(g.tracks)){ tracks[t]??={velocity:[],offset:[],vn:0,on:0}; tracks[t].velocity.push([v.velocity.mean,v.velocity.n]); tracks[t].offset.push([v.microTimingMs.mean,v.microTimingMs.n]); tracks[t].vn+=v.velocity.n; tracks[t].on+=v.microTimingMs.n; } }
  const result={files,tracks:{}}; for(const [t,v] of Object.entries(tracks)){ const w=(pairs)=>{const n=pairs.reduce((s,x)=>s+x[1],0);return n?pairs.reduce((s,x)=>s+x[0]*x[1],0)/n:0}; result.tracks[t]={velocityMean:+w(v.velocity).toFixed(2),microTimingMeanMs:+w(v.offset).toFixed(2),velocityN:v.vn,timingN:v.on}; }
  return result;
}
const feelProfiles={}; for(const [key,names] of Object.entries(aliases)) feelProfiles[key]=aggregate(names);
await writeFile(out,JSON.stringify({schema:'battrochtek.human-feel-profiles/v1',source:'Groove MIDI Dataset (local corpus)',generatedAt:new Date().toISOString(),fileCount:files.length,genres,feelProfiles},null,2));
console.log(`✓ Human feel analysis: ${files.length} MIDI files -> musicology/human-feel-profiles.json`);
await writeFile(new URL('../grooves/human-feel-profiles.js',import.meta.url),`window.BATTROCHTEK_HUMAN_FEEL_PROFILES = ${JSON.stringify(feelProfiles)};\n`);
