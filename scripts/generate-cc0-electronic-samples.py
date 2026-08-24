#!/usr/bin/env python3
"""Generate Battrochtek's first-party CC0 electronic drum core.

These samples are synthesized from mathematical oscillators/noise only; no upstream
recordings are used. Output: mono PCM16 WAV, 44.1 kHz, browser-friendly one-shots.
"""
from __future__ import annotations
import json, math, wave
from pathlib import Path
import numpy as np

SR = 44100
ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "sounds" / "cc0-electronic"
OUT.mkdir(parents=True, exist_ok=True)
RNG = np.random.default_rng(23082026)


def env_exp(n, tau, attack=0.001):
    t=np.arange(n)/SR
    e=np.exp(-t/max(tau,1e-4))
    a=np.minimum(1.0,t/max(attack,1/SR))
    return e*a

def hp_noise(n, strength=1.0):
    x=RNG.standard_normal(n)
    # Simple differentiator/high-pass-like emphasis.
    y=np.empty_like(x); y[0]=x[0]; y[1:]=x[1:]-0.92*x[:-1]
    return y*strength

def normalize(x, peak=.92):
    x=np.nan_to_num(np.asarray(x,dtype=np.float64))
    m=float(np.max(np.abs(x))) if len(x) else 1.0
    if m>0: x=x/m*peak
    return np.clip(x,-1,1)

def write(name, x):
    path=OUT/f"{name}.wav"
    pcm=(normalize(x)*32767).astype('<i2')
    with wave.open(str(path),'wb') as wf:
        wf.setnchannels(1); wf.setsampwidth(2); wf.setframerate(SR); wf.writeframes(pcm.tobytes())
    return f"sounds/cc0-electronic/{name}.wav"

def sine_sweep(duration, f0, f1, tau, click=0):
    n=int(duration*SR); t=np.arange(n)/SR
    # Exponential frequency fall.
    f=f1+(f0-f1)*np.exp(-t/max(tau*.18,.01))
    phase=2*np.pi*np.cumsum(f)/SR
    x=np.sin(phase)*env_exp(n,tau,.0008)
    if click:
        x += hp_noise(n)*env_exp(n,.012,.0001)*click
    return x

def snare(duration=.45, tone=190, noise=.75, body=.45, tau=.16, snap=.4):
    n=int(duration*SR); t=np.arange(n)/SR
    tonal=(np.sin(2*np.pi*tone*t)+.35*np.sin(2*np.pi*tone*1.52*t))*env_exp(n,tau,.0005)*body
    wires=hp_noise(n)*env_exp(n,tau*.75,.0002)*noise
    crack=hp_noise(n)*env_exp(n,.018,.0001)*snap
    return tonal+wires+crack

def hat(duration=.15, open_hat=False, pedal=False, metallic=1.0):
    n=int(duration*SR); t=np.arange(n)/SR
    freqs=[5320,6170,7010,8170,9510,11240]
    metal=sum(np.sign(np.sin(2*np.pi*f*t)) for f in freqs)/len(freqs)
    noise=hp_noise(n)*.55
    tau=.55 if open_hat else (.075 if pedal else .045)
    if open_hat: tau=.5
    x=(metal*.65+noise*.35)*env_exp(n,tau,.0002)*metallic
    if pedal: x += hp_noise(n)*env_exp(n,.018,.0001)*.35
    return x

def clap(duration=.35, dark=False):
    n=int(duration*SR); t=np.arange(n)/SR; x=np.zeros(n)
    noise=RNG.standard_normal(n)
    for delay,amp in [(0,.9),(.012,.7),(.024,.55),(.038,.42)]:
        start=int(delay*SR); seg=n-start
        x[start:]+=noise[:seg]*env_exp(seg,.055,.0001)*amp
    x += hp_noise(n)*env_exp(n,.18,.001)*(.25 if dark else .4)
    return x

def tom(freq, duration=.55, digital=False):
    n=int(duration*SR); t=np.arange(n)/SR
    phase=2*np.pi*np.cumsum(freq*(1+.75*np.exp(-t/.035)))/SR
    x=np.sin(phase)*env_exp(n,.22,.0008)
    x += .18*np.sin(2*phase)*env_exp(n,.11,.0006)
    if digital:
        # gentle 12-bit style quantization
        x=np.round(x*1024)/1024
    return x

def cowbell(duration=.35, digital=False):
    n=int(duration*SR); t=np.arange(n)/SR
    x=(np.sign(np.sin(2*np.pi*540*t))*.55+np.sign(np.sin(2*np.pi*845*t))*.45)*env_exp(n,.12,.0004)
    if digital: x=np.round(x*512)/512
    return x

def rim(duration=.18, pitch=1850):
    n=int(duration*SR); t=np.arange(n)/SR
    x=(np.sin(2*np.pi*pitch*t)+.7*np.sin(2*np.pi*pitch*1.93*t))*env_exp(n,.035,.0001)
    x += hp_noise(n)*env_exp(n,.01,.0001)*.25
    return x

