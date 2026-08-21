import { writeFile, readdir, stat, mkdir, readFile } from "node:fs/promises";
import { basename, dirname, extname, join, relative, resolve } from "node:path";

// Magenta Groove MIDI Dataset "Paper Mapping" projected onto Battrochtek's grid.
// crash, ride, HH open, HH closed, snare, high tom, low-mid tom, floor tom, kick
export const GMD_NOTE_TRACK = new Map([
  [49,0],[55,0],[57,0],[52,0],
  [51,1],[59,1],[53,1],
  [46,2],[26,2],
  [42,3],[22,3],[44,3],
  [38,4],[40,4],[37,4],
  [48,5],[50,5],
  [45,6],[47,6],
  [43,7],[58,7],
  [36,8]
]);

export const TRACK_NAMES = Object.freeze([
  "Crash", "Ride", "HH Open", "HH Closed", "Snare",
  "High Tom", "Low-Mid Tom", "Floor Tom", "Kick"
]);

function readVar(data, state) {
  let value=0;
  for (let i=0;i<4;i++) {
    const byte=data[state.i++];
    value=(value<<7)|(byte&0x7f);
    if (!(byte&0x80)) return value;
  }
  return value;
}
function u16(data,i){ return (data[i]<<8)|data[i+1]; }
function u32(data,i){ return ((data[i]<<24)>>>0)+(data[i+1]<<16)+(data[i+2]<<8)+data[i+3]; }

export function parseMidi(bytes) {
  const data=bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  if (String.fromCharCode(...data.slice(0,4))!=="MThd") throw new Error("MIDI header missing");
  const headerLen=u32(data,4), division=u16(data,12);
  if (division&0x8000) throw new Error("SMPTE MIDI is not supported");
  const ppq=division;
  let pos=8+headerLen;
  const notes=[];
  let tempo=500000;
  let signature=[4,4];
  while (pos+8<=data.length) {
    const type=String.fromCharCode(...data.slice(pos,pos+4));
    const len=u32(data,pos+4); pos+=8;
    const end=Math.min(data.length,pos+len);
    if (type!=="MTrk") { pos=end; continue; }
    const st={i:pos}; let tick=0,running=0;
    while (st.i<end) {
      tick+=readVar(data,st);
      let status=data[st.i++];
      if (status<0x80) { st.i--; status=running; } else if (status<0xf0) running=status;
      if (status===0xff) {
        const meta=data[st.i++],size=readVar(data,st);
        if (meta===0x51&&size===3&&tempo===500000) tempo=(data[st.i]<<16)|(data[st.i+1]<<8)|data[st.i+2];
        if (meta===0x58&&size>=2&&signature[0]===4&&signature[1]===4) signature=[data[st.i],2**data[st.i+1]];
        st.i+=size; continue;
      }
      if (status===0xf0||status===0xf7) { st.i+=readVar(data,st); continue; }
      const kind=status&0xf0;
      const channel=status&0x0f;
      if (kind===0xc0||kind===0xd0) { st.i+=1; continue; }
      const pitch=data[st.i++], velocity=data[st.i++];
      // General MIDI percussion channel is 10 (zero-based channel 9). This also
      // keeps multi-instrument MIDI datasets from turning bass/piano notes into drums.
      if (kind===0x90&&channel===9&&velocity>0&&GMD_NOTE_TRACK.has(pitch)) {
        notes.push({tick,pitch,velocity,track:GMD_NOTE_TRACK.get(pitch)});
      }
    }
    pos=end;
  }
  return {ppq,notes,bpm:Math.round(60000000/tempo),signature};
}

function supportedSignature([n,d]) {
  return [4,8,16].includes(d)&&n>=2&&n<=12&&Number.isInteger(n*16/d);
}
function uniqueSorted(values){ return [...new Set(values)].sort((a,b)=>a-b); }
function clamp(value,min,max,fallback=min){ const n=Number(value); return Number.isFinite(n)?Math.min(max,Math.max(min,n)):fallback; }

