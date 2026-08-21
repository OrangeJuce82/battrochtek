/*
 * BATTROCHTEK - Drum Machine / Step Sequencer
 * Refonte 2026 : architecture modulaire, Web Audio sécurisé, migration storage.
 */
(function () {
    "use strict";

    const COMMON_SIGNATURES = [
        [4,4],[3,4],[12,8],
        ...[4,8,16].flatMap(d => Array.from({length:11},(_,i)=>[i+2,d]))
            .filter(([n,d]) => !((n===4&&d===4)||(n===3&&d===4)||(n===12&&d===8)))
    ];
    const SIGNATURES = COMMON_SIGNATURES.map(([numerator, denominator]) => {
        const barSteps = numerator * (16 / denominator);
        const compound = denominator === 8 && numerator >= 6 && numerator % 3 === 0;
        const group = compound ? 6 : Math.max(1, 16 / denominator);
        return Object.freeze({ numerator, denominator, label:`${numerator}/${denominator}`, barSteps, steps:barSteps*2, group });
    });
    const signatureIndexOf = (numerator, denominator) => SIGNATURES.findIndex(s => s.numerator===Number(numerator) && s.denominator===Number(denominator));

    const TRACK_ROLES = Object.freeze({
        crash:0, ride:1, openHat:2, closedHat:3, snare:4, tomHigh:5, tomLow:6, kick:7
    });

    const SAMPLE_LIBRARY = Object.freeze([{"key":"studio_kick_a","file":"sounds/studio-kick-a.wav","label":"Studio Kick A","type":"kick","source":"01kick1.wav"},{"key":"studio_kick_b","file":"sounds/studio-kick-b.wav","label":"Studio Kick B","type":"kick","source":"01kick2.wav"},{"key":"studio_snare_a","file":"sounds/studio-snare-a.wav","label":"Studio Snare A","type":"snare","source":"01snare1.wav"},{"key":"studio_snare_b","file":"sounds/studio-snare-b.wav","label":"Studio Snare B","type":"snare","source":"01snare2.wav"},{"key":"studio_tom_a","file":"sounds/studio-tom-a.wav","label":"Studio Tom A","type":"tom","source":"01tom1.wav"},{"key":"studio_tom_b","file":"sounds/studio-tom-b.wav","label":"Studio Tom B","type":"tom","source":"01tom2.wav"},{"key":"bright_kick_a","file":"sounds/bright-kick-a.wav","label":"Bright Kick A","type":"kick","source":"02kick1.wav"},{"key":"bright_kick_b","file":"sounds/bright-kick-b.wav","label":"Bright Kick B","type":"kick","source":"02kick2.wav"},{"key":"bright_snare_a","file":"sounds/bright-snare-a.wav","label":"Bright Snare A","type":"snare","source":"02snare1.wav"},{"key":"bright_snare_b","file":"sounds/bright-snare-b.wav","label":"Bright Snare B","type":"snare","source":"02snare2.wav"},{"key":"bright_tom_a","file":"sounds/bright-tom-a.wav","label":"Bright Tom A","type":"tom","source":"02tom1.wav"},{"key":"bright_tom_b","file":"sounds/bright-tom-b.wav","label":"Bright Tom B","type":"tom","source":"02tom2.wav"},{"key":"rock_kick_a","file":"sounds/rock-kick-a.wav","label":"Rock Kick A","type":"kick","source":"03kick1.wav"},{"key":"rock_kick_b","file":"sounds/rock-kick-b.wav","label":"Rock Kick B","type":"kick","source":"03kick2.wav"},{"key":"rock_snare_a","file":"sounds/rock-snare-a.wav","label":"Rock Snare A","type":"snare","source":"03snare1.wav"},{"key":"rock_tom_a","file":"sounds/rock-tom-a.wav","label":"Rock Tom A","type":"tom","source":"03tom1.wav"},{"key":"rock_tom_b","file":"sounds/rock-tom-b.wav","label":"Rock Tom B","type":"tom","source":"03tom2.wav"},{"key":"tight_kick_a","file":"sounds/tight-kick-a.wav","label":"Tight Kick A","type":"kick","source":"04kick1.wav"},{"key":"tight_kick_b","file":"sounds/tight-kick-b.wav","label":"Tight Kick B","type":"kick","source":"04kick2.wav"},{"key":"tight_snare_a","file":"sounds/tight-snare-a.wav","label":"Tight Snare A","type":"snare","source":"04snare1.wav"},{"key":"warm_kick_a","file":"sounds/warm-kick-a.wav","label":"Warm Kick A","type":"kick","source":"05kick1.wav"},{"key":"warm_kick_b","file":"sounds/warm-kick-b.wav","label":"Warm Kick B","type":"kick","source":"05kick2.wav"},{"key":"warm_snare_a","file":"sounds/warm-snare-a.wav","label":"Warm Snare A","type":"snare","source":"05snare1.wav"},{"key":"warm_snare_b","file":"sounds/warm-snare-b.wav","label":"Warm Snare B","type":"snare","source":"05snare2.wav"},{"key":"warm_tom_a","file":"sounds/warm-tom-a.wav","label":"Warm Tom A","type":"tom","source":"05tom1.wav"},{"key":"warm_tom_b","file":"sounds/warm-tom-b.wav","label":"Warm Tom B","type":"tom","source":"05tom2.wav"},{"key":"raw_kick_a","file":"sounds/raw-kick-a.wav","label":"Raw Kick A","type":"kick","source":"06kick1.wav"},{"key":"raw_kick_b","file":"sounds/raw-kick-b.wav","label":"Raw Kick B","type":"kick","source":"06kick2.wav"},{"key":"raw_snare_a","file":"sounds/raw-snare-a.wav","label":"Raw Snare A","type":"snare","source":"06snare1.wav"},{"key":"raw_snare_b","file":"sounds/raw-snare-b.wav","label":"Raw Snare B","type":"snare","source":"06snare2.wav"},{"key":"raw_tom_a","file":"sounds/raw-tom-a.wav","label":"Raw Tom A","type":"tom","source":"06tom1.wav"},{"key":"raw_tom_b","file":"sounds/raw-tom-b.wav","label":"Raw Tom B","type":"tom","source":"06tom2.wav"},{"key":"arena_kick_a","file":"sounds/arena-kick-a.wav","label":"Arena Kick A","type":"kick","source":"07kick1.wav"},{"key":"arena_kick_b","file":"sounds/arena-kick-b.wav","label":"Arena Kick B","type":"kick","source":"07kick2.wav"},{"key":"arena_snare_a","file":"sounds/arena-snare-a.wav","label":"Arena Snare A","type":"snare","source":"07snare1.wav"},{"key":"arena_snare_b","file":"sounds/arena-snare-b.wav","label":"Arena Snare B","type":"snare","source":"07snare2.wav"},{"key":"arena_tom_a","file":"sounds/arena-tom-a.wav","label":"Arena Tom A","type":"tom","source":"07tom1.wav"},{"key":"arena_tom_b","file":"sounds/arena-tom-b.wav","label":"Arena Tom B","type":"tom","source":"07tom2.wav"},{"key":"deep_kick_a","file":"sounds/deep-kick-a.wav","label":"Deep Kick A","type":"kick","source":"08kick1.wav"},{"key":"deep_kick_b","file":"sounds/deep-kick-b.wav","label":"Deep Kick B","type":"kick","source":"08kick2.wav"},{"key":"deep_snare_a","file":"sounds/deep-snare-a.wav","label":"Deep Snare A","type":"snare","source":"08snare1.wav"},{"key":"deep_snare_b","file":"sounds/deep-snare-b.wav","label":"Deep Snare B","type":"snare","source":"08snare2.wav"},{"key":"deep_tom_a","file":"sounds/deep-tom-a.wav","label":"Deep Tom A","type":"tom","source":"08tom1.wav"},{"key":"deep_tom_b","file":"sounds/deep-tom-b.wav","label":"Deep Tom B","type":"tom","source":"08tom2.wav"},{"key":"alarm_01","file":"sounds/alarm-01.wav","label":"Alarm 01","type":"fx","source":"alarm_01.wav"},{"key":"anvil_01","file":"sounds/anvil-01.wav","label":"Anvil 01","type":"fx","source":"anvil_01.wav"},{"key":"beep_01","file":"sounds/beep-01.wav","label":"Beep 01","type":"fx","source":"beep_01.wav"},{"key":"beep_02","file":"sounds/beep-02.wav","label":"Beep 02","type":"fx","source":"beep_02.wav"},{"key":"legacy_bell1","file":"sounds/legacy-bell1.wav","label":"Legacy Bell1","type":"cymbal","source":"bell1.wav"},{"key":"bongo_01","file":"sounds/bongo-01.wav","label":"Bongo 01","type":"perc","source":"bongo_01.wav"},{"key":"bongo_02","file":"sounds/bongo-02.wav","label":"Bongo 02","type":"perc","source":"bongo_02.wav"},{"key":"bongo_03","file":"sounds/bongo-03.wav","label":"Bongo 03","type":"perc","source":"bongo_03.wav"},{"key":"bongo_04","file":"sounds/bongo-04.wav","label":"Bongo 04","type":"perc","source":"bongo_04.wav"},{"key":"legacy_china1","file":"sounds/legacy-china1.wav","label":"Legacy China1","type":"cymbal","source":"china1.wav"},{"key":"clap_01","file":"sounds/clap-01.wav","label":"Clap 01","type":"perc","source":"clap_01.wav"},{"key":"clap_02","file":"sounds/clap-02.wav","label":"Clap 02","type":"perc","source":"clap_02.wav"},{"key":"clap_03","file":"sounds/clap-03.wav","label":"Clap 03","type":"perc","source":"clap_03.wav"},{"key":"clap_04","file":"sounds/clap-04.wav","label":"Clap 04","type":"perc","source":"clap_04.wav"},{"key":"clap_long_01","file":"sounds/clap-long-01.wav","label":"Clap Long 01","type":"perc","source":"clap_long_01.wav"},{"key":"claves_01","file":"sounds/claves-01.wav","label":"Claves 01","type":"perc","source":"claves_01.wav"},{"key":"claves_02","file":"sounds/claves-02.wav","label":"Claves 02","type":"perc","source":"claves_02.wav"},{"key":"legacy_cowbell","file":"sounds/legacy-cowbell.wav","label":"Legacy Cowbell","type":"perc","source":"cowbell.wav"},{"key":"cowbell_01","file":"sounds/cowbell-01.wav","label":"Cowbell 01","type":"perc","source":"cowbell_01.wav"},{"key":"cowbell_02","file":"sounds/cowbell-02.wav","label":"Cowbell 02","type":"perc","source":"cowbell_02.wav"},{"key":"cowbell_03","file":"sounds/cowbell-03.wav","label":"Cowbell 03","type":"perc","source":"cowbell_03.wav"},{"key":"legacy_crash1","file":"sounds/legacy-crash1.wav","label":"Legacy Crash1","type":"cymbal","source":"crash1.wav"},{"key":"crash_electro_01","file":"sounds/crash-electro-01.wav","label":"Crash Electro 01","type":"cymbal","source":"crash_01.wav"},{"key":"crash_electro_02","file":"sounds/crash-electro-02.wav","label":"Crash Electro 02","type":"cymbal","source":"crash_02.wav"},{"key":"crow_01","file":"sounds/crow-01.wav","label":"Crow 01","type":"fx","source":"crow_01.wav"},{"key":"crow_02","file":"sounds/crow-02.wav","label":"Crow 02","type":"fx","source":"crow_02.wav"},{"key":"cymbal_electro_01","file":"sounds/cymbal-electro-01.wav","label":"Cymbal Electro 01","type":"cymbal","source":"cymbal_01.wav"},{"key":"cymbal_electro_02","file":"sounds/cymbal-electro-02.wav","label":"Cymbal Electro 02","type":"cymbal","source":"cymbal_02.wav"},{"key":"cymbal_electro_03","file":"sounds/cymbal-electro-03.wav","label":"Cymbal Electro 03","type":"cymbal","source":"cymbal_03.wav"},{"key":"cymbal_electro_04","file":"sounds/cymbal-electro-04.wav","label":"Cymbal Electro 04","type":"cymbal","source":"cymbal_04.wav"},{"key":"door_01","file":"sounds/door-01.wav","label":"Door 01","type":"fx","source":"door_01.wav"},{"key":"door_02","file":"sounds/door-02.wav","label":"Door 02","type":"fx","source":"door_02.wav"},{"key":"formant_01","file":"sounds/formant-01.wav","label":"Formant 01","type":"fx","source":"formant_01.wav"},{"key":"game_01","file":"sounds/game-01.wav","label":"Game 01","type":"fx","source":"game_01.wav"},{"key":"game_02","file":"sounds/game-02.wav","label":"Game 02","type":"fx","source":"game_02.wav"},{"key":"game_03","file":"sounds/game-03.wav","label":"Game 03","type":"fx","source":"game_03.wav"},{"key":"game_coin","file":"sounds/game-coin.wav","label":"Game Coin","type":"fx","source":"game_coin.wav"},{"key":"game_damaged","file":"sounds/game-damaged.wav","label":"Game Damaged","type":"fx","source":"game_damaged.wav"},{"key":"game_fail","file":"sounds/game-fail.wav","label":"Game Fail","type":"fx","source":"game_fail.wav"},{"key":"game_fail_02","file":"sounds/game-fail-02.wav","label":"Game Fail 02","type":"fx","source":"game_fail_02.wav"},{"key":"game_level_up","file":"sounds/game-level-up.wav","label":"Game Level Up","type":"fx","source":"game_level_up.wav"},{"key":"game_passed_01","file":"sounds/game-passed-01.wav","label":"Game Passed 01","type":"fx","source":"game_passed_01.wav"},{"key":"game_passed_02","file":"sounds/game-passed-02.wav","label":"Game Passed 02","type":"fx","source":"game_passed_02.wav"},{"key":"game_pick_up","file":"sounds/game-pick-up.wav","label":"Game Pick Up","type":"fx","source":"game_pick_up.wav"},{"key":"glass_01","file":"sounds/glass-01.wav","label":"Glass 01","type":"fx","source":"glass_01.wav"},{"key":"glass_02","file":"sounds/glass-02.wav","label":"Glass 02","type":"fx","source":"glass_02.wav"},{"key":"glitch_01","file":"sounds/glitch-01.wav","label":"Glitch 01","type":"fx","source":"glitch_01.wav"},{"key":"glitch_02","file":"sounds/glitch-02.wav","label":"Glitch 02","type":"fx","source":"glitch_02.wav"},{"key":"electro_hat_closed_bright_01","file":"sounds/electro-hat-closed-bright-01.wav","label":"Electro Hat Closed Bright 01","type":"hat","source":"hat_closed_01.wav"},{"key":"electro_hat_closed_bright_02","file":"sounds/electro-hat-closed-bright-02.wav","label":"Electro Hat Closed Bright 02","type":"hat","source":"hat_closed_02.wav"},{"key":"electro_hat_closed_bright_03","file":"sounds/electro-hat-closed-bright-03.wav","label":"Electro Hat Closed Bright 03","type":"hat","source":"hat_closed_03.wav"},{"key":"electro_hat_closed_bright_04","file":"sounds/electro-hat-closed-bright-04.wav","label":"Electro Hat Closed Bright 04","type":"hat","source":"hat_closed_04.wav"},{"key":"electro_hat_closed_bright_05","file":"sounds/electro-hat-closed-bright-05.wav","label":"Electro Hat Closed Bright 05","type":"hat","source":"hat_closed_05.wav"},{"key":"electro_hat_closed_bright_06","file":"sounds/electro-hat-closed-bright-06.wav","label":"Electro Hat Closed Bright 06","type":"hat","source":"hat_closed_06.wav"},{"key":"electro_hat_closed_distorted_01","file":"sounds/electro-hat-closed-distorted-01.wav","label":"Electro Hat Closed Distorted 01","type":"hat","source":"hat_distort_01.wav"},{"key":"electro_hat_closed_metal_01","file":"sounds/electro-hat-closed-metal-01.wav","label":"Electro Hat Closed Metal 01","type":"hat","source":"hat_metal_01.wav"},{"key":"electro_hat_open_bright_01","file":"sounds/electro-hat-open-bright-01.wav","label":"Electro Hat Open Bright 01","type":"hat","source":"hat_open_01.wav"},{"key":"electro_hat_open_bright_02","file":"sounds/electro-hat-open-bright-02.wav","label":"Electro Hat Open Bright 02","type":"hat","source":"hat_open_02.wav"},{"key":"electro_hat_open_bright_03","file":"sounds/electro-hat-open-bright-03.wav","label":"Electro Hat Open Bright 03","type":"hat","source":"hat_open_03.wav"},{"key":"electro_hat_open_bright_04","file":"sounds/electro-hat-open-bright-04.wav","label":"Electro Hat Open Bright 04","type":"hat","source":"hat_open_04.wav"},{"key":"electro_hat_open_bright_05","file":"sounds/electro-hat-open-bright-05.wav","label":"Electro Hat Open Bright 05","type":"hat","source":"hat_open_05.wav"},{"key":"heartbeat_01","file":"sounds/heartbeat-01.wav","label":"Heartbeat 01","type":"fx","source":"heartbeat_01.wav"},{"key":"legacy_hat_closed_1","file":"sounds/legacy-hat-closed-1.wav","label":"Legacy Hat Closed 1","type":"hat","source":"hihat1.wav"},{"key":"legacy_hat_closed_2","file":"sounds/legacy-hat-closed-2.wav","label":"Legacy Hat Closed 2","type":"hat","source":"hihat2.wav"},{"key":"electro_kick_deep_01","file":"sounds/electro-kick-deep-01.wav","label":"Electro Kick Deep 01","type":"kick","source":"kick_01.wav"},{"key":"electro_kick_sub_02","file":"sounds/electro-kick-sub-02.wav","label":"Electro Kick Sub 02","type":"kick","source":"kick_02.wav"},{"key":"electro_kick_sub_03","file":"sounds/electro-kick-sub-03.wav","label":"Electro Kick Sub 03","type":"kick","source":"kick_03.wav"},{"key":"electro_kick_punch_04","file":"sounds/electro-kick-punch-04.wav","label":"Electro Kick Punch 04","type":"kick","source":"kick_04.wav"},{"key":"electro_kick_deep_05","file":"sounds/electro-kick-deep-05.wav","label":"Electro Kick Deep 05","type":"kick","source":"kick_05.wav"},{"key":"electro_kick_deep_06","file":"sounds/electro-kick-deep-06.wav","label":"Electro Kick Deep 06","type":"kick","source":"kick_06.wav"},{"key":"electro_kick_sub_07","file":"sounds/electro-kick-sub-07.wav","label":"Electro Kick Sub 07","type":"kick","source":"kick_07.wav"},{"key":"electro_kick_bright_08","file":"sounds/electro-kick-bright-08.wav","label":"Electro Kick Bright 08","type":"kick","source":"kick_08.wav"},{"key":"electro_kick_punch_09","file":"sounds/electro-kick-punch-09.wav","label":"Electro Kick Punch 09","type":"kick","source":"kick_09.wav"},{"key":"electro_kick_deep_10","file":"sounds/electro-kick-deep-10.wav","label":"Electro Kick Deep 10","type":"kick","source":"kick_10.wav"},{"key":"electro_kick_sub_11","file":"sounds/electro-kick-sub-11.wav","label":"Electro Kick Sub 11","type":"kick","source":"kick_11.wav"},{"key":"electro_kick_sub_12","file":"sounds/electro-kick-sub-12.wav","label":"Electro Kick Sub 12","type":"kick","source":"kick_12.wav"},{"key":"electro_kick_deep_13","file":"sounds/electro-kick-deep-13.wav","label":"Electro Kick Deep 13","type":"kick","source":"kick_13.wav"},{"key":"electro_kick_deep_14","file":"sounds/electro-kick-deep-14.wav","label":"Electro Kick Deep 14","type":"kick","source":"kick_14.wav"},{"key":"electro_kick_distorted_01","file":"sounds/electro-kick-distorted-01.wav","label":"Electro Kick Distorted 01","type":"kick","source":"kick_distort_01.wav"},{"key":"electro_kick_distorted_02","file":"sounds/electro-kick-distorted-02.wav","label":"Electro Kick Distorted 02","type":"kick","source":"kick_distort_02.wav"},{"key":"lock_01","file":"sounds/lock-01.wav","label":"Lock 01","type":"fx","source":"lock_01.wav"},{"key":"maracas_01","file":"sounds/maracas-01.wav","label":"Maracas 01","type":"perc","source":"maracas_01.wav"},{"key":"maracas_02","file":"sounds/maracas-02.wav","label":"Maracas 02","type":"perc","source":"maracas_02.wav"},{"key":"melee_01","file":"sounds/melee-01.wav","label":"Melee 01","type":"fx","source":"melee_01.wav"},{"key":"melee_02","file":"sounds/melee-02.wav","label":"Melee 02","type":"fx","source":"melee_02.wav"},{"key":"melee_03","file":"sounds/melee-03.wav","label":"Melee 03","type":"fx","source":"melee_03.wav"},{"key":"metal_01","file":"sounds/metal-01.wav","label":"Metal 01","type":"fx","source":"metal_01.wav"},{"key":"metal_02","file":"sounds/metal-02.wav","label":"Metal 02","type":"fx","source":"metal_02.wav"},{"key":"notify_01","file":"sounds/notify-01.wav","label":"Notify 01","type":"fx","source":"notify_01.wav"},{"key":"legacy_hat_open_1","file":"sounds/legacy-hat-open-1.wav","label":"Legacy Hat Open 1","type":"hat","source":"open1.wav"},{"key":"legacy_hat_open_2","file":"sounds/legacy-hat-open-2.wav","label":"Legacy Hat Open 2","type":"hat","source":"open2.wav"},{"key":"legacy_pad_2","file":"sounds/legacy-pad-2.wav","label":"Legacy Pad 2","type":"fx","source":"pad2.wav"},{"key":"perc_01","file":"sounds/perc-01.wav","label":"Perc 01","type":"perc","source":"perc_01.wav"},{"key":"perc_02","file":"sounds/perc-02.wav","label":"Perc 02","type":"perc","source":"perc_02.wav"},{"key":"perc_03","file":"sounds/perc-03.wav","label":"Perc 03","type":"perc","source":"perc_03.wav"},{"key":"perc_04","file":"sounds/perc-04.wav","label":"Perc 04","type":"perc","source":"perc_04.wav"},{"key":"punch_01","file":"sounds/punch-01.wav","label":"Punch 01","type":"fx","source":"punch_01.wav"},{"key":"punch_02","file":"sounds/punch-02.wav","label":"Punch 02","type":"fx","source":"punch_02.wav"},{"key":"punch_03","file":"sounds/punch-03.wav","label":"Punch 03","type":"fx","source":"punch_03.wav"},{"key":"punch_04","file":"sounds/punch-04.wav","label":"Punch 04","type":"fx","source":"punch_04.wav"},{"key":"punch_05","file":"sounds/punch-05.wav","label":"Punch 05","type":"fx","source":"punch_05.wav"},{"key":"punch_06","file":"sounds/punch-06.wav","label":"Punch 06","type":"fx","source":"punch_06.wav"},{"key":"ratchet_01","file":"sounds/ratchet-01.wav","label":"Ratchet 01","type":"fx","source":"ratchet_01.wav"},{"key":"legacy_ride1","file":"sounds/legacy-ride1.wav","label":"Legacy Ride1","type":"cymbal","source":"ride1.wav"},{"key":"legacy_ride3","file":"sounds/legacy-ride3.wav","label":"Legacy Ride3","type":"cymbal","source":"ride3.wav"},{"key":"ride_electro_01","file":"sounds/ride-electro-01.wav","label":"Ride Electro 01","type":"cymbal","source":"ride_01.wav"},{"key":"ride_electro_02","file":"sounds/ride-electro-02.wav","label":"Ride Electro 02","type":"cymbal","source":"ride_02.wav"},{"key":"legacy_rim","file":"sounds/legacy-rim.wav","label":"Legacy Rim","type":"perc","source":"rim.wav"},{"key":"rimshot_01","file":"sounds/rimshot-01.wav","label":"Rimshot 01","type":"perc","source":"rimshot_01.wav"},{"key":"rimshot_02","file":"sounds/rimshot-02.wav","label":"Rimshot 02","type":"perc","source":"rimshot_02.wav"},{"key":"rimshot_03","file":"sounds/rimshot-03.wav","label":"Rimshot 03","type":"perc","source":"rimshot_03.wav"},{"key":"rimshot_04","file":"sounds/rimshot-04.wav","label":"Rimshot 04","type":"perc","source":"rimshot_04.wav"},{"key":"electro_snare_snap_01","file":"sounds/electro-snare-snap-01.wav","label":"Electro Snare Snap 01","type":"snare","source":"snare_01.wav"},{"key":"electro_snare_snap_02","file":"sounds/electro-snare-snap-02.wav","label":"Electro Snare Snap 02","type":"snare","source":"snare_02.wav"},{"key":"electro_snare_bright_03","file":"sounds/electro-snare-bright-03.wav","label":"Electro Snare Bright 03","type":"snare","source":"snare_03.wav"},{"key":"electro_snare_crack_04","file":"sounds/electro-snare-crack-04.wav","label":"Electro Snare Crack 04","type":"snare","source":"snare_04.wav"},{"key":"electro_snare_snap_05","file":"sounds/electro-snare-snap-05.wav","label":"Electro Snare Snap 05","type":"snare","source":"snare_05.wav"},{"key":"electro_snare_crack_06","file":"sounds/electro-snare-crack-06.wav","label":"Electro Snare Crack 06","type":"snare","source":"snare_06.wav"},{"key":"electro_snare_snap_07","file":"sounds/electro-snare-snap-07.wav","label":"Electro Snare Snap 07","type":"snare","source":"snare_07.wav"},{"key":"electro_snare_snap_08","file":"sounds/electro-snare-snap-08.wav","label":"Electro Snare Snap 08","type":"snare","source":"snare_08.wav"},{"key":"electro_snare_crack_09","file":"sounds/electro-snare-crack-09.wav","label":"Electro Snare Crack 09","type":"snare","source":"snare_09.wav"},{"key":"electro_snare_snap_10","file":"sounds/electro-snare-snap-10.wav","label":"Electro Snare Snap 10","type":"snare","source":"snare_10.wav"},{"key":"electro_snare_warm_11","file":"sounds/electro-snare-warm-11.wav","label":"Electro Snare Warm 11","type":"snare","source":"snare_11.wav"},{"key":"electro_snare_bright_12","file":"sounds/electro-snare-bright-12.wav","label":"Electro Snare Bright 12","type":"snare","source":"snare_12.wav"},{"key":"electro_snare_snap_13","file":"sounds/electro-snare-snap-13.wav","label":"Electro Snare Snap 13","type":"snare","source":"snare_13.wav"},{"key":"electro_snare_snap_14","file":"sounds/electro-snare-snap-14.wav","label":"Electro Snare Snap 14","type":"snare","source":"snare_14.wav"},{"key":"electro_snare_distorted_01","file":"sounds/electro-snare-distorted-01.wav","label":"Electro Snare Distorted 01","type":"snare","source":"snare_distort_01.wav"},{"key":"electro_snare_distorted_02","file":"sounds/electro-snare-distorted-02.wav","label":"Electro Snare Distorted 02","type":"snare","source":"snare_distort_02.wav"},{"key":"legacy_splash1","file":"sounds/legacy-splash1.wav","label":"Legacy Splash1","type":"cymbal","source":"splash1.wav"},{"key":"legacy_stax_1","file":"sounds/legacy-stax-1.wav","label":"Legacy Stax 1","type":"fx","source":"stax1.wav"},{"key":"metronome_tick","file":"sounds/metronome-tick.wav","label":"Metronome Tick","type":"metro","source":"tick.wav"},{"key":"electro_tom_high_01","file":"sounds/electro-tom-high-01.wav","label":"Electro Tom High 01","type":"tom","source":"tom_hi_01.wav"},{"key":"electro_tom_high_02","file":"sounds/electro-tom-high-02.wav","label":"Electro Tom High 02","type":"tom","source":"tom_hi_02.wav"},{"key":"electro_tom_high_03","file":"sounds/electro-tom-high-03.wav","label":"Electro Tom High 03","type":"tom","source":"tom_hi_03.wav"},{"key":"electro_tom_high_04","file":"sounds/electro-tom-high-04.wav","label":"Electro Tom High 04","type":"tom","source":"tom_hi_04.wav"},{"key":"electro_tom_high_05","file":"sounds/electro-tom-high-05.wav","label":"Electro Tom High 05","type":"tom","source":"tom_hi_05.wav"},{"key":"electro_tom_low_01","file":"sounds/electro-tom-low-01.wav","label":"Electro Tom Low 01","type":"tom","source":"tom_low_01.wav"},{"key":"electro_tom_low_02","file":"sounds/electro-tom-low-02.wav","label":"Electro Tom Low 02","type":"tom","source":"tom_low_02.wav"},{"key":"electro_tom_low_03","file":"sounds/electro-tom-low-03.wav","label":"Electro Tom Low 03","type":"tom","source":"tom_low_03.wav"},{"key":"electro_tom_low_04","file":"sounds/electro-tom-low-04.wav","label":"Electro Tom Low 04","type":"tom","source":"tom_low_04.wav"},{"key":"electro_tom_low_05","file":"sounds/electro-tom-low-05.wav","label":"Electro Tom Low 05","type":"tom","source":"tom_low_05.wav"},{"key":"electro_tom_mid_01","file":"sounds/electro-tom-mid-01.wav","label":"Electro Tom Mid 01","type":"tom","source":"tom_mid_01.wav"},{"key":"electro_tom_mid_02","file":"sounds/electro-tom-mid-02.wav","label":"Electro Tom Mid 02","type":"tom","source":"tom_mid_02.wav"},{"key":"electro_tom_mid_03","file":"sounds/electro-tom-mid-03.wav","label":"Electro Tom Mid 03","type":"tom","source":"tom_mid_03.wav"},{"key":"electro_tom_mid_04","file":"sounds/electro-tom-mid-04.wav","label":"Electro Tom Mid 04","type":"tom","source":"tom_mid_04.wav"},{"key":"electro_tom_mid_05","file":"sounds/electro-tom-mid-05.wav","label":"Electro Tom Mid 05","type":"tom","source":"tom_mid_05.wav"},{"key":"twang_01","file":"sounds/twang-01.wav","label":"Twang 01","type":"fx","source":"twang_01.wav"},{"key":"twang_02","file":"sounds/twang-02.wav","label":"Twang 02","type":"fx","source":"twang_02.wav"},{"key":"twang_03","file":"sounds/twang-03.wav","label":"Twang 03","type":"fx","source":"twang_03.wav"},{"key":"vocal_are_you_crazy","file":"sounds/vocal-are-you-crazy.wav","label":"Vocal Are You Crazy","type":"fx","source":"vocal_are_you_crazy.wav"},{"key":"vocal_come_on_01","file":"sounds/vocal-come-on-01.wav","label":"Vocal Come On 01","type":"fx","source":"vocal_come_on_01.wav"},{"key":"vocal_dont_judge","file":"sounds/vocal-dont-judge.wav","label":"Vocal Dont Judge","type":"fx","source":"vocal_dont_judge.wav"},{"key":"vocal_gasp","file":"sounds/vocal-gasp.wav","label":"Vocal Gasp","type":"fx","source":"vocal_gasp.wav"},{"key":"vocal_lets_run","file":"sounds/vocal-lets-run.wav","label":"Vocal Lets Run","type":"fx","source":"vocal_lets_run.wav"},{"key":"vocal_no_cant","file":"sounds/vocal-no-cant.wav","label":"Vocal No Cant","type":"fx","source":"vocal_no_cant.wav"},{"key":"vocal_order","file":"sounds/vocal-order.wav","label":"Vocal Order","type":"fx","source":"vocal_order.wav"},{"key":"vocal_scream_01","file":"sounds/vocal-scream-01.wav","label":"Vocal Scream 01","type":"fx","source":"vocal_scream_01.wav"},{"key":"vocal_the_line","file":"sounds/vocal-the-line.wav","label":"Vocal The Line","type":"fx","source":"vocal_the_line.wav"},{"key":"vocal_what_01","file":"sounds/vocal-what-01.wav","label":"Vocal What 01","type":"fx","source":"vocal_what_01.wav"},{"key":"vocal_what_02","file":"sounds/vocal-what-02.wav","label":"Vocal What 02","type":"fx","source":"vocal_what_02.wav"},{"key":"warb_01","file":"sounds/warb-01.wav","label":"Warb 01","type":"fx","source":"warb_01.wav"},{"key":"zap_01","file":"sounds/zap-01.wav","label":"Zap 01","type":"fx","source":"zap_01.wav"},{"key":"zap_02","file":"sounds/zap-02.wav","label":"Zap 02","type":"fx","source":"zap_02.wav"},{"key":"zap_03","file":"sounds/zap-03.wav","label":"Zap 03","type":"fx","source":"zap_03.wav"},{"key":"zap_04","file":"sounds/zap-04.wav","label":"Zap 04","type":"fx","source":"zap_04.wav"},{"key":"zap_05","file":"sounds/zap-05.wav","label":"Zap 05","type":"fx","source":"zap_05.wav"}]);
    const SAMPLE_INDEX = Object.freeze(Object.fromEntries(SAMPLE_LIBRARY.map(sample => [sample.key, Object.freeze(sample)])));
    const TRACK_SAMPLE_TYPES = Object.freeze([['cymbal','fx','perc'],['cymbal','perc','fx'],['hat','perc','fx'],['hat','perc'],['snare','perc'],['tom','perc'],['tom','perc'],['kick','perc','fx']]);

    const CONFIG = Object.freeze({
        SIGNATURES: Object.freeze(SIGNATURES),
        SIGNATURE_DENOMINATORS: Object.freeze([4,8,16]),
        TRACK_COUNT: 8,
        METRONOME_TRACK_INDEX: 8,
        LEGACY_TRACK_COUNT: 10,
        MEMORY_SLOTS: 8,
        TEMPO: Object.freeze({ min: 40, max: 240, default: 120 }),
        TEMPO_RAMP_STEP: 5,
        SWING: Object.freeze({ min: 0, max: 100, default: 0, maxDelayRatio: 0.28 }),
        VELOCITY_GAIN: Object.freeze({ ghost:0.30, soft:0.48, normal:0.72, strong:0.92, accent:1.15 }),
        SCHEDULER: Object.freeze({ lookAheadMs: 25, scheduleAheadSec: 0.1 }),
        SAMPLE_MAP: Object.freeze(Object.fromEntries(SAMPLE_LIBRARY.map(sample => [sample.key, [sample.file, sample.label, sample.type]]))),
        KITS: Object.freeze([{"name":"STUDIO PUNCH","color":"#2d9cdb","tracks":["legacy_crash1","legacy_ride1","legacy_hat_open_1","legacy_hat_closed_1","studio_snare_a","studio_tom_a","studio_tom_b","studio_kick_a","metronome_tick"]},{"name":"ARENA 909","color":"#ff5a36","tracks":["crash_electro_02","ride_electro_02","electro_hat_open_bright_03","electro_hat_closed_bright_06","electro_snare_snap_14","electro_tom_high_05","electro_tom_low_05","electro_kick_deep_14","metronome_tick"]},{"name":"NEON 808","color":"#ff2f7d","tracks":["cymbal_electro_01","cowbell_01","electro_hat_open_bright_01","electro_hat_closed_bright_01","electro_snare_warm_11","electro_tom_high_02","electro_tom_low_02","electro_kick_sub_12","metronome_tick"]},{"name":"SOUL POCKET","color":"#d4a72c","tracks":["legacy_crash1","legacy_ride1","legacy_hat_open_2","legacy_hat_closed_2","warm_snare_a","warm_tom_a","warm_tom_b","warm_kick_a","metronome_tick"]},{"name":"FUNK TIGHT","color":"#32a852","tracks":["legacy_splash1","legacy_cowbell","electro_hat_open_bright_04","electro_hat_closed_bright_04","tight_snare_a","electro_tom_high_03","electro_tom_low_03","tight_kick_a","metronome_tick"]},{"name":"DMX STREET","color":"#8b5cf6","tracks":["cymbal_electro_02","cowbell_03","electro_hat_open_bright_02","electro_hat_closed_bright_02","electro_snare_snap_10","electro_tom_mid_03","electro_tom_low_04","electro_kick_deep_10","metronome_tick"]},{"name":"LINN CHROME","color":"#00a7a7","tracks":["crash_electro_01","ride_electro_01","electro_hat_open_bright_05","electro_hat_closed_bright_05","clap_02","electro_tom_high_01","electro_tom_mid_01","electro_kick_deep_05","metronome_tick"]},{"name":"SP DUST","color":"#9a6b3f","tracks":["legacy_china1","legacy_ride3","electro_hat_closed_distorted_01","electro_hat_closed_metal_01","electro_snare_distorted_01","raw_tom_a","raw_tom_b","electro_kick_distorted_01","metronome_tick"]},{"name":"AFRO CIRCUIT","color":"#e48a1d","tracks":["cymbal_electro_03","cowbell_02","maracas_01","claves_01","rimshot_02","bongo_01","bongo_02","electro_kick_sub_07","metronome_tick"]},{"name":"GLITCH LAB","color":"#e83e8c","tracks":["zap_05","game_level_up","electro_hat_closed_distorted_01","glitch_01","electro_snare_distorted_02","punch_03","metal_02","electro_kick_distorted_02","metronome_tick"]}].map(kit => Object.freeze({...kit, tracks:Object.freeze(kit.tracks)})))
    });

    const Util = Object.freeze({
        finite(value, fallback = 0) {
            const n = Number(value);
            return Number.isFinite(n) ? n : fallback;
        },
        clamp(value, min, max, fallback = min) {
            return Math.min(max, Math.max(min, this.finite(value, fallback)));
        },
        clone(value) { return JSON.parse(JSON.stringify(value)); }
    });

    function createFactoryPresets() {
        /*
         * 200 grooves (25 x 8 familles), uniquement inspirés de morceaux connus.
         * Ce sont des adaptations pédagogiques pour une grille 1/16, pas des transcriptions intégrales.
         * Chaque groove transporte sa signature : la sélection du groove met à jour la grille.
         */
        const T = Object.freeze({ crash:TRACK_ROLES.crash, ride:TRACK_ROLES.ride, open:TRACK_ROLES.openHat, hat:TRACK_ROLES.closedHat, snare:TRACK_ROLES.snare, tom1:TRACK_ROLES.tomHigh, tom2:TRACK_ROLES.tomLow, kick:TRACK_ROLES.kick });
        const families = [{name:"Rock / Pop" , grooves:[{name:"Billie Jean – Michael Jackson",bpm:117,signature:[4,4],swing:0,kit:3},{name:"Back In Black – AC/DC",bpm:94,signature:[4,4],swing:0,kit:0},{name:"When The Levee Breaks – Led Zeppelin",bpm:72,signature:[4,4],swing:0,kit:0},{name:"Come Together – The Beatles",bpm:84,signature:[4,4],swing:0,kit:0},{name:"Sunday Bloody Sunday – U2",bpm:103,signature:[4,4],swing:0,kit:0},{name:"Smells Like Teen Spirit – Nirvana",bpm:117,signature:[4,4],swing:0,kit:0},{name:"We Will Rock You – Queen",bpm:81,signature:[4,4],swing:0,kit:0},{name:"Walk This Way – Aerosmith",bpm:108,signature:[4,4],swing:3,kit:4},{name:"Dreams – Fleetwood Mac",bpm:120,signature:[4,4],swing:0,kit:3},{name:"Rosanna – Toto",bpm:82,signature:[4,4],swing:10,kit:0},{name:"In The Air Tonight – Phil Collins",bpm:95,signature:[4,4],swing:0,kit:3},{name:"Every Breath You Take – The Police",bpm:117,signature:[4,4],swing:0,kit:3},{name:"Locked Out Of Heaven – Bruno Mars",bpm:144,signature:[4,4],swing:0,kit:3},{name:"Seven Nation Army – The White Stripes",bpm:124,signature:[4,4],swing:0,kit:0},{name:"Supermassive Black Hole – Muse",bpm:120,signature:[4,4],swing:0,kit:2},{name:"Money – Pink Floyd",bpm:124,signature:[7,4],swing:0,kit:0},{name:"Solsbury Hill – Peter Gabriel",bpm:102,signature:[7,4],swing:0,kit:3},{name:"Tom Sawyer (7/8 section) – Rush",bpm:88,signature:[7,8],swing:0,kit:2},{name:"Use Somebody – Kings Of Leon",bpm:138,signature:[4,4],swing:0,kit:0},{name:"Take Me Out – Franz Ferdinand",bpm:104,signature:[4,4],swing:0,kit:2},{name:"Baba O’Riley – The Who",bpm:117,signature:[4,4],swing:0,kit:0},{name:"Rebel Rebel – David Bowie",bpm:126,signature:[4,4],swing:0,kit:3},{name:"Sledgehammer – Peter Gabriel",bpm:96,signature:[4,4],swing:3,kit:3},{name:"Everybody Wants To Rule The World – Tears for Fears",bpm:112,signature:[12,8],swing:0,kit:3},{name:"Message in a Bottle – The Police",bpm:151,signature:[4,4],swing:0,kit:3}]},{name:"Funk / Soul" , grooves:[{name:"Funky Drummer – James Brown",bpm:100,signature:[4,4],swing:8,kit:3},{name:"Cissy Strut – The Meters",bpm:90,signature:[4,4],swing:4,kit:3},{name:"Superstition – Stevie Wonder",bpm:100,signature:[4,4],swing:6,kit:3},{name:"Cold Sweat – James Brown",bpm:112,signature:[4,4],swing:4,kit:3},{name:"Use Me – Bill Withers",bpm:78,signature:[4,4],swing:6,kit:3},{name:"Chameleon – Herbie Hancock",bpm:112,signature:[4,4],swing:4,kit:4},{name:"Pick Up The Pieces – Average White Band",bpm:108,signature:[4,4],swing:3,kit:3},{name:"The Chicken – Jaco Pastorius",bpm:104,signature:[4,4],swing:4,kit:3},{name:"Get Up (I Feel Like Being A) Sex Machine – James Brown",bpm:108,signature:[4,4],swing:6,kit:3},{name:"Just Kissed My Baby – The Meters",bpm:96,signature:[4,4],swing:4,kit:3},{name:"I Got The Feelin' – James Brown",bpm:112,signature:[4,4],swing:4,kit:3},{name:"Soul Man – Sam & Dave",bpm:112,signature:[4,4],swing:0,kit:3},{name:"I Heard It Through The Grapevine – Marvin Gaye",bpm:117,signature:[4,4],swing:0,kit:3},{name:"Let's Stay Together – Al Green",bpm:102,signature:[4,4],swing:2,kit:3},{name:"Ain't Too Proud To Beg – The Temptations",bpm:118,signature:[4,4],swing:0,kit:3},{name:"Papa Was A Rollin' Stone – The Temptations",bpm:122,signature:[4,4],swing:2,kit:4},{name:"Brick House – Commodores",bpm:108,signature:[4,4],swing:4,kit:3},{name:"Le Freak – Chic",bpm:119,signature:[4,4],swing:0,kit:3},{name:"Good Times – Chic",bpm:111,signature:[4,4],swing:0,kit:3},{name:"Kiss – Prince",bpm:112,signature:[4,4],swing:2,kit:4},{name:"Kissing My Love – Bill Withers",bpm:103,signature:[4,4],swing:3,kit:3},{name:"Rock Steady – Aretha Franklin",bpm:104,signature:[4,4],swing:4,kit:3},{name:"What Is Hip? – Tower of Power",bpm:106,signature:[4,4],swing:2,kit:3},{name:"I Want You Back – The Jackson 5",bpm:98,signature:[4,4],swing:0,kit:3},{name:"Outstanding – The Gap Band",bpm:100,signature:[4,4],swing:4,kit:4}]},{name:"Blues / Shuffle" , grooves:[{name:"Pride And Joy – Stevie Ray Vaughan",bpm:126,signature:[4,4],swing:18,kit:3},{name:"Texas Flood – Stevie Ray Vaughan",bpm:62,signature:[12,8],swing:0,kit:3},{name:"Cold Shot – Stevie Ray Vaughan",bpm:110,signature:[4,4],swing:14,kit:3},{name:"Sweet Home Chicago – Blues Brothers",bpm:116,signature:[4,4],swing:16,kit:3},{name:"Stormy Monday – T-Bone Walker",bpm:66,signature:[12,8],swing:0,kit:3},{name:"Before You Accuse Me – Eric Clapton",bpm:112,signature:[4,4],swing:14,kit:3},{name:"Tush – ZZ Top",bpm:145,signature:[4,4],swing:12,kit:0},{name:"La Grange – ZZ Top",bpm:82,signature:[4,4],swing:18,kit:0},{name:"Crossroads – Cream",bpm:132,signature:[4,4],swing:8,kit:0},{name:"Red House – Jimi Hendrix",bpm:70,signature:[12,8],swing:0,kit:0},{name:"Fool In The Rain – Led Zeppelin",bpm:92,signature:[4,4],swing:18,kit:0},{name:"Rosanna – Toto",bpm:82,signature:[4,4],swing:16,kit:0},{name:"Home At Last – Steely Dan",bpm:94,signature:[4,4],swing:18,kit:3},{name:"Babylon Sisters – Steely Dan",bpm:74,signature:[4,4],swing:16,kit:3},{name:"The Thrill Is Gone – B.B. King",bpm:91,signature:[4,4],swing:8,kit:3},{name:"Hoochie Coochie Man – Muddy Waters",bpm:72,signature:[12,8],swing:0,kit:3},{name:"I'd Rather Go Blind – Etta James",bpm:76,signature:[12,8],swing:0,kit:3},{name:"Still Got The Blues – Gary Moore",bpm:67,signature:[12,8],swing:0,kit:0},{name:"Since I've Been Loving You – Led Zeppelin",bpm:64,signature:[12,8],swing:0,kit:0},{name:"Black Velvet – Alannah Myles",bpm:92,signature:[4,4],swing:10,kit:3},{name:"Pride and Joy (Live Feel) – Stevie Ray Vaughan",bpm:128,signature:[4,4],swing:15,kit:3},{name:"Roadhouse Blues – The Doors",bpm:121,signature:[4,4],swing:8,kit:0},{name:"Boom Boom – John Lee Hooker",bpm:158,signature:[4,4],swing:10,kit:3},{name:"I’m Tore Down – Freddie King",bpm:108,signature:[4,4],swing:12,kit:3},{name:"Hide Away – Freddie King",bpm:132,signature:[4,4],swing:10,kit:3}]},{name:"Jazz" , grooves:[{name:"Take Five – Dave Brubeck Quartet",bpm:174,signature:[5,4],swing:10,kit:3},{name:"So What – Miles Davis",bpm:136,signature:[4,4],swing:10,kit:3},{name:"Moanin' – Art Blakey & The Jazz Messengers",bpm:126,signature:[4,4],swing:10,kit:3},{name:"Freddie Freeloader – Miles Davis",bpm:124,signature:[4,4],swing:10,kit:3},{name:"Cantaloupe Island – Herbie Hancock",bpm:116,signature:[4,4],swing:0,kit:4},{name:"Mercy, Mercy, Mercy – Cannonball Adderley",bpm:110,signature:[4,4],swing:0,kit:4},{name:"Sing, Sing, Sing – Benny Goodman",bpm:112,signature:[4,4],swing:12,kit:3},{name:"My Favorite Things – John Coltrane",bpm:132,signature:[3,4],swing:8,kit:3},{name:"All Blues – Miles Davis",bpm:120,signature:[6,8],swing:0,kit:3},{name:"Footprints – Wayne Shorter",bpm:108,signature:[6,8],swing:0,kit:3},{name:"Blue Rondo à la Turk – Dave Brubeck",bpm:126,signature:[9,8],swing:0,kit:3},{name:"Mission: Impossible Theme – Lalo Schifrin",bpm:112,signature:[5,4],swing:0,kit:3},{name:"A Night In Tunisia – Dizzy Gillespie",bpm:138,signature:[4,4],swing:6,kit:3},{name:"Song For My Father – Horace Silver",bpm:124,signature:[4,4],swing:0,kit:4},{name:"The Sidewinder – Lee Morgan",bpm:126,signature:[4,4],swing:2,kit:4},{name:"Watermelon Man – Herbie Hancock",bpm:116,signature:[4,4],swing:0,kit:4},{name:"St. Thomas – Sonny Rollins",bpm:152,signature:[4,4],swing:0,kit:5},{name:"Caravan – Duke Ellington",bpm:136,signature:[4,4],swing:4,kit:5},{name:"Autumn Leaves – Cannonball Adderley",bpm:124,signature:[4,4],swing:8,kit:3},{name:"Chitlins Con Carne – Kenny Burrell",bpm:110,signature:[4,4],swing:4,kit:3},{name:"Cucumber Slumber – Weather Report",bpm:104,signature:[4,4],swing:0,kit:4},{name:"Actual Proof – Herbie Hancock",bpm:122,signature:[4,4],swing:2,kit:4},{name:"The Chicken (Live) – Jaco Pastorius",bpm:112,signature:[4,4],swing:2,kit:3},{name:"Strasbourg / St. Denis – Roy Hargrove",bpm:112,signature:[4,4],swing:0,kit:4},{name:"Red Clay – Freddie Hubbard",bpm:122,signature:[4,4],swing:2,kit:4}]},{name:"Hip-Hop" , grooves:[{name:"Amen, Brother – The Winstons",bpm:136,signature:[4,4],swing:0,kit:4},{name:"Impeach The President – The Honey Drippers",bpm:96,signature:[4,4],swing:2,kit:4},{name:"Apache – Incredible Bongo Band",bpm:114,signature:[4,4],swing:0,kit:4},{name:"Synthetic Substitution – Melvin Bliss",bpm:92,signature:[4,4],swing:2,kit:4},{name:"Funky Drummer – James Brown",bpm:100,signature:[4,4],swing:6,kit:3},{name:"Think (About It) – Lyn Collins",bpm:102,signature:[4,4],swing:2,kit:4},{name:"Ashley's Roachclip – The Soul Searchers",bpm:92,signature:[4,4],swing:2,kit:4},{name:"Hihache – Lafayette Afro Rock Band",bpm:110,signature:[4,4],swing:0,kit:5},{name:"God Make Me Funky – The Headhunters",bpm:104,signature:[4,4],swing:2,kit:4},{name:"It's A New Day – Skull Snaps",bpm:100,signature:[4,4],swing:2,kit:4},{name:"Nuthin' But A 'G' Thang – Dr. Dre",bpm:94,signature:[4,4],swing:4,kit:4},{name:"C.R.E.A.M. – Wu-Tang Clan",bpm:91,signature:[4,4],swing:6,kit:4},{name:"Shook Ones, Pt. II – Mobb Deep",bpm:94,signature:[4,4],swing:4,kit:4},{name:"The Message – Grandmaster Flash",bpm:100,signature:[4,4],swing:0,kit:4},{name:"Rapper's Delight – Sugarhill Gang",bpm:112,signature:[4,4],swing:0,kit:4},{name:"Paid In Full – Eric B. & Rakim",bpm:100,signature:[4,4],swing:4,kit:4},{name:"Hip Hop Hooray – Naughty By Nature",bpm:99,signature:[4,4],swing:4,kit:4},{name:"Juicy – The Notorious B.I.G.",bpm:96,signature:[4,4],swing:4,kit:4},{name:"Still D.R.E. – Dr. Dre",bpm:93,signature:[4,4],swing:2,kit:4},{name:"The Next Episode – Dr. Dre",bpm:95,signature:[4,4],swing:2,kit:4},{name:"Scenario – A Tribe Called Quest",bpm:102,signature:[4,4],swing:5,kit:4},{name:"They Reminisce Over You (T.R.O.Y.) – Pete Rock & CL Smooth",bpm:102,signature:[4,4],swing:4,kit:4},{name:"Mass Appeal – Gang Starr",bpm:96,signature:[4,4],swing:3,kit:4},{name:"93 ’til Infinity – Souls of Mischief",bpm:93,signature:[4,4],swing:5,kit:4},{name:"Electric Relaxation – A Tribe Called Quest",bpm:98,signature:[4,4],swing:6,kit:4}]},{name:"Reggae / Ska" , grooves:[{name:"One Drop – Bob Marley & The Wailers",bpm:76,signature:[4,4],swing:1,kit:5},{name:"Exodus – Bob Marley & The Wailers",bpm:74,signature:[4,4],swing:0,kit:5},{name:"Jamming – Bob Marley & The Wailers",bpm:78,signature:[4,4],swing:0,kit:5},{name:"Is This Love – Bob Marley & The Wailers",bpm:76,signature:[4,4],swing:0,kit:5},{name:"Legalize It – Peter Tosh",bpm:74,signature:[4,4],swing:0,kit:5},{name:"Marcus Garvey – Burning Spear",bpm:80,signature:[4,4],swing:0,kit:5},{name:"Police And Thieves – Junior Murvin",bpm:78,signature:[4,4],swing:0,kit:5},{name:"War Ina Babylon – Max Romeo",bpm:78,signature:[4,4],swing:0,kit:5},{name:"Satta Massagana – The Abyssinians",bpm:76,signature:[4,4],swing:0,kit:5},{name:"Pressure Drop – Toots & The Maytals",bpm:90,signature:[4,4],swing:0,kit:5},{name:"54-46 That's My Number – Toots & The Maytals",bpm:88,signature:[4,4],swing:0,kit:5},{name:"The Harder They Come – Jimmy Cliff",bpm:92,signature:[4,4],swing:0,kit:5},{name:"Rivers Of Babylon – The Melodians",bpm:86,signature:[4,4],swing:0,kit:5},{name:"Israelites – Desmond Dekker",bpm:84,signature:[4,4],swing:1,kit:5},{name:"A Message To You Rudy – The Specials",bpm:104,signature:[4,4],swing:0,kit:5},{name:"Ghost Town – The Specials",bpm:75,signature:[4,4],swing:2,kit:5},{name:"One Step Beyond – Madness",bpm:156,signature:[4,4],swing:0,kit:2},{name:"Mirror In The Bathroom – The Beat",bpm:160,signature:[4,4],swing:0,kit:2},{name:"Guns Of Navarone – The Skatalites",bpm:132,signature:[4,4],swing:1,kit:5},{name:"Gangsters – The Specials",bpm:148,signature:[4,4],swing:0,kit:2},{name:"Walking On The Moon – The Police",bpm:146,signature:[4,4],swing:0,kit:3},{name:"Red Red Wine – UB40",bpm:89,signature:[4,4],swing:0,kit:5},{name:"Kingston Town – UB40",bpm:82,signature:[4,4],swing:0,kit:5},{name:"Pass The Dutchie – Musical Youth",bpm:150,signature:[4,4],swing:0,kit:5},{name:"Here I Come – Barrington Levy",bpm:86,signature:[4,4],swing:1,kit:5}]},{name:"Latin" , grooves:[{name:"The Girl From Ipanema – Getz/Gilberto",bpm:124,signature:[4,4],swing:0,kit:5},{name:"Mas Que Nada – Jorge Ben Jor",bpm:148,signature:[4,4],swing:0,kit:5},{name:"Oye Como Va – Santana",bpm:126,signature:[4,4],swing:0,kit:5},{name:"Manteca – Dizzy Gillespie",bpm:132,signature:[4,4],swing:0,kit:5},{name:"Watermelon Man – Mongo Santamaría",bpm:112,signature:[4,4],swing:0,kit:5},{name:"Soul Bossa Nova – Quincy Jones",bpm:156,signature:[4,4],swing:0,kit:5},{name:"Corcovado – Antônio Carlos Jobim",bpm:104,signature:[4,4],swing:0,kit:5},{name:"Wave – Antônio Carlos Jobim",bpm:126,signature:[4,4],swing:0,kit:5},{name:"Desafinado – Stan Getz & Charlie Byrd",bpm:132,signature:[4,4],swing:0,kit:5},{name:"Água de Beber – Antônio Carlos Jobim",bpm:126,signature:[4,4],swing:0,kit:5},{name:"Brazil – Ary Barroso",bpm:144,signature:[4,4],swing:0,kit:5},{name:"Ran Kan Kan – Tito Puente",bpm:168,signature:[4,4],swing:0,kit:5},{name:"Mambo Gozón – Tito Puente",bpm:172,signature:[4,4],swing:0,kit:5},{name:"Quimbara – Celia Cruz",bpm:176,signature:[4,4],swing:0,kit:5},{name:"Pedro Navaja – Rubén Blades",bpm:104,signature:[4,4],swing:0,kit:5},{name:"Chan Chan – Buena Vista Social Club",bpm:82,signature:[4,4],swing:0,kit:5},{name:"El Cuarto de Tula – Buena Vista Social Club",bpm:100,signature:[4,4],swing:0,kit:5},{name:"Black Orpheus – Luiz Bonfá",bpm:132,signature:[4,4],swing:0,kit:5},{name:"Afro Blue – Mongo Santamaría",bpm:126,signature:[6,8],swing:0,kit:5},{name:"Spain – Chick Corea",bpm:126,signature:[4,4],swing:0,kit:5},{name:"A Night in Tunisia – Chano Pozo / Dizzy Gillespie",bpm:138,signature:[4,4],swing:0,kit:5},{name:"Chega de Saudade – João Gilberto",bpm:126,signature:[4,4],swing:0,kit:5},{name:"Samba de Uma Nota Só – Antônio Carlos Jobim",bpm:132,signature:[4,4],swing:0,kit:5},{name:"El Cantante – Héctor Lavoe",bpm:102,signature:[4,4],swing:0,kit:5},{name:"Vivir Mi Vida – Marc Anthony",bpm:105,signature:[4,4],swing:0,kit:5}]},{name:"Afro / World" , grooves:[{name:"Water No Get Enemy – Fela Kuti",bpm:102,signature:[4,4],swing:4,kit:5},{name:"Zombie – Fela Kuti",bpm:110,signature:[4,4],swing:4,kit:5},{name:"Expensive Shit – Fela Kuti",bpm:104,signature:[4,4],swing:4,kit:5},{name:"Shakara – Fela Kuti",bpm:106,signature:[4,4],swing:4,kit:5},{name:"Sorrow Tears And Blood – Fela Kuti",bpm:108,signature:[4,4],swing:4,kit:5},{name:"Gentleman – Fela Kuti",bpm:104,signature:[4,4],swing:4,kit:5},{name:"Lady – Fela Kuti",bpm:108,signature:[4,4],swing:4,kit:5},{name:"Roforofo Fight – Fela Kuti",bpm:106,signature:[4,4],swing:4,kit:5},{name:"Opposite People – Fela Kuti",bpm:112,signature:[4,4],swing:4,kit:5},{name:"ITT – Fela Kuti",bpm:104,signature:[4,4],swing:4,kit:5},{name:"Soul Makossa – Manu Dibango",bpm:118,signature:[4,4],swing:2,kit:5},{name:"Pata Pata – Miriam Makeba",bpm:126,signature:[4,4],swing:0,kit:5},{name:"Yéké Yéké – Mory Kanté",bpm:124,signature:[4,4],swing:0,kit:5},{name:"Sweet Mother – Prince Nico Mbarga",bpm:118,signature:[4,4],swing:0,kit:5},{name:"Agolo – Angélique Kidjo",bpm:116,signature:[4,4],swing:0,kit:5},{name:"Jerusalema – Master KG",bpm:124,signature:[4,4],swing:0,kit:5},{name:"Waka Waka – Shakira",bpm:128,signature:[4,4],swing:0,kit:5},{name:"Homeless – Ladysmith Black Mambazo",bpm:92,signature:[6,8],swing:0,kit:5},{name:"Malaika – Miriam Makeba",bpm:96,signature:[6,8],swing:0,kit:5},{name:"Jingo – Santana",bpm:116,signature:[6,8],swing:0,kit:5},{name:"Ye Ye De Smell – Fela Kuti",bpm:108,signature:[4,4],swing:3,kit:5},{name:"African Woman – The Funkees",bpm:112,signature:[4,4],swing:2,kit:5},{name:"New Bell – Manu Dibango",bpm:116,signature:[4,4],swing:2,kit:5},{name:"Lady (Hear Me Tonight) – Modjo / Chic-influenced world-dance",bpm:126,signature:[4,4],swing:0,kit:4},{name:"Premier Gaou – Magic System",bpm:126,signature:[4,4],swing:0,kit:5}]}];
        const uniq=a=>Array.from(new Set(a.filter(Number.isInteger))).sort((x,y)=>x-y);
        const add=(obj,key,values)=>{ if(!obj[key])obj[key]=[]; obj[key].push(...values); };
        const makeDefinition = (familyIndex, grooveIndex, meta) => {
            const sigIndex = signatureIndexOf(meta.signature[0], meta.signature[1]);
            const sig = CONFIG.SIGNATURES[sigIndex];
            const b = sig.barSteps, q=4, e=2;
            const tracks={}, ghost={}, soft={}, strong={}, accent={};
            const every=(step,start=0,end=b)=>{const a=[];for(let i=start;i<end;i+=step)a.push(i);return a;};
            const beat=(n)=>Math.min(b-1,n*q);
            const back=[]; for(let p=q;p<b;p+=2*q) back.push(p);
            const family = familyIndex;
            const v = grooveIndex % 5;
            if (family===0) { // rock/pop
                add(tracks,'hat',every(e)); add(tracks,'snare',back); add(strong,'snare',back);
                add(tracks,'kick',uniq([0, beat(2), Math.max(0,b-2-v%2), ...(v===1?[6]:[]), ...(v===2?[3,10]:[])]));
                add(accent,'kick',[0]); if(v===3)add(tracks,'open',[Math.max(0,b-2)]); add(accent,'snare',back.slice(0,1)); if(v===4){add(tracks,'crash',[0]);add(accent,'crash',[0]);}
            } else if (family===1) { // funk/soul
                add(tracks,'hat',every(1)); add(soft,'hat',every(2,1)); add(tracks,'snare',back); add(strong,'snare',back);
                add(tracks,'kick',uniq([0,3,Math.min(b-1,7),Math.min(b-1,10+v%2),Math.max(0,b-2)]));
                add(tracks,'snare',uniq([2,Math.min(b-1,7),Math.max(0,b-1)])); add(ghost,'snare',uniq([2,Math.min(b-1,7),Math.max(0,b-1)]));
                add(accent,'kick',[0]); if(v%2===0)add(tracks,'open',[Math.max(0,b-1)]);
            } else if (family===2) { // blues / shuffle
                const trip = meta.signature[1]===8 ? every(2) : every(4).flatMap(x=>[x,Math.min(b-1,x+3)]);
                add(tracks,'hat',uniq(trip)); add(tracks,'snare',back.length?back:[Math.floor(b/2)]); add(strong,'snare',back.length?back:[Math.floor(b/2)]);
                add(tracks,'kick',uniq([0,Math.floor(b/2),Math.max(0,b-2)]));
                add(ghost,'snare',uniq(trip.filter((_,i)=>i%2===1))); add(accent,'snare',back.length?[back[0]]:[Math.floor(b/2)]);
            } else if (family===3) { // jazz
                const group=sig.group; const ride=[]; for(let x=0;x<b;x+=group){ride.push(x); if(x+Math.max(1,group-2)<b)ride.push(x+Math.max(1,group-2));}
                add(tracks,'ride',uniq(ride)); add(strong,'ride',every(group)); add(tracks,'kick',[0]); add(soft,'kick',[0]);
                const comps=uniq([Math.min(b-1,3+v),Math.min(b-1,Math.floor(b*.62)),Math.max(0,b-2)]); add(tracks,'snare',comps); add(ghost,'snare',comps); add(accent,'ride',[0]);
            } else if (family===4) { // hip-hop / breaks
                add(tracks,'hat',every(e)); if(v===2)add(tracks,'hat',every(1)); add(soft,'hat',every(4,2));
                add(tracks,'snare',back); add(strong,'snare',back);
                add(tracks,'kick',uniq([0,3+v%2,Math.min(b-1,7),Math.min(b-1,10+v),Math.max(0,b-2)]));
                add(tracks,'snare',uniq([Math.min(b-1,9),Math.max(0,b-1)])); add(ghost,'snare',uniq([Math.min(b-1,9),Math.max(0,b-1)])); add(accent,'snare',back.slice(0,1));
            } else if (family===5) { // reggae / ska — 25 empreintes réellement distinctes
                // 0 one-drop, 1-3 steppers, 4-8 roots/rockers, 9-13 early reggae/rocksteady,
                // 14-19 ska/2-tone, 20 reggae-rock, 21-24 lovers/rub-a-dub/dancehall.
                const P = [
                    {h:[0,2,4,6,8,10,12,14], k:[8], s:[8], o:[14], gh:[6,15]},
                    {h:[0,2,4,6,8,10,12,14], k:[0,4,8,12], s:[8], o:[6,14], gh:[7]},
                    {h:[0,2,4,6,8,10,12,14], k:[0,4,8,12,15], s:[8], o:[10,14], gh:[3,11]},
                    {h:[0,2,4,6,8,10,12,14], k:[0,4,7,8,12], s:[8], o:[6], gh:[14]},
                    {h:[2,6,10,14], k:[0,8], s:[8], o:[14], gh:[7,15]},
                    {h:[0,2,4,6,8,10,12,14], k:[0,7,8,14], s:[8], o:[6,14], gh:[3,11]},
                    {h:[2,6,10,14], k:[3,8,11], s:[8], o:[14], gh:[6,15]},
                    {h:[0,2,4,6,8,10,12,14], k:[0,6,8,13], s:[8], o:[2,10], gh:[7,15]},
                    {h:[2,6,10,14], k:[8,14], s:[8], o:[6,14], gh:[3,11]},
                    {h:[0,2,4,6,8,10,12,14], k:[0,6,8,12], s:[4,12], o:[14], gh:[7]},
                    {h:[0,2,4,6,8,10,12,14], k:[0,3,8,11], s:[4,12], o:[6,14], gh:[15]},
                    {h:[2,6,10,14], k:[0,7,10], s:[4,12], o:[14], gh:[3,11]},
                    {h:[0,2,4,6,8,10,12,14], k:[0,8,14], s:[4,12], o:[6], gh:[7,15]},
                    {h:[1,3,5,7,9,11,13,15], k:[0,6,10], s:[4,12], o:[7,15], gh:[2,14]},
                    {h:[2,6,10,14], k:[0,6,8,14], s:[4,12], o:[6,14], gh:[3,11]},
                    {h:[0,2,4,6,8,10,12,14], k:[0,7,10], s:[4,12], o:[2,14], gh:[6,15]},
                    {h:[0,2,4,6,8,10,12,14], k:[0,4,8,12], s:[4,12], o:[2,6,10,14], gh:[]},
                    {h:[0,2,4,6,8,10,12,14], k:[0,3,8,11,14], s:[4,12], o:[6,14], gh:[7,15]},
                    {h:[1,3,5,7,9,11,13,15], k:[0,4,8,12], s:[4,12], o:[3,11], gh:[6,14]},
                    {h:[0,2,4,6,8,10,12,14], k:[0,6,8,14], s:[4,12], o:[2,10], gh:[7]},
                    {h:[2,6,10,14], k:[0,10], s:[4,12], o:[14], gh:[3,7,15]},
                    {h:[0,2,4,6,8,10,12,14], k:[0,8,11], s:[8], o:[6,14], gh:[3,15]},
                    {h:[2,6,10,14], k:[0,8,13], s:[8], o:[10], gh:[7,15]},
                    {h:[0,2,4,6,8,10,12,14], k:[0,3,8,10,14], s:[4,12], o:[6], gh:[7,15]},
                    {h:[1,3,5,7,9,11,13,15], k:[0,6,8,11], s:[8], o:[7,15], gh:[3,13]}
                ][grooveIndex % 25];
                add(tracks,'hat',P.h); add(soft,'hat',P.h.filter(x=>x%4===2 || x%4===3));
                add(tracks,'kick',P.k); add(tracks,'snare',P.s); add(strong,'snare',P.s);
                add(tracks,'open',P.o); add(tracks,'snare',P.gh); add(ghost,'snare',P.gh);
                if (grooveIndex>=14 && grooveIndex<=19) { add(accent,'hat',P.h.filter(x=>x%4===2)); }
                if (grooveIndex===18) { add(tracks,'ride',[0,3,6,9,12,15]); add(strong,'ride',[0,6,12]); }
                if (grooveIndex===20) { add(tracks,'tom1',[7,15]); add(soft,'tom1',[7,15]); }
                add(accent,'snare',P.s.slice(0,1));
            } else if (family===6) { // latin
                add(tracks,'hat',every(e)); add(tracks,'ride',uniq([0,3,6,Math.min(b-1,10),Math.min(b-1,12)])); add(strong,'ride',[0,Math.min(b-1,8)]);
                add(tracks,'kick',uniq([0,3,Math.floor(b/2),Math.min(b-1,Math.floor(b/2)+3)]));
                add(tracks,'snare',uniq([3,6,Math.min(b-1,11),Math.max(0,b-2)])); add(soft,'snare',uniq([3,Math.min(b-1,11)]));
                add(accent,'ride',[0]); if(v>=3)add(tracks,'tom1',[Math.min(b-1,5),Math.min(b-1,13)]);
            } else { // afro/world
                add(tracks,'hat',every(1)); add(soft,'hat',every(2,1)); add(tracks,'snare',uniq([4,Math.min(b-1,11),Math.min(b-1,12)]));
                add(strong,'snare',uniq([4,Math.min(b-1,12)])); add(tracks,'kick',uniq([0,3,Math.min(b-1,7),Math.min(b-1,10),Math.max(0,b-2)]));
                add(tracks,'open',[Math.max(0,b-1)]); add(tracks,'tom1',[Math.min(b-1,6)]); add(accent,'kick',[0]); add(ghost,'snare',uniq([2,Math.min(b-1,7),Math.max(0,b-1)]));
            }
            // Empreinte légère propre à chaque morceau : évite les doublons exacts tout en gardant le feel principal.
            // Les modifications restent secondaires (ghosts, hat, kick de liaison) et sont déterministes.
            let seed=0; for (const ch of meta.name) seed=(seed*33+ch.charCodeAt(0))>>>0;
            const pick=(salt)=> Math.abs((seed ^ (salt*2654435761))>>>0) % Math.max(1,b);
            const h1=pick(1), h2=pick(2), k1=pick(3), s1=pick(4);
            if (family!==2 && family!==3 && family!==5 && h1%2===1) { add(tracks,'hat',[h1]); add(soft,'hat',[h1]); }
            if (family===1 || family===4 || family===7) { add(tracks,'snare',[s1]); add(ghost,'snare',[s1]); }
            if (![2,3,5].includes(family) && k1!==0 && !back.includes(k1)) { add(tracks,'kick',[k1]); if ((seed&3)===0) add(soft,'kick',[k1]); }
            if ((seed&7)===1 && h2>b/2) { add(tracks,'open',[h2]); add(accent,'open',[h2]); }
            return {...meta, signatureIndex:sigIndex, tracks, ghost, soft, strong, accent};
        };
        const defs=families.map((f,fi)=>f.grooves.map((m,gi)=>makeDefinition(fi,gi,m)));
        const buildPattern=(def)=>{
            const sig=CONFIG.SIGNATURES[def.signatureIndex], cells=[], ghost=[], soft=[], strong=[], accent=[];
            const push=(src,target)=>Object.entries(src||{}).forEach(([voice,pos])=>{const track=T[voice];if(!Number.isInteger(track))return;pos.forEach(p=>{if(p<0||p>=sig.barSteps)return;for(let bar=0;bar<2;bar++)target.push(track*sig.steps+p+bar*sig.barSteps);});});
            push(def.tracks,cells);push(def.ghost,ghost);push(def.soft,soft);push(def.strong,strong);push(def.accent,accent);
            const active=uniq(cells); const keep=a=>uniq(a).filter(x=>active.includes(x));
            return [active,def.kit,Array(CONFIG.TRACK_COUNT).fill(1),def.bpm,1,def.swing,keep(accent),keep(soft),keep(strong),keep(ghost)];
        };
        const banks=families.map(()=>Array.from({length:CONFIG.SIGNATURES.length},()=>[]));
        defs.forEach((family,fi)=>family.forEach((def,gi)=>{banks[fi][def.signatureIndex][gi]=buildPattern(def);}));
        banks.meta=families.map((f,fi)=>({name:f.name,grooves:defs[fi].map(d=>({name:d.name,signatureIndex:d.signatureIndex,signature:CONFIG.SIGNATURES[d.signatureIndex].label,bpm:d.bpm}))}));
        return banks;
    }

    class PatternStore {
        constructor(storageManager, presets) {
            this.storage = storageManager;
            this.presets = presets;
            this.slots = this.normalizeSlots(this.storage.load(this.createDefaults(presets)));
        }
        createDefaults(presets) {
            const slots = Array(CONFIG.MEMORY_SLOTS);
            const signatureIndex = signatureIndexOf(4,4);
            const first = presets[4]?.[signatureIndex]?.find(Boolean);
            if (first) slots[0] = { signatureIndex, pattern:this.normalizePattern(first, signatureIndex) };
            return slots;
        }
        normalizePattern(pattern, signatureIndex = 0) {
            if (!Array.isArray(pattern)) return null;
            const steps = CONFIG.SIGNATURES[signatureIndex].steps;
            const trackMap = [0, 1, 2, 3, 4, 4, 5, 6, 7, 7];
            const rawVolumes = Array.isArray(pattern[2]) ? pattern[2] : [];
            const legacy = rawVolumes.length >= CONFIG.LEGACY_TRACK_COUNT;
            const remapCells = source => {
                const input = Array.isArray(source) ? source.map(Number).filter(Number.isInteger) : [];
                if (!legacy) return input.filter(n => n >= 0 && n < steps * CONFIG.TRACK_COUNT);
                return Array.from(new Set(input.map(index => {
                    const oldTrack = Math.floor(index / steps);
                    const step = index % steps;
                    const newTrack = trackMap[oldTrack];
                    return Number.isInteger(newTrack) ? newTrack * steps + step : null;
                }).filter(Number.isInteger))).sort((a,b)=>a-b);
            };
            const cells = remapCells(pattern[0]);
            const kit = Math.round(Util.clamp(pattern[1], 0, CONFIG.KITS.length - 1, 0));
            const migratedVolumes = legacy ? [
                rawVolumes[0], rawVolumes[1], rawVolumes[2], rawVolumes[3],
                Math.max(rawVolumes[4] ?? 1, rawVolumes[5] ?? 1), rawVolumes[6], rawVolumes[7],
                Math.max(rawVolumes[8] ?? 1, rawVolumes[9] ?? 1)
            ] : rawVolumes;
            const volumes = Array.from({ length: CONFIG.TRACK_COUNT }, (_, i) => Util.clamp(migratedVolumes[i], 0, 1, 1));
            const tempo = Math.round(Util.clamp(pattern[3], CONFIG.TEMPO.min, CONFIG.TEMPO.max, CONFIG.TEMPO.default));
            const master = Util.clamp(pattern[4], 0, 1, 1);
            const isV5 = pattern.length >= 10;
            const swingIndex = 5;
            const accentIndex = 6;
            const weakIndex = 7;
            const strongIndex = isV5 ? 8 : -1;
            const ghostIndex = isV5 ? 9 : -1;
            const swing = Math.round(Util.clamp(pattern[swingIndex], CONFIG.SWING.min, CONFIG.SWING.max, CONFIG.SWING.default));
            const accents = remapCells(pattern[accentIndex]).filter(n => cells.includes(n));
            const weak = remapCells(pattern[weakIndex]).filter(n => cells.includes(n) && !accents.includes(n));
            const strong = strongIndex >= 0 ? remapCells(pattern[strongIndex]).filter(n => cells.includes(n) && !accents.includes(n)) : [];
            const ghost = ghostIndex >= 0 ? remapCells(pattern[ghostIndex]).filter(n => cells.includes(n) && !accents.includes(n) && !weak.includes(n)) : [];
            const customTracks = Array.isArray(pattern[10]) && pattern[10].length >= CONFIG.TRACK_COUNT
                ? pattern[10].slice(0, CONFIG.TRACK_COUNT).map((key, i) => SAMPLE_INDEX[key] ? key : CONFIG.KITS[kit].tracks[i])
                : null;
            return [cells, kit, volumes, tempo, master, swing, accents, weak, strong, ghost, customTracks];
        }
        normalizeSlots(raw) {
            const out = Array(CONFIG.MEMORY_SLOTS);
            if (!Array.isArray(raw)) return out;
            // v18 et antérieures : banques séparées par signature. On migre les premières
            // mémoires rencontrées vers huit slots autonomes qui transportent leur signature.
            const looksLikeLegacyBanks = raw.length === CONFIG.SIGNATURES.length && raw.some(item => Array.isArray(item));
            if (looksLikeLegacyBanks) {
                for (let signatureIndex = 0; signatureIndex < raw.length; signatureIndex++) {
                    const bank = Array.isArray(raw[signatureIndex]) ? raw[signatureIndex] : [];
                    for (let slot = 0; slot < CONFIG.MEMORY_SLOTS; slot++) {
                        if (out[slot] || !bank[slot]) continue;
                        out[slot] = { signatureIndex, pattern:this.normalizePattern(bank[slot], signatureIndex) };
                    }
                }
                return out;
            }
            for (let slot = 0; slot < CONFIG.MEMORY_SLOTS; slot++) {
                const entry = raw[slot];
                if (!entry || typeof entry !== "object") continue;
                const signatureIndex = Math.round(Util.clamp(entry.signatureIndex, 0, CONFIG.SIGNATURES.length - 1, 0));
                const pattern = this.normalizePattern(entry.pattern, signatureIndex);
                if (pattern) out[slot] = { signatureIndex, pattern };
            }
            return out;
        }
        get(slot) { return this.slots[slot] || null; }
        set(slot, signatureIndex, pattern) {
            const normalizedSignature = Math.round(Util.clamp(signatureIndex, 0, CONFIG.SIGNATURES.length - 1, 0));
            this.slots[slot] = { signatureIndex:normalizedSignature, pattern:this.normalizePattern(pattern, normalizedSignature) };
            this.storage.save(this.slots);
        }
        populated() { return this.slots.map((entry, i) => entry ? i : -1).filter(i => i >= 0); }
        resetMemories() {
            this.slots = Array(CONFIG.MEMORY_SLOTS);
            this.storage.save(this.slots);
        }
    }

    class AudioEngine {
        constructor() {
            this.context = null;
            this.buffers = new Map();
            this.loading = new Map();
            this.analyser = null;
            this.meterData = null;
        }
        ensureContext() {
            if (this.context) return this.context;
            const Ctx = window.AudioContext || window.webkitAudioContext;
            if (!Ctx) throw new Error("Web Audio API non supportée par ce navigateur.");
            this.context = new Ctx();
            this.analyser = this.context.createAnalyser();
            this.analyser.fftSize = 256;
            this.analyser.smoothingTimeConstant = 0.72;
            this.analyser.connect(this.context.destination);
            this.meterData = new Uint8Array(this.analyser.fftSize);
            window.audioContext = this.context;
            return this.context;
        }
        async resume() {
            const ctx = this.ensureContext();
            if (ctx.state === "suspended" || ctx.state === "interrupted") await ctx.resume();
            return ctx;
        }
        async loadSample(sampleKey) {
            if (this.buffers.has(sampleKey)) return this.buffers.get(sampleKey);
            if (this.loading.has(sampleKey)) return this.loading.get(sampleKey);
            const entry = CONFIG.SAMPLE_MAP[sampleKey];
            if (!entry) return null;
            const promise = fetch(entry[0])
                .then(r => { if (!r.ok) throw new Error(`Sample introuvable: ${entry[0]}`); return r.arrayBuffer(); })
                .then(data => this.ensureContext().decodeAudioData(data))
                .then(buffer => { this.buffers.set(sampleKey, buffer); this.loading.delete(sampleKey); return buffer; })
                .catch(error => { this.loading.delete(sampleKey); console.warn(error); return null; });
            this.loading.set(sampleKey, promise);
            return promise;
        }
        preloadKit(kitIndex = 0) {
            const kit = CONFIG.KITS[Math.round(Util.clamp(kitIndex, 0, CONFIG.KITS.length - 1, 0))];
            return Promise.all(kit.tracks.map(key => this.loadSample(key)));
        }
        preloadTracks(trackKeys = []) {
            return Promise.all(trackKeys.map(key => this.loadSample(key)));
        }
        async downloadAllSamples(onProgress) {
            const urls = [...new Set(Object.values(CONFIG.SAMPLE_MAP).map(entry => entry[0]))];
            let done = 0, failed = 0;
            for (const url of urls) {
                try {
                    const response = await fetch(url, { cache: "reload" });
                    if (!response.ok) throw new Error(`${response.status} ${url}`);
                } catch (error) {
                    failed++; console.warn("Offline audio:", error);
                }
                done++; if (onProgress) onProgress(done, urls.length, failed);
            }
            return { done, total: urls.length, failed };
        }
        async clearAudioCaches() {
            this.buffers.clear(); this.loading.clear();
            if ("caches" in window) {
                const keys = await caches.keys();
                await Promise.all(keys.filter(key => key.startsWith("battrochtek-audio-")).map(key => caches.delete(key)));
            }
        }
        async play({ kitIndex, trackIndex, sampleKey = null, time, trackVolume = 1, masterVolume = 1, velocity = "normal" }) {
            const ctx = this.ensureContext();
            const kit = CONFIG.KITS[Math.round(Util.clamp(kitIndex, 0, CONFIG.KITS.length - 1, 0))] || CONFIG.KITS[0];
            const safeTrack = Math.round(Util.clamp(trackIndex, 0, CONFIG.METRONOME_TRACK_INDEX, 0));
            const resolvedSampleKey = sampleKey || kit.tracks[safeTrack];
            const buffer = await this.loadSample(resolvedSampleKey);
            if (!buffer) return;
            const source = ctx.createBufferSource();
            const gainNode = ctx.createGain();
            source.buffer = buffer;
            const level = CONFIG.VELOCITY_GAIN[velocity] ?? CONFIG.VELOCITY_GAIN.normal;
            const gain = Util.clamp(Util.finite(trackVolume, 1) * Util.finite(masterVolume, 1) * level, 0, 1.5, 0);
            const startTime = Math.max(ctx.currentTime, Util.finite(time, ctx.currentTime));
            gainNode.gain.setValueAtTime(gain, startTime);
            source.connect(gainNode).connect(this.analyser || ctx.destination);
            source.start(startTime);
        }
        getOutputLevel() {
            if (!this.analyser || !this.meterData) return 0;
            this.analyser.getByteTimeDomainData(this.meterData);
            let sum = 0;
            for (const sample of this.meterData) {
                const x = (sample - 128) / 128;
                sum += x * x;
            }
            const rms = Math.sqrt(sum / this.meterData.length);
            return Util.clamp(rms * 3.2, 0, 1, 0);
        }
        suspend() {
            if (this.context && this.context.state !== "closed") return this.context.suspend();
        }
    }

    class Sequencer {
        constructor(patternStore) {
            this.store = patternStore;
            this.signatureIndex = 0;
            this.memorySlot = 0;
            this.kitIndex = 0;
            this.customTracks = null;
            this.trackVolumes = Array(CONFIG.TRACK_COUNT).fill(1);
            this.masterVolume = 1;
            this.swing = CONFIG.SWING.default;
            this.tempo = CONFIG.TEMPO.default;
            this.activeCells = new Set();
            this.accentCells = new Set();
            this.weakCells = new Set();
            this.strongCells = new Set();
            this.ghostCells = new Set();
            this.trackMuted = Array(CONFIG.TRACK_COUNT).fill(false);
            this.trackSolo = Array(CONFIG.TRACK_COUNT).fill(false);
            this.chainEnabled = false;
            this.metronomeEnabled = false;
            this.tempoRampEnabled = false;
            this.tempoRampStep = CONFIG.TEMPO_RAMP_STEP;
        }
        get signature() { return CONFIG.SIGNATURES[this.signatureIndex]; }
        snapshot() {
            return [Array.from(this.activeCells).sort((a,b)=>a-b), this.kitIndex, this.trackVolumes.slice(), this.tempo, this.masterVolume, this.swing, Array.from(this.accentCells).sort((a,b)=>a-b), Array.from(this.weakCells).sort((a,b)=>a-b), Array.from(this.strongCells).sort((a,b)=>a-b), Array.from(this.ghostCells).sort((a,b)=>a-b), this.customTracks ? this.customTracks.slice() : null];
        }
        apply(pattern) {
            const p = this.store.normalizePattern(pattern, this.signatureIndex);
            if (!p) return false;
            this.activeCells = new Set(p[0]);
            this.kitIndex = p[1];
            this.customTracks = p[10] ? p[10].slice() : null;
            this.trackVolumes = p[2];
            this.tempo = p[3];
            this.masterVolume = p[4];
            this.swing = p[5];
            this.accentCells = new Set(p[6]);
            this.weakCells = new Set(p[7]);
            this.strongCells = new Set(p[8] || []);
            this.ghostCells = new Set(p[9] || []);
            return true;
        }
        sampleForTrack(track) {
            const kit = CONFIG.KITS[this.kitIndex] || CONFIG.KITS[0];
            return this.customTracks?.[track] || kit.tracks[track];
        }
        currentTrackSamples() {
            return Array.from({ length: CONFIG.TRACK_COUNT }, (_, i) => this.sampleForTrack(i));
        }
        selectKit(index) {
            this.kitIndex = Math.round(Util.clamp(index, 0, CONFIG.KITS.length - 1, 0));
            this.customTracks = null;
        }
        setTrackSample(track, sampleKey) {
            const i = Math.round(Util.clamp(track, 0, CONFIG.TRACK_COUNT - 1, 0));
            if (!SAMPLE_INDEX[sampleKey]) return false;
            if (!this.customTracks) this.customTracks = this.currentTrackSamples();
            this.customTracks[i] = sampleKey;
            return true;
        }
        get isCustomKit() { return Array.isArray(this.customTracks); }
        loadSlot(slot) {
            this.memorySlot = Math.round(Util.clamp(slot, 0, CONFIG.MEMORY_SLOTS - 1, 0));
            const entry = this.store.get(this.memorySlot);
            if (entry) {
                this.signatureIndex = entry.signatureIndex;
                this.apply(entry.pattern);
            } else {
                this.activeCells.clear(); this.accentCells.clear(); this.weakCells.clear(); this.strongCells.clear(); this.ghostCells.clear();
            }
        }
        saveSlot() { this.store.set(this.memorySlot, this.signatureIndex, this.snapshot()); }
        cycleCell(index) {
            const clearVelocity = () => { this.accentCells.delete(index); this.weakCells.delete(index); this.strongCells.delete(index); this.ghostCells.delete(index); };
            if (!this.activeCells.has(index)) { this.activeCells.add(index); clearVelocity(); return "normal"; }
            if (![this.accentCells,this.weakCells,this.strongCells,this.ghostCells].some(s=>s.has(index))) { this.strongCells.add(index); return "strong"; }
            if (this.strongCells.has(index)) { this.strongCells.delete(index); this.accentCells.add(index); return "accent"; }
            if (this.accentCells.has(index)) { this.accentCells.delete(index); this.weakCells.add(index); return "soft"; }
            if (this.weakCells.has(index)) { this.weakCells.delete(index); this.ghostCells.add(index); return "ghost"; }
            this.activeCells.delete(index); clearVelocity(); return "off";
        }
        clear() { this.activeCells.clear(); this.accentCells.clear(); this.weakCells.clear(); this.strongCells.clear(); this.ghostCells.clear(); }
        toggleMute(track) {
            const i = Math.round(Util.clamp(track, 0, CONFIG.TRACK_COUNT - 1, 0));
            this.trackMuted[i] = !this.trackMuted[i];
        }
        toggleSolo(track) {
            const i = Math.round(Util.clamp(track, 0, CONFIG.TRACK_COUNT - 1, 0));
            this.trackSolo[i] = !this.trackSolo[i];
        }
        isTrackAudible(track) {
            const anySolo = this.trackSolo.some(Boolean);
            return !this.trackMuted[track] && (!anySolo || this.trackSolo[track]);
        }
        setSignature(numerator, denominator, preserve = true) {
            const nextIndex = signatureIndexOf(numerator, denominator);
            if (nextIndex < 0 || nextIndex === this.signatureIndex) return false;
            const oldSig = this.signature, nextSig = CONFIG.SIGNATURES[nextIndex];
            const remapSet = set => {
                const out = new Set();
                for (const index of set) {
                    const track = Math.floor(index / oldSig.steps), step = index % oldSig.steps;
                    const bar = Math.floor(step / oldSig.barSteps), inBar = step % oldSig.barSteps;
                    const quarterPos = inBar / 4;
                    const mapped = Math.round(quarterPos * 4);
                    if (track < CONFIG.TRACK_COUNT && mapped < nextSig.barSteps) out.add(track * nextSig.steps + bar * nextSig.barSteps + mapped);
                }
                return out;
            };
            if (preserve) { this.activeCells=remapSet(this.activeCells); this.accentCells=remapSet(this.accentCells); this.weakCells=remapSet(this.weakCells); this.strongCells=remapSet(this.strongCells); this.ghostCells=remapSet(this.ghostCells); }
            else this.clear();
            this.signatureIndex = nextIndex;
            return true;
        }
        loadPreset(bankIndex, presetIndex) {
            const info = this.store.presets.meta?.[bankIndex]?.grooves?.[presetIndex];
            if (!info) return false;
            this.signatureIndex = info.signatureIndex;
            const bank = this.store.presets[bankIndex]?.[this.signatureIndex];
            const pattern = bank?.[presetIndex];
            if (!pattern) return false;
            this.apply(pattern);
            return true;
        }
        nextChainSlot() {
            const slots = this.store.populated();
            if (slots.length < 2) { this.chainEnabled = false; return this.memorySlot; }
            const pos = slots.indexOf(this.memorySlot);
            const next = slots[(pos < 0 ? 0 : pos + 1) % slots.length];
            this.loadSlot(next);
            return next;
        }
        randomize() {
            this.clear();
            const steps = this.signature.steps, group = this.signature.group, R = TRACK_ROLES;
            for (let track = 0; track < CONFIG.TRACK_COUNT; track++) {
                for (let step = 0; step < steps; step++) {
                    let probability = 0.04;
                    if (track === R.closedHat) probability = step % 2 === 0 ? 0.72 : 0.18;
                    if (track === R.snare) probability = step % (group * 2) === group ? 0.58 : 0.06;
                    if (track === R.tomHigh || track === R.tomLow) probability = step % (group * 2) === group ? 0.14 : 0.03;
                    if (track === R.kick) probability = step % group === 0 ? 0.46 : 0.08;
                    if (track === R.crash || track === R.ride) probability = step % (group * 4) === 0 ? 0.2 : 0.025;
                    if (Math.random() < probability) this.activeCells.add(track * steps + step);
                }
            }
        }
        variation(familyName = "") {
            const steps=this.signature.steps, barSteps=this.signature.barSteps, R=TRACK_ROLES;
            const family=String(familyName).toLowerCase();
            const style = family.includes("funk") || family.includes("soul") ? "funk"
                : family.includes("reggae") ? "reggae"
                : family.includes("afro") ? "afrobeat"
                : family.includes("hip-hop") || family.includes("hip hop") ? "hiphop"
                : family.includes("latin") || family.includes("bossa") || family.includes("samba") ? "latin"
                : family.includes("rock") || family.includes("pop") ? "rock" : "generic";
            const active=new Set(this.activeCells), soft=new Set(this.weakCells), strong=new Set(this.strongCells), ghost=new Set(this.ghostCells), accent=new Set(this.accentCells);
            const clearV=i=>{soft.delete(i);strong.delete(i);ghost.delete(i);accent.delete(i);};
            const addNote=(track,step,velocity="normal")=>{ if(step<0||step>=steps)return; const i=track*steps+step; active.add(i); clearV(i); if(velocity==="soft")soft.add(i); else if(velocity==="strong")strong.add(i); else if(velocity==="ghost")ghost.add(i); else if(velocity==="accent")accent.add(i); };
            const remove=(track,step)=>{const i=track*steps+step;active.delete(i);clearV(i);};
            const pick=a=>a[Math.floor(Math.random()*a.length)];
            for(let bar=0;bar<2;bar++){
                const base=bar*barSteps, last=base+Math.max(0,barSteps-1), pre=base+Math.max(0,barSteps-2);
                if(style==="reggae"){
                    // One-drop / skank friendly: avoid systematically adding a rock kick on beat 1.
                    if(Math.random()<.55) addNote(R.snare, base+Math.min(barSteps-1, Math.floor(barSteps/2)), Math.random()<.55?"ghost":"normal");
                    if(Math.random()<.45) addNote(R.kick, base+Math.min(barSteps-1, Math.floor(barSteps/2)), "normal");
                    if(Math.random()<.55) remove(R.kick, base);
                    if(Math.random()<.65) addNote(R.openHat, pre, "soft");
                } else if(style==="afrobeat"){
                    [1,3,5,7,9,11,13,15].filter(x=>x<barSteps).forEach(x=>{ if(Math.random()<.18)addNote(R.kick,base+x,"normal"); });
                    if(Math.random()<.7)addNote(R.snare,base+pick([3,7,11,15].filter(x=>x<barSteps)),"ghost");
                    if(Math.random()<.5)addNote(R.openHat,pre,"accent");
                } else if(style==="hiphop"){
                    if(Math.random()<.65)addNote(R.kick,base+pick([1,3,6,10,11,14].filter(x=>x<barSteps)),Math.random()<.3?"strong":"normal");
                    if(Math.random()<.55)addNote(R.snare,base+pick([3,7,11,15].filter(x=>x<barSteps)),"ghost");
                    if(Math.random()<.4)remove(R.closedHat,pre);
                    if(Math.random()<.5)addNote(R.closedHat,last,"soft");
                } else if(style==="rock"){
                    if(Math.random()<.55)addNote(R.kick,base+pick([2,6,10,14].filter(x=>x<barSteps)),"normal");
                    if(Math.random()<.35)addNote(R.openHat,pre,"accent");
                    if(bar===1 && Math.random()<.38){addNote(R.tomHigh,base+Math.max(0,barSteps-3),"normal");addNote(R.tomLow,pre,"strong");addNote(R.snare,last,"accent");}
                } else if(style==="latin"){
                    if(Math.random()<.6)addNote(R.ride,base+pick([0,3,6,9,12,15].filter(x=>x<barSteps)),"soft");
                    if(Math.random()<.55)addNote(R.kick,base+pick([3,7,10,14].filter(x=>x<barSteps)),"normal");
                    if(Math.random()<.35)addNote(R.tomHigh,pre,"soft");
                } else { // funk/soul + generic: syncopation and ghosts
                    const kickCandidates=[1,3,6,7,10,11,Math.max(0,barSteps-2),Math.max(0,barSteps-1)].filter(x=>x<barSteps);
                    for(let k=0;k<1+Math.floor(Math.random()*(style==="funk"?3:2));k++){const st=base+pick(kickCandidates); const idx=R.kick*steps+st; if(active.has(idx)&&Math.random()<.28)remove(R.kick,st); else addNote(R.kick,st,Math.random()<.28?"strong":"normal");}
                    const ghostCandidates=[2,3,5,7,9,10,11,13,15].filter(x=>x<barSteps);
                    for(let k=0;k<(style==="funk"?2:1)+Math.floor(Math.random()*2);k++)addNote(R.snare,base+pick(ghostCandidates),Math.random()<.78?"ghost":"soft");
                    if(Math.random()<.65)addNote(R.openHat,pre,"accent");
                    if(Math.random()<.5)addNote(R.closedHat,last,"soft");
                    if(style==="funk" && Math.random()<.26){addNote(R.tomHigh,base+Math.max(0,barSteps-3),"soft");addNote(R.tomLow,pre,"strong");}
                }
            }
            this.activeCells=active; this.weakCells=soft; this.strongCells=strong; this.ghostCells=ghost; this.accentCells=accent;
        }
    }

    class Scheduler {
        constructor(audio, sequencer, ui) {
            this.audio = audio; this.seq = sequencer; this.ui = ui;
            this.playing = false; this.step = 0; this.nextTime = 0; this.timer = null;
        }
        async start() {
            if (this.playing) return;
            const ctx = await this.audio.resume();
            this.playing = true; this.step = 0; this.nextTime = ctx.currentTime + 0.02;
            this.ui.setPlaying(true);
            this.loop();
        }
        stop() {
            this.playing = false;
            clearTimeout(this.timer); this.timer = null;
            this.ui.setPlaying(false); this.ui.clearPlayhead();
        }
        toggle() { return this.playing ? this.stop() : this.start(); }
        loop() {
            if (!this.playing) return;
            const ctx = this.audio.ensureContext();
            while (this.nextTime < ctx.currentTime + CONFIG.SCHEDULER.scheduleAheadSec) {
                const duration = 60 / Util.clamp(this.seq.tempo, CONFIG.TEMPO.min, CONFIG.TEMPO.max, CONFIG.TEMPO.default) / 4;
                const swingDelay = (this.step % 2 === 1)
                    ? duration * CONFIG.SWING.maxDelayRatio * (Util.clamp(this.seq.swing, CONFIG.SWING.min, CONFIG.SWING.max, CONFIG.SWING.default) / 100)
                    : 0;
                this.scheduleCurrentStep(this.step, this.nextTime + swingDelay);
                const finishing = this.step === this.seq.signature.steps - 1;
                this.nextTime += duration;
                this.step = (this.step + 1) % this.seq.signature.steps;
                if (finishing && this.seq.chainEnabled) {
                    this.seq.nextChainSlot();
                    this.ui.syncSchedulerStructure();
                    this.ui.buildGrid();
                    this.ui.renderState();
                    this.ui.makeKeyboardAccessible();
                }
                if (finishing && this.seq.tempoRampEnabled) {
                    const before = this.seq.tempo;
                    this.seq.tempo = Math.round(Util.clamp(before + this.seq.tempoRampStep, CONFIG.TEMPO.min, CONFIG.TEMPO.max, CONFIG.TEMPO.default));
                    if (this.seq.tempo !== before) this.ui.renderTempo();
                    if (this.seq.tempo >= CONFIG.TEMPO.max) {
                        this.seq.tempoRampEnabled = false;
                        this.ui.renderButtons();
                        this.ui.status(`Escalier terminé : ${CONFIG.TEMPO.max} BPM.`);
                    }
                }
            }
            this.timer = setTimeout(() => this.loop(), CONFIG.SCHEDULER.lookAheadMs);
        }
        scheduleCurrentStep(step, time) {
            const steps = this.seq.signature.steps;
            this.ui.schedulePlayhead(step, time);
            if (this.seq.metronomeEnabled && step % this.seq.signature.group === 0) {
                this.audio.play({ kitIndex: this.seq.kitIndex, trackIndex: CONFIG.METRONOME_TRACK_INDEX, sampleKey: CONFIG.KITS[this.seq.kitIndex].tracks[CONFIG.METRONOME_TRACK_INDEX], time, trackVolume: 0.75, masterVolume: this.seq.masterVolume, velocity: "normal" });
            }
            for (let track = 0; track < CONFIG.TRACK_COUNT; track++) {
                const cellIndex = track * steps + step;
                if (!this.seq.activeCells.has(cellIndex) || !this.seq.isTrackAudible(track)) continue;
                const velocity = this.seq.accentCells.has(cellIndex) ? "accent" : this.seq.strongCells.has(cellIndex) ? "strong" : this.seq.weakCells.has(cellIndex) ? "soft" : this.seq.ghostCells.has(cellIndex) ? "ghost" : "normal";
                this.audio.play({
                    kitIndex: this.seq.kitIndex,
                    trackIndex: track,
                    sampleKey: this.seq.sampleForTrack(track),
                    time,
                    trackVolume: this.seq.trackVolumes[track],
                    masterVolume: this.seq.masterVolume,
                    velocity
                });
            }
        }
    }

    class StorageManager {
        constructor(key) { this.key = key; }
        static encode(value) {
            const bytes = new TextEncoder().encode(JSON.stringify(value));
            let binary = "";
            for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
            return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/u, "");
        }
        static decode(value) {
            const base64 = value.replaceAll("-", "+").replaceAll("_", "/") + "=".repeat((4 - value.length % 4) % 4);
            const binary = atob(base64);
            const bytes = Uint8Array.from(binary, char => char.charCodeAt(0));
            return JSON.parse(new TextDecoder().decode(bytes));
        }
        compact(slots) {
            return { v: 2, slots: slots.map(entry => entry ? { signatureIndex:entry.signatureIndex, pattern:entry.pattern } : null) };
        }
        load(defaults) {
            try {
                const params = new URLSearchParams(location.hash.slice(1));
                const encoded = params.get(this.key);
                if (!encoded) return defaults;
                const payload = StorageManager.decode(encoded);
                if (payload?.v === 2 && Array.isArray(payload.slots)) return payload.slots;
                if (payload?.v === 1 && Array.isArray(payload.banks)) return payload.banks;
                throw new Error("Format de mémoires URL inconnu.");
            } catch (error) {
                console.warn("Hash Battrochtek invalide, chargement des valeurs sûres.", error);
                return defaults;
            }
        }
        save(slots) {
            try {
                const params = new URLSearchParams(location.hash.slice(1));
                params.set(this.key, StorageManager.encode(this.compact(slots)));
                const hash = params.toString();
                history.replaceState(null, "", `${location.pathname}${location.search}#${hash}`);
            } catch (error) {
                console.warn("Impossible d’écrire les mémoires dans l’URL.", error);
            }
        }
    }

    class UIController {
        constructor(seq, audio) {
            this.seq = seq; this.audio = audio; this.scheduler = null;
            this.cells = []; this.memoryButtons = []; this.trackLabels = []; this.trackSampleSelects = []; this.trackMuteButtons = []; this.trackSoloButtons = []; this.kitButtons = [];
            this.copySnapshot = null; this.playheadTimeouts = []; this.tapTimes = []; this.meterFrame = null;
            this.undoStack = []; this.redoStack = []; this.historyLimit = 30;
            this.dom = this.cacheDom();
        }
        alpineUi() {
            try { return window.Alpine?.store?.("ui") || null; } catch { return null; }
        }
        syncUiStore() {
            const ui = this.alpineUi();
            if (!ui) throw new Error("Alpine.js est requis pour l’interface Battrochtek.");
            ui.playing = !!this.scheduler?.playing;
            ui.metronome = !!this.seq.metronomeEnabled;
            ui.tempoRamp = !!this.seq.tempoRampEnabled;
            ui.chain = !!this.seq.chainEnabled;
            ui.memorySlot = this.seq.memorySlot;
            ui.undoAvailable = this.undoStack.length > 0;
            ui.redoAvailable = this.redoStack.length > 0;
            ui.masterState = this.seq.masterVolume <= 0.1 ? "off" : this.seq.masterVolume < 0.75 ? "low" : "high";
        }
        cacheDom() {
            const $ = id => document.getElementById(id);
            return {
                sets: $("sets"), leds: $("leds"), tracks: $("tracks"), grid: document.querySelector(".grid"), sliders: $("sliders"),
                masterButton: $("master-level"), masterIcon: $("master-level-icon"), swingInput: $("swing-input"), vu: $("vu-meter"), presetFamily: $("preset-family"), presetGroove: $("preset-groove"), grooveRefresh: $("groove-refresh"), memory: $("memory"), clear: $("clear"), signatureButton: $("signature-button"),
                signature: $("signature"), signatureNumerator: $("signature-numerator"), signatureDenominator: $("signature-denominator"), metro: $("metronome-button"), chain: $("chain"), play: $("play-button"), icon: $("play-pause-icon"),
                minus: $("minus-button"), plus: $("plus-button"), tap: $("tap-tempo"), tempo: $("metronome-tempo"), random: $("random"), save: $("save"),
                undo: $("undo"), redo: $("redo"), tempoRamp: $("tempo-ramp"), kitSelect: $("kit-select"), cacheClear: $("cache-clear"), themeToggle: $("theme-toggle"), themeIcon: $("theme-toggle-icon"), themeColorMeta: $("theme-color-meta"),
                shareButton: $("share-button"), shareDialog: $("share-dialog"), shareClose: $("share-close"), shareQr: $("share-qr"), shareQrError: $("share-qr-error"), shareUrl: $("share-url"), shareCopy: $("share-copy"), shareNative: $("share-native")
            };
        }
        init(scheduler) {
            this.scheduler = scheduler;
            this.setupTheme(); this.setupShare(); this.buildKits(); this.buildTrackLabels(); this.buildMemory(); this.buildSliders(); this.buildGrid(); this.buildPresetSelector(); this.bindControls(); this.bindUnlock(); this.startVuMeter(); this.renderState(); this.makeKeyboardAccessible();
        }
        setupTheme() {
            const systemDark = window.matchMedia?.("(prefers-color-scheme: dark)");
            let explicitTheme = null;
            const apply = theme => {
                const resolved = theme || (systemDark?.matches ? "dark" : "light");
                document.documentElement.dataset.theme = resolved;
                document.documentElement.style.colorScheme = resolved;
                document.body.dataset.theme = resolved;
                if (this.dom.themeIcon) {
                    this.dom.themeIcon.classList.toggle("fa-sun", resolved === "dark");
                    this.dom.themeIcon.classList.toggle("fa-moon", resolved !== "dark");
                }
                this.dom.themeToggle?.setAttribute("aria-label", resolved === "dark" ? "Passer au thème clair" : "Passer au thème sombre");
                this.dom.themeToggle && (this.dom.themeToggle.dataset.btTooltip = resolved === "dark" ? "Thème clair" : "Thème sombre");
                this.dom.themeColorMeta?.setAttribute("content", resolved === "dark" ? "#101419" : "#f8fafc");
            };
            apply(null);
            this.dom.themeToggle?.addEventListener("click", () => {
                const current = document.documentElement.dataset.theme || (systemDark?.matches ? "dark" : "light");
                explicitTheme = current === "dark" ? "light" : "dark";
                apply(explicitTheme);
            });
            systemDark?.addEventListener?.("change", () => { if (!explicitTheme) apply(null); });
        }
        setupShare() {
            if (!this.dom.shareButton || !this.dom.shareDialog) return;
            const close = () => { if (this.dom.shareDialog.open) this.dom.shareDialog.close(); };
            const copyUrl = async () => {
                const url = this.dom.shareUrl?.value || location.href;
                try {
                    if (navigator.clipboard?.writeText && window.isSecureContext) await navigator.clipboard.writeText(url);
                    else {
                        this.dom.shareUrl?.focus();
                        this.dom.shareUrl?.select();
                        if (!document.execCommand("copy")) throw new Error("Copie refusée");
                    }
                    if (this.dom.shareCopy) {
                        const original = this.dom.shareCopy.innerHTML;
                        this.dom.shareCopy.innerHTML = '<i class="fa-solid fa-check" aria-hidden="true"></i> Lien copié';
                        setTimeout(() => { if (this.dom.shareCopy) this.dom.shareCopy.innerHTML = original; }, 1600);
                    }
                    this.status("Lien du groove copié.");
                } catch (error) {
                    console.warn("Copie du lien impossible.", error);
                    this.status("Impossible de copier automatiquement le lien. Sélectionne-le manuellement.");
                    this.dom.shareUrl?.focus();
                    this.dom.shareUrl?.select();
                }
            };
            const open = () => {
                /* Le lien partagé doit contenir le groove actuellement affiché. */
                this.seq.saveSlot();
                this.renderMemory();
                /* Le QR partage le groove courant uniquement : le lien reste court et importable,
                   tandis que l’URL de la session continue de conserver les 8 mémoires. */
                const shareSlots = Array(CONFIG.MEMORY_SLOTS);
                shareSlots[this.seq.memorySlot] = { signatureIndex:this.seq.signatureIndex, pattern:this.seq.snapshot() };
                const shareLocation = new URL(location.href);
                const shareParams = new URLSearchParams(shareLocation.hash.slice(1));
                shareParams.set("mem", StorageManager.encode({ v: 2, slots: shareSlots.map(entry => entry ?? null) }));
                shareLocation.hash = shareParams.toString();
                const url = shareLocation.href;
                if (this.dom.shareUrl) this.dom.shareUrl.value = url;
                if (this.dom.shareQrError) { this.dom.shareQrError.hidden = true; this.dom.shareQrError.textContent = ""; }
                if (this.dom.shareQr) this.dom.shareQr.hidden = false;
                try {
                    if (!window.BtQRCode?.renderCanvas) throw new Error("Générateur QR indisponible");
                    window.BtQRCode.renderCanvas(this.dom.shareQr, url, { size: 280, quiet: 4 });
                } catch (error) {
                    console.warn("QR code impossible à générer.", error);
                    if (this.dom.shareQr) this.dom.shareQr.hidden = true;
                    if (this.dom.shareQrError) {
                        this.dom.shareQrError.hidden = false;
                        this.dom.shareQrError.textContent = "Le lien est trop long pour être affiché en QR code. Le bouton Copier reste disponible.";
                    }
                }
                const tooltip = document.getElementById("bt-tooltip");
                tooltip?.classList.remove("is-visible");
                tooltip?.setAttribute("aria-hidden", "true");
                this.dom.shareButton.blur();
                this.dom.shareDialog.showModal();
                this.dom.shareClose?.focus();
            };
            this.press(this.dom.shareButton, open);
            this.dom.shareClose?.addEventListener("click", close);
            this.dom.shareCopy?.addEventListener("click", copyUrl);
            if (navigator.share && this.dom.shareNative) {
                this.dom.shareNative.hidden = false;
                this.dom.shareNative.addEventListener("click", async () => {
                    try { await navigator.share({ title: "Battrochtek", text: "Mon groove Battrochtek", url: this.dom.shareUrl?.value || location.href }); }
                    catch (error) { if (error?.name !== "AbortError") console.warn("Partage natif impossible.", error); }
                });
            }
            this.dom.shareDialog.addEventListener("click", event => { if (event.target === this.dom.shareDialog) close(); });
        }
        buildKits() {
            if (!this.dom.kitSelect) return;
            this.dom.kitSelect.innerHTML = CONFIG.KITS.map((kit,i)=>`<option value="${i}">${kit.name}</option>`).join("") + '<option value="custom" disabled>CUSTOM</option>';
            this.dom.kitSelect.value = String(this.seq.kitIndex);
            this.dom.kitSelect.addEventListener("change", async () => {
                if (this.dom.kitSelect.value === "custom") return;
                this.seq.selectKit(Number(this.dom.kitSelect.value));
                this.renderKit();
                const kit = CONFIG.KITS[this.seq.kitIndex];
                this.status(`Chargement ${kit.name}…`);
                const buffers = await this.audio.preloadTracks(this.seq.currentTrackSamples());
                this.status(buffers.every(Boolean) ? `${kit.name} prêt.` : "Kit chargé partiellement : samples manquants.");
            });
        }
        buildTrackLabels() {
            this.dom.tracks.innerHTML = "";
            this.trackLabels = []; this.trackSampleSelects = []; this.trackMuteButtons = []; this.trackSoloButtons = [];
            for (let i = 0; i < CONFIG.TRACK_COUNT; i++) {
                const row = document.createElement("div");
                row.className = "track-row";
                const label = document.createElement("div"); label.className = "bt-led track";
                const select = document.createElement("select"); select.className = "track-sample-select"; select.setAttribute("aria-label", `Son piste ${i + 1}`);
                const allowed = new Set(TRACK_SAMPLE_TYPES[i]);
                const choices = SAMPLE_LIBRARY.filter(sample => allowed.has(sample.type));
                const grouped = Object.groupBy ? Object.groupBy(choices, sample => sample.type) : choices.reduce((acc, sample) => ((acc[sample.type] ||= []).push(sample), acc), {});
                Object.entries(grouped).forEach(([type, samples]) => {
                    const group = document.createElement("optgroup"); group.label = type.toUpperCase();
                    samples.forEach(sample => { const option = document.createElement("option"); option.value = sample.key; option.textContent = sample.label; group.appendChild(option); });
                    select.appendChild(group);
                });
                select.addEventListener("change", async event => {
                    this.pushHistory();
                    if (!this.seq.setTrackSample(i, event.target.value)) return;
                    this.renderKit();
                    await this.audio.loadSample(event.target.value);
                    this.status(`Kit Custom : piste ${i + 1} → ${SAMPLE_INDEX[event.target.value]?.label || event.target.value}.`);
                });
                label.appendChild(select);
                const controls = document.createElement("div"); controls.className = "track-controls";
                const mute = document.createElement("button"); mute.type = "button"; mute.className = "track-toggle mute"; mute.textContent = "M"; mute.dataset.btTooltip = `Mute piste ${i + 1}`;
                const solo = document.createElement("button"); solo.type = "button"; solo.className = "track-toggle solo"; solo.textContent = "S"; solo.dataset.btTooltip = `Solo piste ${i + 1}`;
                mute.addEventListener("click", e => { e.stopPropagation(); this.seq.toggleMute(i); this.renderTrackControls(); });
                solo.addEventListener("click", e => { e.stopPropagation(); this.seq.toggleSolo(i); this.renderTrackControls(); });
                controls.append(mute, solo);
                row.append(label, controls);
                this.dom.tracks.appendChild(row);
                this.trackLabels.push(label); this.trackSampleSelects.push(select); this.trackMuteButtons.push(mute); this.trackSoloButtons.push(solo);
            }
        }
        buildMemory() {
            this.dom.memory.querySelectorAll(".pattern").forEach(el => el.remove());
            this.memoryButtons = [];
            const separator = this.dom.memory.querySelector(".memory-separator");
            for (let i = 0; i < CONFIG.MEMORY_SLOTS; i++) {
                const button = document.createElement("button"); button.type = "button"; button.className = "bt-button pattern"; button.innerHTML = `<span>${i + 1}</span>`;
                button.dataset.btTooltip = `Mémoire ${i + 1} — vide — raccourci ${i + 1}`;
                button.addEventListener("pointerdown", e => { e.preventDefault(); this.selectMemorySlot(i); });
                this.dom.memory.insertBefore(button, separator); this.memoryButtons.push(button);
            }
        }
        slider(className, label, onInput) {
            const input = document.createElement("input"); input.type = "range"; input.min = "0"; input.max = "100"; input.step = "1"; input.className = className;
            input.setAttribute("aria-label", label); input.addEventListener("input", onInput); return input;
        }
        buildSliders() {
            this.dom.sliders.innerHTML = "";
            for (let i = 0; i < CONFIG.TRACK_COUNT; i++) {
                const kind = i < 4 ? "cymbal" : i === 4 ? "snare" : i < 7 ? "tom" : "kick";
                this.dom.sliders.appendChild(this.slider(`slider-thin ${kind}`, `Volume piste ${i+1}`, e => { this.seq.trackVolumes[i] = Util.clamp(Number(e.target.value)/100,0,1,1); }));
            }
        }
        buildPresetSelector() {
            const meta = this.seq.store.presets.meta || [];
            if (!this.dom.presetFamily || !this.dom.presetGroove) return;
            this.dom.presetFamily.innerHTML = meta.map((family, i) => `<option value="${i}">${family.name}</option>`).join("");
            this.dom.presetFamily.value = "0";
            this.populateGrooves(0);
        }
        populateGrooves(familyIndex, selected = 0) {
            const meta = this.seq.store.presets.meta || [];
            const family = meta[familyIndex];
            if (!family || !this.dom.presetGroove) return;
            this.dom.presetGroove.innerHTML = family.grooves.map((groove, i) => `<option value="${i}">${String(i + 1).padStart(2,"0")} · ${groove.name} · ${groove.signature}</option>`).join("");
            this.dom.presetGroove.value = String(Util.clamp(selected, 0, family.grooves.length - 1, 0));
        }
        loadSelectedPreset(recordHistory = true) {
            if (!this.dom.presetFamily || !this.dom.presetGroove) return;
            const family = Number(this.dom.presetFamily.value) || 0;
            const groove = Number(this.dom.presetGroove.value) || 0;
            const before = recordHistory ? this.captureState() : null;
            if (this.seq.loadPreset(family, groove)) {
                if (recordHistory) this.pushHistory(before);
                this.syncSchedulerStructure();
                this.buildGrid(); this.renderState(); this.makeKeyboardAccessible();
            }
        }
        startVuMeter() {
            if (!this.dom.vu) return;
            this.dom.vu.innerHTML = Array.from({length:16}, (_, i) => `<span class="vu-segment" data-i="${i}"></span>`).join("");
            const segments = Array.from(this.dom.vu.children);
            const draw = () => {
                const level = this.audio.getOutputLevel();
                const active = Math.round(level * segments.length);
                segments.forEach((segment, i) => segment.classList.toggle("active", i < active));
                this.meterFrame = requestAnimationFrame(draw);
            };
            draw();
        }
        buildGrid() {
            this.dom.grid.innerHTML = ""; this.dom.leds.innerHTML = ""; this.cells = [];
            const { steps, group } = this.seq.signature;
            this.dom.leds.style.setProperty("--step-count", String(steps));
            for (let i = 0; i < steps; i++) {
                const led = document.createElement("div"); led.className = "bt-led beat-led";
                if (i % group === 0) led.classList.add("beat-accent");
                if (i % this.seq.signature.barSteps === 0) led.classList.add("bar-accent");
                this.dom.leds.appendChild(led);
            }
            const width = (100 - 0.2 * steps) / steps;
            for (let track = 0; track < CONFIG.TRACK_COUNT; track++) {
                for (let step = 0; step < steps; step++) {
                    const index = track * steps + step;
                    const cell = document.createElement("div"); cell.className = "cell beat"; cell.style.width = `${width}%`;
                    if (step === 0) cell.classList.add("first","capo"); else if (step === steps/2) cell.classList.add("capo"); else if (step % group === 0) cell.classList.add("quarto");
                    cell.tabIndex = 0; cell.setAttribute("role", "button");
                    cell.addEventListener("click", event => {
                        this.pushHistory();
                        if (event.shiftKey) {
                            const beatSize = this.seq.signature.group;
                            const offsetInBeat = step % beatSize;
                            for (let targetStep = offsetInBeat; targetStep < steps; targetStep += beatSize) {
                                const targetIndex = track * steps + targetStep;
                                this.seq.cycleCell(targetIndex);
                                this.renderCell(targetIndex);
                            }
                            this.status(`Shift+clic : position ${offsetInBeat + 1}/${beatSize} répétée sur tous les temps de la piste.`);
                            return;
                        }
                        this.seq.cycleCell(index);
                        this.renderCell(index);
                    });
                    cell.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); cell.click(); } });
                    this.dom.grid.appendChild(cell); this.cells.push(cell);
                }
            }
        }
        selectMemorySlot(index) {
            const slot = Math.round(Util.clamp(index, 0, CONFIG.MEMORY_SLOTS - 1, 0));
            this.seq.loadSlot(slot);
            this.syncSchedulerStructure();
            this.buildGrid();
            this.renderState();
            this.makeKeyboardAccessible();
            this.status(`Mémoire ${slot + 1}.`);
        }
        copyCurrentPattern() {
            this.copySnapshot = this.seq.snapshot();
            this.status("Pattern copié — Ctrl+V pour coller dans une mémoire.");
        }
        pastePatternToCurrentMemory() {
            if (!this.copySnapshot) { this.status("Rien à coller : utilise d’abord Ctrl+C."); return; }
            const before = this.captureState();
            this.seq.store.set(this.seq.memorySlot, this.seq.signatureIndex, this.copySnapshot);
            this.seq.loadSlot(this.seq.memorySlot);
            this.syncSchedulerStructure();
            this.pushHistory(before);
            this.renderState();
            this.status(`Pattern collé en mémoire ${this.seq.memorySlot + 1}.`);
        }
        duplicateToNextMemory() {
            const next = (this.seq.memorySlot + 1) % CONFIG.MEMORY_SLOTS;
            const snapshot = this.seq.snapshot();
            this.seq.store.set(next, this.seq.signatureIndex, snapshot);
            this.seq.loadSlot(next);
            this.syncSchedulerStructure();
            this.buildGrid();
            this.renderState();
            this.makeKeyboardAccessible();
            this.status(`Pattern dupliqué vers la mémoire ${next + 1}.`);
        }
        bindControls() {
            this.press(this.dom.clear, () => { this.pushHistory(); this.seq.clear(); this.resetPresetSelectors(); this.renderGrid(); });
            const applySignature = () => { const n=Number(this.dom.signatureNumerator?.value), d=Number(this.dom.signatureDenominator?.value); const before=this.captureState(); if(this.seq.setSignature(n,d,true)){ this.pushHistory(before); this.syncSchedulerStructure(); this.buildGrid(); this.renderState(); this.makeKeyboardAccessible(); } };
            this.dom.signatureNumerator?.addEventListener("change", applySignature);
            this.dom.signatureDenominator?.addEventListener("change", applySignature);
            this.dom.metro.addEventListener("pointerdown", e => { e.preventDefault(); this.seq.metronomeEnabled = !this.seq.metronomeEnabled; this.renderButtons(); });
            this.dom.chain.addEventListener("pointerdown", e => { e.preventDefault(); if (this.seq.store.populated().length >= 2) this.seq.chainEnabled = !this.seq.chainEnabled; this.renderButtons(); });
            this.dom.play.addEventListener("pointerdown", e => { e.preventDefault(); this.scheduler.toggle(); });
            this.bindTempo(this.dom.minus, -1); this.bindTempo(this.dom.plus, 1);
            if (this.dom.tap) this.press(this.dom.tap, () => this.handleTapTempo());
            if (this.dom.presetFamily) this.dom.presetFamily.addEventListener("change", () => {
                const family = Number(this.dom.presetFamily.value) || 0;
                this.populateGrooves(family, 0);
                this.loadSelectedPreset();
            });
            if (this.dom.presetGroove) this.dom.presetGroove.addEventListener("change", () => this.loadSelectedPreset());
            if (this.dom.grooveRefresh) this.press(this.dom.grooveRefresh, () => { this.pushHistory(); this.loadSelectedPreset(false); });
            this.press(this.dom.random, () => { this.pushHistory(); this.seq.variation(this.seq.store.presets.meta?.[Number(this.dom.presetFamily?.value)||0]?.name || ""); this.renderGrid(); });
            this.press(this.dom.save, () => { this.seq.saveSlot(); this.renderMemory(); });
            if (this.dom.cacheClear) this.press(this.dom.cacheClear, () => {
                this.seq.store.resetMemories();
                this.seq.memorySlot = 0;
                this.seq.loadSlot(0);
                this.syncSchedulerStructure();
                this.seq.chainEnabled = false;
                this.undoStack.length = 0;
                this.redoStack.length = 0;
                this.buildGrid();
                this.renderState();
                this.makeKeyboardAccessible();
                this.status("Mémoires réinitialisées. Le cache audio n’a pas été modifié.");
            });
            if (this.dom.undo) this.press(this.dom.undo, () => this.undo());
            if (this.dom.redo) this.press(this.dom.redo, () => this.redo());
            if (this.dom.tempoRamp) this.dom.tempoRamp.addEventListener("pointerdown", event => {
                event.preventDefault();
                this.seq.tempoRampEnabled = !this.seq.tempoRampEnabled;
                this.renderButtons();
                this.status(this.seq.tempoRampEnabled ? `Escalier BPM actif : +${CONFIG.TEMPO_RAMP_STEP} BPM par tour.` : "Escalier BPM désactivé.");
            });
            if (this.dom.tempo) {
                const commitTempo = () => {
                    this.seq.tempo = Math.round(Util.clamp(Number(this.dom.tempo.value), CONFIG.TEMPO.min, CONFIG.TEMPO.max, CONFIG.TEMPO.default));
                    this.renderTempo();
                };
                this.dom.tempo.addEventListener("change", commitTempo);
                this.dom.tempo.addEventListener("keydown", e => { if (e.key === "Enter") { commitTempo(); this.dom.tempo.blur(); } });
                this.bindNumberWheel(this.dom.tempo, 1, CONFIG.TEMPO.min, CONFIG.TEMPO.max, value => { this.seq.tempo = value; this.renderTempo(); });
            }
            if (this.dom.swingInput) {
                const commitSwing = () => {
                    this.seq.swing = Math.round(Util.clamp(Number(this.dom.swingInput.value), CONFIG.SWING.min, CONFIG.SWING.max, CONFIG.SWING.default));
                    this.renderSwing();
                };
                this.dom.swingInput.addEventListener("change", commitSwing);
                this.dom.swingInput.addEventListener("keydown", e => { if (e.key === "Enter") { commitSwing(); this.dom.swingInput.blur(); } });
                this.bindNumberWheel(this.dom.swingInput, 1, CONFIG.SWING.min, CONFIG.SWING.max, value => { this.seq.swing = value; this.renderSwing(); });
            }
            if (this.dom.masterButton) this.press(this.dom.masterButton, () => this.cycleMasterLevel());
            window.addEventListener("keydown", e => {
                const tag = e.target?.tagName?.toLowerCase();
                const editing = tag === "input" || tag === "select" || tag === "textarea" || e.target?.isContentEditable;
                const key = e.key.toLowerCase();
                const mod = e.ctrlKey || e.metaKey;
                if (mod && !editing && key === "z") { e.preventDefault(); e.shiftKey ? this.redo() : this.undo(); return; }
                if (mod && !editing && key === "y") { e.preventDefault(); this.redo(); return; }
                if (mod && !editing && key === "c") { e.preventDefault(); this.copyCurrentPattern(); return; }
                if (mod && !editing && key === "v") { e.preventDefault(); this.pastePatternToCurrentMemory(); return; }
                if (mod && !editing && key === "d") { e.preventDefault(); this.duplicateToNextMemory(); return; }
                if (mod && !editing && key === "s") { e.preventDefault(); this.seq.saveSlot(); this.renderMemory(); this.status(`Mémoire ${this.seq.memorySlot + 1} sauvegardée.`); return; }
                if (e.code === "Space" && !mod && !e.altKey) { e.preventDefault(); this.scheduler.toggle(); return; }
                if (editing || mod || e.altKey) return;
                if (/^[1-8]$/.test(e.key)) { e.preventDefault(); this.selectMemorySlot(Number(e.key) - 1); return; }
                if (key === "t") { e.preventDefault(); this.handleTapTempo(); return; }
                if (key === "m") { e.preventDefault(); this.seq.metronomeEnabled = !this.seq.metronomeEnabled; this.renderButtons(); return; }
            });
            document.addEventListener("visibilitychange", () => {
                if (document.hidden) this.audio.suspend();
                else if (this.scheduler.playing) this.audio.resume().catch(error => console.warn("Reprise audio impossible.", error));
            });
        }
        syncSchedulerStructure() {
            if (!this.scheduler) return;
            const steps = Math.max(1, this.seq.signature.steps);
            this.scheduler.step = ((this.scheduler.step % steps) + steps) % steps;
            this.clearPlayhead();
        }
        bindNumberWheel(input, step, min, max, apply) {
            input.addEventListener("wheel", e => {
                e.preventDefault();
                const direction = e.deltaY < 0 ? 1 : -1;
                const value = Math.round(Util.clamp(Number(input.value) + direction * step, min, max, min));
                input.value = String(value);
                apply(value);
            }, { passive: false });
        }
        cycleMasterLevel() {
            const levels = [0, 0.5, 1];
            const currentIndex = levels.reduce((best, value, i) => Math.abs(value - this.seq.masterVolume) < Math.abs(levels[best] - this.seq.masterVolume) ? i : best, 0);
            this.seq.masterVolume = levels[(currentIndex + 1) % levels.length];
            this.renderMaster();
        }
        handleTapTempo() {
            const now = performance.now();
            if (this.tapTimes.length && now - this.tapTimes[this.tapTimes.length - 1] > 2000) this.tapTimes = [];
            this.tapTimes.push(now);
            if (this.tapTimes.length > 6) this.tapTimes.shift();
            if (this.tapTimes.length < 2) return;
            const intervals = [];
            for (let i = 1; i < this.tapTimes.length; i++) intervals.push(this.tapTimes[i] - this.tapTimes[i - 1]);
            const avg = intervals.reduce((a, b) => a + b, 0) / intervals.length;
            this.seq.tempo = Math.round(Util.clamp(60000 / avg, CONFIG.TEMPO.min, CONFIG.TEMPO.max, CONFIG.TEMPO.default));
            this.renderTempo();
        }
        bindTempo(button, delta) {
            let timer = null;
            const change = () => { this.seq.tempo = Math.round(Util.clamp(this.seq.tempo + delta, CONFIG.TEMPO.min, CONFIG.TEMPO.max, CONFIG.TEMPO.default)); this.renderTempo(); };
            button.addEventListener("pointerdown", e => { e.preventDefault(); button.classList.add("bt-buttondown"); change(); timer = setTimeout(function repeat(){ change(); timer=setTimeout(repeat,80); },500); });
            ["pointerup","pointerleave","pointercancel"].forEach(type => button.addEventListener(type, () => { clearTimeout(timer); button.classList.remove("bt-buttondown"); }));
        }
        press(button, action) {
            button.addEventListener("pointerdown", e => { e.preventDefault(); button.classList.add("bt-buttondown"); action(); });
            ["pointerup","pointerleave","pointercancel"].forEach(type => button.addEventListener(type, () => button.classList.remove("bt-buttondown")));
        }
        bindUnlock() {
            const unlock = async () => { try { this.status("Chargement du kit audio…"); await this.audio.resume(); const buffers = await this.audio.preloadTracks(this.seq.currentTrackSamples()); const missing = buffers.filter(Boolean).length !== buffers.length; this.status(missing ? "Kit chargé partiellement : certains samples sont indisponibles." : "Kit audio prêt."); } catch (e) { console.warn(e); this.status(`Erreur audio : ${e.message || e}`); } };
            ["pointerdown","keydown","touchstart"].forEach(type => document.addEventListener(type, unlock, { once: true, passive: true }));
        }
        renderState() { this.renderSignature(); this.renderTempo(); this.renderKit(); this.renderGrid(); this.renderSliders(); this.renderSwing(); this.renderTrackControls(); this.renderMemory(); this.renderButtons(); }
        renderSignature() { if(this.dom.signatureNumerator)this.dom.signatureNumerator.value=String(this.seq.signature.numerator); if(this.dom.signatureDenominator)this.dom.signatureDenominator.value=String(this.seq.signature.denominator); if(this.dom.signature)this.dom.signature.setAttribute("aria-label",`Signature ${this.seq.signature.label}`); }
        renderTempo() { if (this.dom.tempo) this.dom.tempo.value = String(this.seq.tempo); }
        renderKit() {
            const kit = CONFIG.KITS[this.seq.kitIndex] || CONFIG.KITS[0];
            if (this.dom.kitSelect) {
                this.dom.kitSelect.value = this.seq.isCustomKit ? "custom" : String(this.seq.kitIndex);
                this.dom.kitSelect.style.setProperty("--kit-color", kit.color);
                this.dom.kitSelect.parentElement?.style.setProperty("--kit-color", kit.color);
            }
            this.trackSampleSelects.forEach((select, i) => { select.value = this.seq.sampleForTrack(i); });
        }
        renderCell(index) {
            const cell=this.cells[index]; if(!cell)return;
            const on=this.seq.activeCells.has(index), accent=this.seq.accentCells.has(index), strong=this.seq.strongCells.has(index), soft=this.seq.weakCells.has(index), ghost=this.seq.ghostCells.has(index);
            cell.classList.toggle("on",on); cell.classList.toggle("accent",on&&accent); cell.classList.toggle("strong",on&&strong); cell.classList.toggle("soft",on&&soft); cell.classList.toggle("ghost",on&&ghost);
            const label=accent?"Accent":strong?"Forte":soft?"Douce":ghost?"Ghost":on?"Normale":"Désactivée"; cell.setAttribute("aria-label",`Note ${label}`);
        }
        renderGrid() { this.cells.forEach((cell,i)=>this.renderCell(i)); }
        renderTrackControls() {
            this.trackMuteButtons.forEach((b,i)=>b.classList.toggle("active", !!this.seq.trackMuted[i]));
            this.trackSoloButtons.forEach((b,i)=>b.classList.toggle("active", !!this.seq.trackSolo[i]));
        }
        renderSwing() {
            if (this.dom.swingInput) this.dom.swingInput.value = String(this.seq.swing);
        }
        renderMaster() {
            if (!this.dom.masterButton) return;
            const value = Util.clamp(this.seq.masterVolume, 0, 1, 1);
            const state = value <= 0.1 ? "off" : value < 0.75 ? "low" : "high";
            const label = state === "off" ? "coupé" : state === "low" ? "faible" : "fort";
            const icon = state === "off" ? "fa-volume-xmark" : state === "low" ? "fa-volume-low" : "fa-volume-high";
            this.dom.masterButton.classList.remove("volume-off", "volume-low", "volume-high");
            this.dom.masterButton.classList.add(`volume-${state}`);
            if (this.dom.masterIcon) this.dom.masterIcon.className = `fa-solid ${icon}`;
            this.dom.masterButton.setAttribute("aria-label", `Volume master : ${label}`);
            this.dom.masterButton.dataset.btTooltip = `Volume master : ${label}`;
            this.syncUiStore();
        }
        renderSliders() {
            this.dom.sliders.querySelectorAll("input").forEach((input,i)=>input.value=String(Math.round(Util.clamp(this.seq.trackVolumes[i],0,1,1)*100)));
            this.renderMaster();
        }
        renderMemory() {
            this.memoryButtons.forEach((b,i)=>{
                const saved = !!this.seq.store.get(i);
                const selected = i === this.seq.memorySlot;
                b.classList.toggle("bt-buttondown", selected);
                b.classList.toggle("memory-saved", saved);
                b.classList.toggle("memory-empty", !saved);
                b.dataset.btTooltip = `Mémoire ${i + 1} — ${saved ? "sauvegardée" : "vide"}${selected ? " — sélectionnée" : ""} — raccourci ${i + 1}`;
            });
            if (this.seq.store.populated().length < 2) this.seq.chainEnabled = false;
            this.syncUiStore();
        }
        renderButtons() {
            this.dom.metro.setAttribute("aria-pressed", String(this.seq.metronomeEnabled));
            this.dom.metro.classList.toggle("bt-buttondown", this.seq.metronomeEnabled);
            this.dom.chain.setAttribute("aria-pressed", String(this.seq.chainEnabled));
            this.dom.chain.classList.toggle("bt-buttondown", this.seq.chainEnabled);
            this.dom.tempoRamp?.setAttribute("aria-pressed", String(this.seq.tempoRampEnabled));
            this.dom.tempoRamp?.classList.toggle("bt-buttondown", this.seq.tempoRampEnabled);
            this.dom.undo?.setAttribute("aria-disabled", String(this.undoStack.length === 0));
            this.dom.redo?.setAttribute("aria-disabled", String(this.redoStack.length === 0));
            this.syncUiStore();
        }
        captureState() { return { signatureIndex:this.seq.signatureIndex, memorySlot:this.seq.memorySlot, pattern:this.seq.snapshot() }; }
        restoreState(state) {
            if (!state) return;
            this.seq.signatureIndex = state.signatureIndex;
            this.seq.memorySlot = state.memorySlot ?? 0;
            this.seq.apply(state.pattern);
            this.syncSchedulerStructure();
            this.buildGrid(); this.renderState(); this.makeKeyboardAccessible();
        }
        pushHistory(state = this.captureState()) {
            this.undoStack.push(state);
            if (this.undoStack.length > this.historyLimit) this.undoStack.shift();
            this.redoStack.length = 0;
            this.renderButtons();
        }
        undo() {
            if (!this.undoStack.length) return;
            this.redoStack.push(this.captureState());
            this.restoreState(this.undoStack.pop());
            this.status("Modification annulée.");
        }
        redo() {
            if (!this.redoStack.length) return;
            this.undoStack.push(this.captureState());
            this.restoreState(this.redoStack.pop());
            this.status("Modification rétablie.");
        }
        status(message) {
            window.dispatchEvent(new CustomEvent("battrochtek-status", { detail:String(message || "") }));
            const live = document.querySelector("#bt-status-live"); if (live && message) live.textContent = String(message);
        }
        makeKeyboardAccessible() {
            document.querySelectorAll(".bt-button, .transport-button").forEach(button => {
                if (!button.hasAttribute("role")) button.setAttribute("role", "button");
                if (!button.hasAttribute("tabindex")) button.setAttribute("tabindex", "0");
                if (button.dataset.keyboardReady) return;
                button.dataset.keyboardReady = "1";
                button.addEventListener("keydown", e => {
                    if (e.key !== "Enter" && e.key !== " ") return;
                    e.preventDefault();
                    button.dispatchEvent(new Event("pointerdown", { bubbles:true, cancelable:true }));
                    button.dispatchEvent(new Event("pointerup", { bubbles:true, cancelable:true }));
                });
            });
        }
        resetPresetSelectors() { /* Le motif courant peut être libre sans modifier la sélection affichée. */ }
        setPlaying(value) {
            this.dom.play.setAttribute("aria-label", value ? "Pause" : "Lecture");
            this.dom.play.setAttribute("aria-pressed", String(value));
            this.dom.play.classList.toggle("bt-buttondown", value);
            if (this.dom.icon) {
                this.dom.icon.classList.toggle("fa-play", !value);
                this.dom.icon.classList.toggle("fa-pause", value);
            }
            this.syncUiStore();
        }
        clearPlayhead() { this.playheadTimeouts.forEach(clearTimeout); this.playheadTimeouts=[]; this.cells.forEach(c=>c.classList.remove("ticked")); this.dom.leds.querySelectorAll(".beat-led").forEach(l=>l.classList.remove("is-playing")); }
        schedulePlayhead(step, audioTime) {
            const ctx=this.audio.ensureContext(); const delay=Math.max(0,(audioTime-ctx.currentTime)*1000);
            const id=setTimeout(()=>{ const steps=this.seq.signature.steps; this.cells.forEach(c=>c.classList.remove("ticked")); for(let track=0;track<CONFIG.TRACK_COUNT;track++){ const c=this.cells[track*steps+step]; if(c)c.classList.add("ticked"); } this.dom.leds.querySelectorAll(".beat-led").forEach((l,i)=>l.classList.toggle("is-playing",i===step)); },delay);
            this.playheadTimeouts.push(id);
        }
    }

    const App = {
        init() {
            const presets = createFactoryPresets();
            const storage = new StorageManager("mem");
            const store = new PatternStore(storage, presets);
            // Les 8 mémoires sont autonomes : chacune transporte signature, tempo et pattern.
            storage.save(store.slots);
            const sequencer = new Sequencer(store);
            const first = store.populated()[0] ?? 0;
            sequencer.loadSlot(first);
            const audio = new AudioEngine();
            const ui = new UIController(sequencer, audio);
            const scheduler = new Scheduler(audio, sequencer, ui);
            ui.init(scheduler);
            window.Battrochtek = { CONFIG, TRACK_ROLES, store, sequencer, audio, scheduler, ui };
        }
    };

    let appStarted = false;
    const startApp = () => {
        if (appStarted || !window.Alpine?.store?.("ui")) return false;
        appStarted = true;
        App.init();
        return true;
    };

    const reportMissingAlpine = () => {
        if (appStarted || startApp()) return;
        const message = "Erreur de démarrage : Alpine.js local n’est pas disponible. Exécute npm install pour générer vendor/alpine/alpine.min.js, puis recharge la page.";
        window.dispatchEvent(new CustomEvent("battrochtek-status", { detail: message }));
        console.error(message);
    };

    // Le bundle CDN d'Alpine démarre via microtask. Lors d'un rechargement avec
    // service worker, DOMContentLoaded peut arriver avant la création du store.
    // On tente donc au DOM ready ET à la fin de l'initialisation Alpine.
    document.addEventListener("alpine:initialized", startApp, { once: true });
    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", () => {
            if (!startApp()) window.setTimeout(reportMissingAlpine, 500);
        }, { once: true });
    } else if (!startApp()) {
        window.setTimeout(reportMissingAlpine, 500);
    }
})();
