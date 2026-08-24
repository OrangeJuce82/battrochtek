import { readFile, readdir, writeFile } from 'node:fs/promises';
const dir=new URL('../musicology/canonical-grooves/',import.meta.url);
const refs={
  berkleeCuba:{title:'Advanced Afro-Cuban Rhythms for Drum Set — Berklee',url:'https://college.berklee.edu/courses/ilpd-373',scope:['son','son montuno','rumba','songo','timba','afro-cuban']},
  berkleeLatin:{title:'Latin/Afro-Cuban Styles — Berklee',url:'https://college.berklee.edu/courses/enlt-220',scope:['son','descarga','cha-cha','mambo','danzon','songo','bembe','bossa','samba','partido alto']},
  berkleeLatinJazz:{title:'Latin/Afro-Cuban Jazz — Berklee',url:'https://college.berklee.edu/courses/enlt-300',scope:['son','descarga','cha-cha','mambo','danzon','songo','bembe','abaku','timba','bossa','samba','partido alto','choro','afoxe','festejo','joropo','milonga','chacarera']},
  berkleeBrazil:{title:'Latin Piano Styles — Berklee Online',url:'https://online.berklee.edu/courses/latin-piano-styles',scope:['maxixe','choro','samba','bossa','baiao','afoxe','ijexa','frevo','maracatu','festejo','lando','chacarera','zamba','candombe','milonga','tango','joropo','cumbia','chande']},
  berkleeDrums:{title:'Drum Set Performance 101 — Berklee Online',url:'https://online.berklee.edu/courses/drum-set-performance-101',scope:['bossa','samba','half-time shuffle','afro-cuban 6/8','jazz shuffle','swing','cha cha']},
  drumeoBlues:{title:'Authentic Blues Drumming — Tony Coleman / Drumeo',url:'https://www.drumeo.com/beat/?p=15759',scope:['chicago shuffle','texas shuffle','slow 12 8 blues','straight blues','jump blues','blues rock shuffle','blues shuffle']},
  drumShuffle:{title:'How to Play Shuffles and Shuffle Variations — DRUM! Magazine',url:'https://drummagazine.com/how-to-play-shuffles-and-shuffle-variations/',scope:['chicago shuffle','texas shuffle','train shuffle','half time shuffle','blues rock shuffle','rockabilly shuffle']},
  berkleeBlues:{title:'Blues and Rock Keyboard Techniques — Berklee Online',url:'https://online.berklee.edu/courses/blues-and-rock-keyboard-techniques',scope:['chicago shuffle','texas shuffle','slow 12 8 blues','straight blues']},
  pasCountry:{title:'Country Music Grooves: Variations on the Classics — Percussive Arts Society',url:'https://pas.org/pas-blog/country-music-grooves-variations-on-the-classics/',scope:['train beat','country shuffle','country waltz']},
  pasTrain:{title:'PAS Playlist: Train Beat — Percussive Arts Society',url:'https://pas.org/pas-blog/pas-playlist-train-beat/',scope:['train beat','bluegrass']},
  pasCountrySwing:{title:'Putting More Feel in Your Country Swing Groove — Percussive Arts Society',url:'https://pas.org/pas-blog/groove-of-the-month-putting-more-feel-in-your-country-swing-groove/',scope:['western swing','country swing']},
  drumeoCountry:{title:'A Drummer’s Guide To Country — Drumeo',url:'https://www.drumeo.com/beat/a-drummers-guide-to-country/',scope:['country','train beat','two step','western swing','rockabilly','bluegrass']},
  modernRockabilly:{title:'Rockabilly — Modern Drummer archival feature',url:'https://www.moderndrummer.com/wp-content/uploads/2017/06/md361cs.pdf',scope:['rockabilly']},
  abletonBackbeat:{title:'Backbeats / four-on-the-floor — Ableton Learning Music',url:'https://learningmusic.ableton.com/make-beats/backbeats.html',scope:['classic house','deep house','funky house','techno','trance','disco']},
  abletonTempo:{title:'Tempo and genre — Ableton Learning Music',url:'https://learningmusic.ableton.com/make-beats/tempo-and-genre.html',scope:['classic house','deep house','funky house','techno','trance','dubstep','drum bass','jungle']},
  abletonHouse:{title:'Classic House — Ableton Learning Music',url:'https://learningmusic.ableton.com/make-beats/rock-and-house.html',scope:['classic house']},
  attackUkGarage:{title:'Rolling 2-Step Garage — Attack Magazine',url:'https://www.attackmagazine.com/technique/beat-dissected/rolling-2-step-garage/',scope:['uk garage','2 step']},
  musicradarJungleDnb:{title:'Programming jungle and drum & bass grooves — MusicRadar',url:'https://www.musicradar.com/how-to/program-6-different-jungle-6-dnb-grooves',scope:['jungle','drum bass']},
  berkleeAfricanDrumset:{title:'African Rhythms for Drum Set — Berklee',url:'https://college.berklee.edu/courses/ilpd-355',scope:['afrobeat','highlife','kpanlogo','ewe','agbekor','fanga','mbalax','juju','soukou','makossa','bikutsi','mangambe','mbaqanga','sega','maloya']},
  drumeoAfrican:{title:'African Rhythms Applied to the Drumset — Tosin Aribisala / Drumeo',url:'https://www.drumeo.com/beat/african-rhythms-on-the-drums/',scope:['afrobeat','makossa','soukou']},
  maqamIqa:{title:'Arabic Rhythmic Cycles / Iqa‘at — MaqamWorld',url:'https://www.maqamworld.com/en/iqaa.php',scope:['maqsum','saidi','malfuf','ayoub','baladi','masmoudi','chiftetelli']},
  maqamMaqsum:{title:'Iqa‘ Maqsum 4/4 — MaqamWorld',url:'https://www.maqamworld.com/en/iqaa/maqsum.php',scope:['maqsum']},
  maqamSaidi:{title:'Iqa‘ Sa‘idi 4/4 — MaqamWorld',url:'https://www.maqamworld.com/en/iqaa/saidi.php',scope:['saidi']},
  maqamMalfuf:{title:'Iqa‘ Malfuf 2/4 — MaqamWorld',url:'https://www.maqamworld.com/en/iqaa/malfuf.php',scope:['malfuf']},
  maqamAyyub:{title:'Iqa‘ Ayyub 2/4 — MaqamWorld',url:'https://www.maqamworld.com/en/iqaa/ayyub.php',scope:['ayoub']},
  maqamBaladi:{title:'Iqa‘ Baladi / Masmudi Saghir 4/4 — MaqamWorld',url:'https://www.maqamworld.com/en/iqaa/baladi.php',scope:['baladi','masmoudi saghir']},
  maqamMasmudi:{title:'Iqa‘ Masmudi Kabir 8/4 — MaqamWorld',url:'https://www.maqamworld.com/en/iqaa/masmudi_kabir.php',scope:['masmoudi kabir']},
  maqamCiftetelli:{title:'Iqa‘ Ciftetelli 8/4 — MaqamWorld',url:'https://www.maqamworld.com/en/iqaa/ciftetelli.php',scope:['chiftetelli']},
  cambridgeAksak:{title:'Aksak / asymmetric Balkan rhythmic units — Cambridge Core',url:'https://www.cambridge.org/core/journals/yearbook-of-the-international-folk-music-council/article/abs/on-rhythm-in-rumanian-folk-dance/303B8DC39543C9789026B7186337972D',scope:['balkan 7 8','balkan 9 8','balkan 11 8','cocek','aksak']},
  cambridgeBalkanMeter:{title:'Balkan rhythmic grouping / takt — The Balkan Languages (Cambridge)',url:'https://www.cambridge.org/core/services/aop-cambridge-core/content/view/DF1897CA3A024BFF3AB73392CD28822E/9780521553490AR.pdf/The_Balkan_Languages.pdf?event-type=FTLA',scope:['balkan 7 8','balkan 9 8','balkan 11 8','cocek']},
  raganetTabla:{title:'Popular Tabla Thekas — RagaNet',url:'https://www.raganet.com/Issues/8/tabla8.html',scope:['teentaal','keherwa','dadra']},
  digiKaharwa:{title:'Kaharawa Tal — DigiTabla',url:'https://digitabla.com/reference/tals-and-thekas/kaharawa-tal/',scope:['keherwa']},
  digiDadra:{title:'Dadra Tal — DigiTabla',url:'https://digitabla.com/reference/tals-and-thekas/dadra-tal/',scope:['dadra']},
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
