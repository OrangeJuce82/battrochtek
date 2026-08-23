import { readFile, readdir, writeFile } from 'node:fs/promises';
const dir=new URL('../musicology/canonical-grooves/',import.meta.url);
const refs={
  berkleeCuba:{title:'Advanced Afro-Cuban Rhythms for Drum Set — Berklee',url:'https://college.berklee.edu/courses/ilpd-373',scope:['son','son montuno','rumba','songo','timba','afro-cuban']},
  berkleeLatin:{title:'Latin/Afro-Cuban Styles — Berklee',url:'https://college.berklee.edu/courses/enlt-220',scope:['son','descarga','cha-cha','mambo','danzon','songo','bembe','bossa','samba','partido alto']},
  berkleeLatinJazz:{title:'Latin/Afro-Cuban Jazz — Berklee',url:'https://college.berklee.edu/courses/enlt-300',scope:['son','descarga','cha-cha','mambo','danzon','songo','bembe','abaku','timba','bossa','samba','partido alto','choro','afoxe','festejo','joropo','milonga','chacarera']},
  berkleeBrazil:{title:'Latin Piano Styles — Berklee Online',url:'https://online.berklee.edu/courses/latin-piano-styles',scope:['maxixe','choro','samba','bossa','baiao','afoxe','ijexa','frevo','maracatu','festejo','lando','chacarera','zamba','candombe','milonga','tango','joropo','cumbia','chande']},
  berkleeDrums:{title:'Drum Set Performance 101 — Berklee Online',url:'https://online.berklee.edu/courses/drum-set-performance-101',scope:['bossa','samba','half-time shuffle','afro-cuban 6/8','jazz shuffle','swing','cha cha']},
  modernReggae:{title:'Reggae 101: The Steppers Beat — Modern Drummer',url:'https://www.moderndrummer.com/article/february-2019-reggae-101-the-steppers-beat/',scope:['steppers','rockers','one drop','one-drop']},
  berkleeSly:{title:'Sly Dunbar on Revolutionizing Reggae Drums — Berklee Online',url:'https://online.berklee.edu/takenote/sly-and-robbie-drummer-sly-dunbar-on-revolutionizing-reggae-drums/',scope:['rockers','one drop','one-drop','reggae']},
  modernJamaican:{title:'Wicked Beats / Jamaican ska, rocksteady and reggae — Modern Drummer',url:'https://www.moderndrummer.com/2011/10/wicked-beatsfeaturing-gil-sharone/',scope:['ska','rocksteady','reggae','nyabinghi','dancehall']},
  berkleeSouthAmerica:{title:'South American Rhythms for the Drum Set — Berklee',url:'https://college.berklee.edu/courses/ilpd-357',scope:['peru','brazil','uruguay','argentina','venezuela','colombia','cumbia','joropo','candombe','festejo','lando']},
  berkleeBrazilCubaDrums:{title:'Introduction to Brazilian and Afro-Cuban Drum Set — Berklee',url:'https://college.berklee.edu/courses/ilpd-211',scope:['brazil','cuba','bossa','samba','afro-cuban','reggae','soca','bomba']},
  gmd:{title:'Groove MIDI Dataset — Magenta',url:'https://magenta.tensorflow.org/datasets/groove',scope:['afrobeat','afro-cuban','blues','country','funk','gospel','highlife','hip-hop','jazz','latin','middle eastern','new orleans','pop','punk','reggae','rock','soul']}
};
const normalize=s=>String(s).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
const files=(await readdir(dir)).filter(x=>x.endsWith('.json'));
let taxonomyValidated=0, gmdSupported=0;
for(const file of files){const url=new URL(`../musicology/canonical-grooves/${file}`,import.meta.url),g=JSON.parse(await readFile(url,'utf8'));const hay=normalize(`${g.name} ${g.family} ${g.tradition}`);const evidence=[];
  for(const r of Object.values(refs)){if(r.scope.some(term=>hay.includes(normalize(term)))) evidence.push({title:r.title,url:r.url});}
  const academic=evidence.filter(e=>!e.title.startsWith('Groove MIDI Dataset')); const gmd=evidence.some(e=>e.title.startsWith('Groove MIDI Dataset'));
  if(academic.length)taxonomyValidated++; if(gmd)gmdSupported++;
  g.metadata??={}; g.metadata.evidence={taxonomyState:academic.length?'literature-supported':'needs-review',performanceEvidence:gmd?'human-dataset-available':'not-mapped',references:evidence};
  // Do not promote the score itself merely because the style name exists in literature.
  g.metadata.scoreState=String(g.metadata.validationState||'').includes('needs-review')?'provisional':(g.metadata.scoreState||'candidate');
  g.metadata.references=[...new Map([...(g.metadata.references||[]).map(x=>[typeof x==='string'?x:x.url,x]),...evidence.map(x=>[x.url,x])]).values()];
  await writeFile(url,JSON.stringify(g,null,2));
}
await writeFile(new URL('../musicology/reference-catalog.json',import.meta.url),JSON.stringify({schema:'battrochtek.musicology-references/v1',generatedAt:new Date().toISOString(),references:refs,summary:{canonicalGrooves:files.length,taxonomyLiteratureSupported:taxonomyValidated,humanDatasetSupported:gmdSupported}},null,2));
console.log(`✓ Evidence map: ${taxonomyValidated}/${files.length} taxonomy-supported by cited literature; ${gmdSupported}/${files.length} mapped to GMD family evidence.`);
