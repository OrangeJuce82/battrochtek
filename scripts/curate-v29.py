import json, os, re, math, shutil, hashlib
from collections import defaultdict
import numpy as np
import soundfile as sf
ROOT='/mnt/data/battro_v29_work'
mp=f'{ROOT}/samples/manifest-v2.json'
d=json.load(open(mp))
samples=d['samples']
bykey={s['key']:s for s in samples}

# Curated 10-kit layout: 5 acoustic/world + 5 electronic.
oldkits={k['name']:k for k in d.get('kits',[])}
basekits={
'STUDIO PUNCH': {"name":"STUDIO PUNCH","category":"Acoustique","color":"#2d9cdb","tracks":["legacy_crash1","legacy_ride1","legacy_hat_open_1","legacy_hat_closed_1","studio_snare_a","studio_tom_a","studio_tom_b","deep_tom_b","studio_kick_a","metronome_tick"]},
'SOUL POCKET': {"name":"SOUL POCKET","category":"Acoustique","color":"#d4a72c","tracks":["legacy_crash1","legacy_ride1","legacy_hat_open_2","legacy_hat_closed_2","warm_snare_a","warm_tom_a","warm_tom_b","warm_tom_b","warm_kick_a","metronome_tick"]},
'SP DUST': {"name":"SP DUST","category":"Électro","color":"#9a6b3f","tracks":["legacy_china1","legacy_ride3","electro_hat_closed_distorted_01","electro_hat_closed_metal_01","electro_snare_distorted_01","raw_tom_a","raw_tom_b","deep_tom_a","electro_kick_distorted_01","metronome_tick"]},
'GLITCH LAB': {"name":"GLITCH LAB","category":"Électro","color":"#e83e8c","tracks":["zap_05","game_level_up","electro_hat_closed_distorted_01","glitch_01","electro_snare_distorted_02","punch_03","metal_02","metal_02","electro_kick_distorted_02","metronome_tick"]},
}
for n,cat in [('JAZZ CLUB','Acoustique'),('VINTAGE ROCK','Acoustique'),('BT WORLD PERCUSSION','Acoustique'),('BT ANALOG CLASSIC','Électro'),('BT DETROIT HYBRID','Électro'),('BT DIGITAL 80','Électro')]:
    k=dict(oldkits[n]); k['category']=cat; basekits[n]=k
kits=[basekits[n] for n in ['STUDIO PUNCH','SOUL POCKET','JAZZ CLUB','VINTAGE ROCK','BT WORLD PERCUSSION','BT ANALOG CLASSIC','BT DETROIT HYBRID','BT DIGITAL 80','SP DUST','GLITCH LAB']]

keep=set()
for k in kits: keep.update(k['tracks'])

# Keep representative legacy alternatives only, not the old FX dump.
legacy_extra=[
'legacy_crash1','legacy_splash1','legacy_china1','legacy_ride1','legacy_ride2','legacy_ride3',
'legacy_hat_open_1','legacy_hat_open_2','legacy_hat_closed_1','legacy_hat_closed_2','legacy_rim','legacy_cowbell',
'studio_kick_a','studio_kick_b','studio_snare_a','studio_snare_b','studio_tom_a','studio_tom_b',
'warm_kick_a','warm_kick_b','warm_snare_a','warm_snare_b','warm_tom_a','warm_tom_b',
'raw_kick_a','raw_snare_a','raw_tom_a','raw_tom_b','deep_tom_a','deep_tom_b',
'electro_kick_distorted_01','electro_kick_distorted_02','electro_snare_distorted_01','electro_snare_distorted_02',
'electro_hat_closed_distorted_01','electro_hat_closed_metal_01','glitch_01','zap_05','game_level_up','punch_03','metal_02','metronome_tick',
'clap_02','cowbell_01','claves_01','maracas_01','rimshot_02'
]
keep.update(k for k in legacy_extra if k in bykey)

# External electronic core is compact and coherent; keep all three kits.
for s in samples:
    if s.get('bank') in {'bt-analog','bt-detroit','bt-digital80'}: keep.add(s['key'])

# Generated World/brush core: keep everything except surplus RR > 2.
for s in samples:
    if s.get('bank')=='bt-world' and (not s.get('roundRobinIndex') or s.get('roundRobinIndex')<=2): keep.add(s['key'])

