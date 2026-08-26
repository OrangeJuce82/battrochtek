import { readFile, readdir } from 'node:fs/promises';
import { parseMidi } from './groove-import-lib.mjs';
import { normalizePlayableEvents } from './canonical-groove-lib.mjs';
const jsonDir=new URL('../musicology/canonical-grooves/',import.meta.url), midiDir=new URL('../musicology/midi/',import.meta.url);
const files=(await readdir(jsonDir)).filter(x=>x.endsWith('.json')).sort();
const taxonomyRows=(await readFile(new URL('../musicology/canonical-taxonomy-v1.csv',import.meta.url),'utf8')).trim().split(/\r?\n/).slice(1).filter(Boolean);
const expectedCount=taxonomyRows.length;
const ids=new Set(), midiFiles=new Set(await readdir(midiDir)); let errors=[];
// Catalog descriptors are English. Established proper genre/rhythm names (Raï,
// Baião, Čoček, Bembé, etc.) remain in their conventional source-language form.
const frenchCatalogDescriptor=/\b(?:rythme|batterie|balais?|croches?|double-croches?|mesure|fondation|décalé|composé|demi-temps|adaptation de)\b/i;
for(const file of files){
  const g=JSON.parse(await readFile(new URL(`../musicology/canonical-grooves/${file}`,import.meta.url),'utf8'));
  if(g.schema!=='battrochtek.canonical-groove/v1') errors.push(`${g.id}: schema`);
  if(!g.name||frenchCatalogDescriptor.test(g.name)) errors.push(`${g.id}: catalog name must use English descriptors (${g.name||'missing'})`);
  if(ids.has(g.id)) errors.push(`${g.id}: duplicate id`); ids.add(g.id);
  if(!Array.isArray(g.events)||!g.events.length) errors.push(`${g.id}: empty events`);
  if(!Number.isFinite(g.ppq)||g.ppq<96) errors.push(`${g.id}: invalid PPQ`);
  const midi=file.replace(/\.json$/,'.mid'); if(!midiFiles.has(midi)) errors.push(`${g.id}: MIDI missing`); else { const parsed=parseMidi(await readFile(new URL(`../musicology/midi/${midi}`,import.meta.url))); if(!parsed.notes.length) errors.push(`${g.id}: MIDI has no drum notes`); }
  for(const e of g.events){ if(!Number.isFinite(e.tick)||e.tick<0||!e.instrument||!e.articulation||!e.role||!e.limb) errors.push(`${g.id}: malformed event`); }
  const playability=normalizePlayableEvents(g.events);
  if(playability.removed.length) errors.push(`${g.id}: ${playability.removed.length} unplayable collision(s): ${playability.removed.map(x=>`${x.tick}/${x.reason}/${x.event.instrument}:${x.event.articulation}`).join(', ')}`);
  if(!g.metadata?.scoreState) errors.push(`${g.id}: missing scoreState`);
  if(!g.metadata?.evidence?.taxonomyState) errors.push(`${g.id}: missing taxonomy evidence state`);
  if(g.metadata?.evidence?.taxonomyState==='needs-review') errors.push(`${g.id}: unresolved taxonomy`);
  if(!g.metadata?.references?.length) errors.push(`${g.id}: missing documentary references`);
  if(!g.metadata?.distinctiveFeatures?.length) errors.push(`${g.id}: missing distinctive-feature rationale`);
  if(!g.metadata?.expertReview?.state) errors.push(`${g.id}: missing external human expert-review state`);
  if(g.metadata?.scoreState==='documentary-validated'&&g.metadata?.deskReview?.state!=='complete') errors.push(`${g.id}: documentary-validated without complete desk review`);
}
if(files.length!==expectedCount) errors.push(`expected ${expectedCount} canonical archetypes, found ${files.length}`);
const feel=JSON.parse(await readFile(new URL('../musicology/human-feel-profiles.json',import.meta.url),'utf8'));
if(!feel.fileCount||feel.fileCount<100) errors.push('human feel dataset analysis missing/too small');
const dashboard=JSON.parse(await readFile(new URL('../musicology/validation-dashboard.json',import.meta.url),'utf8'));
if(dashboard.summary?.count!==expectedCount) errors.push('validation dashboard out of sync');
if(dashboard.summary?.scoreDocumentaryValidated!==expectedCount||dashboard.summary?.deskReviewComplete!==expectedCount) errors.push(`desk review is not complete for all ${expectedCount} scores`);
if(dashboard.summary?.taxonomyResolved!==expectedCount||dashboard.summary?.taxonomyNeedsReview!==0) errors.push('taxonomy adjudication is incomplete');
const learning=JSON.parse(await readFile(new URL('../musicology/learning-path-v1.json',import.meta.url),'utf8'));
const lessonNumbers=new Set();
for(const level of learning.levels||[])for(const lesson of level.lessons||[]){
  if(!/^\d+\.\d+$/.test(lesson.number)||lessonNumbers.has(lesson.number)) errors.push(`Learning: invalid/duplicate lesson number ${lesson.number}`);
  lessonNumbers.add(lesson.number);
  if(!ids.has(lesson.canonicalId)) errors.push(`Learning ${lesson.number}: unknown canonicalId ${lesson.canonicalId}`);
  if(!lesson.title||/[àâçéèêëîïôùûüÿœ]/i.test(lesson.title)) errors.push(`Learning ${lesson.number}: title must be English`);
}
if(lessonNumbers.size!==48) errors.push(`Learning: expected 48 lessons, found ${lessonNumbers.size}`);
if(errors.length){console.error(errors.join('\n'));process.exit(1);} console.log(`✓ Canonical validation: ${files.length} archetypes, MIDI/event schemas OK, evidence states present, human-feel analysis present.`);
