import { readFile, readdir } from 'node:fs/promises';
import crypto from 'node:crypto';
import { parseMidi } from './groove-import-lib.mjs';
import { canonicalToPattern } from './canonical-groove-lib.mjs';
const jsonDir=new URL('../musicology/canonical-grooves/',import.meta.url), midiDir=new URL('../musicology/midi/',import.meta.url);
const files=(await readdir(jsonDir)).filter(x=>x.endsWith('.json')).sort();
const ids=new Set(), midiFiles=new Set(await readdir(midiDir)), gridFp=new Map(); let errors=[];
for(const file of files){
  const g=JSON.parse(await readFile(new URL(`../musicology/canonical-grooves/${file}`,import.meta.url),'utf8'));
  if(g.schema!=='battrochtek.canonical-groove/v1') errors.push(`${g.id}: schema`);
  if(ids.has(g.id)) errors.push(`${g.id}: duplicate id`); ids.add(g.id);
  if(!Array.isArray(g.events)||!g.events.length) errors.push(`${g.id}: empty events`);
  if(!Number.isFinite(g.ppq)||g.ppq<96) errors.push(`${g.id}: invalid PPQ`);
  const midi=file.replace(/\.json$/,'.mid'); if(!midiFiles.has(midi)) errors.push(`${g.id}: MIDI missing`); else { const parsed=parseMidi(await readFile(new URL(`../musicology/midi/${midi}`,import.meta.url))); if(!parsed.notes.length) errors.push(`${g.id}: MIDI has no drum notes`); }
  const pattern=canonicalToPattern(g); const fp=crypto.createHash('sha1').update(JSON.stringify(pattern)).digest('hex').slice(0,16); if(gridFp.has(fp)) errors.push(`${g.id}: exact grid collision with ${gridFp.get(fp)}`); else gridFp.set(fp,g.id);
  for(const e of g.events){ if(!Number.isFinite(e.tick)||e.tick<0||!e.instrument||!e.articulation||!e.role||!e.limb) errors.push(`${g.id}: malformed event`); }
}
if(files.length!==213) errors.push(`expected 213 canonical grooves, found ${files.length}`);
if(errors.length){console.error(errors.join('\n'));process.exit(1);} console.log(`✓ Canonical validation: ${files.length} grooves, ${files.length} MIDI files, 0 exact grid collisions, event schema OK.`);