# Jazz: retain all velocity layers/articulations but only two round robins.
for s in samples:
    if s.get('bank')=='jazz-club' and (not s.get('roundRobinIndex') or s.get('roundRobinIndex')<=2): keep.add(s['key'])

# Vintage: max 3 velocity layers per articulation, 2 RR.
groups=defaultdict(list)
for s in samples:
    if s.get('bank')=='vintage-rock': groups[(s.get('instrument'),s.get('articulation'))].append(s)
for g,ss in groups.items():
    velgroups=defaultdict(list)
    for s in ss: velgroups[(s['velocity']['min'],s['velocity']['max'])].append(s)
    ranges=sorted(velgroups)
    if len(ranges)<=3: chosen=ranges
    else: chosen=[ranges[0], ranges[len(ranges)//2], ranges[-1]]
    for vr in chosen:
        for s in velgroups[vr]:
            if not s.get('roundRobinIndex') or s.get('roundRobinIndex')<=2: keep.add(s['key'])

# VCSL: compact authentic palette, max two velocity ranges and two RRs per articulation.
world_words=('agogo','cabasa','cajon','claves','cowbell','guiro','shaker','tamb','triangle','darbuka','frame','slit')
groups=defaultdict(list)
for s in samples:
    if s.get('bank')=='world-percussion' and any(w in (s.get('articulation') or '').lower() or w in s['key'].lower() for w in world_words):
        groups[(s.get('instrument'),s.get('articulation'))].append(s)
for g,ss in groups.items():
    velgroups=defaultdict(list)
    for s in ss: velgroups[(s['velocity']['min'],s['velocity']['max'])].append(s)
    ranges=sorted(velgroups)
    chosen=ranges if len(ranges)<=2 else [ranges[0], ranges[-1]]
    for vr in chosen:
        count=0
        for s in sorted(velgroups[vr], key=lambda x:(x.get('roundRobinIndex') or 0,x['key'])):
            if not s.get('roundRobinIndex') or s.get('roundRobinIndex')<=2:
                keep.add(s['key']); count+=1
                if count>=2: break

# Companion safety: referenced RR base gets its sibling(s) when present.
for key in list(keep):
    s=bykey.get(key)
    if not s: continue
    rg=s.get('roundRobinGroup')
    if rg:
        for t in samples:
            if t.get('roundRobinGroup')==rg and (not t.get('roundRobinIndex') or t.get('roundRobinIndex')<=2): keep.add(t['key'])

cur=[s for s in samples if s['key'] in keep]
curkeys={s['key'] for s in cur}
# Ensure every kit track exists.
missing=[x for k in kits for x in k['tracks'] if x not in curkeys]
if missing: raise SystemExit(f'missing kit samples: {missing}')

# Friendly labels and categories for UI; technical filenames remain preserved in metadata.
BANK_LABEL={'jazz-club':'Jazz Club','vintage-rock':'Vintage Rock','world-percussion':'VCSL World','bt-world':'World','bt-analog':'Analog Classic','bt-detroit':'Detroit','bt-digital80':'Digital 80'}
ART_LABEL={'hit':'Hit','closed':'Closed','open':'Open','pedal':'Pedal','bow':'Bow','bell':'Bell','cross-stick':'Cross-stick','rimshot':'Rimshot','crash':'Crash','brush-hit':'Brush Hit','brush-sweep':'Brush Sweep'}
for s in cur:
    s['category']='Électro' if s.get('bank') in {'bt-analog','bt-detroit','bt-digital80','electro'} or 'electro_' in s['key'] or s['key'] in {'glitch_01','zap_05','game_level_up','punch_03','metal_02'} else 'Acoustique'
    if s.get('bank') in BANK_LABEL:
        inst=(s.get('instrument') or '').replace('hihat','Hi-Hat').replace('percussion','Percussion').title()
        art=(s.get('articulation') or 'hit').replace('-',' ').title()
        s['displayLabel']=f"{BANK_LABEL[s['bank']]} · {inst} · {art}"
    else:
        s['displayLabel']=s.get('label',s['key'])

# Prune physical WAVs not in curated manifest.
files={s['file'] for s in cur}
removed=0
for dirpath,_,fns in os.walk(f'{ROOT}/sounds'):
    for fn in fns:
        if not fn.lower().endswith('.wav'): continue
        p=os.path.join(dirpath,fn); rel=os.path.relpath(p,ROOT).replace(os.sep,'/')
        if rel not in files:
            os.remove(p); removed+=1
for dirpath,dirs,files2 in os.walk(f'{ROOT}/sounds', topdown=False):
    if dirpath!=f'{ROOT}/sounds' and not os.listdir(dirpath): os.rmdir(dirpath)

# Normalize by bank/instrument/articulation as one group, preserving velocity-layer differences.
target_peak_db={'kick':-1.5,'snare':-2.0,'tom':-2.0,'hihat':-4.0,'ride':-4.0,'crash':-4.0,'cymbal':-4.0,'percussion':-3.0,'fx':-3.0,'metro':-4.0,'metronome':-4.0}
audio_groups=defaultdict(list)
for s in cur: audio_groups[(s.get('bank'),s.get('instrument'),s.get('articulation'))].append(s)
normalization=[]
for g,ss in audio_groups.items():
    peaks=[]
    loaded=[]
    for s in ss:
        p=os.path.join(ROOT,s['file'])
        try:
            data,sr=sf.read(p,dtype='float32',always_2d=True)
        except Exception:
            continue
        peak=float(np.max(np.abs(data))) if data.size else 0
        peaks.append(peak); loaded.append((s,p,data,sr))
    if not peaks or max(peaks)<=1e-9: continue
    target=10**(target_peak_db.get(g[1],-3.0)/20)
    gain=target/max(peaks)
    gain=min(gain,4.0)  # +12 dB safety cap
    if abs(20*math.log10(gain))<0.15: continue
    for s,p,data,sr in loaded:
        out=np.clip(data*gain,-0.999,0.999)
        sf.write(p,out,sr,subtype='PCM_16')
        s['normalizationGainDb']=round(20*math.log10(gain),2)
    normalization.append((g,round(20*math.log10(gain),2),len(loaded)))

# Refresh hashes after normalization.
for s in cur:
    p=os.path.join(ROOT,s['file'])
    if os.path.exists(p):
        with open(p,'rb') as f: s['sha256']=hashlib.sha256(f.read()).hexdigest()

d['samples']=cur; d['kits']=kits; d['libraryVersion']='v29-curated'; d['normalization']='group peak normalization preserving velocity relationships'
json.dump(d,open(mp,'w'),ensure_ascii=False,indent=2)
open(f'{ROOT}/samples/manifest-v2.js','w').write('window.BATTROCHTEK_SAMPLE_MANIFEST = '+json.dumps(d,ensure_ascii=False,separators=(',',':'))+';\n')

# Replace hardcoded legacy SAMPLE_LIBRARY with only retained legacy samples.
app=f'{ROOT}/app.js'; text=open(app).read()
legacy=[]
for s in cur:
    if s.get('sourceCollection')=='legacy-import':
        legacy.append({'key':s['key'],'file':s['file'],'label':s.get('label',s['key']),'type':s.get('legacyType') or s.get('type') or s.get('instrument'),'source':s.get('sourceFile','')})
replacement='    const SAMPLE_LIBRARY = Object.freeze('+json.dumps(legacy,ensure_ascii=False,separators=(',',':'))+');'
text,n=re.subn(r'    const SAMPLE_LIBRARY = Object\.freeze\(\[.*?\]\);\n    const LEGACY_SAMPLE_INDEX',replacement+'\n    const LEGACY_SAMPLE_INDEX',text,count=1,flags=re.S)
if n!=1: raise SystemExit('SAMPLE_LIBRARY replacement failed')
# Replace KITS expression inside CONFIG.
kjson=json.dumps(kits,ensure_ascii=False,separators=(',',':'))
text,n=re.subn(r'        KITS: Object\.freeze\(\[\{.*?\.map\(kit => Object\.freeze\(\{\.\.\.kit, tracks:Object\.freeze\(kit\.tracks\)\}\)\)\)\n',f'        KITS: Object.freeze({kjson}.map(kit => Object.freeze({{...kit, tracks:Object.freeze(kit.tracks)}})))\n',text,count=1,flags=re.S)
if n!=1: raise SystemExit('KITS replacement failed')
open(app,'w').write(text)

print('before',len(samples),'after',len(cur),'removed wav',removed,'legacy',len(legacy),'normalization groups',len(normalization))
from collections import Counter
print('banks',Counter(s.get('bank') for s in cur))
print('categories',Counter(s.get('category') for s in cur))
