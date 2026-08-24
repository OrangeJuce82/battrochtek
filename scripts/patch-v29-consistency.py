import os, json, math, re, hashlib
import numpy as np
import soundfile as sf
from scipy.signal import resample_poly

ROOT='/mnt/data/battro_v29_work'
MP=f'{ROOT}/samples/manifest-v2.json'
m=json.load(open(MP))
samples=m['samples']
idx={s['key']:s for s in samples}

# 1) Add a coherent Jazz Club mid tom derived from the Jazz high tom, -4 semitones.
# Keeps the same source/velocity/RR metadata while avoiding borrowing a Studio tom.
new=[]
ratio=2**(4/12)
for s in list(samples):
    if s.get('bank')=='jazz-club' and re.match(r'^jazz_club_tomhi_vl\d+_rr[12]$', s['key']):
        nk=s['key'].replace('tomhi','tommid')
        if nk in idx: continue
        src=os.path.join(ROOT,s['file'])
        dst_rel=s['file'].replace('tomhi','tommid')
        dst=os.path.join(ROOT,dst_rel)
        os.makedirs(os.path.dirname(dst),exist_ok=True)
        data,sr=sf.read(src,dtype='float32',always_2d=True)
        # More samples at same SR -> lower pitch, natural drum decay slightly longer.
        up=1000; down=max(1,round(1000/ratio))
        pitched=resample_poly(data,up,down,axis=0)
        peak=float(np.max(np.abs(pitched))) if pitched.size else 0
        if peak>0.999: pitched=pitched/peak*0.999
        sf.write(dst,np.clip(pitched,-0.999,0.999),sr,subtype='PCM_16')
        ns=dict(s)
        ns['key']=nk; ns['file']=dst_rel
        ns['label']='Jazz Club Tom Mid'
        ns['sourceCollection']=s.get('sourceCollection','')+' (Derived Mid Tom)'
        ns['derivedFrom']=s['key']; ns['pitchShiftSemitones']=-4
        ns['tags']=list(dict.fromkeys((s.get('tags') or [])+['derived','mid-tom']))
        with open(dst,'rb') as f: ns['sha256']=hashlib.sha256(f.read()).hexdigest()
        new.append(ns); idx[nk]=ns
samples.extend(new)

# 2) Kit coherence fixes. 9 musical roles + metronome.
kit_updates={
    'SOUL POCKET': ['legacy_crash1','legacy_ride1','legacy_hat_open_2','legacy_hat_closed_2','warm_snare_a','warm_tom_a','warm_tom_b','deep_tom_a','warm_kick_a','metronome_tick'],
    'JAZZ CLUB': ['legacy_crash1','jazz_club_ride_vl1_rr1','jazz_club_hho_vl1_rr1','jazz_club_hhc_vl1_rr1','jazz_club_snare_vl1_rr1','jazz_club_tomhi_vl1_rr1','jazz_club_tommid_vl1_rr1','jazz_club_tomlo_vl1_rr1','jazz_club_kick_vl1_rr1','metronome_tick'],
    'SP DUST': ['bt_analog_crash','bt_analog_ride','bt_analog_hho_rr1','electro_hat_closed_metal_01','electro_snare_distorted_01','bt_analog_tom_high','bt_analog_tom_mid','bt_analog_tom_low','electro_kick_distorted_01','metronome_tick'],
    'GLITCH LAB': ['bt_digital80_crash','bt_digital80_ride','bt_digital80_hho','electro_hat_closed_distorted_01','electro_snare_distorted_02','bt_digital80_tom_high','bt_digital80_tom_mid','bt_digital80_tom_low','electro_kick_distorted_02','metronome_tick'],
}
rename_kits={
    'BT WORLD PERCUSSION':'WORLD PERCUSSION',
    'BT ANALOG CLASSIC':'ANALOG CLASSIC',
    'BT DETROIT HYBRID':'DETROIT HYBRID',
    'BT DIGITAL 80':'DIGITAL 80',
}
for k in m['kits']:
    if k['name'] in kit_updates: k['tracks']=kit_updates[k['name']]
    if k['name'] in rename_kits: k['name']=rename_kits[k['name']]

