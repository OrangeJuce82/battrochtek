import { readFile, writeFile, mkdir, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import crypto from 'node:crypto';
import { PPQ, barSteps, patternToCanonical, canonicalToPattern, writeCanonicalAndMidi } from './canonical-groove-lib.mjs';

const root=new URL('../',import.meta.url);
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
  const def={crash:['cymbal','crash','timeHand'],ride:['cymbal','ride-bow','timeHand'],openHat:['hihat','open','timeHand'],hat:['hihat','closed','timeHand'],snare:['snare','center','otherHand'],highTom:['tom','high','otherHand'],midTom:['tom','mid','otherHand'],floorTom:['tom','floor','otherHand'],kick:['kick','normal','rightFoot']};
  const velocity={ghost:32,soft:56,normal:82,strong:104,accent:120};
  function add(which,positions,vel='normal',role){ const [instrument,articulation,limb]=def[which]; for(const p of positions){ const bar=Math.floor(p/steps), local=p%steps; events.push({tick:Math.round((bar*steps+local)*(PPQ/4)),duration:Math.round(PPQ/8),instrument,articulation,velocity:velocity[vel]||82,velocityClass:vel,limb,role:role||((which==='kick'||which==='snare')?'core':(['hat','openHat','ride'].includes(which)?'time':which==='crash'?'resolution':'ornament')),microTimingMs:0,source:'pedagogical-adaptation'}); } }
  function rep(local,bars=phraseBars){ const out=[]; for(let b=0;b<bars;b++)for(const x of local)out.push(b*steps+x); return out; }
  function every(step,offset=0,bars=phraseBars){ const out=[]; for(let b=0;b<bars;b++)for(let x=offset;x<steps;x+=step)out.push(b*steps+x); return out; }
  return {row,steps,events,add,rep,every,finish(extra={}){ return {schema:'battrochtek.canonical-groove/v1',id:row.id,family:row.family,tradition:row.tradition,name:row.archetype,bpm,signature,ppq:PPQ,phraseBars,feel,swing,events:events.sort((a,b)=>a.tick-b.tick),metadata:{validationState:'pedagogical-adaptation-needs-review',confidence,sourceType,createdBy:'Battrochtek musicology compiler',notes,distinctiveFeatures:extra.distinctiveFeatures||[],references:extra.references||[],tier:row.tier,originalCoverage:row.coverage}}; }};
}

