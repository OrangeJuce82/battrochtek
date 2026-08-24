#!/usr/bin/env python3
import json, math, wave
from pathlib import Path
import numpy as np

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'sounds'/'cc0-world'
OUT.mkdir(parents=True,exist_ok=True)
SR=44100
RNG=np.random.default_rng(270823)

def env(n,tau=.15,attack=.0005):
    t=np.arange(n)/SR
    a=np.minimum(1,t/max(attack,1e-5))
    return a*np.exp(-t/max(tau,1e-4))

def hp_noise(n):
    x=RNG.standard_normal(n); y=np.empty_like(x); y[0]=x[0]; y[1:]=x[1:]-0.96*x[:-1]; return y

def lp(x,a=.08):
    y=np.empty_like(x); y[0]=x[0]
    for i in range(1,len(x)): y[i]=y[i-1]+a*(x[i]-y[i-1])
    return y

def norm(x,peak=.9):
    x=np.nan_to_num(np.asarray(x,float)); m=np.max(np.abs(x)) if len(x) else 1
    return np.clip((x/m*peak) if m else x,-1,1)

def write(name,x):
    p=OUT/f'{name}.wav'; pcm=(norm(x)*32767).astype('<i2')
    with wave.open(str(p),'wb') as w:
        w.setnchannels(1);w.setsampwidth(2);w.setframerate(SR);w.writeframes(pcm.tobytes())
    return f'sounds/cc0-world/{name}.wav'

def drum(freq=120,dur=.45,tau=.2,slap=0,muted=False):
    n=int(dur*SR); t=np.arange(n)/SR
    f=freq*(1+.5*np.exp(-t/.025)); ph=2*np.pi*np.cumsum(f)/SR
    x=(np.sin(ph)+.22*np.sin(2.1*ph))*env(n,tau,.0004)
    x += lp(RNG.standard_normal(n),.04)*env(n,tau*.55,.0002)*.22
    if slap: x += hp_noise(n)*env(n,.018,.0001)*slap
    if muted: x*=np.exp(-t/.055)
    return x

def wood(freq=1800,dur=.18):
    n=int(dur*SR); t=np.arange(n)/SR
    return (np.sin(2*np.pi*freq*t)+.65*np.sin(2*np.pi*freq*1.64*t)+.3*np.sin(2*np.pi*freq*2.2*t))*env(n,.045,.0001)

def metal(freqs,dur=.6,tau=.22):
    n=int(dur*SR); t=np.arange(n)/SR
    x=sum(np.sin(2*np.pi*f*t+RNG.random()*6.28) for f in freqs)/len(freqs)
    return x*env(n,tau,.0001)+hp_noise(n)*env(n,tau*.6,.0001)*.12

def shaker(dur=.22,slow=False):
    n=int(dur*SR); x=hp_noise(n); gate=np.zeros(n)
    pulses=4 if slow else 7
    for k in range(pulses):
        s=int((k/(pulses+1))*n); e=min(n,s+int((.016 if slow else .009)*SR)); gate[s:e]+=np.hanning(max(2,e-s))
    return x*gate

def guiro(dur=.36,slow=False):
    n=int(dur*SR); t=np.arange(n)/SR; x=np.zeros(n)
    rate=17 if slow else 29
    for k in range(int(dur*rate)):
        s=int(k/rate*SR); e=min(n,s+int(.012*SR));
        if e>s: x[s:e]+=hp_noise(e-s)*np.hanning(e-s)
    return x*env(n,dur*.8,.0001)

def brush(dur=.55,sweep=False):
    n=int(dur*SR); t=np.arange(n)/SR
    noise=hp_noise(n)
    if sweep:
        mod=.45+.55*np.sin(2*np.pi*(5*t+3*t*t))**2
        return noise*mod*env(n,.42,.02)
    return noise*env(n,.12,.001)+lp(noise,.02)*env(n,.22,.001)*.35

entries=[]
def add(key,label,art,data,rr=None,rr_i=None,vel=(1,127),tags=()):
    entries.append({"key":key,"file":write(key,data),"label":label,"legacyType":"perc" if art not in ("brush-hit","brush-sweep") else "snare","instrument":"percussion" if art not in ("brush-hit","brush-sweep") else "snare","articulation":art,"velocity":{"min":vel[0],"max":vel[1]},"roundRobinGroup":rr,"roundRobinIndex":rr_i,"chokeGroup":None,"bank":"bt-world","sourceFile":"generated","sourceCollection":"Battrochtek CC0 World/Brush Core","sourceUrl":"","license":"CC0-1.0","licenseUrl":"https://creativecommons.org/publicdomain/zero/1.0/","generator":"scripts/generate-cc0-world-samples.py","tags":list(tags)})