function patternForWindow(parsed,start,signature,meta={}) {
  const [n,d]=signature;
  const barSteps=n*16/d,steps=barSteps*2;
  const stepTicks=parsed.ppq/4;
  const barTicks=parsed.ppq*n*4/d;
  const windowTicks=barTicks*2;
  const active=[],ghost=[],soft=[],strong=[],accent=[];
  for (const note of parsed.notes) {
    if (note.tick<start||note.tick>=start+windowTicks) continue;
    const step=Math.max(0,Math.min(steps-1,Math.round((note.tick-start)/stepTicks)));
    const cell=note.track*steps+step;
    active.push(cell);
    if (note.velocity<=45) ghost.push(cell);
    else if (note.velocity<=72) soft.push(cell);
    else if (note.velocity>=116) accent.push(cell);
    else if (note.velocity>=98) strong.push(cell);
  }
  const on=uniqueSorted(active);
  if (!on.length) return null;
  const keep=values=>uniqueSorted(values).filter(v=>on.includes(v));
  const bpm=Math.round(clamp(meta.bpm||parsed.bpm,40,240,120));
  const kit=Math.round(clamp(meta.kit,0,9,0));
  const swing=Math.round(clamp(meta.swing,0,100,0));
  return [on,kit,Array(9).fill(1),bpm,1,swing,keep(accent),keep(soft),keep(strong),keep(ghost)];
}

export function midiToMemoryBank(bytes,meta={}) {
  const parsed=parseMidi(bytes);
  const signature=meta.signature||parsed.signature;
  if (!supportedSignature(signature)||!parsed.notes.length) return null;
  const [n,d]=signature;
  const barTicks=parsed.ppq*n*4/d;
  const windowTicks=barTicks*2;
  const maxTick=Math.max(...parsed.notes.map(note=>note.tick));
  const firstTick=Math.min(...parsed.notes.map(note=>note.tick));
  const firstWindow=Math.max(0,Math.floor(firstTick/windowTicks)*windowTicks);
  const memories=[];
  for (let start=firstWindow; start<=maxTick&&memories.length<8; start+=windowTicks) {
    const pattern=patternForWindow(parsed,start,signature,meta);
    if (!pattern) continue;
    memories.push({signature:`${n}/${d}`,pattern});
  }
  if (!memories.length) return null;
  return {
    source:meta.source||"external",
    sourceLabel:meta.sourceLabel||meta.source||"External",
    family:meta.family||"MIDI",
    name:meta.name||"Imported groove",
    bpm:memories[0].pattern[3],
    signature:`${n}/${d}`,
    signatureArray:[n,d],
    memories,
    pattern:memories[0].pattern,
    attribution:meta.attribution||"",
    origin:meta.origin||""
  };
}

const IGNORED_GROOVE_FILES = new Set(["clean-report.json", "external-grooves.js"]);

const SUPPORTED_EXTENSIONS=new Set([".mid",".midi",".json"]);
export async function walkGrooveFiles(dir) {
  const out=[];
  async function walk(path) {
    for (const name of await readdir(path)) {
      const full=join(path,name), s=await stat(full);
      if (s.isDirectory()) await walk(full);
      else if (SUPPORTED_EXTENSIONS.has(extname(name).toLowerCase()) && !IGNORED_GROOVE_FILES.has(name)) out.push(full);
    }
  }
  await walk(dir);
  return out.sort((a,b)=>a.localeCompare(b,undefined,{numeric:true,sensitivity:"base"}));
}
export async function walkMidi(dir) {
  return (await walkGrooveFiles(dir)).filter(file=>[".mid",".midi"].includes(extname(file).toLowerCase()));
}

