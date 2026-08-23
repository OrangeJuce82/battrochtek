import { Buffer } from 'node:buffer';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

export const PPQ = 960;
export const TRACKS = Object.freeze([
  {track:0,instrument:'cymbal',articulation:'crash',gm:49,limb:'timeHand'},
  {track:1,instrument:'cymbal',articulation:'ride-bow',gm:51,limb:'timeHand'},
  {track:2,instrument:'hihat',articulation:'open',gm:46,limb:'timeHand'},
  {track:3,instrument:'hihat',articulation:'closed',gm:42,limb:'timeHand'},
  {track:4,instrument:'snare',articulation:'center',gm:38,limb:'otherHand'},
  {track:5,instrument:'tom',articulation:'high',gm:50,limb:'otherHand'},
  {track:6,instrument:'tom',articulation:'mid',gm:47,limb:'otherHand'},
  {track:7,instrument:'tom',articulation:'floor',gm:43,limb:'otherHand'},
  {track:8,instrument:'kick',articulation:'normal',gm:36,limb:'rightFoot'}
]);
export const TRACK_BY_KEY = new Map(TRACKS.map(x=>[`${x.instrument}:${x.articulation}`,x]));
export const TRACK_BY_INDEX = new Map(TRACKS.map(x=>[x.track,x]));
export const GM_BY_TRACK = new Map(TRACKS.map(x=>[x.track,x.gm]));
const EXTRA_ARTICULATIONS = new Map([
  ['snare:cross-stick',{track:4,gm:37,limb:'otherHand'}],
  ['cymbal:ride-bell',{track:1,gm:53,limb:'timeHand'}]
]);
function resolveEventDef(ev){ return TRACK_BY_KEY.get(`${ev.instrument}:${ev.articulation}`) || EXTRA_ARTICULATIONS.get(`${ev.instrument}:${ev.articulation}`) || (ev.instrument==='snare'?TRACK_BY_INDEX.get(4):ev.instrument==='kick'?TRACK_BY_INDEX.get(8):null); }

export function parseSignature(value='4/4'){
  const [n,d]=String(value).split('/').map(Number);
  return {numerator:Number.isFinite(n)?n:4,denominator:Number.isFinite(d)?d:4};
}
export function ticksPerBar(signature='4/4',ppq=PPQ){ const {numerator,denominator}=parseSignature(signature); return Math.round(ppq*numerator*4/denominator); }
export function barSteps(signature='4/4'){ const {numerator,denominator}=parseSignature(signature); return Math.round(numerator*16/denominator); }
export function velocityNameToMidi(name){ return ({ghost:32,soft:56,normal:82,strong:104,accent:120})[name]??82; }
export function velocityMidiToName(v){ return v<=45?'ghost':v<=72?'soft':v>=116?'accent':v>=98?'strong':'normal'; }

export function patternToCanonical({id,family,tradition,name,bpm=120,signature='4/4',pattern,metadata={}}){
  const stepsPerBar=barSteps(signature), totalSteps=stepsPerBar*2, stepTicks=PPQ/4;
  const active=new Set(pattern?.[0]||[]), accents=new Set(pattern?.[6]||[]), soft=new Set(pattern?.[7]||[]), strong=new Set(pattern?.[8]||[]), ghosts=new Set(pattern?.[9]||[]);
  const events=[];
  for(const cell of [...active].sort((a,b)=>a-b)){
    const track=Math.floor(cell/totalSteps), step=cell%totalSteps, def=TRACK_BY_INDEX.get(track); if(!def) continue;
    const velocityName=accents.has(cell)?'accent':strong.has(cell)?'strong':soft.has(cell)?'soft':ghosts.has(cell)?'ghost':'normal';
    const role=track===8?'core':track===4?(velocityName==='ghost'?'ghost':'core'):[1,2,3].includes(track)?'time':track===0?'resolution':'ornament';
    events.push({tick:Math.round(step*stepTicks),duration:Math.round(stepTicks*.45),instrument:def.instrument,articulation:def.articulation,velocity:velocityNameToMidi(velocityName),velocityClass:velocityName,limb:def.limb,role,microTimingMs:0,source:'canonical-source'});
  }
  return {schema:'battrochtek.canonical-groove/v1',id,family,tradition,name,bpm,signature,ppq:PPQ,phraseBars:2,feel:metadata.feel||'straight',swing:Number(pattern?.[5]||0),events,metadata};
}

