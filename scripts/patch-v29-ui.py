from pathlib import Path
import re
p=Path('/mnt/data/battro_v29_work/app.js')
s=p.read_text()

# Add visible-choice and keyboard-pad helpers after TRACK_SAMPLE_TYPES.
anchor="    const TRACK_SAMPLE_TYPES = Object.freeze([['cymbal','fx','perc'],['cymbal','perc','fx'],['hat','perc','fx'],['hat','perc'],['snare','perc'],['tom','perc'],['tom','perc'],['tom','perc'],['kick','perc','fx']]);\n"
insert=anchor+'''    const SAMPLE_TECHNICAL_BANKS = new Set(["jazz-club","vintage-rock","world-percussion","bt-world","bt-analog","bt-detroit","bt-digital80"]);
    const sampleChoiceFamily = sample => SAMPLE_TECHNICAL_BANKS.has(sample.bank)
        ? `${sample.bank}|${sample.key.replace(/_vl\\d+_rr\\d+$/u, "").replace(/_rr\\d+$/u, "")}`
        : sample.roundRobinGroup ? `${sample.bank}|${sample.roundRobinGroup}` : sample.key;
    const SAMPLE_VISIBLE_CHOICES = Object.freeze((() => {
        const chosen = new Map();
        for (const sample of SAMPLE_MANIFEST) {
            if ((sample.instrument === "metro" || sample.instrument === "metronome") || (sample.roundRobinIndex && sample.roundRobinIndex > 1)) continue;
            const family = sampleChoiceFamily(sample);
            const current = chosen.get(family);
            const distance = candidate => {
                const min = candidate.velocity?.min ?? 1, max = candidate.velocity?.max ?? 127;
                return min <= 76 && max >= 76 ? 0 : Math.min(Math.abs(76 - min), Math.abs(76 - max));
            };
            if (!current || distance(sample) < distance(current)) chosen.set(family, sample);
        }
        return [...chosen.values()].sort((a,b) => String(a.category||"").localeCompare(String(b.category||"")) || String(a.displayLabel||a.label).localeCompare(String(b.displayLabel||b.label)));
    })());
    const sampleUiLabel = sample => sample?.displayLabel || sample?.label || sample?.key || "";
    const PAD_KEYBOARD_MAP = Object.freeze({
        KeyQ:8, KeyW:4, KeyE:3, KeyR:2,
        KeyU:7, KeyI:6, KeyO:5, KeyP:1, BracketLeft:0
    });
    const PAD_KEYBOARD_LABELS = Object.freeze({ KeyQ:"A/Q", KeyW:"Z/W", KeyE:"E", KeyR:"R", KeyU:"U", KeyI:"I", KeyO:"O", KeyP:"P", BracketLeft:"^/[" });
'''
if anchor not in s: raise SystemExit('anchor types not found')
s=s.replace(anchor,insert,1)

# Monitoring state in constructor.
s=s.replace('this.soundUrlTimer = null;\n            this.dom = this.cacheDom();','this.soundUrlTimer = null;\n            this.monitoringEnabled = localStorage.getItem("battrochtek.monitoring") !== "0";\n            this.dom = this.cacheDom();',1)

# Cache monitoring DOM.
s=s.replace('groovePreview: $("groove-preview"), grooveAdd: $("groove-add"), gridShiftLeft: $("grid-shift-left"), gridShiftUp: $("grid-shift-up"), gridShiftDown: $("grid-shift-down"), gridShiftRight: $("grid-shift-right"), memory:', 'groovePreview: $("groove-preview"), grooveAdd: $("groove-add"), gridShiftLeft: $("grid-shift-left"), gridShiftUp: $("grid-shift-up"), gridShiftDown: $("grid-shift-down"), gridShiftRight: $("grid-shift-right"), monitoring: $("monitoring-toggle"), memory:',1)

