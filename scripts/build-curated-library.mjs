import { readFile, writeFile, readdir } from 'node:fs/promises';
import crypto from 'node:crypto';
import { canonicalToPattern } from './canonical-groove-lib.mjs';

const corpusDir=new URL('../musicology/canonical-grooves/',import.meta.url);
const indexUrl=new URL('../musicology/canonical-corpus-index.json',import.meta.url);
const outputUrl=new URL('../grooves/Battrochtek Curated/curated.json',import.meta.url);
const manifestUrl=new URL('../musicology/canonical-manifest.json',import.meta.url);

function patternFingerprint(pattern){return crypto.createHash('sha1').update(JSON.stringify(pattern)).digest('hex').slice(0,16);}
function structuralFingerprint(g){const structural=(g.events||[]).filter(e=>!['ghost','ornament'].includes(e.role)).map(e=>[e.tick,e.instrument,e.articulation,e.role]).sort((a,b)=>a[0]-b[0]||String(a[1]).localeCompare(String(b[1])));return crypto.createHash('sha1').update(JSON.stringify([g.signature,g.phraseBars||2,g.feel||'straight',Math.round(Number(g.swing||0)),structural])).digest('hex').slice(0,16);}
const index=JSON.parse(await readFile(indexUrl,'utf8'));
const files=(await readdir(corpusDir)).filter(x=>x.endsWith('.json')).sort();
const candidates=[];
for(const file of files){
  const g=JSON.parse(await readFile(new URL(`../musicology/canonical-grooves/${file}`,import.meta.url),'utf8'));
  const pattern=canonicalToPattern(g); const fp=patternFingerprint(pattern);
  const midi=index.entries.find(e=>e.id===g.id)?.midi||'';
  candidates.push({
    canonicalId:g.id,source:'battrochtek-curated',sourceLabel:'Battrochtek Curated',family:g.family,tradition:g.tradition,name:g.name,
    bpm:g.bpm,signature:g.signature,memories:[{signature:g.signature,pattern}],pattern,style:g.family,substyle:g.tradition,feel:g.feel||'straight',
    difficulty:g.metadata?.tier==='A'?'intermediate':g.metadata?.tier==='C'?'advanced':'intermediate',sourceType:g.metadata?.sourceType||'canonical-event-model',
    validationState:g.metadata?.validationState||'needs-review',scoreState:g.metadata?.scoreState||'provisional',confidence:Number(g.metadata?.confidence||.5),provenance:g.metadata?.provenance||{},
    canonical:{schema:g.schema,ppq:g.ppq,phraseBars:g.phraseBars,eventCount:(g.events||[]).length,json:`musicology/canonical-grooves/${file}`,midi},
    musicology:{notes:g.metadata?.notes||'',distinctiveFeatures:g.metadata?.distinctiveFeatures||[],references:g.metadata?.references||[],evidence:g.metadata?.evidence||{},catalogDisambiguation:Boolean(g.metadata?.catalogDisambiguation)},
    structuralFingerprint:structuralFingerprint(g),
    tags:[...new Set([g.family.toLowerCase(),g.tradition.toLowerCase(),g.name.toLowerCase(),g.feel||'straight',g.metadata?.validationState||'needs-review',g.metadata?.scoreState||'provisional'])],fingerprint:fp
  });
}
// Exact grid duplicates are merged, never cosmetically altered just to look unique.
const byFp=new Map();
for(const g of candidates){
  // Structural identity (CORE/time/fill positions) is the publication key. Velocity-only
  // differences do not justify two archetype entries while their scores are provisional.
  const key=g.structuralFingerprint; const list=byFp.get(key)||[]; list.push(g); byFp.set(key,list);
}
const rank=g=>((g.scoreState==='validated'?100:0)+(g.musicology?.evidence?.taxonomyState==='literature-supported'?20:0)+(g.confidence||0)*10-(String(g.validationState).includes('needs-review')?5:0));
const grooves=[]; const duplicateConflicts=[];
for(const [fp,list] of byFp){
  list.sort((a,b)=>rank(b)-rank(a)||a.canonicalId.localeCompare(b.canonicalId)); const winner=list[0];
  // Never expose unrelated archetypes as synonyms merely because their provisional score collides.
  // They stay in the canonical corpus and review manifest, but are held out of the runtime library.
  winner.reviewHolds=list.slice(1).map(x=>({canonicalId:x.canonicalId,name:x.name,family:x.family,tradition:x.tradition,validationState:x.validationState,scoreState:x.scoreState}));
  grooves.push(winner);
  if(list.length>1) duplicateConflicts.push({structuralFingerprint:fp,winner:winner.canonicalId,held:list.slice(1).map(x=>x.canonicalId),reason:'identical structural score; held from runtime until score-level review distinguishes or merges it legitimately'});
}
grooves.sort((a,b)=>a.family.localeCompare(b.family)||a.tradition.localeCompare(b.tradition)||a.name.localeCompare(b.name));
const manifestEntries=grooves.map(g=>({id:g.canonicalId,family:g.family,tradition:g.tradition,archetype:g.name,playable:true,status:g.validationState,confidence:g.confidence,sourceType:g.sourceType,fingerprint:g.fingerprint,canonical:g.canonical,musicology:g.musicology}));
await writeFile(outputUrl,JSON.stringify({version:'3.0.0',name:'Battrochtek Curated',purpose:'Single canonical library compiled from the universal event corpus. One representative canonical score per archetype; every entry also exports as Standard MIDI File.',count:grooves.length,taxonomyCount:candidates.length,canonicalSchema:'battrochtek.canonical-groove/v1',ppq:index.ppq||960,grooves},null,2));
await writeFile(manifestUrl,JSON.stringify({version:'3.0.0',taxonomyCount:candidates.length,playableCount:grooves.length,needsRebuild:manifestEntries.filter(x=>String(x.status).includes('needs-review')).length,entries:manifestEntries,duplicateConflicts},null,2));
console.log(`✓ Battrochtek Curated: ${grooves.length}/${candidates.length} representative scores published; ${duplicateConflicts.length} exact structural clusters held for score review.`);