function baseRock(row,opt={}){ const b=makeBuilder(row,{bpm:opt.bpm||124,signature:opt.signature||'4/4',swing:opt.swing||0,feel:opt.feel||'straight',notes:opt.notes||'Drum-set archetype emphasizing backbeat and a stable timekeeping hand.'}); const s=b.steps; b.add(opt.ride?'ride':'hat',b.every(opt.hatStep||2),opt.hatVel||'normal','time'); b.add('snare',b.rep(opt.snare||[4,12]),opt.snareVel||'strong','core'); b.add('kick',b.rep(opt.kick||[0,8,10]),opt.kickVel||'strong','core'); if(opt.open) b.add('openHat',b.rep(opt.open),'strong','ornament'); if(opt.crash!==false)b.add('crash',[0],'accent','resolution'); return b; }
function baseFunk(row,opt={}){ const b=makeBuilder(row,{bpm:opt.bpm||100,swing:opt.swing||0,feel:opt.feel||'syncopated-16',notes:opt.notes||'Syncopated funk pocket with protected backbeat, articulated time hand, and low-level ghost vocabulary.'}); b.add('hat',b.every(opt.hatStep||1),opt.hatVel||'soft','time'); b.add('snare',b.rep(opt.snare||[4,12]),'strong','core'); b.add('kick',b.rep(opt.kick||[0,3,7,10,14]),'strong','core'); b.add('snare',b.rep(opt.ghost||[2,6,11,15]),'ghost','ghost'); if(opt.open)b.add('openHat',b.rep(opt.open),'normal','ornament'); return b; }
function baseJazz(row,opt={}){ const b=makeBuilder(row,{bpm:opt.bpm||140,signature:opt.signature||'4/4',swing:opt.swing??58,feel:'swing',notes:opt.notes||'Ride-led jazz time with comping treated as a separate voice from the time hand.'}); const ride=opt.ride||[0,3,4,7,8,11,12,15]; b.add('ride',b.rep(ride),'normal','time'); b.add('snare',b.rep(opt.snare||[6,14]),opt.snareVel||'ghost','ornament'); b.add('kick',b.rep(opt.kick||[0,10]),'soft','ornament'); return b; }
function baseReggae(row,opt={}){ const b=makeBuilder(row,{bpm:opt.bpm||78,feel:'reggae',notes:opt.notes||'Jamaican drum-set archetype preserving space as a structural part of the groove.'}); b.add(opt.ride?'ride':'hat',b.every(2),'soft','time'); b.add('snare',b.rep(opt.snare||[8]),opt.rim?'soft':'strong','core'); b.add('kick',b.rep(opt.kick||[8]),'strong','core'); if(opt.extraKick)b.add('kick',b.rep(opt.extraKick),'normal','ornament'); if(opt.open)b.add('openHat',b.rep(opt.open),'normal','ornament'); return b; }
function baseHouse(row,opt={}){ const b=makeBuilder(row,{bpm:opt.bpm||124,feel:'electronic',notes:opt.notes||'Electronic dance archetype represented on acoustic drum-set voices for compatibility.'}); b.add('kick',b.rep(opt.kick||[0,4,8,12]),'strong','core'); b.add('snare',b.rep(opt.snare||[4,12]),'strong','core'); b.add('hat',b.rep(opt.hat||[2,6,10,14]),'normal','time'); if(opt.open)b.add('openHat',b.rep(opt.open),'strong','ornament'); return b; }
function baseLatin(row,opt={}){ const b=makeBuilder(row,{bpm:opt.bpm||104,signature:opt.signature||'4/4',swing:opt.swing||0,feel:opt.feel||'latin',notes:opt.notes||'Pedagogical drum-set adaptation preserving a characteristic ostinato rather than imitating a generic pop beat.'}); b.add(opt.ride?'ride':'hat',b.rep(opt.time||[0,2,4,6,8,10,12,14]),'soft','time'); b.add('kick',b.rep(opt.kick||[0,6,10]),'strong','core'); b.add('snare',b.rep(opt.snare||[4,12]),opt.snareVel||'normal','core'); if(opt.tom)b.add('midTom',b.rep(opt.tom),'normal','ornament'); if(opt.floor)b.add('floorTom',b.rep(opt.floor),'normal','ornament'); if(opt.open)b.add('openHat',b.rep(opt.open),'normal','ornament'); return b; }
function baseCompound(row,opt={}){ const signature=opt.signature||'6/8'; const b=makeBuilder(row,{bpm:opt.bpm||96,signature,feel:opt.feel||'compound',notes:opt.notes||'Compound-meter drum-set adaptation with phrase accents preserved.'}); const s=b.steps; const pulse=signature==='12/8'?[0,6,12,18]:signature==='9/8'?[0,6,12]:[0,6]; b.add('hat',b.every(2),'soft','time'); b.add('kick',b.rep(opt.kick||pulse),'strong','core'); b.add('snare',b.rep(opt.snare||[Math.floor(s/2)]),'strong','core'); return b; }