def cymbal(duration=1.2, ride=False):
    n=int(duration*SR); t=np.arange(n)/SR
    freqs=[2431,3179,4211,5693,6983,8237,10111]
    x=sum(np.sin(2*np.pi*f*t + RNG.random()*6.28) for f in freqs)/len(freqs)
    x += hp_noise(n)*.38
    x *= env_exp(n,.62 if ride else .38,.0003)
    return x

entries=[]
def add(key, label, bank, instrument, articulation, legacy_type, data, *, rr=None, rr_i=None, vel=(1,127), choke=None, tags=()):
    file=write(key,data)
    entries.append({
        "key":key,"file":file,"label":label,"legacyType":legacy_type,
        "instrument":instrument,"articulation":articulation,
        "velocity":{"min":vel[0],"max":vel[1]},"roundRobinGroup":rr,"roundRobinIndex":rr_i,
        "chokeGroup":choke,"bank":bank,"sourceFile":"generated",
        "sourceCollection":"Battrochtek CC0 Electronic Core","sourceUrl":"",
        "license":"CC0-1.0","licenseUrl":"https://creativecommons.org/publicdomain/zero/1.0/",
        "generator":"scripts/generate-cc0-electronic-samples.py","tags":list(tags)
    })

# Analog Classic: classic sine/noise drum-machine language, original synthesis.
for i,(f0,f1) in enumerate([(145,49),(132,45)],1): add(f"bt_analog_kick_rr{i}",f"BT Analog Kick RR{i}","bt-analog","kick","hit","kick",sine_sweep(.75,f0,f1,.34,.09),rr="bt_analog_kick",rr_i=i,tags=("analog","classic","sub"))
for i,tone in enumerate([178,190],1): add(f"bt_analog_snare_rr{i}",f"BT Analog Snare RR{i}","bt-analog","snare","hit","snare",snare(tone=tone,noise=.7,body=.35,tau=.14,snap=.32),rr="bt_analog_snare",rr_i=i,tags=("analog","classic"))
for i in [1,2]: add(f"bt_analog_hhc_rr{i}",f"BT Analog Hi-Hat Closed RR{i}","bt-analog","hihat","closed","hat",hat(.15,metallic=1+.03*i),rr="bt_analog_hhc",rr_i=i,choke="bt-analog-hat",tags=("analog","hihat"))
for i in [1,2]: add(f"bt_analog_hho_rr{i}",f"BT Analog Hi-Hat Open RR{i}","bt-analog","hihat","open","hat",hat(.9,open_hat=True,metallic=.95+.04*i),rr="bt_analog_hho",rr_i=i,choke="bt-analog-hat",tags=("analog","hihat"))
add("bt_analog_hhp","BT Analog Hi-Hat Pedal","bt-analog","hihat","pedal","hat",hat(.12,pedal=True),choke="bt-analog-hat",tags=("analog","hihat"))
add("bt_analog_clap","BT Analog Clap","bt-analog","snare","clap","snare",clap(),tags=("analog","clap"))
add("bt_analog_cowbell","BT Analog Cowbell","bt-analog","percussion","cowbell","perc",cowbell(),tags=("analog","cowbell"))
for name,f in [("tom_high",165),("tom_mid",125),("tom_low",92)]: add(f"bt_analog_{name}",f"BT Analog {name.replace('_',' ').title()}","bt-analog","tom","hit","tom",tom(f),tags=("analog","tom"))
add("bt_analog_crash","BT Analog Crash","bt-analog","crash","crash","cymbal",cymbal(1.25),tags=("analog","cymbal"))
add("bt_analog_ride","BT Analog Ride","bt-analog","ride","bow","cymbal",cymbal(1.3,True),tags=("analog","ride"))