# Helpers for clean, short, Title Case labels.
def title_words(text):
    text=text.replace('_',' ').replace('-',' ')
    words=[]
    for w in re.split(r'\s+',text.strip()):
        if not w: continue
        u=w.upper()
        if u in {'HH','FX','SP'}: words.append(u)
        elif re.fullmatch(r'\d+',w): words.append(w)
        else: words.append(w[:1].upper()+w[1:].lower())
    return ' '.join(words)

def tom_position(key):
    lk=key.lower()
    if any(x in lk for x in ('tomhi','tom_high','tom-high')): return 'Tom High'
    if any(x in lk for x in ('tommid','tom_mid','tom-mid')): return 'Tom Mid'
    if any(x in lk for x in ('tomlo','tom_low','tom-low')): return 'Tom Low'
    return 'Tom'

def clean_label(s):
    key=s['key']; bank=s.get('bank') or ''
    inst=s.get('instrument') or '' ; art=s.get('articulation') or 'hit'
    bank_prefix={
      'jazz-club':'Jazz Club','vintage-rock':'Vintage Rock','bt-analog':'Analog Classic',
      'bt-detroit':'Detroit Hybrid','bt-digital80':'Digital 80'
    }.get(bank,'')
    if inst=='tom': core=tom_position(key)
    elif inst=='hihat': core={'open':'Hi-Hat Open','closed':'Hi-Hat Closed','pedal':'Hi-Hat Pedal'}.get(art,'Hi-Hat')
    elif inst=='ride': core='Ride Bell' if art=='bell' else 'Ride'
    elif inst=='crash': core='Crash'
    elif inst=='kick': core='Kick'
    elif inst=='snare':
        core={'cross-stick':'Cross-Stick','rimshot':'Rimshot','brush-hit':'Brush Hit','brush-sweep':'Brush Sweep','clap':'Clap'}.get(art,'Snare')
    elif inst=='percussion':
        # World packs: provenance is deliberately hidden; articulation IS the instrument name.
        core=title_words(art if art!='hit' else re.sub(r'^(?:world_percussion_|bt_world_)','',re.sub(r'_vl\d+_rr\d+$|_rr\d+$','',key)))
        core=core.replace('Frame Drum Vl1','Frame Drum').replace('Agogo Vl1','Agogo').replace('Cabasa Vl1','Cabasa')
    elif inst in ('metro','metronome'): core='Metronome'
    elif inst=='fx':
        core=title_words(re.sub(r'_\d+$','',key))
    else:
        core=title_words(s.get('label') or key)
    # Legacy/generic provenance words are not useful to the musician.
    if not bank_prefix:
        aliases={
          'studio_kick_a':'Studio Kick A','studio_kick_b':'Studio Kick B','studio_snare_a':'Studio Snare A','studio_snare_b':'Studio Snare B',
          'studio_tom_a':'Studio Tom High','studio_tom_b':'Studio Tom Mid','warm_kick_a':'Warm Kick','warm_snare_a':'Warm Snare',
          'warm_tom_a':'Warm Tom High','warm_tom_b':'Warm Tom Mid','raw_kick_a':'Raw Kick','raw_snare_a':'Raw Snare',
          'raw_tom_a':'Raw Tom High','raw_tom_b':'Raw Tom Mid','deep_tom_a':'Deep Tom Low','deep_tom_b':'Deep Tom Low B',
          'legacy_crash1':'Crash','legacy_splash1':'Splash','legacy_china1':'China','legacy_ride1':'Ride','legacy_ride3':'Ride Dark',
          'legacy_hat_open_1':'Hi-Hat Open','legacy_hat_open_2':'Hi-Hat Open Warm','legacy_hat_closed_1':'Hi-Hat Closed','legacy_hat_closed_2':'Hi-Hat Closed Warm',
          'legacy_rim':'Cross-Stick','legacy_cowbell':'Cowbell','metronome_tick':'Metronome',
          'electro_hat_closed_distorted_01':'Distorted Hi-Hat Closed','electro_hat_closed_metal_01':'Metal Hi-Hat Closed',
          'electro_kick_distorted_01':'Distorted Kick','electro_kick_distorted_02':'Glitch Kick','electro_snare_distorted_01':'Distorted Snare','electro_snare_distorted_02':'Glitch Snare',
          'glitch_01':'Glitch','zap_05':'Zap','game_level_up':'Level Up','punch_03':'Punch','metal_02':'Metal Hit',
          'clap_02':'Clap','cowbell_01':'Cowbell Bright','claves_01':'Claves','maracas_01':'Maracas','rimshot_02':'Rimshot'
        }
        return aliases.get(key,core)
    return f'{bank_prefix} {core}'