# Hand drums: three dynamics x two RR, intentionally distinct sizes.
for family,freq in [('conga',118),('bongo',205),('frame-drum',92)]:
    for vl,(amp,slap) in enumerate([(.58,.12),(.78,.28),(1,.55)],1):
        lo=1+(vl-1)*42; hi=42*vl if vl<3 else 127
        for rr in (1,2):
            jitter=1+(rr-1)*.025
            add(f'bt_world_{family.replace("-","_")}_vl{vl}_rr{rr}',f'BT World {family.title()} VL{vl} RR{rr}',family,drum(freq*jitter,.48 if family!='bongo' else .3,.2 if family!='bongo' else .12,slap)*amp,rr=f'bt_world_{family}_vl{vl}',rr_i=rr,vel=(lo,hi),tags=(family,'hand-drum'))
# Muted/slap articulations
add('bt_world_conga_muted','BT World Conga Muted','conga-muted',drum(124,.22,.07,.18,True),tags=('conga','muted'))
add('bt_world_conga_slap','BT World Conga Slap','conga-slap',drum(130,.28,.09,.9),tags=('conga','slap'))
add('bt_world_bongo_slap','BT World Bongo Slap','bongo-slap',drum(230,.2,.065,1.0),tags=('bongo','slap'))
# Woods/metals and shakers.
for i,f in enumerate((1650,1740,1860),1): add(f'bt_world_claves_rr{i}',f'BT World Claves RR{i}','claves',wood(f,.14),rr='bt_world_claves',rr_i=i,tags=('claves','wood'))
for i,f in enumerate((960,1040),1): add(f'bt_world_woodblock_rr{i}',f'BT World Woodblock RR{i}','woodblock',wood(f,.2),rr='bt_world_woodblock',rr_i=i,tags=('woodblock','wood'))
add('bt_world_agogo_high','BT World Agogo High','agogo-high',metal([1180,1825],.5,.19),tags=('agogo','metal'))
add('bt_world_agogo_low','BT World Agogo Low','agogo-low',metal([790,1260],.55,.21),tags=('agogo','metal'))
add('bt_world_cowbell','BT World Cowbell','cowbell',metal([540,835],.48,.16),tags=('cowbell','metal'))
add('bt_world_triangle_open','BT World Triangle Open','triangle-open',metal([3120,6250,9180],1.0,.52),tags=('triangle','metal'))
add('bt_world_triangle_muted','BT World Triangle Muted','triangle-muted',metal([3120,6250],.18,.055),tags=('triangle','muted'))
for i in (1,2): add(f'bt_world_shaker_rr{i}',f'BT World Shaker RR{i}','shaker',shaker(.25),rr='bt_world_shaker',rr_i=i,tags=('shaker',))
add('bt_world_maracas','BT World Maracas','maracas',shaker(.32,True)+.28*hp_noise(int(.32*SR))*env(int(.32*SR),.16,.003),tags=('maracas',))
add('bt_world_guiro_fast','BT World Guiro Fast','guiro-fast',guiro(.32,False),tags=('guiro',))
add('bt_world_guiro_slow','BT World Guiro Slow','guiro-slow',guiro(.55,True),tags=('guiro',))
add('bt_world_tambourine','BT World Tambourine','tambourine',metal([2250,3180,4530,6820],.55,.22)+.35*shaker(.55),tags=('tambourine',))
# Brush textures carried by the same manifest semantics as acoustic libraries.
for rr in (1,2,3): add(f'bt_brush_hit_rr{rr}',f'BT Brush Hit RR{rr}','brush-hit',brush(.42,False)*(1+.03*rr),rr='bt_brush_hit',rr_i=rr,tags=('brushes','snare'))
for rr in (1,2): add(f'bt_brush_sweep_rr{rr}',f'BT Brush Sweep RR{rr}','brush-sweep',brush(.8,True)*(1+.025*rr),rr='bt_brush_sweep',rr_i=rr,tags=('brushes','snare','sweep'))

meta={"schemaVersion":1,"generatedCount":len(entries),"sampleRate":SR,"format":"mono PCM16 WAV","license":"CC0-1.0","samples":entries,"kit":{"name":"BT WORLD PERCUSSION","color":"#e48a1d","tracks":["bt_world_tambourine","bt_world_triangle_open","bt_world_shaker_rr1","bt_world_claves_rr1","bt_brush_hit_rr1","bt_world_bongo_vl2_rr1","bt_world_conga_vl2_rr1","bt_world_frame_drum_vl2_rr1","bt_world_frame_drum_vl3_rr1","metronome_tick"]}}
(ROOT/'samples'/'generated-cc0-world.json').write_text(json.dumps(meta,indent=2,ensure_ascii=False)+'\n',encoding='utf8')
print(f'Generated {len(entries)} CC0 world/brush samples in {OUT}')