# Replace buildKits and buildTrackLabels block.
pat=r'''        buildKits\(\) \{.*?\n        buildMemory\(\) \{'''
repl='''        buildKits() {
            if (!this.dom.kitSelect) return;
            this.dom.kitSelect.innerHTML = "";
            const categories = ["Acoustique", "Électro"];
            categories.forEach(category => {
                const group = document.createElement("optgroup"); group.label = category.toUpperCase();
                CONFIG.KITS.forEach((kit,i) => {
                    if ((kit.category || "Acoustique") !== category) return;
                    const option = document.createElement("option"); option.value = String(i); option.textContent = kit.name; group.appendChild(option);
                });
                this.dom.kitSelect.appendChild(group);
            });
            const custom = document.createElement("option"); custom.value = "custom"; custom.disabled = true; custom.textContent = "CUSTOM"; this.dom.kitSelect.appendChild(custom);
            this.dom.kitSelect.value = String(this.seq.kitIndex);
            this.dom.kitSelect.addEventListener("change", async () => {
                if (this.dom.kitSelect.value === "custom") return;
                this.seq.selectKit(Number(this.dom.kitSelect.value));
                this.renderKit(); this.saveSoundStateToUrl();
                const kit = CONFIG.KITS[this.seq.kitIndex];
                this.status(I18N.t("status.loadingKit", { kit:kit.name }));
                const buffers = await this.audio.preloadTracks(this.seq.currentTrackSamples());
                this.status(buffers.every(Boolean) ? I18N.t("status.kitReady", { kit:kit.name }) : I18N.t("status.kitPartial"));
            });
        }
        articulationForTrack(track) {
            return track===TRACK_ROLES.openHat ? "open" : track===TRACK_ROLES.closedHat ? "closed" : track===TRACK_ROLES.ride ? "bow" : null;
        }
        velocityForCell(index) {
            if (this.seq.accentCells.has(index)) return "accent";
            if (this.seq.strongCells.has(index)) return "strong";
            if (this.seq.weakCells.has(index)) return "soft";
            if (this.seq.ghostCells.has(index)) return "ghost";
            return "normal";
        }
        async previewTrackSample(track, sampleKey, velocity = "normal", force = false) {
            if (!force && !this.monitoringEnabled) return;
            try {
                const ctx = await this.audio.resume();
                await this.audio.play({ kitIndex:this.seq.kitIndex, trackIndex:track, sampleKey, time:ctx.currentTime, trackVolume:this.seq.trackVolumes[track], masterVolume:this.seq.masterVolume, pan:this.seq.trackPans[track], velocity, articulation:this.articulationForTrack(track) });
            } catch (error) { console.warn("Preview sample impossible", error); }
        }
        setSamplePickerValue(input, sampleKey) {
            const sample = SAMPLE_INDEX[sampleKey];
            input.dataset.sampleKey = sampleKey || "";
            input.value = sampleUiLabel(sample) || sampleKey || "";
        }
        buildTrackLabels() {
            this.dom.tracks.innerHTML = "";
            this.trackLabels = []; this.trackRows = []; this.trackSampleSelects = []; this.trackShiftLeftButtons = []; this.trackShiftRightButtons = [];
            for (let i = 0; i < CONFIG.TRACK_COUNT; i++) {
                const row = document.createElement("div"); row.className = "track-row";
                const label = document.createElement("div"); label.className = "bt-led track";
                const trackName = I18N.t(TRACK_I18N_KEYS[i]); label.dataset.btTooltip = trackName;
                const allowed = new Set(TRACK_SAMPLE_TYPES[i]);
                const choices = SAMPLE_VISIBLE_CHOICES.filter(sample => allowed.has(sample.legacyType||sample.type||sample.instrument));
                const picker = document.createElement("div"); picker.className = "sample-picker";
                const input = document.createElement("input"); input.type = "search"; input.className = "track-sample-select sample-search-input"; input.autocomplete = "off"; input.spellcheck = false; input.placeholder = "Rechercher un son…"; input.setAttribute("aria-label", `${trackName} — rechercher un son`); input.setAttribute("role","combobox"); input.setAttribute("aria-expanded","false");
                const menu = document.createElement("div"); menu.className = "sample-picker-menu"; menu.hidden = true;
                picker.append(input, menu); label.appendChild(picker);
                let filtered = choices.slice(), active = -1;
                const categoryOrder = {"Acoustique":0,"Électro":1};
                const renderMenu = () => {
                    const query = input.value.trim().toLowerCase();
                    filtered = choices.filter(sample => !query || `${sampleUiLabel(sample)} ${sample.key} ${sample.bank||""} ${sample.instrument||""} ${sample.articulation||""}`.toLowerCase().includes(query));
                    filtered.sort((a,b)=>(categoryOrder[a.category]??9)-(categoryOrder[b.category]??9) || sampleUiLabel(a).localeCompare(sampleUiLabel(b)));
                    menu.innerHTML = ""; active = -1;
                    let lastCategory = null;
                    filtered.slice(0,80).forEach((sample,index) => {
                        if (sample.category !== lastCategory) {
                            const heading = document.createElement("div"); heading.className = "sample-picker-heading"; heading.textContent = sample.category || "Autres"; menu.appendChild(heading); lastCategory = sample.category;
                        }
                        const option = document.createElement("button"); option.type = "button"; option.className = "sample-picker-option"; option.dataset.index = String(index); option.dataset.sampleKey = sample.key; option.textContent = sampleUiLabel(sample); option.setAttribute("role","option");
                        option.addEventListener("pointerdown", event => event.preventDefault());
                        option.addEventListener("click", () => commit(sample));
                        menu.appendChild(option);
                    });
                    menu.hidden = false; input.setAttribute("aria-expanded","true");
                };
                const optionNodes = () => [...menu.querySelectorAll(".sample-picker-option")];
                const activate = async next => {
                    const nodes = optionNodes(); if (!nodes.length) return;
                    active = (next + nodes.length) % nodes.length;
                    nodes.forEach((node,n)=>node.classList.toggle("active",n===active));
                    const sample = SAMPLE_INDEX[nodes[active].dataset.sampleKey];
                    nodes[active].scrollIntoView({block:"nearest"});
                    if (sample) await this.previewTrackSample(i, sample.key, "normal");
                };
                const close = () => { menu.hidden = true; input.setAttribute("aria-expanded","false"); active = -1; };
                const commit = async sample => {
                    if (!sample) return;
                    this.pushHistory();
                    if (!this.seq.setTrackSample(i, sample.key)) return;
                    this.setSamplePickerValue(input, sample.key); close(); this.renderKit(); this.saveSoundStateToUrl();
                    await this.audio.loadSample(sample.key); await this.previewTrackSample(i, sample.key, "normal");
                    this.status(I18N.t("track.custom", { n:i + 1, sample:sampleUiLabel(sample) }));
                };
                input.addEventListener("focus", () => { input.value = ""; renderMenu(); });
                input.addEventListener("input", renderMenu);
                input.addEventListener("keydown", event => {
                    if (event.key === "ArrowDown") { event.preventDefault(); if (menu.hidden) renderMenu(); activate(active+1); }
                    else if (event.key === "ArrowUp") { event.preventDefault(); if (menu.hidden) renderMenu(); activate(active-1); }
                    else if (event.key === "Enter") { const nodes=optionNodes(); if (active>=0 && nodes[active]) { event.preventDefault(); commit(SAMPLE_INDEX[nodes[active].dataset.sampleKey]); } }
                    else if (event.key === "Escape") { event.preventDefault(); this.setSamplePickerValue(input,this.seq.sampleForTrack(i)); close(); input.blur(); }
                });
                input.addEventListener("blur", () => setTimeout(() => { this.setSamplePickerValue(input,this.seq.sampleForTrack(i)); close(); },80));
                const controls = document.createElement("div"); controls.className = "track-controls track-shift-controls";
                const shiftLeft = document.createElement("button"); shiftLeft.type = "button"; shiftLeft.className = "track-toggle pattern-shift"; shiftLeft.textContent = "‹"; shiftLeft.dataset.btTooltip = I18N.t("track.shiftLeft");
                const shiftRight = document.createElement("button"); shiftRight.type = "button"; shiftRight.className = "track-toggle pattern-shift"; shiftRight.textContent = "›"; shiftRight.dataset.btTooltip = I18N.t("track.shiftRight");
                const shiftTrack = (direction, e) => { e.preventDefault(); e.stopPropagation(); this.pushHistory(); const amount=e.shiftKey?this.seq.signature.group:1; this.seq.shiftTrack(i,direction*amount); this.renderGrid(); this.autoSaveMemory(); this.status(I18N.t("track.shifted", { n:i+1, amount:amount===1?"1 step":"1 beat" })); };
                shiftLeft.addEventListener("click", e => shiftTrack(-1,e)); shiftRight.addEventListener("click", e => shiftTrack(1,e)); controls.append(shiftLeft,shiftRight);
                row.append(label,controls); this.dom.tracks.appendChild(row);
                this.trackLabels.push(label); this.trackRows.push(row); this.trackSampleSelects.push(input); this.trackShiftLeftButtons.push(shiftLeft); this.trackShiftRightButtons.push(shiftRight);
            }
        }
        buildMemory() {'''
