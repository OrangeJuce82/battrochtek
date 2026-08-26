import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const root=path.resolve(path.dirname(new URL(import.meta.url).pathname),'..');
const app=fs.readFileSync(path.join(root,'app.js'),'utf8');
const manifest=JSON.parse(fs.readFileSync(path.join(root,'samples/manifest-v2.json'),'utf8'));
const samples=new Map(manifest.samples.map(s=>[s.key,s]));
const errors=[];

const roleMatch=app.match(/const TRACK_ROLES = Object\.freeze\((\{.*?\})\);/s);
if(!roleMatch) errors.push('TRACK_ROLES introuvable');
const roles=roleMatch?vm.runInNewContext(`(${roleMatch[1]})`):{};
const expectedRoles={crash:0,bell:1,ride:2,openHat:3,closedHat:4,snare:5,tomHigh:6,tomMid:7,tomFloor:8,kick:9};
for(const [name,index] of Object.entries(expectedRoles)) if(roles[name]!==index) errors.push(`TRACK_ROLES.${name}=${roles[name]} attendu ${index}`);

const labelMatch=app.match(/const TRACK_I18N_KEYS = Object\.freeze\((\[.*?\])\);/s);
const labels=labelMatch?vm.runInNewContext(`(${labelMatch[1]})`):[];
const expectedLabels=['track.crash','track.bell','track.ride','track.openHat','track.closedHat','track.snare','track.tomHigh','track.tomMid','track.tomFloor','track.kick'];
if(JSON.stringify(labels)!==JSON.stringify(expectedLabels))errors.push(`TRACK_I18N_KEYS ordre invalide: ${JSON.stringify(labels)}`);

const km=app.match(/KITS:\s*Object\.freeze\((\[.*?\])\.map\(kit\s*=>\s*Object\.freeze/s);
if(!km)throw new Error('CONFIG.KITS introuvable');
const kits=vm.runInNewContext(`(${km[1]})`);
const checks=[
  [0,s=>s.instrument==='crash'||s.articulation==='crash','Crash'],
  [1,s=>s.instrument==='ride'&&s.articulation==='bell','Bell'],
  [2,s=>s.instrument==='ride'&&s.articulation==='bow','Ride Bow'],
  [3,s=>s.instrument==='hihat'&&s.articulation==='open','HH Open'],
  [4,s=>s.instrument==='hihat'&&s.articulation==='closed','HH Closed'],
  [5,s=>s.instrument==='snare','Snare'],
  [6,s=>s.instrument==='tom','Tom High'],
  [7,s=>s.instrument==='tom','Tom Mid'],
  [8,s=>s.instrument==='tom','Tom Floor'],
  [9,s=>s.instrument==='kick','Kick'],
  [10,s=>s.legacyType==='metro'||s.instrument==='metronome','Metronome']
];
const bellFallbackExpectations=new Map([
  ["STUDIO PUNCH","henkonen_ridebell_vl2"],
  ["SOUL POCKET","henkonen_ride2bell_vl1"],
  ["ANALOG CLASSIC","bt_analog_short_bell"],
  ["DETROIT HYBRID","bt_detroit_ride_bell"],
  ["DIGITAL 80","bt_digital80_bell"],
  ["SP DUST","bt_spdust_bell"],
  ["GLITCH LAB","bt_glitch_metal_bell"]
]);
for(const [kitName,key] of bellFallbackExpectations){
  const kit=kits.find(k=>k.name===kitName);
  if(!kit)errors.push(`${kitName}: kit introuvable pour audit Bell`);
  else if(kit.tracks[1]!==key)errors.push(`${kitName}: Bell ${kit.tracks[1]} attendu ${key}`);
}

for(const kit of kits){
  if(kit.tracks.length!==11){errors.push(`${kit.name}: ${kit.tracks.length} pistes`);continue;}
  if(kit.name==='WORLD PERCUSSION'){
    // This kit intentionally maps traditional percussion to drum-grid roles.
    if(kit.tracks[1]!=='world_cowbell')errors.push('WORLD PERCUSSION: Bell doit être Cowbell');
    if(kit.tracks[2]!=='world_agogo')errors.push('WORLD PERCUSSION: Ride doit être Agogo');
    continue;
  }
  for(const [index,predicate,label] of checks){
    const key=kit.tracks[index], meta=samples.get(key);
    if(!meta){errors.push(`${kit.name} ${label}: sample absent ${key}`);continue;}
    if(!predicate(meta))errors.push(`${kit.name} piste ${index} ${label}: ${key} => ${meta.instrument}/${meta.articulation}`);
  }
  if(kit.tracks[1]===kit.tracks[2])errors.push(`${kit.name}: Bell et Ride utilisent le même sample`);
}

if(!app.includes('track===TRACK_ROLES.bell ? "bell"'))errors.push('articulationForTrack Bell absente');
if(!app.includes('track===TRACK_ROLES.ride ? "bow"'))errors.push('articulationForTrack Ride Bow absente');
if(!app.includes('["crash","ride","ride","hihat","hihat","snare","tom","tom","tom","kick"]'))errors.push('fallback navigateur de sons non aligné sur 10 pistes');
if(!app.includes('sourceTrackOrder:"v53"'))errors.push('migration v53 Ride/Bell absente');
if(!app.includes('ride-bell:${'))errors.push('enrichissement Ride/Bell FEEL absent');

if(errors.length){console.error(errors.join('\n'));process.exit(1);}
console.log(`Track semantics audit OK: ${kits.length} kits, Bell=1, Ride=2, articulations et migrations cohérentes.`);