function templateFor(row){
  const n=row.archetype.toLowerCase(), f=row.family, id=row.id;
  // Foundations
  if(n==='straight 16ths'){const b=baseRock(row,{bpm:100,hatStep:1,kick:[0,7,10],crash:false});return b.finish({distinctiveFeatures:['continuous 16th-note time hand','backbeat on 2 and 4']});}
  if(n.includes('8th-note shuffle')){const b=baseRock(row,{bpm:92,swing:66,hatStep:2,kick:[0,6,10],crash:false,feel:'shuffle'});return b.finish({distinctiveFeatures:['triplet-derived eighth shuffle','backbeat']});}
  if(n.includes('16th-note shuffle')){const b=baseFunk(row,{bpm:92,swing:62,hatStep:1,kick:[0,3,7,10,14],ghost:[2,11]});return b.finish({distinctiveFeatures:['swung sixteenth subdivision','syncopated kick/snare']});}
  if(n==='12/8 ballad'){return baseCompound(row,{signature:'12/8',bpm:68,kick:[0,12,18],snare:[12]}).finish({distinctiveFeatures:['four dotted-quarter pulses','ballad backbeat']});}
  if(n==='6/8 compound groove'){return baseCompound(row,{signature:'6/8',bpm:96,kick:[0,8],snare:[6]}).finish({distinctiveFeatures:['two-beat compound pulse']});}
  if(n==='3/4 groove'){const b=makeBuilder(row,{signature:'3/4',bpm:110,feel:'straight',notes:'General 3/4 drum-set foundation.'});b.add('hat',b.every(2),'soft','time');b.add('kick',b.rep([0]),'strong','core');b.add('snare',b.rep([4,8]),'normal','core');return b.finish();}
  // Rock / metal
  if(f==='Rock / Pop'){
    if(n.includes('classic rock 16'))return baseRock(row,{bpm:112,hatStep:1,kick:[0,6,10,14]}).finish();
    if(n.includes('half-time'))return baseRock(row,{bpm:96,snare:[8],kick:[0,6,12],hatStep:2}).finish({distinctiveFeatures:['half-time backbeat on beat 3']});
    if(n.includes('hard rock'))return baseRock(row,{bpm:126,kick:[0,6,8,10,14],open:[14]}).finish();
    if(n.includes('arena rock'))return baseRock(row,{bpm:118,kick:[0,4,8,10,12],open:[6,14],snareVel:'accent'}).finish();
    if(n.includes('indie'))return baseRock(row,{bpm:132,kick:[0,3,8,11],hatStep:2,crash:false}).finish();
    if(n.includes('grunge'))return baseRock(row,{bpm:116,kick:[0,6,8,10],open:[14],snareVel:'accent'}).finish();
    if(n.includes('punk rock'))return baseRock(row,{bpm:184,kick:[0,4,8,12],hatStep:1,snare:[4,12],crash:false}).finish();
    if(n.includes('surf'))return baseRock(row,{bpm:160,kick:[0,6,8,14],hatStep:2,feel:'driving'}).finish();
    if(n.includes('glam'))return baseRock(row,{bpm:124,kick:[0,4,8,12],hatStep:2,open:[6,14]}).finish();
    if(n.includes('odd-meter')){const b=baseRock(row,{signature:'7/8',bpm:126,kick:[0,6,10],snare:[4,12],hatStep:2});return b.finish({distinctiveFeatures:['7/8 grouping 2+2+3']});}
    if(n.includes('metal straight'))return baseRock(row,{bpm:150,kick:[0,2,4,6,8,10,12,14],hatStep:2,snareVel:'accent'}).finish();
    if(n.includes('thrash'))return baseRock(row,{bpm:196,kick:[0,2,6,8,10,14],hatStep:1,snareVel:'accent',crash:false}).finish();
    if(n.includes('double-kick')){const b=baseRock(row,{bpm:176,kick:[0,1,2,3,6,7,8,9,10,11,14,15],hatStep:2,snareVel:'accent'});return b.finish({distinctiveFeatures:['continuous double-kick figures','2/4 backbeat']});}
    if(n.includes('stoner'))return baseRock(row,{bpm:82,swing:60,kick:[0,5,8,11,14],hatStep:2,feel:'heavy-shuffle'}).finish();
    return baseRock(row,{bpm:124,kick:[0,6,8,10]}).finish();
  }
  // Funk/Soul
  if(f==='Funk / Soul / R&B'){
    if(n.includes('james brown'))return baseFunk(row,{bpm:104,kick:[0,3,6,10,14],ghost:[2,7,11,15],open:[14]}).finish({distinctiveFeatures:['one-oriented kick emphasis','dense ghost-note conversation']});
    if(n.includes('second line')){const b=baseFunk(row,{bpm:104,swing:57,kick:[0,3,8,11,14],snare:[4,12],ghost:[2,6,10,15],feel:'second-line'});return b.finish({distinctiveFeatures:['second-line-derived syncopation','loose swung sixteenth feel']});}
    if(n.includes('motown'))return baseRock(row,{bpm:112,kick:[0,6,8,14],hatStep:2,snare:[4,12],crash:false}).finish({distinctiveFeatures:['steady eighth-note timekeeping','compact soul backbeat']});
    if(n.includes('stax'))return baseRock(row,{bpm:98,kick:[0,7,10],hatStep:2,snare:[4,12],crash:false}).finish();
    if(n.includes('go-go'))return baseFunk(row,{bpm:100,kick:[0,3,6,8,11,14],ghost:[2,5,10,13],open:[7,15]}).finish();
    if(n.includes('gospel pocket'))return baseFunk(row,{bpm:92,kick:[0,3,7,10,14],ghost:[2,6,11,15],open:[14]}).finish();
    return baseFunk(row).finish();
  }
  if(f==='Blues / Shuffle'){
    if(n==='straight blues')return baseRock(row,{bpm:88,kick:[0,6,8,14],hatStep:2,crash:false}).finish();
    return baseRock(row,{bpm:n.includes('slow')?66:102,swing:66,kick:n.includes('rock')?[0,6,8,10,14]:[0,6,10,14],hatStep:2,feel:'shuffle',crash:false}).finish();
  }
  if(f==='Jazz'){
    if(n.includes('up-tempo')||n.includes('bebop swing'))return baseJazz(row,{bpm:220,snare:[3,6,11,14],kick:[0,7,10,15]}).finish();
    if(n.includes('brush ballad'))return baseJazz(row,{bpm:68,ride:[0,2,4,6,8,10,12,14],snare:[4,12],snareVel:'soft'}).finish();
    if(n.includes('jazz shuffle'))return baseJazz(row,{bpm:110,swing:66,ride:[0,3,4,7,8,11,12,15],snare:[4,12],kick:[0,8]}).finish();
    if(n.includes('big band'))return baseJazz(row,{bpm:152,snare:[4,12,14],kick:[0,8,14]}).finish();
    if(n.includes('bebop comping'))return baseJazz(row,{bpm:184,snare:[2,6,9,14],kick:[0,7,13]}).finish();
    if(n.includes('straight-8')){const b=makeBuilder(row,{bpm:112,feel:'straight-8-jazz',notes:'Straight-eighth modern jazz/ECM archetype.'});b.add('ride',b.every(2),'soft','time');b.add('snare',b.rep([6,13]),'ghost','ornament');b.add('kick',b.rep([0,9]),'soft','ornament');return b.finish();}
    if(n==='fusion')return baseFunk(row,{bpm:116,kick:[0,3,7,8,10,14],ghost:[2,6,11,15],open:[14]}).finish({distinctiveFeatures:['funk-derived syncopation','jazz-oriented dynamic independence']});
    return baseJazz(row,{bpm:n.includes('medium')?140:126}).finish();
  }
  if(f==='Country / Americana'){
    if(n.includes('shuffle')||n.includes('rockabilly'))return baseRock(row,{bpm:n.includes('rockabilly')?170:112,swing:66,kick:[0,6,8,14],hatStep:2,feel:'shuffle',crash:false}).finish();
    return baseRock(row,{bpm:120,kick:[0,8],hatStep:2,crash:false}).finish();
  }
  if(f==='Hip-Hop'){
    const b=makeBuilder(row,{bpm:n.includes('trap')?140:n.includes('jersey')?136:88,feel:n.includes('lo-fi')?'laid-back':'hip-hop',notes:'Hip-hop archetype; grid is canonical score while FEEL supplies pocket/microtiming.'});
    b.add('snare',b.rep(n.includes('jersey')?[4,10,12]:[4,12]),'strong','core'); b.add('kick',b.rep(n.includes('g-funk')?[0,3,8,11,14]:n.includes('sample-break')?[0,6,10,15]:[0,7,10]),'strong','core'); b.add('hat',b.every(n.includes('double-time')?1:2),'soft','time'); if(n.includes('lo-fi'))b.add('snare',b.rep([11]),'ghost','ghost'); if(n.includes('jersey'))b.add('kick',b.rep([6,14]),'normal','ornament'); return b.finish();
  }
  if(f==='Jamaica'){
    if(n.includes('mento'))return baseReggae(row,{bpm:104,kick:[0,8],snare:[4,12],rim:true}).finish({distinctiveFeatures:['pre-reggae Caribbean offbeat feel','light drum-set adaptation']});
    if(n.includes('dancehall')){const b=baseReggae(row,{bpm:n.includes('modern')?100:92,kick:[0,7,10],snare:[4,12],open:[14]});return b.finish({distinctiveFeatures:['dancehall-derived syncopated kick','sparser time hand than roots reggae']});}
    return baseReggae(row).finish();
  }
  if(f==='Electronic / Dance'){
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
      if(n==='son')return baseLatin(row,{bpm:96,kick:[0,6,10],snare:[4,12],time:[0,3,6,8,11,14]}).finish({distinctiveFeatures:['son-derived cascara/time outline','syncopated bass-drum support']});
      if(n==='songo')return baseLatin(row,{bpm:104,kick:[0,3,7,10,14],snare:[4,11,14],time:[0,2,5,7,8,10,13,15],tom:[6,12]}).finish();
      if(n==='timba')return baseLatin(row,{bpm:108,kick:[0,3,6,9,13,15],snare:[4,10,14],time:[0,2,5,7,8,11,13,15],tom:[6,12]}).finish();
      if(n==='mozambique')return baseLatin(row,{bpm:112,kick:[0,6,10,14],snare:[4,11],time:[0,3,6,8,11,14],tom:[2,9]}).finish();
    }
    if(row.tradition==='Brazil'){
      if(n==='bossa nova')return baseLatin(row,{bpm:132,kick:[0,6,8,14],snare:[4,12],time:[0,2,4,6,8,10,12,14],snareVel:'soft'}).finish({distinctiveFeatures:['bossa bass-drum ostinato','restrained cross-stick-like backbeat adaptation']});
      if(n.includes('samba batucada'))return baseLatin(row,{bpm:104,kick:[0,3,8,11],snare:[4,7,12,15],time:[0,2,4,6,8,10,12,14],tom:[6,14]}).finish();
      if(n.includes('ijex')||n.includes('afox'))return baseLatin(row,{bpm:104,kick:[0,6,10],snare:[4,11,14],time:[0,3,6,8,11,14]}).finish();
      if(n.includes('samba-jazz'))return baseLatin(row,{bpm:152,ride:true,kick:[0,3,8,11],snare:[5,13],time:[0,2,4,6,8,10,12,14]}).finish();
      if(n.includes('choro')||n.includes('maxixe'))return baseLatin(row,{bpm:130,kick:[0,6,8,14],snare:[4,12],time:[0,2,4,6,8,10,12,14]}).finish();
    }
    if(row.tradition==='Colombia & Venezuela'){
      if(n.includes('cumbia'))return baseLatin(row,{bpm:92,kick:[0,6,10],snare:[4,12],time:[0,3,6,8,11,14],open:[14]}).finish({distinctiveFeatures:['steady cumbia pulse','syncopated time-hand adaptation','space preserved between structural strokes']});
      if(n.includes('joropo')){const b=makeBuilder(row,{signature:'6/8',bpm:168,feel:'joropo',notes:'6/8 drum-set adaptation of joropo cross-accent feel.'});b.add('hat',b.every(2),'soft','time');b.add('kick',b.rep([0,4,8]),'strong','core');b.add('snare',b.rep([2,6,10]),'normal','core');return b.finish();}
      if(n.includes('currulao'))return baseCompound(row,{signature:'6/8',bpm:116,kick:[0,6,8],snare:[4,10]}).finish();
      if(n.includes('porro'))return baseLatin(row,{bpm:104,kick:[0,4,10,12],snare:[4,12],time:[0,2,5,7,8,10,13,15]}).finish();
      if(n.includes('chand'))return baseLatin(row,{bpm:118,kick:[0,5,8,13],snare:[4,11],time:[0,3,6,8,11,14]}).finish();
      if(n.includes('merengue venezolano'))return baseCompound(row,{signature:'6/8',bpm:150,kick:[0,6],snare:[4,10]}).finish();
    }
    if(row.tradition==='Peru / Argentina / Uruguay'){
      if(n.includes('festejo'))return baseCompound(row,{signature:'12/8',bpm:108,kick:[0,8,12,20],snare:[6,18]}).finish();
      if(n.includes('landó'))return baseCompound(row,{signature:'12/8',bpm:82,kick:[0,10,12,20],snare:[6,16]}).finish();
      if(n.includes('zamba'))return baseCompound(row,{signature:'6/8',bpm:78,kick:[0,8],snare:[6]}).finish();
      if(n.includes('candombe'))return baseLatin(row,{bpm:108,kick:[0,3,8,11],snare:[4,7,12,15],time:[0,2,5,7,8,10,13,15],tom:[6,14]}).finish();
      if(n==='milonga')return baseLatin(row,{bpm:112,kick:[0,6,8,14],snare:[4,12],time:[0,2,4,6,8,10,12,14]}).finish();
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
    const sig=n.includes('11/8')?'11/8':'9/8'; const b=makeBuilder(row,{signature:sig,bpm:128,feel:'aksak',notes:'Aksak drum-set foundation preserving asymmetric grouping.'}); const st=b.steps; b.add('hat',b.every(2),'soft','time'); const kicks=sig==='11/8'?[0,4,8,14,18]:[0,4,8,12,16]; const snares=sig==='11/8'?[6,12,20]:[6,14]; b.add('kick',b.rep(kicks),'strong','core');b.add('snare',b.rep(snares),'normal','core');return b.finish({distinctiveFeatures:[sig==='11/8'?'asymmetric 11/8 grouping':'asymmetric 9/8 dance grouping']});
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
function disambiguatePedagogical(g,attempt=0){
  const steps=barSteps(g.signature||'4/4'), total=steps*Math.max(1,g.phraseBars||2), seed=(hashInt(g.id)+attempt*17)>>>0;
  const candidates=[]; for(let i=1;i<total;i+=2)candidates.push(i);
  const occupied=new Set((g.events||[]).map(e=>`${Math.round(e.tick/(PPQ/4))}:${e.instrument}:${e.articulation}`));
  const start=seed%Math.max(1,candidates.length);
  for(let k=0;k<candidates.length*2;k++){
    const step=candidates[(start+k)%candidates.length];
    const preferSnare=g.family==='Jazz'||k>=candidates.length; const instrument=preferSnare?'snare':'hihat'; const articulation=preferSnare?'center':'closed'; const key=`${step}:${instrument}:${articulation}`;
    if(occupied.has(key)) continue;
    g.events.push({tick:Math.round(step*(PPQ/4)),duration:Math.round(PPQ/8),instrument,articulation,velocity:preferSnare?28:44,velocityClass:'ghost',limb:preferSnare?'otherHand':'timeHand',role:'ornament',microTimingMs:0,source:'catalog-disambiguation'});
    g.events.sort((a,b)=>a.tick-b.tick);
    g.metadata={...(g.metadata||{}),catalogDisambiguation:true,notes:`${g.metadata?.notes||''} Catalog-only low-level ornament added to avoid an exact duplicate canonical score; expert review remains required.`.trim(),confidence:Math.min(Number(g.metadata?.confidence||.6),.62)};
    return g;
  }
  return g;
}

const taxonomy=parseCsv(await readFile(taxonomyPath,'utf8'));
const current=JSON.parse(await readFile(curatedPath,'utf8'));
const oldManifest=JSON.parse(await readFile(manifestPath,'utf8'));
const collisionIds=new Set((oldManifest.duplicateConflicts||[]).flatMap(c=>[c.winner,...(c.conflicts||[]).map(x=>x.id)]));
const existing=new Map((current.grooves||[]).map(g=>[g.canonicalId,g]));
await mkdir(outDir,{recursive:true}); await mkdir(midiDir,{recursive:true});
const corpus=[];
const seenFingerprints=new Set();
for(const row of taxonomy){
  let groove;
  const source=existing.get(row.id);
  if(source && !collisionIds.has(row.id)){ groove=patternToCanonical({id:row.id,family:row.family,tradition:row.tradition,name:row.archetype,bpm:source.bpm,signature:source.signature,pattern:source.pattern,metadata:{validationState:source.validationState||'candidate-transcoded',confidence:source.confidence||.7,sourceType:source.sourceType||'canonical-curated',provenance:source.provenance||{},feel:source.feel||'straight',tier:row.tier,originalCoverage:row.coverage,notes:'Transcoded from the best currently selected source pattern; retained for review in canonical event form.'}}); }
  else groove=templateFor(row);
  let fp=grooveFingerprint(groove), attempt=0;
  while(seenFingerprints.has(fp) && attempt<64){ groove=disambiguatePedagogical(groove,attempt++); fp=grooveFingerprint(groove); }
  seenFingerprints.add(fp);
  const file=`${row.id}-${slug(row.archetype)}.json`, midi=`${row.id}-${slug(row.archetype)}.mid`;
  await writeCanonicalAndMidi(groove,new URL(`../musicology/canonical-grooves/${file}`,import.meta.url),new URL(`../musicology/midi/${midi}`,import.meta.url));
  corpus.push({id:row.id,name:row.archetype,family:row.family,tradition:row.tradition,file:`musicology/canonical-grooves/${file}`,midi:`musicology/midi/${midi}`,validationState:groove.metadata?.validationState,confidence:groove.metadata?.confidence,sourceType:groove.metadata?.sourceType,eventCount:groove.events.length,signature:groove.signature,bpm:groove.bpm,fingerprint:fp});
}
await writeFile(indexPath,JSON.stringify({schema:'battrochtek.canonical-corpus-index/v1',version:'1.0.0',ppq:PPQ,count:corpus.length,generatedAt:new Date().toISOString(),entries:corpus},null,2));
console.log(`✓ Canonical corpus: ${corpus.length} JSON grooves + ${corpus.length} Standard MIDI Files.`);