# Detroit Hybrid: harder transient, brighter hats, club-oriented.
for i,(f0,f1) in enumerate([(172,54),(160,51)],1): add(f"bt_detroit_kick_rr{i}",f"BT Detroit Kick RR{i}","bt-detroit","kick","hit","kick",np.tanh(sine_sweep(.58,f0,f1,.24,.19)*1.65),rr="bt_detroit_kick",rr_i=i,tags=("detroit","club","hybrid"))
for i,tone in enumerate([205,218],1): add(f"bt_detroit_snare_rr{i}",f"BT Detroit Snare RR{i}","bt-detroit","snare","hit","snare",np.tanh(snare(.38,tone,.9,.30,.11,.58)*1.35),rr="bt_detroit_snare",rr_i=i,tags=("detroit","club"))
for i in [1,2]: add(f"bt_detroit_hhc_rr{i}",f"BT Detroit Hi-Hat Closed RR{i}","bt-detroit","hihat","closed","hat",hat(.13,metallic=1.15+.04*i),rr="bt_detroit_hhc",rr_i=i,choke="bt-detroit-hat",tags=("detroit","hihat"))
for i in [1,2]: add(f"bt_detroit_hho_rr{i}",f"BT Detroit Hi-Hat Open RR{i}","bt-detroit","hihat","open","hat",hat(.72,open_hat=True,metallic=1.08+.04*i),rr="bt_detroit_hho",rr_i=i,choke="bt-detroit-hat",tags=("detroit","hihat"))
add("bt_detroit_hhp","BT Detroit Hi-Hat Pedal","bt-detroit","hihat","pedal","hat",hat(.11,pedal=True,metallic=1.1),choke="bt-detroit-hat",tags=("detroit","hihat"))
add("bt_detroit_clap","BT Detroit Clap","bt-detroit","snare","clap","snare",clap(.32),tags=("detroit","clap"))
add("bt_detroit_rim","BT Detroit Rimshot","bt-detroit","snare","rimshot","snare",rim(.16,2100),tags=("detroit","rimshot"))
for name,f in [("tom_high",178),("tom_mid",132),("tom_low",96)]: add(f"bt_detroit_{name}",f"BT Detroit {name.replace('_',' ').title()}","bt-detroit","tom","hit","tom",np.tanh(tom(f,.48)*1.25),tags=("detroit","tom"))
add("bt_detroit_crash","BT Detroit Crash","bt-detroit","crash","crash","cymbal",cymbal(1.05)*1.1,tags=("detroit","cymbal"))
add("bt_detroit_ride","BT Detroit Ride","bt-detroit","ride","bow","cymbal",cymbal(1.15,True),tags=("detroit","ride"))
add("bt_detroit_ride_bell","BT Detroit Ride Bell","bt-detroit","ride","bell","cymbal",rim(.75,3250)+.35*rim(.75,5110),tags=("detroit","ride","bell"))

# Digital 80: deliberately lower-resolution / early-digital flavor, no copied ROMs.
def digi(x, bits=9, rate_div=2):
    y=np.asarray(x).copy(); y=np.round(y*(2**(bits-1)))/(2**(bits-1))
    if rate_div>1:
        idx=(np.arange(len(y))//rate_div)*rate_div; y=y[np.minimum(idx,len(y)-1)]
    return y
for i,(f0,f1) in enumerate([(118,48),(125,51)],1): add(f"bt_digital80_kick_rr{i}",f"BT Digital 80 Kick RR{i}","bt-digital80","kick","hit","kick",digi(sine_sweep(.48,f0,f1,.22,.06),10,1),rr="bt_digital80_kick",rr_i=i,tags=("digital","80s"))
for i,tone in enumerate([170,185],1): add(f"bt_digital80_snare_rr{i}",f"BT Digital 80 Snare RR{i}","bt-digital80","snare","hit","snare",digi(snare(.36,tone,.58,.52,.12,.28),9,2),rr="bt_digital80_snare",rr_i=i,tags=("digital","80s"))
add("bt_digital80_hhc","BT Digital 80 Hi-Hat Closed","bt-digital80","hihat","closed","hat",digi(hat(.12,metallic=.9),8,2),choke="bt-digital80-hat",tags=("digital","80s","hihat"))
add("bt_digital80_hho","BT Digital 80 Hi-Hat Open","bt-digital80","hihat","open","hat",digi(hat(.62,open_hat=True,metallic=.9),8,2),choke="bt-digital80-hat",tags=("digital","80s","hihat"))
add("bt_digital80_rim","BT Digital 80 Cross Stick","bt-digital80","snare","cross-stick","snare",digi(rim(.14,1620),9,2),tags=("digital","80s","rim"))
add("bt_digital80_clap","BT Digital 80 Clap","bt-digital80","snare","clap","snare",digi(clap(.28,True),8,2),tags=("digital","80s","clap"))
for name,f in [("tom_high",158),("tom_mid",119),("tom_low",83)]: add(f"bt_digital80_{name}",f"BT Digital 80 {name.replace('_',' ').title()}","bt-digital80","tom","hit","tom",digi(tom(f,.43,True),9,2),tags=("digital","80s","tom"))
add("bt_digital80_crash","BT Digital 80 Crash","bt-digital80","crash","crash","cymbal",digi(cymbal(.82),8,2),tags=("digital","80s","cymbal"))
add("bt_digital80_ride","BT Digital 80 Ride","bt-digital80","ride","bow","cymbal",digi(cymbal(.92,True),8,2),tags=("digital","80s","ride"))
add("bt_digital80_cowbell","BT Digital 80 Cowbell","bt-digital80","percussion","cowbell","perc",digi(cowbell(.28,True),9,2),tags=("digital","80s","cowbell"))

meta={"schemaVersion":1,"generatedCount":len(entries),"sampleRate":SR,"format":"mono PCM16 WAV","license":"CC0-1.0","samples":entries}
(ROOT/"samples"/"generated-cc0-electronic.json").write_text(json.dumps(meta,indent=2,ensure_ascii=False)+"\n",encoding="utf8")
print(f"Generated {len(entries)} CC0 electronic samples in {OUT}")
