import { readFile, writeFile, mkdir, readdir } from 'node:fs/promises';
import crypto from 'node:crypto';
import { PPQ, barSteps, patternToCanonical, writeCanonicalAndMidi } from './canonical-groove-lib.mjs';

const taxonomyPath=new URL('../musicology/canonical-taxonomy-v1.csv',import.meta.url);
const curatedPath=new URL('../grooves/Battrochtek Curated/curated.json',import.meta.url);
const outDir=new URL('../musicology/canonical-grooves/',import.meta.url);
const midiDir=new URL('../musicology/midi/',import.meta.url);
const indexPath=new URL('../musicology/canonical-corpus-index.json',import.meta.url);
const manifestPath=new URL('../musicology/canonical-manifest.json',import.meta.url);

function parseCsv(text){ const rows=[]; let row=[],cell='',q=false; for(let i=0;i<text.length;i++){const c=text[i],n=text[i+1];if(c==='"'){if(q&&n==='"'){cell+='"';i++;}else q=!q;continue;}if(c===','&&!q){row.push(cell);cell='';continue;}if((c==='\n'||c==='\r')&&!q){if(c==='\r'&&n==='\n')i++;row.push(cell);cell='';if(row.some(Boolean))rows.push(row);row=[];continue;}cell+=c;} if(cell||row.length){row.push(cell);rows.push(row);} const [h,...body]=rows; return body.map(cols=>Object.fromEntries(h.map((k,i)=>[k,cols[i]??'']))); }
const slug=s=>String(s).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
const uniq=a=>[...new Set(a)].sort((x,y)=>x-y);
const hashInt=s=>parseInt(crypto.createHash('sha1').update(s).digest('hex').slice(0,8),16)>>>0;

function makeBuilder(row,{signature='4/4',bpm=120,swing=0,feel='straight',phraseBars=2,notes='',confidence=.68,sourceType='battrochtek-pedagogical-adaptation'}={}){
  const steps=barSteps(signature), events=[];
  const def={crash:['cymbal','crash','timeHand'],ride:['cymbal','ride-bow','timeHand'],openHat:['hihat','open','timeHand'],hat:['hihat','closed','timeHand'],snare:['snare','center','otherHand'],crossStick:['snare','cross-stick','otherHand'],rideBell:['cymbal','ride-bell','timeHand'],highTom:['tom','high','otherHand'],midTom:['tom','mid','otherHand'],floorTom:['tom','floor','otherHand'],kick:['kick','normal','rightFoot']};
  const velocity={ghost:32,soft:56,normal:82,strong:104,accent:120};
  function add(which,positions,vel='normal',role){ const [instrument,articulation,limb]=def[which]; for(const p of positions){ const bar=Math.floor(p/steps), local=p%steps; events.push({tick:Math.round((bar*steps+local)*(PPQ/4)),duration:Math.round(PPQ/8),instrument,articulation,velocity:velocity[vel]||82,velocityClass:vel,limb,role:role||((which==='kick'||which==='snare')?'core':(['hat','openHat','ride'].includes(which)?'time':which==='crash'?'resolution':'ornament')),microTimingMs:0,source:'pedagogical-adaptation'}); } }
  function rep(local,bars=phraseBars){ const out=[]; for(let b=0;b<bars;b++)for(const x of local)out.push(b*steps+x); return out; }
  function every(step,offset=0,bars=phraseBars){ const out=[]; for(let b=0;b<bars;b++)for(let x=offset;x<steps;x+=step)out.push(b*steps+x); return out; }
  return {row,steps,events,add,rep,every,finish(extra={}){ return {schema:'battrochtek.canonical-groove/v1',id:row.id,family:row.family,tradition:row.tradition,name:row.archetype,bpm,signature,ppq:PPQ,phraseBars,feel,swing,events:events.sort((a,b)=>a.tick-b.tick),metadata:{validationState:'pedagogical-adaptation-needs-review',confidence,sourceType,createdBy:'Battrochtek musicology compiler',notes,distinctiveFeatures:extra.distinctiveFeatures||[],references:extra.references||[],tier:row.tier,originalCoverage:row.coverage}}; }};
}

function baseRock(row,opt={}){ const b=makeBuilder(row,{bpm:opt.bpm||124,signature:opt.signature||'4/4',swing:opt.swing||0,feel:opt.feel||'straight',notes:opt.notes||'Drum-set archetype emphasizing backbeat and a stable timekeeping hand.'}); b.add(opt.ride?'ride':'hat',b.every(opt.hatStep||2),opt.hatVel||'normal','time'); b.add('snare',b.rep(opt.snare||[4,12]),opt.snareVel||'strong','core'); b.add('kick',b.rep(opt.kick||[0,8,10]),opt.kickVel||'strong','core'); if(opt.open) b.add('openHat',b.rep(opt.open),'strong','ornament'); if(opt.crash!==false)b.add('crash',[0],'accent','resolution'); return b; }
function baseFunk(row,opt={}){ const b=makeBuilder(row,{bpm:opt.bpm||100,swing:opt.swing||0,feel:opt.feel||'syncopated-16',notes:opt.notes||'Syncopated funk pocket with protected backbeat, articulated time hand, and low-level ghost vocabulary.'}); b.add('hat',b.every(opt.hatStep||1),opt.hatVel||'soft','time'); b.add('snare',b.rep(opt.snare||[4,12]),'strong','core'); b.add('kick',b.rep(opt.kick||[0,3,7,10,14]),'strong','core'); b.add('snare',b.rep(opt.ghost||[2,6,11,15]),'ghost','ghost'); if(opt.open)b.add('openHat',b.rep(opt.open),'normal','ornament'); return b; }
function baseReggae(row,opt={}){ const b=makeBuilder(row,{bpm:opt.bpm||78,feel:'reggae',notes:opt.notes||'Jamaican drum-set archetype preserving space as a structural part of the groove.'}); b.add(opt.ride?'ride':'hat',b.every(2),'soft','time'); b.add('snare',b.rep(opt.snare||[8]),opt.rim?'soft':'strong','core'); b.add('kick',b.rep(opt.kick||[8]),'strong','core'); if(opt.extraKick)b.add('kick',b.rep(opt.extraKick),'normal','ornament'); if(opt.open)b.add('openHat',b.rep(opt.open),'normal','ornament'); return b; }
function baseHouse(row,opt={}){ const b=makeBuilder(row,{bpm:opt.bpm||124,feel:'electronic',notes:opt.notes||'Electronic dance archetype represented on acoustic drum-set voices for compatibility.'}); b.add('kick',b.rep(opt.kick||[0,4,8,12]),'strong','core'); b.add('snare',b.rep(opt.snare||[4,12]),'strong','core'); b.add('hat',b.rep(opt.hat||[2,6,10,14]),'normal','time'); if(opt.open)b.add('openHat',b.rep(opt.open),'strong','ornament'); return b; }
function baseLatin(row,opt={}){ const b=makeBuilder(row,{bpm:opt.bpm||104,signature:opt.signature||'4/4',swing:opt.swing||0,feel:opt.feel||'latin',notes:opt.notes||'Pedagogical drum-set adaptation preserving a characteristic ostinato rather than imitating a generic pop beat.'}); b.add(opt.ride?'ride':'hat',b.rep(opt.time||[0,2,4,6,8,10,12,14]),'soft','time'); b.add('kick',b.rep(opt.kick||[0,6,10]),'strong','core'); b.add('snare',b.rep(opt.snare||[4,12]),opt.snareVel||'normal','core'); if(opt.tom)b.add('midTom',b.rep(opt.tom),'normal','ornament'); if(opt.floor)b.add('floorTom',b.rep(opt.floor),'normal','ornament'); if(opt.open)b.add('openHat',b.rep(opt.open),'normal','ornament'); return b; }
function baseCompound(row,opt={}){ const signature=opt.signature||'6/8'; const b=makeBuilder(row,{bpm:opt.bpm||96,signature,feel:opt.feel||'compound',notes:opt.notes||'Compound-meter drum-set adaptation with phrase accents preserved.'}); const s=b.steps; const pulse=signature==='12/8'?[0,6,12,18]:signature==='9/8'?[0,6,12]:[0,6]; b.add('hat',b.every(2),'soft','time'); b.add('kick',b.rep(opt.kick||pulse),'strong','core'); b.add('snare',b.rep(opt.snare||[Math.floor(s/2)]),'strong','core'); return b; }