export async function sourceDirectories(input) {
  const root=resolve(input);
  const dirs=[];
  for (const name of await readdir(root)) {
    const full=join(root,name);
    if (!(await stat(full)).isDirectory()) continue;
    const files=await walkGrooveFiles(full);
    if (files.length) dirs.push({path:full,label:name});
  }
  return dirs.sort((a,b)=>a.label.localeCompare(b.label,undefined,{numeric:true,sensitivity:"base"}));
}

function normalizeJsonGroove(groove, context) {
  if (!groove || typeof groove!=="object") return null;
  const memories=Array.isArray(groove.memories) ? groove.memories.filter(m=>Array.isArray(m?.pattern)).slice(0,8) : [];
  const pattern=memories[0]?.pattern || groove.pattern;
  if (!Array.isArray(pattern)) return null;
  const signature=String(groove.signature || memories[0]?.signature || "4/4");
  return {
    ...groove,
    source:slug(context.sourceLabel), sourceLabel:context.sourceLabel,
    family:groove.family || context.family || "Grooves",
    name:groove.name || context.name,
    signature,
    bpm:Number(groove.bpm || pattern[3]) || 120,
    pattern,
    memories:memories.length ? memories : [{signature,pattern}],
    origin:groove.origin || context.origin
  };
}

async function importJsonFile(file,sourceDir,label) {
  const rel=relative(sourceDir,file), parent=dirname(rel);
  const family=parent==="." ? "Grooves" : parent.replaceAll("\\"," / ").replaceAll("/"," / ");
  const parsed=JSON.parse(await readFile(file,"utf8"));
  const rows=Array.isArray(parsed) ? parsed : Array.isArray(parsed?.grooves) ? parsed.grooves : [parsed];
  return rows.map((groove,index)=>normalizeJsonGroove(groove,{
    sourceLabel:label,family,name:rows.length>1 ? `${niceMidiName(file)} ${index+1}` : niceMidiName(file),origin:rel
  })).filter(Boolean);
}

export async function importSourceFolder(sourceDir,label=basename(sourceDir)) {
  const files=await walkGrooveFiles(sourceDir),grooves=[];
  for (const file of files) {
    const rel=relative(sourceDir,file);
    const parent=dirname(rel);
    const family=parent==="." ? "MIDI" : parent.replaceAll("\\"," / ").replaceAll("/"," / ");
    try {
      if (extname(file).toLowerCase()===".json") {
        grooves.push(...await importJsonFile(file,sourceDir,label));
        continue;
      }
      const bytes=await readFile(file);
      const groove=midiToMemoryBank(bytes,{
        source:slug(label),sourceLabel:label,family,
        name:niceMidiName(file),origin:rel
      });
      if (groove) grooves.push(groove);
    } catch (error) {
      console.warn(`⚠ ${label}/${rel}: ${error.message}`);
    }
  }
  return grooves;
}

export async function importGrooveRoot(input="grooves") {
  const root=resolve(input), sources=await sourceDirectories(root);
  const allGrooves=[],sourceInfo=[];
  for (const source of sources) {
    const grooves=await importSourceFolder(source.path,source.label);
    allGrooves.push(...grooves);
    sourceInfo.push({id:slug(source.label),label:source.label,available:grooves.length>0,count:grooves.length});
  }
  return {grooves:allGrooves,sourceInfo};
}

export async function writeGrooveBundle(file,grooves,sourceInfo) {
  await mkdir(new URL("../grooves/",import.meta.url),{recursive:true});
  const header="/* Generated by Battrochtek groove tools. Do not edit by hand. */\n";
  const body=`window.BATTROCHTEK_EXTERNAL_GROOVES = ${JSON.stringify(grooves)};\nwindow.BATTROCHTEK_GROOVE_SOURCE_INFO = ${JSON.stringify(sourceInfo)};\n`;
  await writeFile(file,header+body,"utf8");
}

export function slug(value) {
  return String(value).normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"")||"source";
}
export function niceMidiName(path) {
  return basename(path).replace(/\.(mid|midi|json)$/i,"").replace(/[_-]+/g," ").replace(/\s+/g," ").trim();
}
