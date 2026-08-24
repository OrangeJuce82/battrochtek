import { access, cp, mkdir, readFile, readdir, rename, writeFile } from "node:fs/promises";
import { basename, extname, join, relative, resolve } from "node:path";
import { spawn } from "node:child_process";
import { createHash } from "node:crypto";

const ROOT = resolve(new URL("..", import.meta.url).pathname);
const argv = process.argv.slice(2);
const arg = name => { const i=argv.indexOf(`--${name}`); return i>=0 ? argv[i+1] : null; };
const flag = name => argv.includes(`--${name}`);
const profile = arg("profile");
const sourceArg = arg("source");
if (!profile || !sourceArg) {
  console.error("Usage: node scripts/import-sample-pack.mjs --profile <ferrosintesis-drumkit|ferrosintesis-accents|oramics-lm2|oramics-909|vcsl-world> --source <folder> [--dry-run]");
  process.exit(2);
}
const sourceRoot = resolve(sourceArg);
await access(sourceRoot);
const dryRun=flag("dry-run");

const PROFILES = {
  "ferrosintesis-drumkit": {
    bank:"jazz-club", kitName:"JAZZ CLUB", kitColor:"#c9a35c", sourceCollection:"Virtuosity Drums / ferrosintesis curated core", license:"CC0-1.0",
    sourceUrl:"https://github.com/0x4D44/ferrosintesis", destination:"sounds/imported/jazz-club",
    matcher: /^(hhc|hho|hhp|kick|ride|ridebell|sidestick|snare|tomhi|tomlo)_vl(\d+)_rr(\d+)\.(?:wav|flac)$/i,
    classify(match) {
      const code=match[1].toLowerCase();
      const map={hhc:["hihat","closed","hat"],hho:["hihat","open","hat"],hhp:["hihat","pedal","hat"],kick:["kick","hit","kick"],ride:["ride","bow","cymbal"],ridebell:["ride","bell","cymbal"],sidestick:["snare","cross-stick","snare"],snare:["snare","hit","snare"],tomhi:["tom","hit","tom"],tomlo:["tom","hit","tom"]};
      return {code,...Object.fromEntries(["instrument","articulation","legacyType"].map((k,i)=>[k,map[code][i]])),vl:Number(match[2]),rr:Number(match[3]),chokeGroup:code.startsWith("hh")?"jazz-club-hat":null};
    }
  },
  "ferrosintesis-accents": {
    bank:"jazz-club", kitName:"JAZZ CLUB", kitColor:"#c9a35c", sourceCollection:"Virtuosity Drums + Big Rusty / ferrosintesis curated accents", license:"CC0-1.0",
    sourceUrl:"https://github.com/0x4D44/ferrosintesis", destination:"sounds/imported/jazz-club",
    matcher: /^(crash|splash|china)(?:_vl(\d+))?(?:_rr(\d+))?\.(?:wav|flac)$/i,
    classify(match) { const code=match[1].toLowerCase(); return {code,instrument:code==="crash"?"crash":"cymbal",articulation:code,legacyType:"cymbal",vl:Number(match[2]||1),rr:Number(match[3]||1),chokeGroup:null}; }
  },
  "oramics-lm2": {
    bank:"lm2", kitName:"LM-2", kitColor:"#00a7a7", sourceCollection:"Oramics Sampled — LM-2", license:"Public-Domain", sourceUrl:"https://github.com/oramics/sampled/tree/master/DM/LM-2", destination:"sounds/imported/lm2",
    matcher:/\.(?:wav|aif|aiff|flac)$/i, classify: genericDrumClassifier
  },
  "oramics-909": {
    bank:"909-detroit", kitName:"909 DETROIT", kitColor:"#ff5a36", sourceCollection:"Oramics Sampled — TR-909 Detroit", license:"Public-Domain", sourceUrl:"https://github.com/oramics/sampled/tree/master/DM/TR-909/Detroit", destination:"sounds/imported/909-detroit",
    matcher:/\.(?:wav|aif|aiff|flac)$/i, classify: genericDrumClassifier
  },
  "vcsl-world": {
    bank:"world-percussion", kitName:"WORLD PERCUSSION", kitColor:"#e48a1d", sourceCollection:"Versilian Community Sample Library", license:"CC0-1.0", sourceUrl:"https://github.com/sgossner/VCSL", destination:"sounds/imported/world",
    matcher:/\.(?:wav|aif|aiff|flac)$/i, classify: worldClassifier
  }
};
const cfg=PROFILES[profile];
if(!cfg){ console.error(`Unknown profile: ${profile}`); process.exit(2); }