function latinCanonical(row,opt={}){
  const b=makeBuilder(row,{bpm:opt.bpm||104,signature:opt.signature||'4/4',swing:opt.swing||0,feel:opt.feel||'latin',phraseBars:opt.phraseBars||2,notes:opt.notes||'Reviewed pedagogical drum-set orchestration built from documented percussion functions; score remains an adaptation rather than a literal traditional-percussion transcription.',confidence:opt.confidence||.78,sourceType:'battrochtek-reviewed-pedagogical-adaptation'});
  const add=(voice,positions,vel='normal',role)=>{ if(positions?.length)b.add(voice,positions,vel,role); };
  add(opt.timeVoice||'hat',opt.time,'soft','time'); add('rideBell',opt.rideBell,'normal','time'); add('kick',opt.kick,'strong','core'); add(opt.crossStick?'crossStick':'snare',opt.snare,opt.snareVel||'normal','core'); add('snare',opt.ghost,'ghost','ghost'); add('highTom',opt.highTom,'normal','ornament'); add('midTom',opt.midTom,'normal','ornament'); add('floorTom',opt.floorTom,'normal','ornament'); add('openHat',opt.openHat,'normal','ornament'); add('crash',opt.crash,'accent','resolution');
  const g=b.finish({distinctiveFeatures:opt.features||[],references:opt.references||[]});
  g.metadata.validationState='reviewed-pedagogical-adaptation'; g.metadata.scoreState='reviewed-adaptation';
  return g;
}

const LATIN_REBUILD_IDS=new Set(Array.from({length:36},(_,i)=>`CAN-${128+i}`));
const V19_REBUILD_IDS=new Set([
  'CAN-017','CAN-118',
  ...Array.from({length:16},(_,i)=>`CAN-${String(41+i).padStart(3,'0')}`),
  ...Array.from({length:14},(_,i)=>`CAN-${String(65+i).padStart(3,'0')}`)
]);
const V20_REBUILD_IDS=new Set([
  ...Array.from({length:23},(_,i)=>`CAN-${String(18+i).padStart(3,'0')}`),
  ...Array.from({length:10},(_,i)=>`CAN-${String(89+i).padStart(3,'0')}`)
]);