for s in samples:
    s['displayLabel']=clean_label(s)

# 3) Audit every kit against track roles.
roles=[('crash',{'crash','cymbal','percussion','fx'},None),('ride',{'ride','cymbal','percussion','fx'},None),('openHat',{'hihat','percussion','fx'},'open'),('closedHat',{'hihat','percussion','fx'},None),('snare',{'snare','percussion'},None),('tomHigh',{'tom','percussion','fx'},None),('tomMid',{'tom','percussion','fx'},None),('tomFloor',{'tom','percussion','fx'},None),('kick',{'kick','percussion','fx'},None),('metro',{'metro','metronome'},None)]
idx={s['key']:s for s in samples}
issues=[]
for k in m['kits']:
    seen={}
    for (role,allowed,required_art),key in zip(roles,k['tracks']):
        s=idx.get(key)
        if not s:
            issues.append(f"{k['name']}: {role} missing key {key}"); continue
        inst=s.get('instrument')
        if inst not in allowed: issues.append(f"{k['name']}: {role} uses {key} ({inst})")
        if role=='openHat' and inst=='hihat' and s.get('articulation')!='open': issues.append(f"{k['name']}: openHat is not open ({key})")
        if role=='closedHat' and inst=='hihat' and s.get('articulation') not in {'closed','pedal'}: issues.append(f"{k['name']}: closedHat is {s.get('articulation')} ({key})")
        if key in seen and role!='metro': issues.append(f"{k['name']}: duplicate {key} on {seen[key]} and {role}")
        seen[key]=role

m['samples']=samples
m['libraryVersion']='v29-curated-consistent'
m['kitAudit']={'status':'ok' if not issues else 'issues','issues':issues,'roles':[r[0] for r in roles]}
json.dump(m,open(MP,'w'),ensure_ascii=False,indent=2)
open(f'{ROOT}/samples/manifest-v2.js','w').write('window.BATTROCHTEK_SAMPLE_MANIFEST = '+json.dumps(m,ensure_ascii=False,separators=(',',':'))+';\n')

# 4) Patch app embedded legacy labels and kits from the canonical manifest.
app=f'{ROOT}/app.js'; text=open(app).read()
legacy=[]
for s in samples:
    if s.get('sourceCollection')=='legacy-import':
        legacy.append({'key':s['key'],'file':s['file'],'label':s['displayLabel'],'type':s.get('legacyType') or s.get('instrument'),'source':s.get('sourceFile','')})
replacement='    const SAMPLE_LIBRARY = Object.freeze('+json.dumps(legacy,ensure_ascii=False,separators=(',',':'))+');'
text,n=re.subn(r'    const SAMPLE_LIBRARY = Object\.freeze\(\[.*?\]\);\n    const LEGACY_SAMPLE_INDEX',replacement+'\n    const LEGACY_SAMPLE_INDEX',text,count=1,flags=re.S)
if n!=1: raise SystemExit('SAMPLE_LIBRARY patch failed')
kjson=json.dumps(m['kits'],ensure_ascii=False,separators=(',',':'))
text,n=re.subn(r'        KITS: Object\.freeze\(\[\{.*?\.map\(kit => Object\.freeze\(\{\.\.\.kit, tracks:Object\.freeze\(kit\.tracks\)\}\)\)\)\n',f'        KITS: Object.freeze({kjson}.map(kit => Object.freeze({{...kit, tracks:Object.freeze(kit.tracks)}})))\n',text,count=1,flags=re.S)
if n!=1: raise SystemExit('KITS patch failed')
open(app,'w').write(text)

# 5) Report.
report={'sampleCount':len(samples),'addedJazzMidTomSamples':len(new),'kitCount':len(m['kits']),'issues':issues,'kits':m['kits']}
json.dump(report,open(f'{ROOT}/samples/kit-audit-v29.json','w'),ensure_ascii=False,indent=2)
print(json.dumps(report,ensure_ascii=False,indent=2))