function genericDrumClassifier(match, file){
  const s=file.toLowerCase().replace(/[^a-z0-9]+/g," ");
  const has=(...v)=>v.some(x=>s.includes(x));
  if(has("kick","bd ","bass drum")) return {code:"kick",instrument:"kick",articulation:"hit",legacyType:"kick"};
  if(has("sidestick","side stick","cross stick","crossstick")) return {code:"sidestick",instrument:"snare",articulation:"cross-stick",legacyType:"snare"};
  if(has("rimshot","rim shot"," rim ")) return {code:"rimshot",instrument:"snare",articulation:"rimshot",legacyType:"snare"};
  if(has("clap")) return {code:"clap",instrument:"snare",articulation:"clap",legacyType:"snare"};
  if(has("snare"," sd ")) return {code:"snare",instrument:"snare",articulation:"hit",legacyType:"snare"};
  if(has("open hat","openhat","ohh","hh open")) return {code:"hho",instrument:"hihat",articulation:"open",legacyType:"hat",chokeGroup:`${cfg?.bank||"import"}-hat`};
  if(has("pedal hat","pedalhat","foot hat")) return {code:"hhp",instrument:"hihat",articulation:"pedal",legacyType:"hat",chokeGroup:`${cfg?.bank||"import"}-hat`};
  if(has("closed hat","closedhat","chh","hh closed","hihat","hi hat")) return {code:"hhc",instrument:"hihat",articulation:"closed",legacyType:"hat",chokeGroup:`${cfg?.bank||"import"}-hat`};
  if(has("ride bell","ridebell")) return {code:"ridebell",instrument:"ride",articulation:"bell",legacyType:"cymbal"};
  if(has("ride")) return {code:"ride",instrument:"ride",articulation:"bow",legacyType:"cymbal"};
  if(has("crash")) return {code:"crash",instrument:"crash",articulation:"crash",legacyType:"cymbal"};
  if(has("tom")) return {code:has("high","hi ")?"tomhi":has("low","floor")?"tomlo":"tommid",instrument:"tom",articulation:"hit",legacyType:"tom"};
  if(has("cowbell")) return {code:"cowbell",instrument:"percussion",articulation:"cowbell",legacyType:"perc"};
  return null;
}
function worldClassifier(match,file){
  const s=file.toLowerCase().replace(/[^a-z0-9]+/g," ");
  const kinds=["bongo","conga","tumba","timbale","agogo","cabasa","shaker","guiro","claves","woodblock","cuica","triangle","tambourine","cowbell","djembe","frame drum","darabuka","doumbek","udu"];
  const kind=kinds.find(k=>s.includes(k)); if(!kind) return null;
  const articulation=s.includes("open")?"open":s.includes("mute")||s.includes("muted")?"muted":s.includes("slap")?"slap":s.includes("rim")?"rim":"hit";
  return {code:kind.replace(/\s+/g,"-"),instrument:"percussion",articulation,legacyType:"perc"};
}
async function walk(dir){ const out=[]; for(const ent of await readdir(dir,{withFileTypes:true})){ const p=join(dir,ent.name); if(ent.isDirectory()) out.push(...await walk(p)); else out.push(p); } return out; }
function slug(s){ return s.toLowerCase().replace(/\.[^.]+$/," ").replace(/[^a-z0-9]+/g,"_").replace(/^_|_$/g,""); }
function run(cmd,args){ return new Promise((res,rej)=>{ const p=spawn(cmd,args,{stdio:"inherit"}); p.on("exit",c=>c===0?res():rej(new Error(`${cmd} exited ${c}`))); }); }
async function sha256(path){ const b=await readFile(path); return createHash("sha256").update(b).digest("hex"); }
const files=await walk(sourceRoot); const selected=[];
for(const file of files){ const rel=relative(sourceRoot,file); const m=basename(file).match(cfg.matcher); if(!m) continue; const meta=cfg.classify(m,rel); if(meta) selected.push({file,rel,meta}); }
if(!selected.length){ console.error(`No compatible samples found for ${profile} in ${sourceRoot}`); process.exit(1); }
// Infer layer count per articulation to map vl -> MIDI range.
const maxVl=new Map();
for(const s of selected){ const g=`${s.meta.code}`; maxVl.set(g,Math.max(maxVl.get(g)||1,s.meta.vl||1)); }
const manifestPath=join(ROOT,"samples/manifest-v2.json"); const manifest=JSON.parse(await readFile(manifestPath,"utf8"));
const existing=new Map(manifest.samples.map(s=>[s.key,s])); const imported=[];
if(!dryRun) await mkdir(join(ROOT,cfg.destination),{recursive:true});
const counters=new Map();
for(const item of selected){
  const count=(counters.get(item.meta.code)||0)+1; counters.set(item.meta.code,count);
  const rr=item.meta.rr||count; const vl=item.meta.vl||1; const layers=maxVl.get(item.meta.code)||1;
  const min=Math.floor((vl-1)*127/layers)+1, max=Math.floor(vl*127/layers);
  const key=`${cfg.bank.replace(/-/g,"_")}_${item.meta.code.replace(/-/g,"_")}_vl${vl}_rr${rr}`;
  const destRel=`${cfg.destination}/${key}.wav`; const dest=join(ROOT,destRel);
  if(!dryRun){
    if(extname(item.file).toLowerCase()===".wav") await cp(item.file,dest);
    else await run("ffmpeg",["-y","-loglevel","error","-i",item.file,"-ac","1","-ar","44100","-sample_fmt","s16",dest]);
  }
  const entry={key,file:destRel,label:key.replace(/_/g," "),legacyType:item.meta.legacyType,instrument:item.meta.instrument,articulation:item.meta.articulation,velocity:{min,max},roundRobinGroup:`${cfg.bank}_${item.meta.code}_vl${vl}`,roundRobinIndex:rr,chokeGroup:item.meta.chokeGroup||null,bank:cfg.bank,sourceFile:item.rel,sourceCollection:cfg.sourceCollection,sourceUrl:cfg.sourceUrl,license:cfg.license,importProfile:profile,tags:["imported",cfg.bank]};
  if(!dryRun) entry.sha256=await sha256(dest);
  imported.push(entry); existing.set(key,entry);
}
if(dryRun){ console.log(`Dry run: ${selected.length} samples would be imported for ${profile}`); process.exit(0); }
manifest.samples=[...existing.values()];
manifest.kits=Array.isArray(manifest.kits)?manifest.kits:[];
const bankSamples=manifest.samples.filter(sample=>sample.bank===cfg.bank);
const pick=(instrument,articulation,fallback)=>bankSamples.find(sample=>sample.instrument===instrument && (!articulation || sample.articulation===articulation))?.key || fallback;
if(cfg.kitName){
  const kit={name:cfg.kitName,color:cfg.kitColor||"#777777",tracks:[
    pick("crash","crash","legacy_crash1"),
    pick("ride","bow","legacy_ride1"),
    pick("hihat","open","legacy_hat_open_1"),
    pick("hihat","closed","legacy_hat_closed_1"),
    pick("snare","hit",pick("snare","cross-stick","studio_snare_a")),
    bankSamples.find(sample=>sample.instrument==="tom" && /hi/i.test(sample.key))?.key || pick("percussion",null,"studio_tom_a"),
    bankSamples.find(sample=>sample.instrument==="tom" && /mid/i.test(sample.key))?.key || pick("percussion",null,"studio_tom_b"),
    bankSamples.find(sample=>sample.instrument==="tom" && /(lo|floor)/i.test(sample.key))?.key || pick("percussion",null,"deep_tom_b"),
    pick("kick","hit","studio_kick_a"),
    "metronome_tick"
  ]};
  const kitIndex=manifest.kits.findIndex(item=>item.name===cfg.kitName);
  if(kitIndex>=0) manifest.kits[kitIndex]=kit; else manifest.kits.push(kit);
}
await writeFile(manifestPath,JSON.stringify(manifest,null,2)+"\n");
await writeFile(join(ROOT,"samples/manifest-v2.js"),`window.BATTROCHTEK_SAMPLE_MANIFEST = ${JSON.stringify(manifest)};\n`);
const ledgerPath=join(ROOT,"samples/provenance.jsonl");
let ledger=""; try{ ledger=await readFile(ledgerPath,"utf8"); }catch{}
ledger += imported.map(s=>JSON.stringify({key:s.key,file:s.file,sha256:s.sha256,sourceCollection:s.sourceCollection,sourceUrl:s.sourceUrl,sourceFile:s.sourceFile,license:s.license,importProfile:s.importProfile})).join("\n")+"\n";
await writeFile(ledgerPath,ledger);
console.log(`Imported ${imported.length} samples into ${cfg.destination}; manifest now has ${manifest.samples.length} entries.`);