s,n=re.subn(pat,repl,s,count=1,flags=re.S)
if n!=1: raise SystemExit('replace kits/labels failed')

# renderKit picker update.
s=s.replace('this.trackSampleSelects.forEach((select, i) => { select.value = this.seq.sampleForTrack(i); });','this.trackSampleSelects.forEach((input, i) => this.setSamplePickerValue(input, this.seq.sampleForTrack(i)));',1)

# Add helper for moving one cell before buildGrid.
anchor='        buildGrid() {\n'
helper='''        moveSingleNote(sourceIndex, targetIndex) {
            if (sourceIndex === targetIndex || !this.seq.activeCells.has(sourceIndex)) return false;
            const velocity = this.velocityForCell(sourceIndex);
            const sets=[this.seq.activeCells,this.seq.accentCells,this.seq.weakCells,this.seq.strongCells,this.seq.ghostCells];
            sets.forEach(set => { set.delete(sourceIndex); set.delete(targetIndex); });
            this.seq.activeCells.add(targetIndex);
            if (velocity === "accent") this.seq.accentCells.add(targetIndex);
            else if (velocity === "strong") this.seq.strongCells.add(targetIndex);
            else if (velocity === "soft") this.seq.weakCells.add(targetIndex);
            else if (velocity === "ghost") this.seq.ghostCells.add(targetIndex);
            return true;
        }
        buildGrid() {
'''
if anchor not in s: raise SystemExit('buildGrid anchor missing')
s=s.replace(anchor,helper,1)