function templateFor(row){
  const n=row.archetype.toLowerCase(), f=row.family, id=row.id;
  // Foundations
  if(n==='straight 16ths'){const b=baseRock(row,{bpm:100,hatStep:1,kick:[0,7,10],crash:false});return b.finish({distinctiveFeatures:['continuous 16th-note time hand','backbeat on 2 and 4']});}
  if(n.includes('8th-note shuffle')){const b=baseRock(row,{bpm:92,swing:66,hatStep:2,kick:[0,6,10],crash:false,feel:'shuffle'});return b.finish({distinctiveFeatures:['triplet-derived eighth shuffle','backbeat']});}
  if(n.includes('16th-note shuffle')){const b=baseFunk(row,{bpm:92,swing:62,hatStep:1,kick:[0,3,7,10,14],ghost:[2,11]});return b.finish({distinctiveFeatures:['swung sixteenth subdivision','syncopated kick/snare']});}
  if(n==='12/8 ballad'){return baseCompound(row,{signature:'12/8',bpm:68,kick:[0,12,18],snare:[12]}).finish({distinctiveFeatures:['four dotted-quarter pulses','ballad backbeat']});}
  if(n==='6/8 compound groove'){return baseCompound(row,{signature:'6/8',bpm:96,kick:[0,8],snare:[6]}).finish({distinctiveFeatures:['two-beat compound pulse']});}
  if(n==='3/4 groove'){const b=makeBuilder(row,{signature:'3/4',bpm:110,feel:'straight',notes:'General 3/4 drum-set foundation.'});b.add('hat',b.every(2),'soft','time');b.add('kick',b.rep([0]),'strong','core');b.add('snare',b.rep([4,8]),'normal','core');return b.finish();}
  // Rock / Pop / Metal — reviewed complete drum-set archetypes.
  if(f==='Rock / Pop'){
    const refs=['https://online.berklee.edu/courses/drum-set-performance-101','https://www.moderndrummer.com/'];
    const rock=(opt)=>{
      const b=makeBuilder(row,{bpm:opt.bpm||124,signature:opt.signature||'4/4',swing:opt.swing||0,feel:opt.feel||'rock',notes:'Reviewed complete Rock/Pop drum-set archetype: stable time voice, explicit backbeat role and style-specific bass-drum function.',confidence:.8,sourceType:'battrochtek-reviewed-pedagogical-adaptation'});
      const time=opt.time||[0,2,4,6,8,10,12,14];
      b.add(opt.timeVoice||'hat',b.rep(time),opt.timeVel||'normal','time');
      if(opt.kick?.length)b.add('kick',b.rep(opt.kick),opt.kickVel||'strong','core');
      if(opt.snare?.length)b.add('snare',b.rep(opt.snare),opt.snareVel||'strong','core');
      if(opt.ghost?.length)b.add('snare',b.rep(opt.ghost),'ghost','ghost');
      if(opt.open?.length)b.add('openHat',b.rep(opt.open),opt.openVel||'strong','ornament');
      if(opt.crash?.length)b.add('crash',opt.crash,'accent','resolution');
      if(opt.highTom?.length)b.add('highTom',b.rep(opt.highTom),'normal','ornament');
      if(opt.floorTom?.length)b.add('floorTom',b.rep(opt.floorTom),'normal','ornament');
      const g=b.finish({distinctiveFeatures:opt.features||[],references:[...refs,...(opt.references||[])]});
      g.metadata.validationState='reviewed-pedagogical-adaptation'; g.metadata.scoreState='reviewed-adaptation';
      g.metadata.roleModel={timeHand:opt.timeVoice==='ride'?'ride':'hihat',otherHand:'backbeat',rightFoot:opt.rightFoot||'foundation',leftFoot:opt.leftFoot||'minimal'};
      return g;
    };
    if(n.includes('early rock')||n.includes('lindy'))return rock({bpm:164,swing:62,feel:'early-rock-shuffle',timeVoice:'ride',time:[0,3,4,7,8,11,12,15],kick:[0,6,8,14],snare:[4,12],features:['shuffle-derived time voice','backbeat on 2 and 4','walking bass-drum support']});
    if(n==='classic rock 8ths')return rock({bpm:118,kick:[0,6,8,10],snare:[4,12],features:['eighth-note hi-hat foundation','2 and 4 backbeat','syncopated bass-drum support']});
    if(n.includes('classic rock 16'))return rock({bpm:108,time:[0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15],timeVel:'soft',kick:[0,3,7,10,14],snare:[4,12],ghost:[11],features:['continuous sixteenth-note time hand','classic backbeat','sixteenth-note bass-drum pickups']});
    if(n==='rock shuffle')return rock({bpm:104,swing:66,feel:'shuffle',kick:[0,6,8,14],snare:[4,12],open:[14],features:['triplet-derived shuffle pulse','strong 2 and 4','open-hat lift into the bar line']});
    if(n==='half-time rock')return rock({bpm:96,kick:[0,6,10,14],snare:[8],features:['half-time backbeat on beat 3','eighth-note time voice','syncopated kick support']});
    if(n==='hard rock')return rock({bpm:126,kick:[0,3,6,8,10,14],snare:[4,12],open:[6,14],snareVel:'accent',features:['heavy backbeat','denser bass-drum support','open-hat accents']});
    if(n==='arena rock')return rock({bpm:116,timeVoice:'ride',kick:[0,4,8,10,12],snare:[4,12],snareVel:'accent',crash:[0,16],features:['broad ride-led time','quarter-note bass-drum weight','large backbeat and section crash']});
    if(n==='power ballad')return rock({signature:'12/8',bpm:68,feel:'12-8-ballad',time:[0,2,4,6,8,10,12,14,16,18,20,22],kick:[0,12,18],snare:[6,18],open:[22],features:['12/8 subdivision','large ballad backbeat','open-hat/cymbal lift']});
    if(n==='pop rock')return rock({bpm:120,kick:[0,6,8,14],snare:[4,12],features:['clean eighth-note time','economical pop backbeat','moderate kick syncopation']});
    if(n==='indie rock')return rock({bpm:132,kick:[0,3,8,11,14],snare:[4,12],time:[0,2,4,6,8,10,12,14],features:['off-beat bass-drum movement','steady eighth-note hand','dry backbeat']});
    if(n.includes('alternative')||n.includes('grunge'))return rock({bpm:116,kick:[0,6,8,10,14],snare:[4,12],snareVel:'accent',open:[14],features:['heavy backbeat','dynamic open-hat lift','dense kick support']});
    if(n==='punk rock')return rock({bpm:184,time:[0,2,4,6,8,10,12,14],timeVel:'strong',kick:[0,4,8,12],snare:[4,12],features:['fast driving eighth-note time','quarter-note kick drive','hard backbeat']});
    if(n==='pop-punk')return rock({bpm:176,time:[0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15],timeVel:'normal',kick:[0,3,6,8,10,14],snare:[4,12],features:['fast sixteenth/eighth hand flow','syncopated kick pickups','bright backbeat']});
    if(n.includes('post-punk')||n.includes('new wave'))return rock({bpm:138,time:[0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15],timeVel:'soft',kick:[0,4,8,12],snare:[4,12],open:[6,14],features:['dance-derived sixteenth-note hand','four-on-floor bass drum','offbeat open-hat color']});
    if(n==='surf rock')return rock({bpm:160,timeVoice:'ride',time:[0,2,4,6,8,10,12,14],kick:[0,6,8,14],snare:[4,12],features:['fast ride-led drive','straight backbeat','propulsive kick pattern']});
    if(n==='glam rock')return rock({bpm:124,time:[0,4,8,12],timeVel:'strong',kick:[0,4,8,12],snare:[4,12],open:[6,14],features:['stomping quarter-note cymbal pulse','quarter-note kick weight','large 2 and 4 backbeat']});
    if(n==='progressive rock')return rock({signature:'5/4',bpm:122,time:[0,2,4,6,8,10,12,14,16,18],kick:[0,6,10,16],snare:[4,12,18],features:['5/4 phrase','backbeat displaced by asymmetric meter','stable subdivision through bar line']});
    if(n.includes('odd-meter'))return rock({signature:'7/8',bpm:126,time:[0,2,4,6,8,10,12],kick:[0,6,10],snare:[4,12],features:['7/8 grouping 2+2+3','time voice preserves asymmetric pulse','backbeat adapted to meter']});
    if(n==='metal straight-8')return rock({bpm:150,time:[0,2,4,6,8,10,12,14],timeVel:'strong',kick:[0,2,4,6,8,10,12,14],snare:[4,12],snareVel:'accent',features:['straight eighth-note cymbal time','continuous eighth-note kick drive','accented backbeat']});
    if(n==='metal half-time')return rock({bpm:132,time:[0,2,4,6,8,10,12,14],kick:[0,1,3,6,8,10,14,15],snare:[8],snareVel:'accent',features:['half-time snare on beat 3','double-kick bursts','steady cymbal grid']});
    if(n==='thrash metal')return rock({bpm:196,timeVoice:'ride',time:[0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15],timeVel:'strong',kick:[0,2,6,8,10,14],snare:[4,12],snareVel:'accent',features:['very fast continuous time hand','aggressive backbeat','syncopated double-bass support']});
    if(n==='double-kick metal')return rock({bpm:176,time:[0,2,4,6,8,10,12,14],kick:[0,1,2,3,6,7,8,9,10,11,14,15],snare:[4,12],snareVel:'accent',features:['sustained double-kick sixteenth figures','stable cymbal pulse','2 and 4 backbeat']});
    if(n==='metalcore half-time')return rock({bpm:150,time:[0,2,4,6,8,10,12,14],kick:[0,1,3,6,9,10,14,15],snare:[8],snareVel:'accent',open:[14],features:['breakdown-oriented half-time backbeat','syncopated double-kick bursts','open-hat setup']});
    if(n.includes('stoner')||n.includes('heavy shuffle'))return rock({bpm:82,swing:60,feel:'heavy-shuffle',kick:[0,5,8,11,14],snare:[4,12],open:[14],features:['slow heavy shuffle','behind-the-beat backbeat handled by FEEL','wide open-hat lift']});
    return rock({bpm:124,kick:[0,6,8,10],snare:[4,12],features:['general rock backbeat','stable time hand','bass-drum foundation']});
  }
  // Funk / Soul / R&B — reviewed role-based drum-set archetypes.
  if(f==='Funk / Soul / R&B'){
    const refs=['https://www.moderndrummer.com/2011/06/uriel-jones-architect-of-the-motown-sound/','https://www.moderndrummer.com/2016/08/video-lesson-groove-construction-part-6-w-jost-nickel/'];
    const reviewed=(opt)=>{const b=makeBuilder(row,{bpm:opt.bpm||100,feel:opt.feel||'funk',notes:'Reviewed role-based Funk/Soul/R&B drum-set adaptation.',confidence:.8,sourceType:'battrochtek-reviewed-pedagogical-adaptation'});b.add(opt.timeVoice||'hat',b.rep(opt.time||[0,2,4,6,8,10,12,14]),opt.timeVel||'soft','time');b.add('kick',b.rep(opt.kick||[0,7,10]),opt.kickVel||'strong','core');b.add(opt.crossStick?'crossStick':'snare',b.rep(opt.snare||[4,12]),opt.snareVel||'strong','core');if(opt.ghost?.length)b.add('snare',b.rep(opt.ghost),'ghost','ghost');if(opt.open?.length)b.add('openHat',b.rep(opt.open),'normal','ornament');if(opt.tom?.length)b.add('midTom',b.rep(opt.tom),'normal','ornament');const g=b.finish({distinctiveFeatures:opt.features||[],references:[...refs,...(opt.references||[])]});g.metadata.validationState='reviewed-pedagogical-adaptation';g.metadata.scoreState='reviewed-adaptation';return g;};
    if(n.includes('james brown'))return reviewed({bpm:104,time:[0,4,8,12],kick:[0,3,6,10,14],snare:[4,12],ghost:[2,7,11,15],open:[14],features:['one-oriented kick emphasis','quarter-note/space-aware time hand','ghost-note conversation around protected backbeat']});
    if(n.includes('meters-style'))return reviewed({bpm:98,feel:'new-orleans-funk',time:[0,2,4,7,8,10,12,15],kick:[0,3,7,10,14],snare:[4,12],ghost:[2,6,11,15],features:['broken sixteenth time-hand phrase','syncopated New Orleans bass-drum pocket','ghost-note counterline']});
    if(n.includes('new orleans')||n.includes('second line'))return reviewed({bpm:104,feel:'second-line',time:[0,3,4,7,8,11,12,15],kick:[0,3,8,11,14],snare:[4,12],ghost:[2,6,10,15],features:['second-line-derived syncopation','loose triplet-informed hand feel','bass/snare conversation']});
    if(n.includes('motown'))return reviewed({bpm:112,time:[0,2,4,6,8,10,12,14],kick:[0,3,6,8,11,14],snare:[4,12],ghost:[15],tom:[14],features:['steady eighth-note time','syncopated bass-drum pickups interacting with bass line','strong backbeat with signature pickup vocabulary'],references:['https://www.moderndrummer.com/2009/06/secrets-of-motown/']});
    if(n.includes('stax')||n.includes('southern soul'))return reviewed({bpm:98,time:[0,2,4,6,8,10,12,14],kick:[0,7,10],snare:[4,12],features:['spacious southern-soul pocket','less busy kick than Motown','firm backbeat']});
    if(n.includes('philly'))return reviewed({bpm:108,time:[0,2,4,6,8,10,12,14],kick:[0,6,8,11,14],snare:[4,12],open:[14],features:['smooth eighth-note soul time','dance-oriented bass drum','light open-hat lift']});
    if(n.includes('p-funk'))return reviewed({bpm:100,time:[0,2,4,6,8,10,12,14],kick:[0,3,7,10,14],snare:[4,12],ghost:[2,6,11,15],open:[7,15],features:['syncopated sixteenth pocket','ghost-note conversation','open-hat punctuation']});
    if(n.includes('boogaloo'))return reviewed({bpm:108,time:[0,3,4,7,8,11,12,15],kick:[0,6,10,14],snare:[4,12],ghost:[7,15],features:['Latin/R&B-influenced syncopation','broken time-hand phrase','backbeat retained']});
    if(n.includes('go-go'))return reviewed({bpm:100,time:[0,2,4,5,6,8,10,12,13,14],kick:[0,3,6,8,11,14],snare:[4,12],ghost:[2,7,10,15],open:[7,15],features:['continuous syncopated time-hand phrase','busy interlocking kick/ghost vocabulary','open-hat lift']});
    if(n==='gospel pocket')return reviewed({bpm:92,time:[0,2,4,6,8,10,12,14],kick:[0,3,6,10,14],snare:[4,12],ghost:[2,5,7,11,15],open:[14],features:['syncopated church pocket','busy ghost-note preparation around backbeat','bass-drum response distinct from P-Funk']});
    if(n.includes('gospel'))return reviewed({bpm:150,time:[0,2,4,6,8,10,12,14],kick:[0,4,8,12,14],snare:[2,6,10,14],ghost:[5,13],open:[14],features:['shout-derived driving backbeats','quarter-note kick drive','section-driving cymbal articulation']});
    if(n.includes('linear funk'))return reviewed({bpm:96,time:[0,2,5,8,10,13],kick:[0,3,7,10,14],snare:[4,9,12],ghost:[6,15],features:['linearized hand-foot conversation','fewer simultaneous time/backbeat attacks','syncopated sixteenth flow']});
    if(n.includes('ghost-note funk'))return reviewed({bpm:102,time:[0,2,4,6,8,10,12,14],kick:[0,3,8,10,14],snare:[4,12],ghost:[1,2,6,7,9,11,15],features:['protected backbeat surrounded by dense low-level snare vocabulary','restrained kick leaves room for ghosts']});
    if(n.includes('disco-funk')||n.includes('chic'))return reviewed({bpm:118,time:[0,2,4,6,8,10,12,14],kick:[0,4,8,12],snare:[4,12],open:[6,14],features:['four-on-floor dance foundation','steady eighth-note time','offbeat open-hat punctuation']});
    if(n.includes('neo-soul')||n.includes('dilla'))return reviewed({bpm:84,feel:'laid-back-neo-soul',time:[0,2,4,6,8,10,12,14],kick:[0,3,7,10,14],snare:[4,12],ghost:[2,6,11,15],features:['laid-back backbeat','soft ghost-note lattice','broken bass-drum support']});
    if(n.includes('modern r&b'))return reviewed({bpm:88,time:[0,2,4,6,8,10,12,14],kick:[0,7,10,15],snare:[4,12],ghost:[11],features:['sparse contemporary pocket','late-feeling backbeat handled by FEEL','restrained ornamentation']});
    return reviewed({bpm:100,kick:[0,3,7,10,14],snare:[4,12],ghost:[2,6,11,15],features:['general funk syncopation','protected backbeat','ghost-note vocabulary']});
  }
  if(f==='Blues / Shuffle'){
    if(n==='straight blues')return baseRock(row,{bpm:88,kick:[0,6,8,14],hatStep:2,crash:false}).finish();
    return baseRock(row,{bpm:n.includes('slow')?66:102,swing:66,kick:n.includes('rock')?[0,6,8,10,14]:[0,6,10,14],hatStep:2,feel:'shuffle',crash:false}).finish();
  }
  if(f==='Jazz'){
    const refs=['https://www.moderndrummer.com/2013/01/md-education-team-weighs-in-on-learning-jazz/','https://www.moderndrummer.com/article/up-tempo-jazz-ride-playing/'];
    const jazz=(opt)=>{const b=makeBuilder(row,{bpm:opt.bpm||140,signature:opt.signature||'4/4',swing:opt.swing??58,feel:opt.feel||'swing',notes:'Reviewed jazz drum-set adaptation: time voice, comping and bass-drum roles are separated.',confidence:.82,sourceType:'battrochtek-reviewed-pedagogical-adaptation'});b.add(opt.timeVoice||'ride',b.rep(opt.time||[0,3,4,7,8,11,12,15]),opt.timeVel||'normal','time');if(opt.snare?.length)b.add('snare',b.rep(opt.snare),opt.snareVel||'ghost','comping');if(opt.kick?.length)b.add('kick',b.rep(opt.kick),opt.kickVel||'soft','comping');if(opt.cross?.length)b.add('crossStick',b.rep(opt.cross),'soft','comping');if(opt.open?.length)b.add('openHat',b.rep(opt.open),'soft','time');const g=b.finish({distinctiveFeatures:opt.features||[],references:[...refs,...(opt.references||[])]});g.metadata.validationState='reviewed-pedagogical-adaptation';g.metadata.scoreState='reviewed-adaptation';g.metadata.leftFootRole=opt.leftFoot||'hi-hat 2 and 4 (semantic; dedicated pedal lane pending)';return g;};
    if(n==='medium swing')return jazz({bpm:140,snare:[6,14],kick:[0,10],features:['ride cymbal is primary voice','light snare comping','soft bass-drum support','left-foot hi-hat on 2 and 4 represented semantically']});
    if(n.includes('up-tempo')||n.includes('bebop swing'))return jazz({bpm:220,time:[0,2,4,6,8,10,12,14],snare:[3,6,11,14],kick:[7,15],features:['up-tempo ride straightens toward eighth-note flow','broken snare comping','very light sparse bass drum']});
    if(n.includes('two-feel'))return jazz({bpm:132,time:[0,3,4,7,8,11,12,15],snare:[6,14],kick:[0,8],features:['two-beat bass foundation on 1 and 3','ride swing remains primary voice','sparse comping']});
    if(n==='jazz ballad')return jazz({bpm:72,time:[0,3,4,7,8,11,12,15],snare:[7,14],snareVel:'ghost',kick:[0],features:['slow ride-led swing','very sparse conversational snare comping','bass drum used as occasional color rather than two-feel foundation']});
    if(n.includes('brush ballad'))return jazz({bpm:68,timeVoice:'hat',time:[0,2,4,6,8,10,12,14],snare:[4,12],snareVel:'soft',kick:[0,8],features:['brush-ballad time represented as soft continuous hand pulse','restrained cross/backbeat gesture','minimal bass drum']});
    if(n.includes('brush swing'))return jazz({bpm:116,timeVoice:'hat',time:[0,2,4,6,8,10,12,14],snare:[3,7,11,15],snareVel:'ghost',kick:[0,8],features:['brush sweep pulse separated from stick ride pattern','light comping','two-beat bass support']});
    if(n.includes('jazz waltz'))return jazz({signature:'3/4',bpm:126,time:[0,3,4,7,8,11],snare:[5,10],kick:[0,8],features:['3/4 swing ride phrase','light comping across three-beat bar','soft bass support']});
    if(n.includes('jazz shuffle'))return jazz({bpm:110,swing:66,time:[0,3,4,7,8,11,12,15],snare:[4,12],snareVel:'normal',kick:[0,8],features:['triplet shuffle surface','jazz balance with ride leading','backbeat more explicit than medium swing']});
    if(n.includes('big band'))return jazz({bpm:152,snare:[4,12,14],snareVel:'normal',kick:[0,8,14],features:['ride time with ensemble figures','stronger setup/ensemble punctuation']});
    if(n.includes('bebop comping'))return jazz({bpm:184,snare:[2,6,9,14],kick:[7,13],features:['independent snare comping','sparse bomb-style bass-drum accents','ride remains uninterrupted']});
    if(n.includes('straight-8'))return jazz({bpm:112,swing:0,feel:'straight-8-jazz',time:[0,2,4,6,8,10,12,14],snare:[6,13],kick:[9],features:['straight-eighth ride time','open modern-jazz comping','space prioritized']});
    if(n.includes('afro-cuban jazz 6/8'))return jazz({signature:'12/8',bpm:108,swing:0,feel:'afro-cuban-jazz-6-8',time:[0,4,6,10,12,16,18,22],snare:[6,18],kick:[0,12],features:['compound 6/8 bell/ride orientation','jazz comping layered over Afro-Cuban cycle','compound-meter bass support']});
    if(n==='jazz-funk')return jazz({bpm:116,swing:0,feel:'jazz-funk',timeVoice:'hat',time:[0,2,4,6,8,10,12,14],snare:[4,12,15],snareVel:'normal',kick:[0,3,7,10,14],features:['complete funk backbeat and bass-drum pocket','jazz-derived dynamic independence','single time-hand voice rather than simultaneous ride/hi-hat']});
    if(n==='fusion')return jazz({bpm:124,swing:0,feel:'fusion',time:[0,2,4,6,8,10,12,14],snare:[4,11,12],snareVel:'normal',kick:[0,3,7,8,10,14],features:['ride-led fusion time','syncopated funk-derived bass drum','active snare interaction']});
    return jazz({bpm:126,snare:[6,14],kick:[0,10],features:['ride-led jazz time','independent comping']});
  }
  if(f==='Country / Americana'){
    if(n.includes('shuffle')||n.includes('rockabilly'))return baseRock(row,{bpm:n.includes('rockabilly')?170:112,swing:66,kick:[0,6,8,14],hatStep:2,feel:'shuffle',crash:false}).finish();
    return baseRock(row,{bpm:120,kick:[0,8],hatStep:2,crash:false}).finish();
  }
  if(f==='Hip-Hop'){
    const refs=['https://magenta.tensorflow.org/datasets/groove','https://www.moderndrummer.com/'];
    const hip=(opt)=>{
      const b=makeBuilder(row,{bpm:opt.bpm||90,feel:opt.feel||'hip-hop',notes:'Reviewed complete Hip-Hop/Breakbeat drum-set archetype. Canonical score carries the skeleton; FEEL supplies style-specific pocket and microtiming.',confidence:.79,sourceType:'battrochtek-reviewed-pedagogical-adaptation'});
      b.add('hat',b.rep(opt.time||[0,2,4,6,8,10,12,14]),opt.timeVel||'soft','time');
      b.add('kick',b.rep(opt.kick||[0,7,10]),opt.kickVel||'strong','core');
      b.add('snare',b.rep(opt.snare||[4,12]),opt.snareVel||'strong','core');
      if(opt.ghost?.length)b.add('snare',b.rep(opt.ghost),'ghost','ghost');
      if(opt.kickGhost?.length)b.add('kick',b.rep(opt.kickGhost),'ghost','ghost');
      if(opt.open?.length)b.add('openHat',b.rep(opt.open),'normal','ornament');
      const g=b.finish({distinctiveFeatures:opt.features||[],references:[...refs,...(opt.references||[])]});
      g.metadata.validationState='reviewed-pedagogical-adaptation'; g.metadata.scoreState='reviewed-adaptation';
      g.metadata.roleModel={timeHand:'hihat',otherHand:'backbeat/ghosts',rightFoot:opt.rightFoot||'broken-pocket',leftFoot:'minimal'};
      return g;
    };
    if(n==='old-school breakbeat')return hip({bpm:104,time:[0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15],kick:[0,3,7,10,14],snare:[4,12],ghost:[7,15],features:['sample-break-derived sixteenth hand layer','broken kick phrase','strong 2 and 4 backbeat with ghost pickups']});
    if(n==='boom bap')return hip({bpm:92,kick:[0,3,8,11,14],snare:[4,12],ghost:[15],features:['sparse eighth-note hand','hard backbeat','asymmetric kick phrase','late snare feel delegated to FEEL']});
    if(n.includes('g-funk'))return hip({bpm:94,feel:'laid-back-west-coast',time:[0,2,4,6,8,10,12,14],kick:[0,3,8,11,14],snare:[4,12],open:[14],features:['laid-back West Coast pocket','open-hat lift','syncopated kick under stable backbeat']});
    if(n.includes('dilla')||n.includes('drunk'))return hip({bpm:82,feel:'drunk-pocket',time:[0,2,4,6,8,10,12,14],kick:[0,3,7,10,14],kickGhost:[15],snare:[4,12],ghost:[6,11],features:['intentionally sparse canonical grid','drunk/late microtiming delegated to human-feel layer','soft kick/snare ghost lattice']});
    if(n.includes('lo-fi'))return hip({bpm:76,feel:'laid-back',time:[0,2,4,6,8,10,12,14],kick:[0,7,10],snare:[4,12],ghost:[11,15],features:['restrained low-density pocket','soft ghost pickups','minimal kick support']});
    if(n==='trap half-time')return hip({bpm:140,time:[0,2,4,6,8,10,12,14],kick:[0,3,7,10,14],snare:[8],features:['half-time clap/snare on beat 3','syncopated low-end phrase','eighth-note hat foundation']});
    if(n.includes('trap double-time'))return hip({bpm:140,time:[0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15],timeVel:'soft',kick:[0,3,7,10,14],snare:[8],features:['half-time backbeat with double-time sixteenth hats','syncopated kick phrase','hat-roll detail delegated to Density']});
    if(n==='drill')return hip({bpm:142,time:[0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15],kick:[0,3,6,11,14],snare:[8],ghost:[15],features:['half-time backbeat','syncopated drill kick placement','continuous hat grid for FEEL articulation']});
    if(n==='jersey club')return hip({bpm:136,time:[0,2,4,6,8,10,12,14],kick:[0,3,6,10,13],snare:[4,10,12],features:['fast club-oriented kick syncopation','multiple clap/snare anchors','compact eighth-note time']});
    if(n.includes('sample-break'))return hip({bpm:98,time:[0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31],kick:[0,6,10,15,16,19,26,30],snare:[4,12,20,28],ghost:[7,15,23,31],features:['two-bar sampled-break phrase','bar-to-bar kick variation','ghost-note pickups around backbeats']});
    return hip({bpm:90,kick:[0,7,10],snare:[4,12],features:['general hip-hop pocket','stable backbeat','broken bass-drum phrase']});
  }
  if(f==='Jamaica'){
    if(n.includes('mento'))return baseReggae(row,{bpm:104,kick:[0,8],snare:[4,12],rim:true}).finish({distinctiveFeatures:['pre-reggae Caribbean offbeat feel','light drum-set adaptation']});
    if(n.includes('dancehall')){const b=baseReggae(row,{bpm:n.includes('modern')?100:92,kick:[0,7,10],snare:[4,12],open:[14]});return b.finish({distinctiveFeatures:['dancehall-derived syncopated kick','sparser time hand than roots reggae']});}
    return baseReggae(row).finish();
  }
  if(f==='Electronic / Dance'){
    if(n.includes('breakbeat')||n.includes('big beat')){const b=makeBuilder(row,{bpm:126,feel:'breakbeat',notes:'Complete breakbeat/Big Beat drum-set archetype with a stable subdivision layer and broken kick/snare phrase.'});b.add('hat',b.every(1),'ghost','time');b.add('hat',b.rep([0,4,8,12]),'normal','time');b.add('snare',b.rep([4,12]),'accent','core');b.add('snare',b.rep([7,15]),'ghost','ghost');b.add('kick',b.rep([0,3,6,10,14]),'strong','core');b.add('openHat',b.rep([11]),'normal','ornament');return b.finish({distinctiveFeatures:['complete sixteenth subdivision layer','broken syncopated bass-drum phrase','strong sampled-break backbeats','ghost pickup vocabulary']});}
    if(n.includes('drum & bass')){const b=makeBuilder(row,{bpm:174,feel:'breakbeat'});b.add('hat',b.every(1),'soft','time');b.add('snare',b.rep([4,12]),'accent','core');b.add('kick',b.rep([0,6,10,15]),'strong','core');return b.finish();}
    if(n.includes('dubstep'))return baseHouse(row,{bpm:140,kick:[0,10],snare:[8],hat:[2,6,10,14]}).finish();
    if(n.includes('footwork')||n.includes('juke')){const b=makeBuilder(row,{bpm:160,feel:'footwork'});b.add('hat',b.every(1),'soft','time');b.add('snare',b.rep([4,10,12]),'strong','core');b.add('kick',b.rep([0,3,7,9,14]),'strong','core');return b.finish();}
    if(n.includes('trance'))return baseHouse(row,{bpm:138,open:[6,14]}).finish();
    if(n.includes('detroit electro'))return baseHouse(row,{bpm:126,kick:[0,8,11],snare:[4,12],hat:[2,6,10,14],open:[14]}).finish();
    if(n.includes('amapiano'))return baseHouse(row,{bpm:112,kick:[0,7,10,14],snare:[4,12],hat:[2,6,10,14]}).finish();
    if(n.includes('afro house'))return baseHouse(row,{bpm:122,kick:[0,4,8,12],snare:[4,12],hat:[2,6,10,14],open:[7,15]}).finish();
    return baseHouse(row,{bpm:124}).finish();
  }
  if(f==='Latin America'){
    if(row.tradition==='Cuba'){
      const commonRefs=['https://college.berklee.edu/courses/ilpd-373','https://online.berklee.edu/courses/arranging-and-producing-contemporary-music-styles'];
      if(n==='son')return latinCanonical(row,{bpm:94,time:[0,3,6,8,11,14,16,19,22,24,27,30],kick:[0,10,16,26],snare:[6,12,22,28],snareVel:'soft',features:['two-bar son-derived cáscara outline','sparse tumbao-supporting bass drum','two-bar phrase preserved'],references:commonRefs});
      if(n==='son montuno')return latinCanonical(row,{bpm:104,timeVoice:'ride',time:[0,3,6,8,11,14,16,18,21,24,27,30],kick:[6,14,22,30],snare:[4,12,20,28],snareVel:'soft',features:['bell/cáscara-oriented time hand','more active montuno-section orchestration','two-bar phrase'],references:commonRefs});
      if(n==='mambo')return latinCanonical(row,{bpm:118,timeVoice:'ride',time:[0,3,6,8,11,14,16,19,22,24,27,30],kick:[0,6,14,16,22,30],snare:[4,12,20,28],features:['bell-led mambo section feel','tumbao-supporting bass drum','stronger ensemble punctuation'],references:commonRefs});
      if(n==='cha-cha-cha')return latinCanonical(row,{bpm:112,timeVoice:'ride',crossStick:true,rideBell:[0,4,8,12,16,20,24,28],time:[],kick:[0,6,14,16,22,30],snare:[4,12,20,28],snareVel:'soft',features:['quarter-note cha-cha bell pulse','restrained drum-set orchestration','tumbao-derived bass support'],references:[...commonRefs,'https://online.berklee.edu/courses/drum-set-performance-101']});
      if(n==='bolero cubano')return latinCanonical(row,{bpm:72,time:[0,2,4,6,8,10,12,14,16,18,20,22,24,26,28,30],kick:[0,8,16,24],snare:[6,14,22,30],snareVel:'soft',features:['slow restrained time','sparse bass drum','soft cross-stick-like response'],references:commonRefs});
      if(n==='songo')return latinCanonical(row,{bpm:104,time:[0,2,5,7,8,10,13,15,16,18,21,23,24,26,29,31],kick:[0,3,7,10,14,16,19,23,26,30],snare:[4,11,14,20,27,30],ghost:[6,22],midTom:[12,28],features:['drum-set-native Cuban vocabulary','syncopated kick/snare conversation','tom integration without abandoning time'],references:commonRefs});
      if(n==='timba')return latinCanonical(row,{bpm:112,timeVoice:'ride',time:[0,2,5,7,8,11,13,15,16,18,21,23,24,27,29,31],kick:[0,3,6,9,13,15,16,19,22,25,29,31],snare:[4,10,14,20,26,30],ghost:[6,12,22,28],highTom:[11,27],floorTom:[15,31],features:['high-density contemporary Cuban drum-set orchestration','syncopated kick displacement','kit-wide interaction'],references:commonRefs});
      if(n==='mozambique')return latinCanonical(row,{bpm:116,timeVoice:'ride',time:[0,3,6,8,11,14,16,19,22,24,27,30],kick:[0,6,10,14,16,22,26,30],snare:[4,11,20,27],midTom:[2,9,18,25],features:['bell-led Mozambique outline','interlocking tom/snare voice','two-bar cyclic phrase'],references:commonRefs});
      if(n.includes('guaguanc'))return latinCanonical(row,{bpm:100,time:[0,3,7,10,12,16,19,23,26,28],kick:[0,10,16,26],snare:[6,12,22,28],floorTom:[3,11,19,27],features:['rumba-derived two-bar cyclic phrasing','tumba-style low-drum adaptation','space around clave-oriented accents'],references:commonRefs});
      if(n.includes('afro-cuban 6/8')||n.includes('bemb'))return latinCanonical(row,{signature:'12/8',bpm:96,feel:'afro-cuban-6-8',timeVoice:'ride',time:[0,4,6,10,12,16,18,22,24,28,30,34,36,40,42,46],kick:[0,12,24,36],snare:[6,18,30,42],midTom:[10,22,34,46],features:['12/8 bell-cycle orientation','four-limb compound-meter coordination','Afro-Cuban 6/8 drum-set adaptation'],references:[...commonRefs,'https://online.berklee.edu/courses/drum-set-performance-101']});
      if(n==='salsa 2-3')return latinCanonical(row,{bpm:176,timeVoice:'ride',crossStick:true,time:[0,3,6,8,11,14,16,18,21,24,27,30],kick:[6,14,22,30],snare:[4,12,18,24,28],snareVel:'soft',features:['two-bar 2-3 clave orientation','cáscara/bell-derived time hand','tumbao-supporting bass drum'],references:commonRefs});
      if(n==='salsa 3-2')return latinCanonical(row,{bpm:176,timeVoice:'ride',crossStick:true,time:[0,2,5,8,11,14,16,19,22,24,27,30],kick:[6,14,22,30],snare:[0,6,12,20,28],snareVel:'soft',features:['two-bar 3-2 clave orientation','cáscara/bell-derived time hand','tumbao-supporting bass drum'],references:commonRefs});
    }
    if(row.tradition==='Brazil'){
      const brazilRefs=['https://online.berklee.edu/courses/drum-set-performance-101','https://college.berklee.edu/people/fernando-brandao','https://www.drumeo.com/beat/5-styles-beginner-drummers/'];
      if(n==='bossa nova')return latinCanonical(row,{bpm:132,crossStick:true,time:[0,2,4,6,8,10,12,14,16,18,20,22,24,26,28,30],kick:[0,6,8,14,16,22,24,30],snare:[4,12,20,28],snareVel:'soft',features:['bass drum on 1, &2, 3, &4','soft cross-stick-like 2 and 4','even restrained time hand'],references:brazilRefs});
      if(n==='samba batucada')return latinCanonical(row,{bpm:104,time:[0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31],kick:[0,7,8,15,16,23,24,31],snare:[2,5,7,10,13,15,18,21,23,26,29,31],ghost:[3,11,19,27],features:['surdo-derived two-beat bass-drum motion','continuous 16th-note hand flow','syncopated tamborim/caixa-style hand phrase'],references:['https://www.moderndrummer.com/wp-content/uploads/2018/10/MD-469-1218c.pdf','https://college.berklee.edu/people/fernando-brandao']});
      if(n==='samba partido alto')return latinCanonical(row,{bpm:112,crossStick:true,time:[0,2,4,6,8,10,12,14,16,18,20,22,24,26,28,30],kick:[0,7,8,15,16,23,24,31],snare:[3,6,10,13,18,21,25,29],snareVel:'soft',features:['two-bar partido-alto-oriented cross-stick phrase','samba bass-drum ostinato','phrase asymmetry preserved'],references:['https://www.berklee.edu/events/viva-brasil','https://college.berklee.edu/people/fernando-brandao']});
      if(n==='samba-reggae')return latinCanonical(row,{bpm:96,time:[0,2,4,6,8,10,12,14,16,18,20,22,24,26,28,30],kick:[0,4,8,12,16,20,24,28],snare:[6,14,22,30],floorTom:[3,11,19,27],features:['slower bloco-derived pulse','strong low-drum foundation','offbeat hand punctuation'],references:['https://college.berklee.edu/people/fernando-brandao']});
      if(n==='baião')return latinCanonical(row,{bpm:112,timeVoice:'ride',time:[0,2,4,6,8,10,12,14,16,18,20,22,24,26,28,30],kick:[0,3,8,11,16,19,24,27],snare:[3,7,11,15,19,23,27,31],snareVel:'soft',features:['zabumba-derived bass-drum ostinato','anticipation into beat 2','triangle/ride subdivision layer'],references:['https://digital.library.adelaide.edu.au/dspace/bitstream/2440/106341/2/02whole.pdf','https://online.berklee.edu/courses/arranging-and-producing-contemporary-music-styles']});
      if(n==='maracatu')return latinCanonical(row,{bpm:96,timeVoice:'ride',time:[0,3,6,8,11,14,16,19,22,24,27,30],kick:[0,5,8,13,16,21,24,29],snare:[4,7,12,15,20,23,28,31],floorTom:[2,10,18,26],features:['alfaias-inspired low-drum dialogue','syncopated bell layer','processional weight'],references:['https://college.berklee.edu/people/fernando-brandao']});
      if(n==='frevo')return latinCanonical(row,{bpm:168,timeVoice:'ride',time:[0,2,4,6,8,10,12,14,16,18,20,22,24,26,28,30],kick:[0,4,8,12,16,20,24,28],snare:[2,6,10,14,18,22,26,30],ghost:[1,5,9,13,17,21,25,29],features:['fast march-derived pulse','active snare articulation','bright continuous time'],references:['https://college.berklee.edu/people/fernando-brandao']});
      if(n.includes('ijex')||n.includes('afox'))return latinCanonical(row,{bpm:104,timeVoice:'ride',crossStick:true,time:[0,3,6,8,11,14,16,19,22,24,27,30],kick:[6,14,22,30],snare:[0,4,8,12,16,20,24,28],snareVel:'soft',features:['ijexá-derived bell/cymbal phrase','bass drum on 2+ and 4+','quarter-note cross-stick layer'],references:['https://www.drumeo.com/beat/5-drumming-styles-youve-probably-never-heard/','https://www.berklee.edu/events/viva-brasil']});
      if(n==='samba-funk')return latinCanonical(row,{bpm:108,time:[0,1,2,3,4,5,6,7,8,9,10,11,12,13,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,31],openHat:[14,30],kick:[0,3,8,11,14,16,19,24,27,30],snare:[4,12,20,28],ghost:[2,6,10,15,18,22,26,31],features:['samba-derived bass motion','funk backbeat','16th-note ghost-note vocabulary'],references:['https://college.berklee.edu/people/fernando-brandao']});
      if(n==='samba-jazz')return latinCanonical(row,{bpm:152,timeVoice:'ride',time:[0,2,4,6,8,10,12,14,16,18,20,22,24,26,28,30],kick:[0,7,8,15,16,23,24,31],snare:[5,13,21,29],ghost:[3,11,19,27],features:['ride-led samba orchestration','surdo-derived bass ostinato','interactive snare comping'],references:['https://college.berklee.edu/people/fernando-brandao']});
      if(n.includes('choro')||n.includes('maxixe'))return latinCanonical(row,{bpm:132,crossStick:true,time:[0,2,4,6,8,10,12,14,16,18,20,22,24,26,28,30],kick:[0,6,8,14,16,22,24,30],snare:[3,7,11,15,19,23,27,31],snareVel:'soft',features:['light maxixe/choro drum-set adaptation','syncopated hand accompaniment','two-beat Brazilian bass support'],references:['https://online.berklee.edu/courses/latin-piano-styles','https://college.berklee.edu/people/fernando-brandao']});
    }
    if(row.tradition==='Colombia & Venezuela'){
      const southRefs=['https://college.berklee.edu/courses/ilpd-357','https://www.moderndrummer.com/wp-content/uploads/2018/10/MD-469-1218c.pdf'];
      if(n.includes('cumbia'))return latinCanonical(row,{bpm:92,time:[0,3,6,8,11,14,16,19,22,24,27,30],kick:[0,8,16,24],snare:[6,14,22,30],snareVel:'soft',floorTom:[3,11,19,27],features:['steady low-drum pulse','offbeat hand-drum response','two-bar drum-set adaptation preserving space'],references:southRefs});
      if(n.includes('porro'))return latinCanonical(row,{bpm:108,timeVoice:'ride',time:[0,2,5,7,8,10,13,15,16,18,21,23,24,26,29,31],kick:[0,4,10,12,16,20,26,28],snare:[4,12,20,28],features:['brass-band-oriented Colombian pulse','more active cymbal line than cumbia','strong quarter-note anchors'],references:southRefs});
      if(n.includes('chand'))return latinCanonical(row,{bpm:118,time:[0,3,6,8,11,14,16,19,22,24,27,30],kick:[0,5,8,13,16,21,24,29],snare:[4,11,14,20,27,30],features:['syncopated coastal Colombian drum-set adaptation','interlocking low/high strokes'],references:southRefs});
      if(n.includes('currulao'))return latinCanonical(row,{signature:'6/8',bpm:116,feel:'pacific-colombian-6-8',timeVoice:'ride',time:[0,2,4,6,8,10,12,14,16,18,20,22],kick:[0,6,8,12,18,20],snare:[4,10,16,22],floorTom:[2,8,14,20],features:['compound-meter Pacific Colombian feel','interlocking low drum and hand response','6/8 cyclic phrase'],references:southRefs});
      if(n.includes('joropo'))return latinCanonical(row,{signature:'6/8',bpm:168,feel:'joropo',timeVoice:'ride',time:[0,2,4,6,8,10,12,14,16,18,20,22],kick:[0,4,8,12,16,20],snare:[2,6,10,14,18,22],snareVel:'soft',features:['fast 6/8 with 3-over-2 articulation','alternating low/high pulse','continuous subdivision'],references:southRefs});
      if(n.includes('merengue venezolano'))return latinCanonical(row,{signature:'6/8',bpm:150,feel:'venezuelan-6-8',time:[0,2,4,6,8,10,12,14,16,18,20,22],kick:[0,6,12,18],snare:[4,10,16,22],features:['fast compound-meter Venezuelan pulse','distinct from Dominican merengue'],references:southRefs});
    }
    if(row.tradition==='Peru / Argentina / Uruguay'){
      const southRefs=['https://college.berklee.edu/courses/ilpd-357','https://www.berklee.edu/berklee-now/news/peruvian-music-queen'];
      if(n.includes('festejo'))return latinCanonical(row,{signature:'12/8',bpm:108,feel:'afro-peruvian',time:[0,4,6,10,12,16,18,22,24,28,30,34,36,40,42,46],kick:[0,8,12,20,24,32,36,44],snare:[6,18,30,42],floorTom:[10,22,34,46],features:['Afro-Peruvian compound pulse','cajón-inspired low/high dialogue','lively syncopated response'],references:southRefs});
      if(n.includes('land'))return latinCanonical(row,{signature:'12/8',bpm:82,feel:'afro-peruvian',time:[0,4,6,10,12,16,18,22,24,28,30,34,36,40,42,46],kick:[0,10,12,20,24,34,36,44],snare:[6,16,18,30,40,42],snareVel:'soft',features:['slower Afro-Peruvian compound cycle','cajón-inspired low/high dialogue','greater space than festejo'],references:southRefs});
      if(n.includes('chacarera'))return latinCanonical(row,{signature:'6/8',bpm:112,feel:'chacarera',time:[0,2,4,6,8,10,12,14,16,18,20,22],kick:[0,6,12,18],snare:[4,10,16,22],floorTom:[2,8,14,20],features:['6/8 folkloric pulse with hemiola implication','alternating low/high drum function'],references:['https://college.berklee.edu/courses/ilpd-357']});
      if(n.includes('zamba'))return latinCanonical(row,{signature:'6/8',bpm:78,feel:'zamba-argentina',time:[0,2,4,6,8,10,12,14,16,18,20,22],kick:[0,8,12,20],snare:[6,10,18,22],snareVel:'soft',features:['slow 6/8 Argentine folkloric pulse','restrained drum-set adaptation'],references:['https://college.berklee.edu/courses/ilpd-357']});
      if(n.includes('candombe'))return latinCanonical(row,{bpm:108,time:[0,2,5,7,8,10,13,15,16,18,21,23,24,26,29,31],kick:[0,3,8,11,16,19,24,27],snare:[4,7,12,15,20,23,28,31],floorTom:[2,6,10,14,18,22,26,30],features:['three-drum-function-inspired drum-set layering','syncopated Uruguayan pulse','continuous interlocking phrase'],references:['https://college.berklee.edu/courses/ilpd-357','https://www.moderndrummer.com/wp-content/uploads/2018/10/MD-469-1218c.pdf']});
      if(n==='tango')return latinCanonical(row,{bpm:120,time:[0,4,8,12,16,20,24,28],kick:[0,6,8,14,16,22,24,30],snare:[4,12,20,28],features:['marked tango pulse','syncopated 3-3-2-adjacent bass support','restrained cymbal role'],references:['https://college.berklee.edu/courses/ilpd-357']});
      if(n==='milonga')return latinCanonical(row,{bpm:116,time:[0,2,4,6,8,10,12,14,16,18,20,22,24,26,28,30],kick:[0,6,8,14,16,22,24,30],snare:[3,7,11,15,19,23,27,31],snareVel:'soft',features:['quicker flowing Río de la Plata pulse','continuous light subdivision','syncopated bass support'],references:['https://college.berklee.edu/courses/ilpd-357']});
    }
    return baseLatin(row).finish();
  }
  if(f==='Caribbean'){
    if(n==='merengue')return baseLatin(row,{bpm:132,kick:[0,4,8,12],snare:[4,12],time:[0,2,4,6,8,10,12,14],open:[6,14]}).finish();
    if(n.includes('plena'))return baseLatin(row,{bpm:108,kick:[0,6,10],snare:[4,11,14],time:[0,3,6,8,11,14]}).finish();
    if(n==='calypso')return baseLatin(row,{bpm:116,kick:[0,6,8,14],snare:[4,12],time:[0,2,5,7,8,10,13,15]}).finish();
    if(n==='kompa')return baseLatin(row,{bpm:96,kick:[0,6,8,14],snare:[4,12],time:[0,2,4,6,8,10,12,14],open:[14]}).finish();
    if(n==='zouk')return baseLatin(row,{bpm:104,kick:[0,3,8,11],snare:[4,12],time:[0,2,4,6,8,10,12,14],open:[6,14]}).finish();
    if(n.includes('biguine')||n.includes('beguine'))return baseLatin(row,{bpm:124,kick:[0,6,10,14],snare:[4,12],time:[0,3,6,8,11,14]}).finish();
    return baseLatin(row).finish();
  }
  if(f==='Africa'){
    if(n.includes('agbekor')||n.includes('ewe 12'))return baseCompound(row,{signature:'12/8',bpm:108,kick:[0,8,12,20],snare:[6,14,18]}).finish();
    if(n.includes('mbalax'))return baseLatin(row,{bpm:126,kick:[0,3,7,10,14],snare:[4,11,15],time:[0,2,5,7,8,10,13,15],tom:[6,12]}).finish();
    if(n.includes('soukous'))return baseLatin(row,{bpm:124,kick:[0,4,8,12],snare:[4,12],time:[0,2,4,6,8,10,12,14],open:[14]}).finish();
    if(n.includes('bikutsi'))return baseCompound(row,{signature:'6/8',bpm:132,kick:[0,4,8],snare:[2,6,10]}).finish();
    if(n.includes('mangambe'))return baseCompound(row,{signature:'6/8',bpm:118,kick:[0,6,10],snare:[4,8]}).finish();
    if(n.includes('mbaqanga'))return baseLatin(row,{bpm:118,kick:[0,4,8,12],snare:[4,12],time:[0,2,4,6,8,10,12,14]}).finish();
    if(n.includes('south african house'))return baseHouse(row,{bpm:118,kick:[0,4,8,12],hat:[2,6,10,14],snare:[4,12]}).finish();
    if(n==='sega')return baseCompound(row,{signature:'6/8',bpm:116,kick:[0,8],snare:[4,10]}).finish();
    return baseLatin(row,{bpm:118}).finish();
  }
  if(f==='North Africa / Middle East'){
    if(n.includes('raï'))return baseLatin(row,{bpm:112,kick:[0,6,8,14],snare:[4,12],time:[0,2,4,6,8,10,12,14]}).finish();
    const b=makeBuilder(row,{bpm:n.includes('malfuf')?124:n.includes('ayoub')?112:96,feel:'arabic-cycle',notes:'Drum-set adaptation of an Arabic iqa cycle. Kick represents low/dum function; snare/rim voice represents high/tek function.'});
    const cycles=n.includes('maqsum')?{k:[0,6,8],s:[4,10,14]}:n.includes('masmoudi kabir')?{k:[0,6,10],s:[4,8,14]}:{k:[0,8],s:[4,12]}; b.add('kick',b.rep(cycles.k),'strong','core');b.add('snare',b.rep(cycles.s),'normal','core');b.add('hat',b.every(2),'soft','time');return b.finish({distinctiveFeatures:['low/high stroke-function adaptation','cyclic accent pattern']});
  }
  if(f==='Balkans / Eastern Europe'){
    const sig=n.includes('11/8')?'11/8':'9/8'; const b=makeBuilder(row,{signature:sig,bpm:128,feel:'aksak',notes:'Aksak drum-set foundation preserving asymmetric grouping.'}); b.add('hat',b.every(2),'soft','time'); const kicks=sig==='11/8'?[0,4,8,14,18]:[0,4,8,12,16]; const snares=sig==='11/8'?[6,12,20]:[6,14]; b.add('kick',b.rep(kicks),'strong','core');b.add('snare',b.rep(snares),'normal','core');return b.finish({distinctiveFeatures:[sig==='11/8'?'asymmetric 11/8 grouping':'asymmetric 9/8 dance grouping']});
  }
  if(f==='South Asia'){
    const sig=n.includes('dadra')?'6/8':'4/4'; const b=makeBuilder(row,{signature:sig,bpm:n.includes('bhangra')?104:96,feel:'south-asian-adaptation',notes:'Pedagogical drum-set adaptation of a South Asian rhythmic cycle; does not replace study of dhol/tabla technique.'}); if(sig==='6/8'){b.add('kick',b.rep([0,8]),'strong','core');b.add('snare',b.rep([4,10]),'normal','core');b.add('hat',b.every(2),'soft','time');}else{b.add('kick',b.rep(n.includes('bhangra')?[0,6,8,14]:n.includes('teentaal')?[0,4,8,12]:[0,8]),'strong','core');b.add('snare',b.rep(n.includes('bhangra')?[4,12]:[4,12]),'strong','core');b.add('hat',b.every(2),'soft','time');}return b.finish();
  }
  if(f==='Global / Hybrid'){
    if(n.includes('brazilian funk'))return baseFunk(row,{bpm:108,kick:[0,3,8,11,14],ghost:[2,6,13],open:[14]}).finish();
    if(n.includes('latin rock'))return baseRock(row,{bpm:118,kick:[0,6,8,14],hatStep:2}).finish({distinctiveFeatures:['rock backbeat','Latin-derived kick syncopation']});
    if(n.includes('reggae rock'))return baseReggae(row,{bpm:92,kick:[0,8,12],snare:[4,12],open:[14]}).finish();
    if(n.includes('afrobeat-funk'))return baseFunk(row,{bpm:110,kick:[0,3,7,10,14],ghost:[2,6,11],open:[14]}).finish();
    if(n.includes('6/8'))return baseCompound(row,{signature:'6/8',bpm:112,kick:[0,8],snare:[4,10]}).finish();
  }
  // Last-resort adaptation: family-aware, unique but deliberately flagged for review.
  const seed=hashInt(id); const b=makeBuilder(row,{bpm:90+(seed%50),notes:'Fallback pedagogical adaptation generated from family-level grammar. Requires expert review before high-confidence publication.',confidence:.45});
  const kick=uniq([0,8,6+(seed%3),12+(seed%4)].map(x=>x%16)); const snare=uniq([4,12,10+(seed%3)].map(x=>x%16)); b.add('hat',b.every(2),'soft','time'); b.add('kick',b.rep(kick),'strong','core'); b.add('snare',b.rep(snare),'normal','core'); return b.finish();
}