export function canonicalToPattern(groove){
  const signature=groove.signature||'4/4', stepsPerBar=barSteps(signature), totalSteps=stepsPerBar*2, stepTicks=(groove.ppq||PPQ)/4;
  const active=[],accent=[],soft=[],strong=[],ghost=[];
  const add=(arr,v)=>{ if(!arr.includes(v)) arr.push(v); };
  for(const ev of groove.events||[]){
    const def=resolveEventDef(ev); if(!def) continue;
    const step=Math.max(0,Math.min(totalSteps-1,Math.round((Number(ev.tick)||0)/stepTicks)));
    const cell=def.track*totalSteps+step; add(active,cell);
    const v=ev.velocityClass||velocityMidiToName(Number(ev.velocity)||82);
    if(v==='accent')add(accent,cell); else if(v==='strong')add(strong,cell); else if(v==='soft')add(soft,cell); else if(v==='ghost')add(ghost,cell);
  }
  const sort=a=>a.sort((x,y)=>x-y);
  return [sort(active),0,Array(9).fill(1),Math.round(groove.bpm||120),1,Math.round(groove.swing||0),sort(accent),sort(soft),sort(strong),sort(ghost)];
}

function varLen(n){ const bytes=[n&0x7f]; while((n>>=7)) bytes.unshift((n&0x7f)|0x80); return Buffer.from(bytes); }
function u16(n){ return Buffer.from([(n>>8)&255,n&255]); }
function u32(n){ return Buffer.from([(n>>>24)&255,(n>>>16)&255,(n>>>8)&255,n&255]); }
function midiEvent(delta,bytes){ return Buffer.concat([varLen(delta),Buffer.from(bytes)]); }
export function canonicalToMidi(groove){
  const ppq=groove.ppq||PPQ; const sig=parseSignature(groove.signature); const us=Math.round(60000000/(groove.bpm||120));
  const ev=[];
  ev.push({tick:0,order:0,bytes:[0xff,0x51,0x03,(us>>16)&255,(us>>8)&255,us&255]});
  const dd=Math.log2(sig.denominator)|0; ev.push({tick:0,order:0,bytes:[0xff,0x58,0x04,sig.numerator,dd,24,8]});
  for(const note of groove.events||[]){ const def=resolveEventDef(note); if(!def)continue; const t=Math.max(0,Math.round(note.tick||0)); const dur=Math.max(1,Math.round(note.duration||ppq/8)); const vel=Math.max(1,Math.min(127,Math.round(note.velocity||82))); ev.push({tick:t,order:1,bytes:[0x99,def.gm,vel]}); ev.push({tick:t+dur,order:2,bytes:[0x89,def.gm,0]}); }
  ev.sort((a,b)=>a.tick-b.tick||a.order-b.order);
  const chunks=[]; let last=0; for(const e of ev){chunks.push(midiEvent(e.tick-last,e.bytes));last=e.tick;} chunks.push(midiEvent(0,[0xff,0x2f,0]));
  const track=Buffer.concat(chunks); return Buffer.concat([Buffer.from('MThd'),u32(6),u16(0),u16(1),u16(ppq),Buffer.from('MTrk'),u32(track.length),track]);
}
export async function writeCanonicalAndMidi(groove,jsonPath,midiPath){ const jp=jsonPath instanceof URL?fileURLToPath(jsonPath):jsonPath; const mp=midiPath instanceof URL?fileURLToPath(midiPath):midiPath; await mkdir(dirname(jp),{recursive:true}); await mkdir(dirname(mp),{recursive:true}); await writeFile(jp,JSON.stringify(groove,null,2)); await writeFile(mp,canonicalToMidi(groove)); }
export async function readCanonical(path){ return JSON.parse(await readFile(path,'utf8')); }