# Patch grid pointerdown/move/finish block within buildGrid. Use exact snippets.
old='''                    cell.addEventListener("pointerdown", event => {
                        if (!event.altKey || event.button !== 0) return;
                        event.preventDefault();
                        this.gridDrag = {
                            pointerId:event.pointerId, sourceTrack:track, startX:event.clientX, startY:event.clientY,
                            before:this.captureState(), deltaSteps:0, deltaTracks:0, moved:false, wholeGrid:event.shiftKey
                        };
                        cell.setPointerCapture?.(event.pointerId);
                        this.dom.grid.classList.add("is-pattern-dragging");
                    });'''
new='''                    cell.addEventListener("pointerdown", event => {
                        if (event.button !== 0) return;
                        const singleNote = !event.altKey && this.seq.activeCells.has(index);
                        if (!event.altKey && !singleNote) return;
                        event.preventDefault();
                        this.gridDrag = {
                            pointerId:event.pointerId, sourceTrack:track, sourceStep:step, sourceIndex:index, startX:event.clientX, startY:event.clientY,
                            before:this.captureState(), deltaSteps:0, deltaTracks:0, moved:false, wholeGrid:event.altKey&&event.shiftKey, singleNote
                        };
                        cell.setPointerCapture?.(event.pointerId);
                        this.dom.grid.classList.add("is-pattern-dragging");
                    });'''
if old not in s: raise SystemExit('pointerdown old missing')
s=s.replace(old,new,1)

old='''                        this.seq.signatureIndex = drag.before.signatureIndex;
                        this.seq.apply(drag.before.pattern);
                        if (drag.wholeGrid) {
                            this.seq.translateGrid(deltaTracks, deltaSteps);
                        } else {
                            const targetTrack = ((drag.sourceTrack + deltaTracks) % CONFIG.TRACK_COUNT + CONFIG.TRACK_COUNT) % CONFIG.TRACK_COUNT;
                            this.seq.translateTrack(drag.sourceTrack, targetTrack, deltaSteps);
                        }
                        this.renderGrid();'''
new='''                        this.seq.signatureIndex = drag.before.signatureIndex;
                        this.seq.apply(drag.before.pattern);
                        if (drag.singleNote) {
                            const targetTrack = ((drag.sourceTrack + deltaTracks) % CONFIG.TRACK_COUNT + CONFIG.TRACK_COUNT) % CONFIG.TRACK_COUNT;
                            const targetStep = ((drag.sourceStep + deltaSteps) % steps + steps) % steps;
                            this.moveSingleNote(drag.sourceIndex, targetTrack * steps + targetStep);
                        } else if (drag.wholeGrid) {
                            this.seq.translateGrid(deltaTracks, deltaSteps);
                        } else {
                            const targetTrack = ((drag.sourceTrack + deltaTracks) % CONFIG.TRACK_COUNT + CONFIG.TRACK_COUNT) % CONFIG.TRACK_COUNT;
                            this.seq.translateTrack(drag.sourceTrack, targetTrack, deltaSteps);
                        }
                        this.renderGrid();'''
if old not in s: raise SystemExit('drag move old missing')
s=s.replace(old,new,1)

old='''                        this.gridDrag = null;
                        this.suppressGridClick = true;
                        this.dom.grid.classList.remove("is-pattern-dragging");
                        if (drag.moved) {
                            this.pushHistory(drag.before);
                            this.autoSaveMemory();
                            if (drag.wholeGrid) {
                                this.status(I18N.t("grid.moveAllStatus", { tracks:drag.deltaTracks, steps:drag.deltaSteps }));
                            } else {
                                const targetTrack = ((drag.sourceTrack + drag.deltaTracks) % CONFIG.TRACK_COUNT + CONFIG.TRACK_COUNT) % CONFIG.TRACK_COUNT;
                                this.status(I18N.t("grid.moveTrackStatus", { from:drag.sourceTrack + 1, to:targetTrack + 1, steps:drag.deltaSteps }));
                            }
                        } else {'''
