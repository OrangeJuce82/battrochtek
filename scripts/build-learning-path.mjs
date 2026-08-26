import { readFile, writeFile } from 'node:fs/promises';

const curriculum=JSON.parse(await readFile(new URL('../musicology/learning-path-v1.json',import.meta.url),'utf8'));
const library=JSON.parse(await readFile(new URL('../grooves/Battrochtek Curated/curated.json',import.meta.url),'utf8'));
const grooves=new Map(library.grooves.map(groove=>[groove.canonicalId,groove]));
const seen=new Set();

const levels=curriculum.levels.map(level=>({
  level:level.level,
  title:level.title,
  description:level.description,
  lessons:level.lessons.map(lesson=>{
    if(seen.has(lesson.number))throw new Error(`Duplicate Learning lesson ${lesson.number}`);
    seen.add(lesson.number);
    const groove=grooves.get(lesson.canonicalId);
    if(!groove)throw new Error(`Learning ${lesson.number}: missing ${lesson.canonicalId}`);
    const targetTempo=Math.round(groove.bpm);
    const startRatio=level.level<=1?.62:level.level===2?.68:level.level===3?.72:level.level===4?.76:.80;
    const startTempo=Math.max(40,Math.round(targetTempo*startRatio));
    return {
      ...lesson,
      focusKeys:lesson.focus,
      level:level.level,
      canonicalName:groove.name,
      family:groove.family,
      tradition:groove.tradition,
      signature:groove.signature,
      startTempo,
      targetTempo,
      tempoStep:level.level<=2?3:2,
      loopsPerLevel:level.level<=2?4:6,
      practiceMode:level.level<=1?'layers':level.level<=3?'combined':'tempo',
      masteryProfile:level.level>=3?'dynamic':'foundation'
    };
  })
}));

const output={schema:curriculum.schema,name:curriculum.name,language:curriculum.language,version:2,lessonCount:seen.size,dimensions:curriculum.dimensions,focusTranslations:curriculum.focusTranslations,frameworkSources:curriculum.frameworkSources,levels};
await writeFile(new URL('../grooves/learning-path.js',import.meta.url),`window.BATTROCHTEK_LEARNING_PATH=${JSON.stringify(output)};\n`);
console.log(`✓ Learning path: ${seen.size} lessons across ${levels.length} levels.`);
