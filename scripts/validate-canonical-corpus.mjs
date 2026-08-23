import { readFile, readdir } from 'node:fs/promises';
import { parseMidi } from './groove-import-lib.mjs';
const jsonDir=new URL('../musicology/canonical-grooves/',import.meta.url), midiDir=new URL('../musicology/midi/',import.meta.url);
const files=(await readdir(jsonDir)).filter(x=>x.endsWith('.json')).sort();
const ids=new Set(), midiFiles=new Set(await readdir(midiDir)); let errors=[];
for(const file of files){
  const g=JSON.parse(await readFile(new URL(`../musicology/canonical-grooves/${file}`,import.meta.url),'utf8'));
  if(g.schema!=='battrochtek.canonical-groove/v1') errors.push(`${g.id}: schema`);
  if(ids.has(g.id)) errors.push(`${g.id}: duplicate id`); ids.add(g.id);
  if(!Array.isArray(g.events)||!g.events.length) errors.push(`${g.id}: empty events`);
  if(!Number.isFinite(g.ppq)||g.ppq<96) errors.push(`${g.id}: invalid PPQ`);
  const midi=file.replace(/\.json$/,'.mid'); if(!midiFiles.has(midi)) errors.push(`${g.id}: MIDI missing`); else { const parsed=parseMidi(await readFile(new URL(`../musicology/midi/${midi}`,import.meta.url))); if(!parsed.notes.length) errors.push(`${g.id}: MIDI has no drum notes`); }
  for(const e of g.events){ if(!Number.isFinite(e.tick)||e.tick<0||!e.instrument||!e.articulation||!e.role||!e.limb) errors.push(`${g.id}: malformed event`); }
  if(!g.metadata?.scoreState) errors.push(`${g.id}: missing scoreState`);
  if(!g.metadata?.evidence?.taxonomyState) errors.push(`${g.id}: missing taxonomy evidence state`);
}
if(files.length!==213) errors.push(`expected 213 canonical archetypes, found ${files.length}`);
const feel=JSON.parse(await readFile(new URL('../musicology/human-feel-profiles.json',import.meta.url),'utf8'));
if(!feel.fileCount||feel.fileCount<100) errors.push('human feel dataset analysis missing/too small');
const dashboard=JSON.parse(await readFile(new URL('../musicology/validation-dashboard.json',import.meta.url),'utf8'));
if(dashboard.summary?.count!==213) errors.push('validation dashboard out of sync');
if(errors.length){console.error(errors.join('\n'));process.exit(1);} console.log(`✓ Canonical validation: ${files.length} archetypes, MIDI/event schemas OK, evidence states present, human-feel analysis present.`);