new='''                        this.gridDrag = null;
                        this.suppressGridClick = drag.moved || !drag.singleNote;
                        this.dom.grid.classList.remove("is-pattern-dragging");
                        if (drag.moved) {
                            this.pushHistory(drag.before); this.autoSaveMemory();
                            if (drag.singleNote) this.status("Note déplacée.");
                            else if (drag.wholeGrid) this.status(I18N.t("grid.moveAllStatus", { tracks:drag.deltaTracks, steps:drag.deltaSteps }));
                            else {
                                const targetTrack = ((drag.sourceTrack + drag.deltaTracks) % CONFIG.TRACK_COUNT + CONFIG.TRACK_COUNT) % CONFIG.TRACK_COUNT;
                                this.status(I18N.t("grid.moveTrackStatus", { from:drag.sourceTrack + 1, to:targetTrack + 1, steps:drag.deltaSteps }));
                            }
                        } else {'''
if old not in s: raise SystemExit('finish old missing')
s=s.replace(old,new,1)

# Cell click monitoring after regular cycle.
s=s.replace('''                        this.seq.cycleCell(index);
                        this.renderCell(index);
                        this.autoSaveMemory();
                    });''','''                        this.seq.cycleCell(index);
                        this.renderCell(index);
                        this.autoSaveMemory();
                        if (this.seq.activeCells.has(index)) this.previewTrackSample(track, this.seq.sampleForTrack(track), this.velocityForCell(index));
                    });''',1)

# Monitoring click binding after grid shift handlers.
anchor='''            this.dom.gridShiftDown?.addEventListener("click", event => { event.preventDefault(); shiftGridTracks(1); });
            this.press(this.dom.random, () => this.setFeelEnabled(!this.feel.enabled));'''
repl='''            this.dom.gridShiftDown?.addEventListener("click", event => { event.preventDefault(); shiftGridTracks(1); });
            if (this.dom.monitoring) this.press(this.dom.monitoring, () => { this.monitoringEnabled = !this.monitoringEnabled; localStorage.setItem("battrochtek.monitoring", this.monitoringEnabled ? "1" : "0"); this.renderButtons(); this.status(this.monitoringEnabled ? "Monitoring activé." : "Monitoring désactivé."); });
            this.press(this.dom.random, () => this.setFeelEnabled(!this.feel.enabled));'''
if anchor not in s: raise SystemExit('monitor binding anchor missing')
s=s.replace(anchor,repl,1)

# Keyboard pad before editing early return.
anchor='''                if (e.code === "Space" && !mod && !e.altKey) { e.preventDefault(); if (this.previewEnabled) this.stopGroovePreview({ silent:true }); this.scheduler.toggle(); return; }
                if (editing || mod || e.altKey) return;'''
repl='''                if (e.code === "Space" && !mod && !e.altKey) { e.preventDefault(); if (this.previewEnabled) this.stopGroovePreview({ silent:true }); this.scheduler.toggle(); return; }
                if (!editing && !mod && !e.altKey && PAD_KEYBOARD_MAP[e.code] !== undefined) { e.preventDefault(); if (!e.repeat) this.previewTrackSample(PAD_KEYBOARD_MAP[e.code], this.seq.sampleForTrack(PAD_KEYBOARD_MAP[e.code]), "normal", true); return; }
                if (editing || mod || e.altKey) return;'''
if anchor not in s: raise SystemExit('keyboard anchor missing')
s=s.replace(anchor,repl,1)

# render monitoring state.
anchor='''            this.dom.chain.setAttribute("aria-pressed", String(this.seq.chainEnabled));
            this.dom.chain.classList.toggle("bt-buttondown", this.seq.chainEnabled);'''
repl='''            this.dom.chain.setAttribute("aria-pressed", String(this.seq.chainEnabled));
            this.dom.chain.classList.toggle("bt-buttondown", this.seq.chainEnabled);
            if (this.dom.monitoring) { this.dom.monitoring.setAttribute("aria-pressed", String(this.monitoringEnabled)); this.dom.monitoring.classList.toggle("bt-buttondown", this.monitoringEnabled); }'''
if anchor not in s: raise SystemExit('render monitoring anchor missing')
s=s.replace(anchor,repl,1)

p.write_text(s)
print('patched app.js')