function grooveFingerprint(g){ return crypto.createHash('sha1').update(JSON.stringify([g.signature,(g.events||[]).map(e=>[e.tick,e.instrument,e.articulation,e.velocityClass])])).digest('hex').slice(0,16); }
const taxonomy=parseCsv(await readFile(taxonomyPath,'utf8'));
// Canonical JSON is the stable source of truth once it exists. Runtime Curated is an output,
// never an input for later builds; this makes publication holds/merges fully idempotent.
const existingCanonical=new Map();
try {
  for(const file of (await readdir(outDir)).filter(x=>x.endsWith('.json'))){
    const g=JSON.parse(await readFile(new URL(`../musicology/canonical-grooves/${file}`,import.meta.url),'utf8'));
    if(g?.id) existingCanonical.set(g.id,g);
  }
} catch {}
const current=JSON.parse(await readFile(curatedPath,'utf8'));
const oldManifest=JSON.parse(await readFile(manifestPath,'utf8'));
const collisionIds=new Set((oldManifest.duplicateConflicts||[]).flatMap(c=>[c.winner,...(c.conflicts||[]).map(x=>x.id)]));
const existing=new Map((current.grooves||[]).map(g=>[g.canonicalId,g]));
await mkdir(outDir,{recursive:true}); await mkdir(midiDir,{recursive:true});
const corpus=[];
for(const row of taxonomy){
  let groove;
  const prior=existingCanonical.get(row.id);
  const source=existing.get(row.id);
  if(LATIN_REBUILD_IDS.has(row.id)||V19_REBUILD_IDS.has(row.id)||V20_REBUILD_IDS.has(row.id)){
    groove=templateFor(row);
  } else if(prior){
    groove={...prior,id:row.id,family:row.family,tradition:row.tradition,name:row.archetype,metadata:{...(prior.metadata||{}),tier:row.tier,originalCoverage:row.coverage}};
  } else if(source && !collisionIds.has(row.id)){ groove=patternToCanonical({id:row.id,family:row.family,tradition:row.tradition,name:row.archetype,bpm:source.bpm,signature:source.signature,pattern:source.pattern,metadata:{validationState:source.validationState||'candidate-transcoded',confidence:source.confidence||.7,sourceType:source.sourceType||'canonical-curated',provenance:source.provenance||{},feel:source.feel||'straight',tier:row.tier,originalCoverage:row.coverage,notes:'Transcoded from the best currently selected source pattern; retained for review in canonical event form.'}}); }
  else groove=templateFor(row);
  const fp=grooveFingerprint(groove);
  const file=`${row.id}-${slug(row.archetype)}.json`, midi=`${row.id}-${slug(row.archetype)}.mid`;
  await writeCanonicalAndMidi(groove,new URL(`../musicology/canonical-grooves/${file}`,import.meta.url),new URL(`../musicology/midi/${midi}`,import.meta.url));
  corpus.push({id:row.id,name:row.archetype,family:row.family,tradition:row.tradition,file:`musicology/canonical-grooves/${file}`,midi:`musicology/midi/${midi}`,validationState:groove.metadata?.validationState,confidence:groove.metadata?.confidence,sourceType:groove.metadata?.sourceType,eventCount:groove.events.length,signature:groove.signature,bpm:groove.bpm,fingerprint:fp});
}
await writeFile(indexPath,JSON.stringify({schema:'battrochtek.canonical-corpus-index/v1',version:'1.0.0',ppq:PPQ,count:corpus.length,generatedAt:new Date().toISOString(),entries:corpus},null,2));
console.log(`✓ Canonical corpus: ${corpus.length} archetypes + ${corpus.length} Standard MIDI Files (duplicates are preserved for review, never cosmetically altered).`);
