import { readFile, writeFile, readdir } from 'node:fs/promises';
import crypto from 'node:crypto';
import { canonicalToPattern } from './canonical-groove-lib.mjs';

const corpusDir=new URL('../musicology/canonical-grooves/',import.meta.url);
const indexUrl=new URL('../musicology/canonical-corpus-index.json',import.meta.url);
const outputUrl=new URL('../grooves/Battrochtek Curated/curated.json',import.meta.url);
const manifestUrl=new URL('../musicology/canonical-manifest.json',import.meta.url);

function patternFingerprint(pattern){return crypto.createHash('sha1').update(JSON.stringify(pattern)).digest('hex').slice(0,16);}
const index=JSON.parse(await readFile(indexUrl,'utf8'));
const files=(await readdir(corpusDir)).filter(x=>x.endsWith('.json')).sort();
const grooves=[];
const fingerprints=new Map();
for(const file of files){
  const g=JSON.parse(await readFile(new URL(`../musicology/canonical-grooves/${file}`,import.meta.url),'utf8'));
  const pattern=canonicalToPattern(g); const fp=patternFingerprint(pattern);
  const midi=index.entries.find(e=>e.id===g.id)?.midi||'';
  if(fingerprints.has(fp)) throw new Error(`Canonical grid collision: ${g.id} ${g.name} == ${fingerprints.get(fp)}`);
  fingerprints.set(fp,`${g.id} ${g.name}`);
  grooves.push({
    canonicalId:g.id,source:'battrochtek-curated',sourceLabel:'Battrochtek Curated',family:g.family,tradition:g.tradition,name:g.name,
    bpm:g.bpm,signature:g.signature,memories:[{signature:g.signature,pattern}],pattern,style:g.family,substyle:g.tradition,feel:g.feel||'straight',
    difficulty:g.metadata?.tier==='A'?'intermediate':g.metadata?.tier==='C'?'advanced':'intermediate',sourceType:g.metadata?.sourceType||'canonical-event-model',
    validationState:g.metadata?.validationState||'needs-review',confidence:Number(g.metadata?.confidence||.5),provenance:g.metadata?.provenance||{},
    canonical:{schema:g.schema,ppq:g.ppq,phraseBars:g.phraseBars,eventCount:(g.events||[]).length,json:`musicology/canonical-grooves/${file}`,midi},
    musicology:{notes:g.metadata?.notes||'',distinctiveFeatures:g.metadata?.distinctiveFeatures||[],references:g.metadata?.references||[],catalogDisambiguation:Boolean(g.metadata?.catalogDisambiguation)},
    tags:[...new Set([g.family.toLowerCase(),g.tradition.toLowerCase(),g.name.toLowerCase(),g.feel||'straight',g.metadata?.validationState||'needs-review'])],fingerprint:fp
  });
}
grooves.sort((a,b)=>a.family.localeCompare(b.family)||a.tradition.localeCompare(b.tradition)||a.name.localeCompare(b.name));
const manifestEntries=grooves.map(g=>({id:g.canonicalId,family:g.family,tradition:g.tradition,archetype:g.name,playable:true,status:g.validationState,confidence:g.confidence,sourceType:g.sourceType,fingerprint:g.fingerprint,canonical:g.canonical,musicology:g.musicology}));
await writeFile(outputUrl,JSON.stringify({version:'2.0.0',name:'Battrochtek Curated',purpose:'Single canonical library compiled from the universal event corpus. One representative canonical score per archetype; every entry also exports as Standard MIDI File.',count:grooves.length,taxonomyCount:grooves.length,canonicalSchema:'battrochtek.canonical-groove/v1',ppq:index.ppq||960,grooves},null,2));
await writeFile(manifestUrl,JSON.stringify({version:'2.0.0',taxonomyCount:grooves.length,playableCount:grooves.length,needsRebuild:manifestEntries.filter(x=>String(x.status).includes('needs-review')).length,entries:manifestEntries,duplicateConflicts:[]},null,2));
console.log(`✓ Battrochtek Curated: ${grooves.length}/${grooves.length} canonical archetypes compiled; 0 exact grid collisions.`);
