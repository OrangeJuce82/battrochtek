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
        crash:0, ride:1, openHat:2, closedHat:3, snare:4,
        tomHigh:5, tomMid:6, tomFloor:7, kick:8
    });
    const TRACK_I18N_KEYS = Object.freeze(["track.crash", "track.ride", "track.openHat", "track.closedHat", "track.snare", "track.tomHigh", "track.tomMid", "track.tomFloor", "track.kick"]);

    const SAMPLE_LIBRARY = Object.freeze([{"key":"studio_kick_a","file":"sounds/studio-kick-a.wav","label":"Studio Kick A","type":"kick","source":"01kick1.wav"},{"key":"studio_kick_b","file":"sounds/studio-kick-b.wav","label":"Studio Kick B","type":"kick","source":"01kick2.wav"},{"key":"studio_snare_a","file":"sounds/studio-snare-a.wav","label":"Studio Snare A","type":"snare","source":"01snare1.wav"},{"key":"studio_snare_b","file":"sounds/studio-snare-b.wav","label":"Studio Snare B","type":"snare","source":"01snare2.wav"},{"key":"studio_tom_a","file":"sounds/studio-tom-a.wav","label":"Studio Tom A","type":"tom","source":"01tom1.wav"},{"key":"studio_tom_b","file":"sounds/studio-tom-b.wav","label":"Studio Tom B","type":"tom","source":"01tom2.wav"},{"key":"bright_kick_a","file":"sounds/bright-kick-a.wav","label":"Bright Kick A","type":"kick","source":"02kick1.wav"},{"key":"bright_kick_b","file":"sounds/bright-kick-b.wav","label":"Bright Kick B","type":"kick","source":"02kick2.wav"},{"key":"bright_snare_a","file":"sounds/bright-snare-a.wav","label":"Bright Snare A","type":"snare","source":"02snare1.wav"},{"key":"bright_snare_b","file":"sounds/bright-snare-b.wav","label":"Bright Snare B","type":"snare","source":"02snare2.wav"},{"key":"bright_tom_a","file":"sounds/bright-tom-a.wav","label":"Bright Tom A","type":"tom","source":"02tom1.wav"},{"key":"bright_tom_b","file":"sounds/bright-tom-b.wav","label":"Bright Tom B","type":"tom","source":"02tom2.wav"},{"key":"rock_kick_a","file":"sounds/rock-kick-a.wav","label":"Rock Kick A","type":"kick","source":"03kick1.wav"},{"key":"rock_kick_b","file":"sounds/rock-kick-b.wav","label":"Rock Kick B","type":"kick","source":"03kick2.wav"},{"key":"rock_snare_a","file":"sounds/rock-snare-a.wav","label":"Rock Snare A","type":"snare","source":"03snare1.wav"},{"key":"rock_tom_a","file":"sounds/rock-tom-a.wav","label":"Rock Tom A","type":"tom","source":"03tom1.wav"},{"key":"rock_tom_b","file":"sounds/rock-tom-b.wav","label":"Rock Tom B","type":"tom","source":"03tom2.wav"},{"key":"tight_kick_a","file":"sounds/tight-kick-a.wav","label":"Tight Kick A","type":"kick","source":"04kick1.wav"},{"key":"tight_kick_b","file":"sounds/tight-kick-b.wav","label":"Tight Kick B","type":"kick","source":"04kick2.wav"},{"key":"tight_snare_a","file":"sounds/tight-snare-a.wav","label":"Tight Snare A","type":"snare","source":"04snare1.wav"},{"key":"warm_kick_a","file":"sounds/warm-kick-a.wav","label":"Warm Kick A","type":"kick","source":"05kick1.wav"},{"key":"warm_kick_b","file":"sounds/warm-kick-b.wav","label":"Warm Kick B","type":"kick","source":"05kick2.wav"},{"key":"warm_snare_a","file":"sounds/warm-snare-a.wav","label":"Warm Snare A","type":"snare","source":"05snare1.wav"},{"key":"warm_snare_b","file":"sounds/warm-snare-b.wav","label":"Warm Snare B","type":"snare","source":"05snare2.wav"},{"key":"warm_tom_a","file":"sounds/warm-tom-a.wav","label":"Warm Tom A","type":"tom","source":"05tom1.wav"},{"key":"warm_tom_b","file":"sounds/warm-tom-b.wav","label":"Warm Tom B","type":"tom","source":"05tom2.wav"},{"key":"raw_kick_a","file":"sounds/raw-kick-a.wav","label":"Raw Kick A","type":"kick","source":"06kick1.wav"},{"key":"raw_kick_b","file":"sounds/raw-kick-b.wav","label":"Raw Kick B","type":"kick","source":"06kick2.wav"},{"key":"raw_snare_a","file":"sounds/raw-snare-a.wav","label":"Raw Snare A","type":"snare","source":"06snare1.wav"},{"key":"raw_snare_b","file":"sounds/raw-snare-b.wav","label":"Raw Snare B","type":"snare","source":"06snare2.wav"},{"key":"raw_tom_a","file":"sounds/raw-tom-a.wav","label":"Raw Tom A","type":"tom","source":"06tom1.wav"},{"key":"raw_tom_b","file":"sounds/raw-tom-b.wav","label":"Raw Tom B","type":"tom","source":"06tom2.wav"},{"key":"arena_kick_a","file":"sounds/arena-kick-a.wav","label":"Arena Kick A","type":"kick","source":"07kick1.wav"},{"key":"arena_kick_b","file":"sounds/arena-kick-b.wav","label":"Arena Kick B","type":"kick","source":"07kick2.wav"},{"key":"arena_snare_a","file":"sounds/arena-snare-a.wav","label":"Arena Snare A","type":"snare","source":"07snare1.wav"},{"key":"arena_snare_b","file":"sounds/arena-snare-b.wav","label":"Arena Snare B","type":"snare","source":"07snare2.wav"},{"key":"arena_tom_a","file":"sounds/arena-tom-a.wav","label":"Arena Tom A","type":"tom","source":"07tom1.wav"},{"key":"arena_tom_b","file":"sounds/arena-tom-b.wav","label":"Arena Tom B","type":"tom","source":"07tom2.wav"},{"key":"deep_kick_a","file":"sounds/deep-kick-a.wav","label":"Deep Kick A","type":"kick","source":"08kick1.wav"},{"key":"deep_kick_b","file":"sounds/deep-kick-b.wav","label":"Deep Kick B","type":"kick","source":"08kick2.wav"},{"key":"deep_snare_a","file":"sounds/deep-snare-a.wav","label":"Deep Snare A","type":"snare","source":"08snare1.wav"},{"key":"deep_snare_b","file":"sounds/deep-snare-b.wav","label":"Deep Snare B","type":"snare","source":"08snare2.wav"},{"key":"deep_tom_a","file":"sounds/deep-tom-a.wav","label":"Deep Tom A","type":"tom","source":"08tom1.wav"},{"key":"deep_tom_b","file":"sounds/deep-tom-b.wav","label":"Deep Tom B","type":"tom","source":"08tom2.wav"},{"key":"alarm_01","file":"sounds/alarm-01.wav","label":"Alarm 01","type":"fx","source":"alarm_01.wav"},{"key":"anvil_01","file":"sounds/anvil-01.wav","label":"Anvil 01","type":"fx","source":"anvil_01.wav"},{"key":"beep_01","file":"sounds/beep-01.wav","label":"Beep 01","type":"fx","source":"beep_01.wav"},{"key":"beep_02","file":"sounds/beep-02.wav","label":"Beep 02","type":"fx","source":"beep_02.wav"},{"key":"legacy_bell1","file":"sounds/legacy-bell1.wav","label":"Legacy Bell1","type":"cymbal","source":"bell1.wav"},{"key":"bongo_01","file":"sounds/bongo-01.wav","label":"Bongo 01","type":"perc","source":"bongo_01.wav"},{"key":"bongo_02","file":"sounds/bongo-02.wav","label":"Bongo 02","type":"perc","source":"bongo_02.wav"},{"key":"bongo_03","file":"sounds/bongo-03.wav","label":"Bongo 03","type":"perc","source":"bongo_03.wav"},{"key":"bongo_04","file":"sounds/bongo-04.wav","label":"Bongo 04","type":"perc","source":"bongo_04.wav"},{"key":"legacy_china1","file":"sounds/legacy-china1.wav","label":"Legacy China1","type":"cymbal","source":"china1.wav"},{"key":"clap_01","file":"sounds/clap-01.wav","label":"Clap 01","type":"perc","source":"clap_01.wav"},{"key":"clap_02","file":"sounds/clap-02.wav","label":"Clap 02","type":"perc","source":"clap_02.wav"},{"key":"clap_03","file":"sounds/clap-03.wav","label":"Clap 03","type":"perc","source":"clap_03.wav"},{"key":"clap_04","file":"sounds/clap-04.wav","label":"Clap 04","type":"perc","source":"clap_04.wav"},{"key":"clap_long_01","file":"sounds/clap-long-01.wav","label":"Clap Long 01","type":"perc","source":"clap_long_01.wav"},{"key":"claves_01","file":"sounds/claves-01.wav","label":"Claves 01","type":"perc","source":"claves_01.wav"},{"key":"claves_02","file":"sounds/claves-02.wav","label":"Claves 02","type":"perc","source":"claves_02.wav"},{"key":"legacy_cowbell","file":"sounds/legacy-cowbell.wav","label":"Legacy Cowbell","type":"perc","source":"cowbell.wav"},{"key":"cowbell_01","file":"sounds/cowbell-01.wav","label":"Cowbell 01","type":"perc","source":"cowbell_01.wav"},{"key":"cowbell_02","file":"sounds/cowbell-02.wav","label":"Cowbell 02","type":"perc","source":"cowbell_02.wav"},{"key":"cowbell_03","file":"sounds/cowbell-03.wav","label":"Cowbell 03","type":"perc","source":"cowbell_03.wav"},{"key":"legacy_crash1","file":"sounds/legacy-crash1.wav","label":"Legacy Crash1","type":"cymbal","source":"crash1.wav"},{"key":"crash_electro_01","file":"sounds/crash-electro-01.wav","label":"Crash Electro 01","type":"cymbal","source":"crash_01.wav"},{"key":"crash_electro_02","file":"sounds/crash-electro-02.wav","label":"Crash Electro 02","type":"cymbal","source":"crash_02.wav"},{"key":"crow_01","file":"sounds/crow-01.wav","label":"Crow 01","type":"fx","source":"crow_01.wav"},{"key":"crow_02","file":"sounds/crow-02.wav","label":"Crow 02","type":"fx","source":"crow_02.wav"},{"key":"cymbal_electro_01","file":"sounds/cymbal-electro-01.wav","label":"Cymbal Electro 01","type":"cymbal","source":"cymbal_01.wav"},{"key":"cymbal_electro_02","file":"sounds/cymbal-electro-02.wav","label":"Cymbal Electro 02","type":"cymbal","source":"cymbal_02.wav"},{"key":"cymbal_electro_03","file":"sounds/cymbal-electro-03.wav","label":"Cymbal Electro 03","type":"cymbal","source":"cymbal_03.wav"},{"key":"cymbal_electro_04","file":"sounds/cymbal-electro-04.wav","label":"Cymbal Electro 04","type":"cymbal","source":"cymbal_04.wav"},{"key":"door_01","file":"sounds/door-01.wav","label":"Door 01","type":"fx","source":"door_01.wav"},{"key":"door_02","file":"sounds/door-02.wav","label":"Door 02","type":"fx","source":"door_02.wav"},{"key":"formant_01","file":"sounds/formant-01.wav","label":"Formant 01","type":"fx","source":"formant_01.wav"},{"key":"game_01","file":"sounds/game-01.wav","label":"Game 01","type":"fx","source":"game_01.wav"},{"key":"game_02","file":"sounds/game-02.wav","label":"Game 02","type":"fx","source":"game_02.wav"},{"key":"game_03","file":"sounds/game-03.wav","label":"Game 03","type":"fx","source":"game_03.wav"},{"key":"game_coin","file":"sounds/game-coin.wav","label":"Game Coin","type":"fx","source":"game_coin.wav"},{"key":"game_damaged","file":"sounds/game-damaged.wav","label":"Game Damaged","type":"fx","source":"game_damaged.wav"},{"key":"game_fail","file":"sounds/game-fail.wav","label":"Game Fail","type":"fx","source":"game_fail.wav"},{"key":"game_fail_02","file":"sounds/game-fail-02.wav","label":"Game Fail 02","type":"fx","source":"game_fail_02.wav"},{"key":"game_level_up","file":"sounds/game-level-up.wav","label":"Game Level Up","type":"fx","source":"game_level_up.wav"},{"key":"game_passed_01","file":"sounds/game-passed-01.wav","label":"Game Passed 01","type":"fx","source":"game_passed_01.wav"},{"key":"game_passed_02","file":"sounds/game-passed-02.wav","label":"Game Passed 02","type":"fx","source":"game_passed_02.wav"},{"key":"game_pick_up","file":"sounds/game-pick-up.wav","label":"Game Pick Up","type":"fx","source":"game_pick_up.wav"},{"key":"glass_01","file":"sounds/glass-01.wav","label":"Glass 01","type":"fx","source":"glass_01.wav"},{"key":"glass_02","file":"sounds/glass-02.wav","label":"Glass 02","type":"fx","source":"glass_02.wav"},{"key":"glitch_01","file":"sounds/glitch-01.wav","label":"Glitch 01","type":"fx","source":"glitch_01.wav"},{"key":"glitch_02","file":"sounds/glitch-02.wav","label":"Glitch 02","type":"fx","source":"glitch_02.wav"},{"key":"electro_hat_closed_bright_01","file":"sounds/electro-hat-closed-bright-01.wav","label":"Electro Hat Closed Bright 01","type":"hat","source":"hat_closed_01.wav"},{"key":"electro_hat_closed_bright_02","file":"sounds/electro-hat-closed-bright-02.wav","label":"Electro Hat Closed Bright 02","type":"hat","source":"hat_closed_02.wav"},{"key":"electro_hat_closed_bright_03","file":"sounds/electro-hat-closed-bright-03.wav","label":"Electro Hat Closed Bright 03","type":"hat","source":"hat_closed_03.wav"},{"key":"electro_hat_closed_bright_04","file":"sounds/electro-hat-closed-bright-04.wav","label":"Electro Hat Closed Bright 04","type":"hat","source":"hat_closed_04.wav"},{"key":"electro_hat_closed_bright_05","file":"sounds/electro-hat-closed-bright-05.wav","label":"Electro Hat Closed Bright 05","type":"hat","source":"hat_closed_05.wav"},{"key":"electro_hat_closed_bright_06","file":"sounds/electro-hat-closed-bright-06.wav","label":"Electro Hat Closed Bright 06","type":"hat","source":"hat_closed_06.wav"},{"key":"electro_hat_closed_distorted_01","file":"sounds/electro-hat-closed-distorted-01.wav","label":"Electro Hat Closed Distorted 01","type":"hat","source":"hat_distort_01.wav"},{"key":"electro_hat_closed_metal_01","file":"sounds/electro-hat-closed-metal-01.wav","label":"Electro Hat Closed Metal 01","type":"hat","source":"hat_metal_01.wav"},{"key":"electro_hat_open_bright_01","file":"sounds/electro-hat-open-bright-01.wav","label":"Electro Hat Open Bright 01","type":"hat","source":"hat_open_01.wav"},{"key":"electro_hat_open_bright_02","file":"sounds/electro-hat-open-bright-02.wav","label":"Electro Hat Open Bright 02","type":"hat","source":"hat_open_02.wav"},{"key":"electro_hat_open_bright_03","file":"sounds/electro-hat-open-bright-03.wav","label":"Electro Hat Open Bright 03","type":"hat","source":"hat_open_03.wav"},{"key":"electro_hat_open_bright_04","file":"sounds/electro-hat-open-bright-04.wav","label":"Electro Hat Open Bright 04","type":"hat","source":"hat_open_04.wav"},{"key":"electro_hat_open_bright_05","file":"sounds/electro-hat-open-bright-05.wav","label":"Electro Hat Open Bright 05","type":"hat","source":"hat_open_05.wav"},{"key":"heartbeat_01","file":"sounds/heartbeat-01.wav","label":"Heartbeat 01","type":"fx","source":"heartbeat_01.wav"},{"key":"legacy_hat_closed_1","file":"sounds/legacy-hat-closed-1.wav","label":"Legacy Hat Closed 1","type":"hat","source":"hihat1.wav"},{"key":"legacy_hat_closed_2","file":"sounds/legacy-hat-closed-2.wav","label":"Legacy Hat Closed 2","type":"hat","source":"hihat2.wav"},{"key":"electro_kick_deep_01","file":"sounds/electro-kick-deep-01.wav","label":"Electro Kick Deep 01","type":"kick","source":"kick_01.wav"},{"key":"electro_kick_sub_02","file":"sounds/electro-kick-sub-02.wav","label":"Electro Kick Sub 02","type":"kick","source":"kick_02.wav"},{"key":"electro_kick_sub_03","file":"sounds/electro-kick-sub-03.wav","label":"Electro Kick Sub 03","type":"kick","source":"kick_03.wav"},{"key":"electro_kick_punch_04","file":"sounds/electro-kick-punch-04.wav","label":"Electro Kick Punch 04","type":"kick","source":"kick_04.wav"},{"key":"electro_kick_deep_05","file":"sounds/electro-kick-deep-05.wav","label":"Electro Kick Deep 05","type":"kick","source":"kick_05.wav"},{"key":"electro_kick_deep_06","file":"sounds/electro-kick-deep-06.wav","label":"Electro Kick Deep 06","type":"kick","source":"kick_06.wav"},{"key":"electro_kick_sub_07","file":"sounds/electro-kick-sub-07.wav","label":"Electro Kick Sub 07","type":"kick","source":"kick_07.wav"},{"key":"electro_kick_bright_08","file":"sounds/electro-kick-bright-08.wav","label":"Electro Kick Bright 08","type":"kick","source":"kick_08.wav"},{"key":"electro_kick_punch_09","file":"sounds/electro-kick-punch-09.wav","label":"Electro Kick Punch 09","type":"kick","source":"kick_09.wav"},{"key":"electro_kick_deep_10","file":"sounds/electro-kick-deep-10.wav","label":"Electro Kick Deep 10","type":"kick","source":"kick_10.wav"},{"key":"electro_kick_sub_11","file":"sounds/electro-kick-sub-11.wav","label":"Electro Kick Sub 11","type":"kick","source":"kick_11.wav"},{"key":"electro_kick_sub_12","file":"sounds/electro-kick-sub-12.wav","label":"Electro Kick Sub 12","type":"kick","source":"kick_12.wav"},{"key":"electro_kick_deep_13","file":"sounds/electro-kick-deep-13.wav","label":"Electro Kick Deep 13","type":"kick","source":"kick_13.wav"},{"key":"electro_kick_deep_14","file":"sounds/electro-kick-deep-14.wav","label":"Electro Kick Deep 14","type":"kick","source":"kick_14.wav"},{"key":"electro_kick_distorted_01","file":"sounds/electro-kick-distorted-01.wav","label":"Electro Kick Distorted 01","type":"kick","source":"kick_distort_01.wav"},{"key":"electro_kick_distorted_02","file":"sounds/electro-kick-distorted-02.wav","label":"Electro Kick Distorted 02","type":"kick","source":"kick_distort_02.wav"},{"key":"lock_01","file":"sounds/lock-01.wav","label":"Lock 01","type":"fx","source":"lock_01.wav"},{"key":"maracas_01","file":"sounds/maracas-01.wav","label":"Maracas 01","type":"perc","source":"maracas_01.wav"},{"key":"maracas_02","file":"sounds/maracas-02.wav","label":"Maracas 02","type":"perc","source":"maracas_02.wav"},{"key":"melee_01","file":"sounds/melee-01.wav","label":"Melee 01","type":"fx","source":"melee_01.wav"},{"key":"melee_02","file":"sounds/melee-02.wav","label":"Melee 02","type":"fx","source":"melee_02.wav"},{"key":"melee_03","file":"sounds/melee-03.wav","label":"Melee 03","type":"fx","source":"melee_03.wav"},{"key":"metal_01","file":"sounds/metal-01.wav","label":"Metal 01","type":"fx","source":"metal_01.wav"},{"key":"metal_02","file":"sounds/metal-02.wav","label":"Metal 02","type":"fx","source":"metal_02.wav"},{"key":"notify_01","file":"sounds/notify-01.wav","label":"Notify 01","type":"fx","source":"notify_01.wav"},{"key":"legacy_hat_open_1","file":"sounds/legacy-hat-open-1.wav","label":"Legacy Hat Open 1","type":"hat","source":"open1.wav"},{"key":"legacy_hat_open_2","file":"sounds/legacy-hat-open-2.wav","label":"Legacy Hat Open 2","type":"hat","source":"open2.wav"},{"key":"legacy_pad_2","file":"sounds/legacy-pad-2.wav","label":"Legacy Pad 2","type":"fx","source":"pad2.wav"},{"key":"perc_01","file":"sounds/perc-01.wav","label":"Perc 01","type":"perc","source":"perc_01.wav"},{"key":"perc_02","file":"sounds/perc-02.wav","label":"Perc 02","type":"perc","source":"perc_02.wav"},{"key":"perc_03","file":"sounds/perc-03.wav","label":"Perc 03","type":"perc","source":"perc_03.wav"},{"key":"perc_04","file":"sounds/perc-04.wav","label":"Perc 04","type":"perc","source":"perc_04.wav"},{"key":"punch_01","file":"sounds/punch-01.wav","label":"Punch 01","type":"fx","source":"punch_01.wav"},{"key":"punch_02","file":"sounds/punch-02.wav","label":"Punch 02","type":"fx","source":"punch_02.wav"},{"key":"punch_03","file":"sounds/punch-03.wav","label":"Punch 03","type":"fx","source":"punch_03.wav"},{"key":"punch_04","file":"sounds/punch-04.wav","label":"Punch 04","type":"fx","source":"punch_04.wav"},{"key":"punch_05","file":"sounds/punch-05.wav","label":"Punch 05","type":"fx","source":"punch_05.wav"},{"key":"punch_06","file":"sounds/punch-06.wav","label":"Punch 06","type":"fx","source":"punch_06.wav"},{"key":"ratchet_01","file":"sounds/ratchet-01.wav","label":"Ratchet 01","type":"fx","source":"ratchet_01.wav"},{"key":"legacy_ride1","file":"sounds/legacy-ride1.wav","label":"Legacy Ride1","type":"cymbal","source":"ride1.wav"},{"key":"legacy_ride3","file":"sounds/legacy-ride3.wav","label":"Legacy Ride3","type":"cymbal","source":"ride3.wav"},{"key":"ride_electro_01","file":"sounds/ride-electro-01.wav","label":"Ride Electro 01","type":"cymbal","source":"ride_01.wav"},{"key":"ride_electro_02","file":"sounds/ride-electro-02.wav","label":"Ride Electro 02","type":"cymbal","source":"ride_02.wav"},{"key":"legacy_rim","file":"sounds/legacy-rim.wav","label":"Legacy Rim","type":"perc","source":"rim.wav"},{"key":"rimshot_01","file":"sounds/rimshot-01.wav","label":"Rimshot 01","type":"perc","source":"rimshot_01.wav"},{"key":"rimshot_02","file":"sounds/rimshot-02.wav","label":"Rimshot 02","type":"perc","source":"rimshot_02.wav"},{"key":"rimshot_03","file":"sounds/rimshot-03.wav","label":"Rimshot 03","type":"perc","source":"rimshot_03.wav"},{"key":"rimshot_04","file":"sounds/rimshot-04.wav","label":"Rimshot 04","type":"perc","source":"rimshot_04.wav"},{"key":"electro_snare_snap_01","file":"sounds/electro-snare-snap-01.wav","label":"Electro Snare Snap 01","type":"snare","source":"snare_01.wav"},{"key":"electro_snare_snap_02","file":"sounds/electro-snare-snap-02.wav","label":"Electro Snare Snap 02","type":"snare","source":"snare_02.wav"},{"key":"electro_snare_bright_03","file":"sounds/electro-snare-bright-03.wav","label":"Electro Snare Bright 03","type":"snare","source":"snare_03.wav"},{"key":"electro_snare_crack_04","file":"sounds/electro-snare-crack-04.wav","label":"Electro Snare Crack 04","type":"snare","source":"snare_04.wav"},{"key":"electro_snare_snap_05","file":"sounds/electro-snare-snap-05.wav","label":"Electro Snare Snap 05","type":"snare","source":"snare_05.wav"},{"key":"electro_snare_crack_06","file":"sounds/electro-snare-crack-06.wav","label":"Electro Snare Crack 06","type":"snare","source":"snare_06.wav"},{"key":"electro_snare_snap_07","file":"sounds/electro-snare-snap-07.wav","label":"Electro Snare Snap 07","type":"snare","source":"snare_07.wav"},{"key":"electro_snare_snap_08","file":"sounds/electro-snare-snap-08.wav","label":"Electro Snare Snap 08","type":"snare","source":"snare_08.wav"},{"key":"electro_snare_crack_09","file":"sounds/electro-snare-crack-09.wav","label":"Electro Snare Crack 09","type":"snare","source":"snare_09.wav"},{"key":"electro_snare_snap_10","file":"sounds/electro-snare-snap-10.wav","label":"Electro Snare Snap 10","type":"snare","source":"snare_10.wav"},{"key":"electro_snare_warm_11","file":"sounds/electro-snare-warm-11.wav","label":"Electro Snare Warm 11","type":"snare","source":"snare_11.wav"},{"key":"electro_snare_bright_12","file":"sounds/electro-snare-bright-12.wav","label":"Electro Snare Bright 12","type":"snare","source":"snare_12.wav"},{"key":"electro_snare_snap_13","file":"sounds/electro-snare-snap-13.wav","label":"Electro Snare Snap 13","type":"snare","source":"snare_13.wav"},{"key":"electro_snare_snap_14","file":"sounds/electro-snare-snap-14.wav","label":"Electro Snare Snap 14","type":"snare","source":"snare_14.wav"},{"key":"electro_snare_distorted_01","file":"sounds/electro-snare-distorted-01.wav","label":"Electro Snare Distorted 01","type":"snare","source":"snare_distort_01.wav"},{"key":"electro_snare_distorted_02","file":"sounds/electro-snare-distorted-02.wav","label":"Electro Snare Distorted 02","type":"snare","source":"snare_distort_02.wav"},{"key":"legacy_splash1","file":"sounds/legacy-splash1.wav","label":"Legacy Splash1","type":"cymbal","source":"splash1.wav"},{"key":"legacy_stax_1","file":"sounds/legacy-stax-1.wav","label":"Legacy Stax 1","type":"fx","source":"stax1.wav"},{"key":"metronome_tick","file":"sounds/metronome-tick.wav","label":"Metronome Tick","type":"metro","source":"tick.wav"},{"key":"electro_tom_high_01","file":"sounds/electro-tom-high-01.wav","label":"Electro Tom High 01","type":"tom","source":"tom_hi_01.wav"},{"key":"electro_tom_high_02","file":"sounds/electro-tom-high-02.wav","label":"Electro Tom High 02","type":"tom","source":"tom_hi_02.wav"},{"key":"electro_tom_high_03","file":"sounds/electro-tom-high-03.wav","label":"Electro Tom High 03","type":"tom","source":"tom_hi_03.wav"},{"key":"electro_tom_high_04","file":"sounds/electro-tom-high-04.wav","label":"Electro Tom High 04","type":"tom","source":"tom_hi_04.wav"},{"key":"electro_tom_high_05","file":"sounds/electro-tom-high-05.wav","label":"Electro Tom High 05","type":"tom","source":"tom_hi_05.wav"},{"key":"electro_tom_low_01","file":"sounds/electro-tom-low-01.wav","label":"Electro Tom Low 01","type":"tom","source":"tom_low_01.wav"},{"key":"electro_tom_low_02","file":"sounds/electro-tom-low-02.wav","label":"Electro Tom Low 02","type":"tom","source":"tom_low_02.wav"},{"key":"electro_tom_low_03","file":"sounds/electro-tom-low-03.wav","label":"Electro Tom Low 03","type":"tom","source":"tom_low_03.wav"},{"key":"electro_tom_low_04","file":"sounds/electro-tom-low-04.wav","label":"Electro Tom Low 04","type":"tom","source":"tom_low_04.wav"},{"key":"electro_tom_low_05","file":"sounds/electro-tom-low-05.wav","label":"Electro Tom Low 05","type":"tom","source":"tom_low_05.wav"},{"key":"electro_tom_mid_01","file":"sounds/electro-tom-mid-01.wav","label":"Electro Tom Mid 01","type":"tom","source":"tom_mid_01.wav"},{"key":"electro_tom_mid_02","file":"sounds/electro-tom-mid-02.wav","label":"Electro Tom Mid 02","type":"tom","source":"tom_mid_02.wav"},{"key":"electro_tom_mid_03","file":"sounds/electro-tom-mid-03.wav","label":"Electro Tom Mid 03","type":"tom","source":"tom_mid_03.wav"},{"key":"electro_tom_mid_04","file":"sounds/electro-tom-mid-04.wav","label":"Electro Tom Mid 04","type":"tom","source":"tom_mid_04.wav"},{"key":"electro_tom_mid_05","file":"sounds/electro-tom-mid-05.wav","label":"Electro Tom Mid 05","type":"tom","source":"tom_mid_05.wav"},{"key":"twang_01","file":"sounds/twang-01.wav","label":"Twang 01","type":"fx","source":"twang_01.wav"},{"key":"twang_02","file":"sounds/twang-02.wav","label":"Twang 02","type":"fx","source":"twang_02.wav"},{"key":"twang_03","file":"sounds/twang-03.wav","label":"Twang 03","type":"fx","source":"twang_03.wav"},{"key":"vocal_are_you_crazy","file":"sounds/vocal-are-you-crazy.wav","label":"Vocal Are You Crazy","type":"fx","source":"vocal_are_you_crazy.wav"},{"key":"vocal_come_on_01","file":"sounds/vocal-come-on-01.wav","label":"Vocal Come On 01","type":"fx","source":"vocal_come_on_01.wav"},{"key":"vocal_dont_judge","file":"sounds/vocal-dont-judge.wav","label":"Vocal Dont Judge","type":"fx","source":"vocal_dont_judge.wav"},{"key":"vocal_gasp","file":"sounds/vocal-gasp.wav","label":"Vocal Gasp","type":"fx","source":"vocal_gasp.wav"},{"key":"vocal_lets_run","file":"sounds/vocal-lets-run.wav","label":"Vocal Lets Run","type":"fx","source":"vocal_lets_run.wav"},{"key":"vocal_no_cant","file":"sounds/vocal-no-cant.wav","label":"Vocal No Cant","type":"fx","source":"vocal_no_cant.wav"},{"key":"vocal_order","file":"sounds/vocal-order.wav","label":"Vocal Order","type":"fx","source":"vocal_order.wav"},{"key":"vocal_scream_01","file":"sounds/vocal-scream-01.wav","label":"Vocal Scream 01","type":"fx","source":"vocal_scream_01.wav"},{"key":"vocal_the_line","file":"sounds/vocal-the-line.wav","label":"Vocal The Line","type":"fx","source":"vocal_the_line.wav"},{"key":"vocal_what_01","file":"sounds/vocal-what-01.wav","label":"Vocal What 01","type":"fx","source":"vocal_what_01.wav"},{"key":"vocal_what_02","file":"sounds/vocal-what-02.wav","label":"Vocal What 02","type":"fx","source":"vocal_what_02.wav"},{"key":"warb_01","file":"sounds/warb-01.wav","label":"Warb 01","type":"fx","source":"warb_01.wav"},{"key":"zap_01","file":"sounds/zap-01.wav","label":"Zap 01","type":"fx","source":"zap_01.wav"},{"key":"zap_02","file":"sounds/zap-02.wav","label":"Zap 02","type":"fx","source":"zap_02.wav"},{"key":"zap_03","file":"sounds/zap-03.wav","label":"Zap 03","type":"fx","source":"zap_03.wav"},{"key":"zap_04","file":"sounds/zap-04.wav","label":"Zap 04","type":"fx","source":"zap_04.wav"},{"key":"zap_05","file":"sounds/zap-05.wav","label":"Zap 05","type":"fx","source":"zap_05.wav"}]);
    const SAMPLE_INDEX = Object.freeze(Object.fromEntries(SAMPLE_LIBRARY.map(sample => [sample.key, Object.freeze(sample)])));
    const TRACK_SAMPLE_TYPES = Object.freeze([['cymbal','fx','perc'],['cymbal','perc','fx'],['hat','perc','fx'],['hat','perc'],['snare','perc'],['tom','perc'],['tom','perc'],['tom','perc'],['kick','perc','fx']]);

    const CONFIG = Object.freeze({
        SIGNATURES: Object.freeze(SIGNATURES),
        SIGNATURE_DENOMINATORS: Object.freeze([4,8,16]),
        TRACK_COUNT: 9,
        METRONOME_TRACK_INDEX: 9,
        LEGACY_TRACK_COUNT: 10,
        MEMORY_SLOTS: 8,
        TEMPO: Object.freeze({ min: 40, max: 240, default: 120 }),
        SWING: Object.freeze({ min: 0, max: 100, default: 0, maxDelayRatio: 0.28 }),
        VELOCITY_GAIN: Object.freeze({ ghost:0.30, soft:0.48, normal:0.72, strong:0.92, accent:1.15 }),
        SCHEDULER: Object.freeze({ lookAheadMs: 25, scheduleAheadSec: 0.1 }),
        SAMPLE_MAP: Object.freeze(Object.fromEntries(SAMPLE_LIBRARY.map(sample => [sample.key, [sample.file, sample.label, sample.type]]))),
        KITS: Object.freeze([{"name":"STUDIO PUNCH","color":"#2d9cdb","tracks":["legacy_crash1","legacy_ride1","legacy_hat_open_1","legacy_hat_closed_1","studio_snare_a","studio_tom_a","studio_tom_b","deep_tom_b","studio_kick_a","metronome_tick"]},{"name":"ARENA 909","color":"#ff5a36","tracks":["crash_electro_02","ride_electro_02","electro_hat_open_bright_03","electro_hat_closed_bright_06","electro_snare_snap_14","electro_tom_high_05","electro_tom_low_05","electro_tom_low_02","electro_kick_deep_14","metronome_tick"]},{"name":"NEON 808","color":"#ff2f7d","tracks":["cymbal_electro_01","cowbell_01","electro_hat_open_bright_01","electro_hat_closed_bright_01","electro_snare_warm_11","electro_tom_high_02","electro_tom_low_02","electro_tom_low_03","electro_kick_sub_12","metronome_tick"]},{"name":"SOUL POCKET","color":"#d4a72c","tracks":["legacy_crash1","legacy_ride1","legacy_hat_open_2","legacy_hat_closed_2","warm_snare_a","warm_tom_a","warm_tom_b","warm_tom_b","warm_kick_a","metronome_tick"]},{"name":"FUNK TIGHT","color":"#32a852","tracks":["legacy_splash1","legacy_cowbell","electro_hat_open_bright_04","electro_hat_closed_bright_04","tight_snare_a","electro_tom_high_03","electro_tom_low_03","electro_tom_low_05","tight_kick_a","metronome_tick"]},{"name":"DMX STREET","color":"#8b5cf6","tracks":["cymbal_electro_02","cowbell_03","electro_hat_open_bright_02","electro_hat_closed_bright_02","electro_snare_snap_10","electro_tom_mid_03","electro_tom_low_04","electro_tom_low_04","electro_kick_deep_10","metronome_tick"]},{"name":"LINN CHROME","color":"#00a7a7","tracks":["crash_electro_01","ride_electro_01","electro_hat_open_bright_05","electro_hat_closed_bright_05","clap_02","electro_tom_high_01","electro_tom_mid_01","electro_tom_low_01","electro_kick_deep_05","metronome_tick"]},{"name":"SP DUST","color":"#9a6b3f","tracks":["legacy_china1","legacy_ride3","electro_hat_closed_distorted_01","electro_hat_closed_metal_01","electro_snare_distorted_01","raw_tom_a","raw_tom_b","deep_tom_a","electro_kick_distorted_01","metronome_tick"]},{"name":"AFRO CIRCUIT","color":"#e48a1d","tracks":["cymbal_electro_03","cowbell_02","maracas_01","claves_01","rimshot_02","bongo_01","bongo_02","bongo_03","electro_kick_sub_07","metronome_tick"]},{"name":"GLITCH LAB","color":"#e83e8c","tracks":["zap_05","game_level_up","electro_hat_closed_distorted_01","glitch_01","electro_snare_distorted_02","punch_03","metal_02","metal_02","electro_kick_distorted_02","metronome_tick"]}].map(kit => Object.freeze({...kit, tracks:Object.freeze(kit.tracks)})))
    });

    const Util = Object.freeze({
        finite(value, fallback = 0) {
            const n = Number(value);
            return Number.isFinite(n) ? n : fallback;
        },
        clamp(value, min, max, fallback = min) {
            return Math.min(max, Math.max(min, this.finite(value, fallback)));
        },
        clone(value) { return JSON.parse(JSON.stringify(value)); },
        escapeHtml(value) {
            return String(value).replace(/[&<>"']/g, char => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[char]));
        }
    });

    class UserPreferences {
        constructor(key = "battrochtek.userPreferences") {
            this.key = key;
            this.defaults = Object.freeze({
                version: 1,
                theme: "system",
                audio: Object.freeze({ masterVolume: 1, metronomeEnabled: false }),
                training: Object.freeze({ mode:"tempo", startTempo:60, targetTempo:90, tempoStep:3, loopsPerLevel:4, countInBars:1 }),
                ui: Object.freeze({}),
                editing: Object.freeze({})
            });
            this.data = this.load();
        }
        load() {
            const fallback = () => ({
                version:1, theme:"system",
                audio:{ masterVolume:1, metronomeEnabled:false },
                training:{ mode:"tempo", startTempo:60, targetTempo:90, tempoStep:3, loopsPerLevel:4, countInBars:1 },
                ui:{}, editing:{}
            });
            try {
                const parsed = JSON.parse(localStorage.getItem(this.key) || "null");
                if (!parsed || typeof parsed !== "object") return fallback();
                const out = fallback();
                out.theme = ["system","light","dark"].includes(parsed.theme) ? parsed.theme : out.theme;
                out.audio.masterVolume = Util.clamp(parsed.audio?.masterVolume, 0, 1, out.audio.masterVolume);
                out.audio.metronomeEnabled = !!parsed.audio?.metronomeEnabled;
                const t = parsed.training || {};
                out.training.mode = ["layers","tempo","combined"].includes(t.mode) ? t.mode : out.training.mode;
                out.training.startTempo = Math.round(Util.clamp(t.startTempo, CONFIG.TEMPO.min, CONFIG.TEMPO.max, out.training.startTempo));
                out.training.targetTempo = Math.round(Util.clamp(t.targetTempo, CONFIG.TEMPO.min, CONFIG.TEMPO.max, out.training.targetTempo));
                if (out.training.targetTempo < out.training.startTempo) [out.training.startTempo, out.training.targetTempo] = [out.training.targetTempo, out.training.startTempo];
                out.training.tempoStep = Math.round(Util.clamp(t.tempoStep, 1, 20, out.training.tempoStep));
                out.training.loopsPerLevel = Math.round(Util.clamp(t.loopsPerLevel, 1, 32, out.training.loopsPerLevel));
                out.training.countInBars = Math.round(Util.clamp(t.countInBars, 0, 2, out.training.countInBars));
                out.editing = parsed.editing && typeof parsed.editing === "object" ? { ...parsed.editing } : {};
                return out;
            } catch (error) {
                console.warn("Préférences utilisateur invalides, valeurs par défaut utilisées.", error);
                return fallback();
            }
        }
        save() {
            try { localStorage.setItem(this.key, JSON.stringify(this.data)); }
            catch (error) { console.warn("Impossible d’enregistrer les préférences utilisateur.", error); }
        }
        setTheme(theme) {
            this.data.theme = ["system","light","dark"].includes(theme) ? theme : "system";
            this.save();
        }
        setAudio(patch = {}) {
            if ("masterVolume" in patch) this.data.audio.masterVolume = Util.clamp(patch.masterVolume, 0, 1, 1);
            if ("metronomeEnabled" in patch) this.data.audio.metronomeEnabled = !!patch.metronomeEnabled;
            this.save();
        }
        setTraining(patch = {}) {
            this.data.training = { ...this.data.training, ...patch };
            this.save();
        }
        setUi(patch = {}) {
            this.data.ui = { ...this.data.ui, ...patch };
            this.save();
        }
    }

    const I18N_RESOURCES = Object.freeze({
        fr: { translation: {
            "toolbar.source":"SOURCE", "toolbar.style":"STYLE", "toolbar.groove":"GROOVE", "toolbar.variant":"VARIANTE", "toolbar.swing":"SWING",
            "feel.title":"FEEL", "feel.subtitle":"FEEL actif : le batteur interprète le groove. AUTO fait évoluer la performance à chaque tour.", "feel.auto":"AUTO", "feel.autoTooltip":"Nouvelle interprétation à chaque tour", "feel.energy":"ÉNERGIE", "feel.stable":"STABLE", "feel.fills":"FILLS", "feel.density":"DENSITÉ", "feel.orchestrationProfile":"ORCHESTRATION", "feel.orchestration":"INSTRUMENTS", "feel.xyAria":"Pad Feel : horizontal fills, vertical énergie", "feel.layersAria":"Couches que FEEL peut agrémenter", "feel.orchAuto":"AUTO · selon le groove", "feel.orchPocket":"Pocket", "feel.orchHihat":"Hi-Hat", "feel.orchRide":"Ride", "feel.orchOpenKit":"Open Kit", "feel.orchPercussive":"Percussif", "feel.orchFullKit":"Full Kit", "feel.hhTooltip":"Agrémenter le charley · OFF = conserver exactement le charley source", "feel.rideTooltip":"Autoriser FEEL à agrémenter le ride · les notes source restent conservées", "feel.crashTooltip":"Autoriser FEEL à agrémenter les crashs · les notes source restent conservées", "feel.tomsTooltip":"Autoriser FEEL à agrémenter les toms · les notes source restent conservées", "feel.orchInfoAuto":"Choisit le rôle de la main de time selon le groove, sans modifier le CORE.", "feel.orchInfoPocket":"Main de time au hi-hat, jeu compact, cymbales et toms très discrets.", "feel.orchInfoHihat":"Conserve la main de time au hi-hat et privilégie ses articulations.", "feel.orchInfoRide":"Déplace la main de time du hi-hat vers le ride en conservant le même rythme.", "feel.orchInfoOpenKit":"Autorise des passages naturels entre hi-hat, ride et crash ; toms surtout en transition.", "feel.orchInfoPercussive":"Garde le time stable et ouvre davantage les déplacements vers les toms.", "feel.orchInfoFullKit":"Tout le kit est disponible, toujours sous les contraintes des deux mains et deux pieds.",
            "search.placeholder":"Rechercher un groove…", "search.aria":"Rechercher dans tous les grooves", "search.results":"Résultats de recherche", "common.off":"Désactivé", "language.tooltip":"Langue", "theme.toggle":"Basculer le thème clair / sombre", "share.tooltip":"Partager ou sauvegarder ce groove", "audio.output":"Niveau de sortie audio", "audio.outputAria":"VU-mètre de sortie", "toolbar.sourceTooltip":"Source des grooves", "toolbar.styleTooltip":"Style musical", "toolbar.grooveTooltip":"Groove", "toolbar.preview":"Préécouter le groove sélectionné", "toolbar.addPatch":"Ajouter le patch à partir de la mémoire sélectionnée", "toolbar.variantTooltip":"Créer une variante musicale du groove courant", "kit.tooltip":"Kit de batterie", "swing.tooltip":"Swing en pourcentage", "transport.playPause":"Lecture / arrêt (Espace)","transport.stop":"Arrêt", "transport.tap":"Tap tempo (T)", "transport.tempoDown":"Diminuer le tempo", "transport.tempoUp":"Augmenter le tempo", "transport.tempo":"Tempo en BPM", "transport.signature":"Signature rythmique", "practice.countIn":"DÉCOMPTE", "memory.chain":"Chaîner les mémoires", "memory.undo":"Annuler", "memory.redo":"Rétablir", "memory.save":"Sauvegarder dans la mémoire sélectionnée (Ctrl+S)", "memory.new":"Nouveau motif vierge", "memory.clear":"Vider les mémoires",
            "practice.title":"Entraînement", "practice.subtitle":"Configure l’entraînement, puis appuie sur Lecture pour démarrer.", "practice.progression":"PROGRESSION", "practice.modeTempo":"Tempo", "practice.modeLayers":"Couches", "practice.modeCombined":"Couches + tempo", "practice.start":"DÉPART", "practice.target":"OBJECTIF", "practice.step":"PALIER", "practice.loops":"TOURS / NIVEAU", "practice.oneBar":"1 mesure", "practice.twoBars":"2 mesures", "practice.startButton":"Démarrer", "practice.stopButton":"Arrêter", "practice.ready":"Prêt à démarrer", "practice.explainer":"Couches : charley → caisse claire → grosse caisse → autres éléments du groove → accents → notes fantômes.",
            "practice.hihat":"Charley", "practice.snare":"Charley + caisse claire", "practice.kick":"Charley + caisse claire + grosse caisse", "practice.accents":"+ accents", "practice.ghosts":"+ notes fantômes", "practice.tempoStatus":"{{tempo}} → {{target}} BPM", "practice.loop":"tour {{current}}/{{total}}", "practice.started":"Entraînement démarré à {{tempo}} BPM.", "practice.stopped":"Entraînement arrêté.", "practice.targetReached":"Objectif atteint : {{tempo}} BPM. On continue.", "practice.layersDone":"Toutes les couches sont en place.", "practice.layersToTempo":"Couches acquises. Progression tempo vers {{target}} BPM.", "practice.level":"Entraînement : {{label}}.", "practice.tempo":"Entraînement : {{tempo}} BPM.", "practice.changedStopped":"Entraînement arrêté : les réglages ont été modifiés.",
            "track.crash":"Crash", "track.ride":"Ride", "track.openHat":"HH ouvert", "track.closedHat":"HH fermé", "track.snare":"Caisse claire", "track.tomHigh":"Tom aigu", "track.tomMid":"Tom médium", "track.tomFloor":"Tom basse", "track.kick":"Grosse caisse",
            "language.label":"Langue", "audio.outputLabel":"SORTIE", "common.close":"Fermer", "share.title":"Partager ce groove", "share.subtitle":"Le QR code ouvre l’application. Le bouton Copier crée un lien contenant toutes les mémoires.", "share.link":"LIEN", "share.copy":"Copier le lien", "share.share":"Partager", "transport.metronome":"Métronome (M)", "transport.practice":"Entraînement", "transport.play":"Lecture", "transport.pause":"Pause", "transport.practice":"Entraînement", "memory.slot":"Mémoire {{n}}", "memory.saved":"sauvegardée", "memory.empty":"vide", "memory.selected":"sélectionnée",
            "shortcut.title":"Raccourcis clavier", "shortcut.transport":"Transport", "shortcut.edit":"Édition", "shortcut.grid":"Grille", "shortcut.playStop":"Lecture / arrêt", "shortcut.space":"Espace", "shortcut.tap":"Tap tempo", "shortcut.metronome":"Métronome", "shortcut.memories":"Mémoire 1 à 8", "shortcut.undo":"Annuler", "shortcut.redo":"Rétablir", "shortcut.copy":"Copier le motif", "shortcut.paste":"Coller le motif", "shortcut.duplicate":"Dupliquer vers mémoire suivante", "shortcut.save":"Sauvegarder la mémoire", "shortcut.cell":"Changer une cellule", "shortcut.repeatBeat":"Répéter la position à chaque temps", "shortcut.deleteCell":"Effacer une cellule", "shortcut.deleteBeat":"Effacer cette position sur tous les temps", "shortcut.moveTrack":"Déplacer une piste sur les 2 axes", "shortcut.moveGrid":"Déplacer toute la grille sur les 2 axes", "shortcut.shiftBeat":"Décaler avec ‹ › d’un temps", "shortcut.click":"Clic", "shortcut.drag":"Glisser", "shortcut.velocity":"Niveaux de vélocité", "shortcut.velocityCycle":"Éteint → normal → fort → accent → doux → fantôme",
            "track.shiftLeft":"Décaler la piste à gauche — Shift : 1 temps", "track.shiftRight":"Décaler la piste à droite — Shift : 1 temps", "track.mute":"Couper la piste {{n}}", "track.solo":"Solo piste {{n}}", "track.pan":"Panoramique piste {{n}}", "track.volume":"Volume piste {{n}}", "track.shifted":"Piste {{n}} décalée de {{amount}}.", "track.custom":"Kit personnalisé : piste {{n}} → {{sample}}.", "rotary.reset":"Double-clic : valeur par défaut",
            "memory.tooltip":"Mémoire {{n}} — {{state}} — raccourci {{n}}", "memory.restored":"Mémoire {{n}} restaurée depuis le groove source.", "memory.selectedStatus":"Mémoire {{n}}.", "memory.savedStatus":"Mémoire {{n}} sauvegardée.",
            "status.loadingKit":"Chargement {{kit}}…", "status.kitReady":"{{kit}} prêt.", "status.kitPartial":"Kit chargé partiellement : certains samples sont indisponibles.", "status.noGroove":"Aucun groove trouvé", "status.patternCopied":"Motif copié — Ctrl+V pour le coller dans une mémoire.", "status.nothingToPaste":"Rien à coller : utilise d’abord Ctrl+C.", "status.patternPasted":"Motif collé en mémoire {{n}}.", "status.patternDuplicated":"Motif dupliqué vers la mémoire {{n}}.", "status.gridShifted":"Grille décalée {{direction}} de {{amount}}.", "status.left":"à gauche", "status.right":"à droite", "status.memoriesReset":"Mémoires réinitialisées. Le cache audio n’a pas été modifié.", "status.patchAdded":"{{count}} motif(s) ajouté(s) à partir de M{{memory}}.", "status.previewing":"Préécoute : {{groove}}", "status.previewStopped":"Préécoute arrêtée.", "status.loadingAudio":"Chargement du kit audio…", "status.undo":"Modification annulée.", "status.redo":"Modification rétablie.", "status.linkCopied":"Lien du groove copié.", "status.copyFailed":"Impossible de copier le lien automatiquement. Sélectionne-le manuellement.", "share.copied":"Lien copié", "share.qrTooLong":"Le lien est trop long pour être affiché en QR code. Le bouton Copier reste disponible.",
            "grid.moveAllStatus":"Alt+Shift+glisser : grille déplacée de {{tracks}} piste(s) et {{steps}} pas (bouclage modulo).", "grid.moveTrackStatus":"Alt+glisser : piste {{from}} → {{to}}, décalage {{steps}} pas (bouclage modulo).", "grid.deleteBeatStatus":"Ctrl/Cmd+Shift+clic : position {{position}}/{{beatSize}} supprimée sur tous les temps de la piste.", "grid.deleteCellStatus":"Ctrl/Cmd+clic : cellule supprimée.", "grid.repeatBeatStatus":"Shift+clic : position {{position}}/{{beatSize}} répétée sur tous les temps de la piste.",
            "theme.toLight":"Passer au thème clair", "theme.toDark":"Passer au thème sombre", "theme.light":"Thème clair", "theme.dark":"Thème sombre", "master.off":"coupé", "master.low":"faible", "master.high":"fort", "master.tooltip":"Volume master : {{level}}", "note.off":"Désactivée", "note.normal":"Normale", "note.soft":"Douce", "note.strong":"Forte", "note.accent":"Accent", "note.ghost":"Fantôme", "note.aria":"Note {{level}}"
        }},
        en: { translation: {
            "toolbar.source":"SOURCE", "toolbar.style":"STYLE", "toolbar.groove":"GROOVE", "toolbar.variant":"VARIATION", "toolbar.swing":"SWING",
            "feel.title":"FEEL", "feel.subtitle":"FEEL active: the drummer interprets the groove. AUTO evolves the performance each loop.", "feel.auto":"AUTO", "feel.autoTooltip":"New interpretation each loop", "feel.energy":"ENERGY", "feel.stable":"STABLE", "feel.fills":"FILLS", "feel.density":"DENSITY", "feel.orchestrationProfile":"ORCHESTRATION", "feel.orchestration":"INSTRUMENTS", "feel.xyAria":"Feel pad: fills horizontally, energy vertically", "feel.layersAria":"Layers FEEL may embellish", "feel.orchAuto":"AUTO · from groove", "feel.orchPocket":"Pocket", "feel.orchHihat":"Hi-Hat", "feel.orchRide":"Ride", "feel.orchOpenKit":"Open Kit", "feel.orchPercussive":"Percussive", "feel.orchFullKit":"Full Kit", "feel.hhTooltip":"Embellish hi-hat · OFF = preserve the source hi-hat exactly", "feel.rideTooltip":"Allow FEEL to embellish ride · source notes stay preserved", "feel.crashTooltip":"Allow FEEL to embellish crashes · source notes stay preserved", "feel.tomsTooltip":"Allow FEEL to embellish toms · source notes stay preserved", "feel.orchInfoAuto":"Chooses the time-hand role from the groove without changing the CORE.", "feel.orchInfoPocket":"Time hand stays on hi-hat; compact playing with very restrained cymbals and toms.", "feel.orchInfoHihat":"Keeps the time hand on hi-hat and focuses on hi-hat articulations.", "feel.orchInfoRide":"Moves the time hand from hi-hat to ride while preserving the same rhythm.", "feel.orchInfoOpenKit":"Allows natural moves between hi-hat, ride and crash; toms mainly for transitions.", "feel.orchInfoPercussive":"Keeps time stable while allowing more movement toward the toms.", "feel.orchInfoFullKit":"The whole kit is available, still constrained by two hands and two feet.",
            "search.placeholder":"Search grooves…", "search.aria":"Search all grooves", "search.results":"Search results", "common.off":"Off", "language.tooltip":"Language", "theme.toggle":"Toggle light / dark theme", "share.tooltip":"Share or save this groove", "audio.output":"Audio output level", "audio.outputAria":"Output VU meter", "toolbar.sourceTooltip":"Groove source", "toolbar.styleTooltip":"Music style", "toolbar.grooveTooltip":"Groove", "toolbar.preview":"Preview selected groove", "toolbar.addPatch":"Add the patch from the selected memory onward", "toolbar.variantTooltip":"Create a musical variation of the current groove", "kit.tooltip":"Drum kit", "swing.tooltip":"Swing percentage", "transport.playPause":"Play / stop (Space)","transport.stop":"Stop", "transport.tap":"Tap tempo (T)", "transport.tempoDown":"Decrease tempo", "transport.tempoUp":"Increase tempo", "transport.tempo":"Tempo in BPM", "transport.signature":"Time signature", "practice.countIn":"COUNT-IN", "memory.chain":"Chain memories", "memory.undo":"Undo", "memory.redo":"Redo", "memory.save":"Save to selected memory (Ctrl+S)", "memory.new":"New empty pattern", "memory.clear":"Clear memories",
            "practice.title":"Practice", "practice.subtitle":"Practice the groove by tempo or by layers.", "practice.progression":"PROGRESSION", "practice.modeTempo":"Tempo", "practice.modeLayers":"Layers", "practice.modeCombined":"Layers + tempo", "practice.start":"START", "practice.target":"TARGET", "practice.step":"STEP", "practice.loops":"LOOPS / LEVEL", "practice.oneBar":"1 bar", "practice.twoBars":"2 bars", "practice.startButton":"Start", "practice.stopButton":"Stop", "practice.ready":"Ready to start", "practice.explainer":"Layers: hi-hat → snare → kick → other groove parts → accents → ghost notes.",
            "practice.hihat":"Hi-hat", "practice.snare":"Hi-hat + snare", "practice.kick":"Hi-hat + snare + kick", "practice.accents":"+ accents", "practice.ghosts":"+ ghost notes", "practice.tempoStatus":"{{tempo}} → {{target}} BPM", "practice.loop":"loop {{current}}/{{total}}", "practice.started":"Practice started at {{tempo}} BPM.", "practice.stopped":"Practice stopped.", "practice.targetReached":"Target reached: {{tempo}} BPM. Keep going.", "practice.layersDone":"All layers are active.", "practice.layersToTempo":"Layers complete. Tempo progression to {{target}} BPM.", "practice.level":"Practice: {{label}}.", "practice.tempo":"Practice: {{tempo}} BPM.", "practice.changedStopped":"Practice stopped because its settings changed.",
            "track.crash":"Crash", "track.ride":"Ride", "track.openHat":"Open HH", "track.closedHat":"Closed HH", "track.snare":"Snare", "track.tomHigh":"High Tom", "track.tomMid":"Mid Tom", "track.tomFloor":"Floor Tom", "track.kick":"Kick",
            "language.label":"Language", "audio.outputLabel":"OUTPUT", "common.close":"Close", "share.title":"Share this groove", "share.subtitle":"The QR code opens the app. Copy Link creates a link containing all memories.", "share.link":"LINK", "share.copy":"Copy link", "share.share":"Share", "transport.metronome":"Metronome (M)", "transport.practice":"Practice", "transport.play":"Play", "transport.pause":"Pause", "transport.practice":"Practice", "memory.slot":"Memory {{n}}", "memory.saved":"saved", "memory.empty":"empty", "memory.selected":"selected",
            "shortcut.title":"Keyboard shortcuts", "shortcut.transport":"Transport", "shortcut.edit":"Editing", "shortcut.grid":"Grid", "shortcut.playStop":"Play / Stop", "shortcut.space":"Space", "shortcut.tap":"Tap tempo", "shortcut.metronome":"Metronome", "shortcut.memories":"Memory 1 to 8", "shortcut.undo":"Undo", "shortcut.redo":"Redo", "shortcut.copy":"Copy pattern", "shortcut.paste":"Paste pattern", "shortcut.duplicate":"Duplicate to next memory", "shortcut.save":"Save memory", "shortcut.cell":"Toggle a cell", "shortcut.repeatBeat":"Repeat this position on every beat", "shortcut.deleteCell":"Delete a cell", "shortcut.deleteBeat":"Delete this position on every beat", "shortcut.moveTrack":"Move one track on both axes", "shortcut.moveGrid":"Move the whole grid on both axes", "shortcut.shiftBeat":"Shift with ‹ › by one beat", "shortcut.click":"Click", "shortcut.drag":"Drag", "shortcut.velocity":"Velocity levels", "shortcut.velocityCycle":"Off → normal → strong → accent → soft → ghost",
            "track.shiftLeft":"Shift track left — Shift: 1 beat", "track.shiftRight":"Shift track right — Shift: 1 beat", "track.mute":"Mute track {{n}}", "track.solo":"Solo track {{n}}", "track.pan":"Pan track {{n}}", "track.volume":"Track {{n}} volume", "track.shifted":"Track {{n}} shifted by {{amount}}.", "track.custom":"Custom kit: track {{n}} → {{sample}}.", "rotary.reset":"Double-click: reset to default",
            "memory.tooltip":"Memory {{n}} — {{state}} — shortcut {{n}}", "memory.restored":"Memory {{n}} restored from source groove.", "memory.selectedStatus":"Memory {{n}}.", "memory.savedStatus":"Memory {{n}} saved.",
            "status.loadingKit":"Loading {{kit}}…", "status.kitReady":"{{kit}} ready.", "status.kitPartial":"Kit partially loaded: missing samples.", "status.noGroove":"No grooves found", "status.patternCopied":"Pattern copied — Ctrl+V to paste into a memory.", "status.nothingToPaste":"Nothing to paste: use Ctrl+C first.", "status.patternPasted":"Pattern pasted into memory {{n}}.", "status.patternDuplicated":"Pattern duplicated to memory {{n}}.", "status.gridShifted":"Grid shifted {{direction}} by {{amount}}.", "status.left":"left", "status.right":"right", "status.memoriesReset":"Memories reset. Audio cache was not changed.", "status.patchAdded":"{{count}} pattern(s) added from M{{memory}} onward.", "status.previewing":"Preview: {{groove}}", "status.previewStopped":"Preview stopped.", "status.loadingAudio":"Loading audio kit…", "status.undo":"Change undone.", "status.redo":"Change redone.", "status.linkCopied":"Groove link copied.", "status.copyFailed":"Could not copy the link automatically. Select it manually.", "share.copied":"Link copied", "share.qrTooLong":"The link is too long to display as a QR code. The Copy button is still available.",
            "grid.moveAllStatus":"Alt+Shift+drag: grid moved by {{tracks}} track(s) and {{steps}} step(s) (modulo wrap).", "grid.moveTrackStatus":"Alt+drag: track {{from}} → {{to}}, shifted by {{steps}} step(s) (modulo wrap).", "grid.deleteBeatStatus":"Ctrl/Cmd+Shift+click: position {{position}}/{{beatSize}} deleted on every beat of the track.", "grid.deleteCellStatus":"Ctrl/Cmd+click: cell deleted.", "grid.repeatBeatStatus":"Shift+click: position {{position}}/{{beatSize}} repeated on every beat of the track.",
            "theme.toLight":"Switch to light theme", "theme.toDark":"Switch to dark theme", "theme.light":"Light theme", "theme.dark":"Dark theme", "master.off":"off", "master.low":"low", "master.high":"high", "master.tooltip":"Master volume: {{level}}", "note.off":"Off", "note.normal":"Normal", "note.soft":"Soft", "note.strong":"Strong", "note.accent":"Accent", "note.ghost":"Ghost", "note.aria":"Note {{level}}"
        }},
        es: { translation: {
            "toolbar.source":"FUENTE", "toolbar.style":"ESTILO", "toolbar.groove":"GROOVE", "toolbar.variant":"VARIACIÓN", "toolbar.swing":"SWING",
            "feel.title":"FEEL", "feel.subtitle":"FEEL activo: el baterista interpreta el groove. AUTO hace evolucionar la interpretación en cada vuelta.", "feel.auto":"AUTO", "feel.autoTooltip":"Nueva interpretación en cada vuelta", "feel.energy":"ENERGÍA", "feel.stable":"ESTABLE", "feel.fills":"FILLS", "feel.density":"DENSIDAD", "feel.orchestrationProfile":"ORQUESTACIÓN", "feel.orchestration":"INSTRUMENTOS", "feel.xyAria":"Pad Feel: fills en horizontal, energía en vertical", "feel.layersAria":"Capas que FEEL puede ornamentar", "feel.orchAuto":"AUTO · según el groove", "feel.orchPocket":"Pocket", "feel.orchHihat":"Hi-Hat", "feel.orchRide":"Ride", "feel.orchOpenKit":"Kit abierto", "feel.orchPercussive":"Percusivo", "feel.orchFullKit":"Kit completo", "feel.hhTooltip":"Ornamentar el charles · OFF = conservar exactamente el charles fuente", "feel.rideTooltip":"Permitir que FEEL ornamente el ride · las notas fuente se conservan", "feel.crashTooltip":"Permitir que FEEL ornamente los crashes · las notas fuente se conservan", "feel.tomsTooltip":"Permitir que FEEL ornamente los toms · las notas fuente se conservan", "feel.orchInfoAuto":"Elige el papel de la mano de tiempo según el groove sin modificar el CORE.", "feel.orchInfoPocket":"La mano de tiempo queda en el charles; juego compacto con platos y toms muy discretos.", "feel.orchInfoHihat":"Mantiene la mano de tiempo en el charles y prioriza sus articulaciones.", "feel.orchInfoRide":"Mueve la mano de tiempo del charles al ride conservando el mismo ritmo.", "feel.orchInfoOpenKit":"Permite cambios naturales entre charles, ride y crash; toms sobre todo en transiciones.", "feel.orchInfoPercussive":"Mantiene el tiempo estable y permite más desplazamientos hacia los toms.", "feel.orchInfoFullKit":"Todo el kit está disponible, siempre limitado por dos manos y dos pies.",
            "search.placeholder":"Buscar grooves…", "search.aria":"Buscar en todos los grooves", "search.results":"Resultados de búsqueda", "common.off":"Off", "language.tooltip":"Idioma", "theme.toggle":"Cambiar tema claro / oscuro", "share.tooltip":"Compartir o guardar este groove", "audio.output":"Nivel de salida de audio", "audio.outputAria":"VU-metro de salida", "toolbar.sourceTooltip":"Fuente de grooves", "toolbar.styleTooltip":"Estilo musical", "toolbar.grooveTooltip":"Groove", "toolbar.preview":"Preescuchar el groove seleccionado", "toolbar.addPatch":"Añadir el patch desde la memoria seleccionada", "toolbar.variantTooltip":"Crear una variación musical del groove actual", "kit.tooltip":"Kit de batería", "swing.tooltip":"Swing en porcentaje", "transport.playPause":"Reproducir / stop (Espacio)","transport.stop":"Stop", "transport.tap":"Tap tempo (T)", "transport.tempoDown":"Disminuir tempo", "transport.tempoUp":"Aumentar tempo", "transport.tempo":"Tempo en BPM", "transport.signature":"Compás", "practice.countIn":"COUNT-IN", "memory.chain":"Encadenar memorias", "memory.undo":"Deshacer", "memory.redo":"Rehacer", "memory.save":"Guardar en la memoria seleccionada (Ctrl+S)", "memory.new":"Nuevo patrón vacío", "memory.clear":"Vaciar memorias",
            "practice.title":"Práctica", "practice.subtitle":"Practica el groove por tempo o por capas.", "practice.progression":"PROGRESIÓN", "practice.modeTempo":"Tempo", "practice.modeLayers":"Capas", "practice.modeCombined":"Capas + tempo", "practice.start":"INICIO", "practice.target":"OBJETIVO", "practice.step":"PASO", "practice.loops":"VUELTAS / NIVEL", "practice.oneBar":"1 compás", "practice.twoBars":"2 compases", "practice.startButton":"Empezar", "practice.stopButton":"Parar", "practice.ready":"Listo para empezar", "practice.explainer":"Capas: charles → caja → bombo → otras partes del groove → acentos → ghost notes.",
            "practice.hihat":"Charles", "practice.snare":"Charles + caja", "practice.kick":"Charles + caja + bombo", "practice.accents":"+ acentos", "practice.ghosts":"+ ghost notes", "practice.tempoStatus":"{{tempo}} → {{target}} BPM", "practice.loop":"vuelta {{current}}/{{total}}", "practice.started":"Práctica iniciada a {{tempo}} BPM.", "practice.stopped":"Práctica detenida.", "practice.targetReached":"Objetivo alcanzado: {{tempo}} BPM. Continúa.", "practice.layersDone":"Todas las capas están activas.", "practice.layersToTempo":"Capas completadas. Progresión de tempo hasta {{target}} BPM.", "practice.level":"Práctica: {{label}}.", "practice.tempo":"Práctica: {{tempo}} BPM.", "practice.changedStopped":"Práctica detenida porque cambiaron sus ajustes.",
            "track.crash":"Crash", "track.ride":"Ride", "track.openHat":"Charles abierto", "track.closedHat":"Charles cerrado", "track.snare":"Caja", "track.tomHigh":"Tom agudo", "track.tomMid":"Tom medio", "track.tomFloor":"Tom base", "track.kick":"Bombo",
            "language.label":"Idioma", "audio.outputLabel":"SALIDA", "common.close":"Cerrar", "share.title":"Compartir este groove", "share.subtitle":"El código QR abre la aplicación. Copiar enlace crea un enlace con todas las memorias.", "share.link":"ENLACE", "share.copy":"Copiar enlace", "share.share":"Compartir", "transport.metronome":"Metrónomo (M)", "transport.practice":"Práctica", "transport.play":"Reproducir", "transport.pause":"Pausa", "transport.practice":"Práctica", "memory.slot":"Memoria {{n}}", "memory.saved":"guardada", "memory.empty":"vacía", "memory.selected":"seleccionada",
            "shortcut.title":"Atajos de teclado", "shortcut.transport":"Transporte", "shortcut.edit":"Edición", "shortcut.grid":"Cuadrícula", "shortcut.playStop":"Reproducir / Stop", "shortcut.space":"Espacio", "shortcut.tap":"Tap tempo", "shortcut.metronome":"Metrónomo", "shortcut.memories":"Memoria 1 a 8", "shortcut.undo":"Deshacer", "shortcut.redo":"Rehacer", "shortcut.copy":"Copiar patrón", "shortcut.paste":"Pegar patrón", "shortcut.duplicate":"Duplicar a la memoria siguiente", "shortcut.save":"Guardar memoria", "shortcut.cell":"Cambiar una celda", "shortcut.repeatBeat":"Repetir la posición en cada pulso", "shortcut.deleteCell":"Borrar una celda", "shortcut.deleteBeat":"Borrar esta posición en todos los pulsos", "shortcut.moveTrack":"Mover una pista en los 2 ejes", "shortcut.moveGrid":"Mover toda la cuadrícula en los 2 ejes", "shortcut.shiftBeat":"Desplazar con ‹ › un pulso", "shortcut.click":"Clic", "shortcut.drag":"Arrastrar", "shortcut.velocity":"Niveles de velocidad", "shortcut.velocityCycle":"Apagado → normal → fuerte → acento → suave → fantasma",
            "track.shiftLeft":"Desplazar la pista a la izquierda — Shift: 1 pulso", "track.shiftRight":"Desplazar la pista a la derecha — Shift: 1 pulso", "track.mute":"Silenciar pista {{n}}", "track.solo":"Solo pista {{n}}", "track.pan":"Pan pista {{n}}", "track.volume":"Volumen pista {{n}}", "track.shifted":"Pista {{n}} desplazada {{amount}}.", "track.custom":"Kit Custom: pista {{n}} → {{sample}}.", "rotary.reset":"Doble clic: valor predeterminado",
            "memory.tooltip":"Memoria {{n}} — {{state}} — atajo {{n}}", "memory.restored":"Memoria {{n}} restaurada desde el groove fuente.", "memory.selectedStatus":"Memoria {{n}}.", "memory.savedStatus":"Memoria {{n}} guardada.",
            "status.loadingKit":"Cargando {{kit}}…", "status.kitReady":"{{kit}} listo.", "status.kitPartial":"Kit cargado parcialmente: faltan samples.", "status.noGroove":"No se encontraron grooves", "status.patternCopied":"Patrón copiado — Ctrl+V para pegarlo en una memoria.", "status.nothingToPaste":"Nada que pegar: usa primero Ctrl+C.", "status.patternPasted":"Patrón pegado en la memoria {{n}}.", "status.patternDuplicated":"Patrón duplicado en la memoria {{n}}.", "status.gridShifted":"Cuadrícula desplazada {{direction}} {{amount}}.", "status.left":"a la izquierda", "status.right":"a la derecha", "status.memoriesReset":"Memorias reiniciadas. La caché de audio no se ha modificado.", "status.patchAdded":"{{count}} patrón(es) añadido(s) desde M{{memory}}.", "status.previewing":"Preescucha: {{groove}}", "status.previewStopped":"Preescucha detenida.", "status.loadingAudio":"Cargando kit de audio…", "status.undo":"Modificación deshecha.", "status.redo":"Modificación rehecha.", "status.linkCopied":"Enlace del groove copiado.", "status.copyFailed":"No se pudo copiar el enlace automáticamente. Selecciónalo manualmente.", "share.copied":"Enlace copiado", "share.qrTooLong":"El enlace es demasiado largo para mostrarse como código QR. El botón Copiar sigue disponible.",
            "grid.moveAllStatus":"Alt+Shift+arrastrar: cuadrícula movida {{tracks}} pista(s) y {{steps}} paso(s) (bucle módulo).", "grid.moveTrackStatus":"Alt+arrastrar: pista {{from}} → {{to}}, desplazamiento {{steps}} paso(s) (bucle módulo).", "grid.deleteBeatStatus":"Ctrl/Cmd+Shift+clic: posición {{position}}/{{beatSize}} borrada en todos los pulsos de la pista.", "grid.deleteCellStatus":"Ctrl/Cmd+clic: celda borrada.", "grid.repeatBeatStatus":"Shift+clic: posición {{position}}/{{beatSize}} repetida en todos los pulsos de la pista.",
            "theme.toLight":"Cambiar al tema claro", "theme.toDark":"Cambiar al tema oscuro", "theme.light":"Tema claro", "theme.dark":"Tema oscuro", "master.off":"apagado", "master.low":"bajo", "master.high":"alto", "master.tooltip":"Volumen master: {{level}}", "note.off":"Desactivada", "note.normal":"Normal", "note.soft":"Suave", "note.strong":"Fuerte", "note.accent":"Acento", "note.ghost":"Ghost", "note.aria":"Nota {{level}}"
        }}
    });
    const I18N = {
        language: "fr",
        init() {
            const saved = localStorage.getItem("battrochtek-language");
            const browser = String(navigator.language || "fr").slice(0, 2).toLowerCase();
            this.language = ["fr", "en", "es"].includes(saved) ? saved : (["fr", "en", "es"].includes(browser) ? browser : "fr");
            if (window.i18next?.init) {
                window.i18next.init({ lng:this.language, fallbackLng:"fr", resources:I18N_RESOURCES, initImmediate:false, interpolation:{ escapeValue:false } });
            }
            document.documentElement.lang = this.language;
        },
        t(key, params = {}) {
            const rawFallback = I18N_RESOURCES[this.language]?.translation?.[key] ?? I18N_RESOURCES.fr.translation[key] ?? key;
            let fallback = String(rawFallback);
            Object.entries(params).forEach(([name, replacement]) => { fallback = fallback.replaceAll(`{{${name}}}`, String(replacement)); });
            if (window.i18next?.t) {
                const translated = window.i18next.t(key, { ...params, lng:this.language, defaultValue:fallback });
                if (typeof translated === "string" && translated.length) return translated;
            }
            return fallback;
        },
        setLanguage(language) {
            if (!["fr", "en", "es"].includes(language)) return;
            this.language = language;
            localStorage.setItem("battrochtek-language", language);
            window.i18next?.changeLanguage?.(language);
            document.documentElement.lang = language;
            this.apply(document);
            window.dispatchEvent(new CustomEvent("battrochtek-language", { detail:language }));
        },
        apply(root = document) {
            root.querySelectorAll("[data-i18n]").forEach(node => { node.textContent = this.t(node.dataset.i18n); });
            root.querySelectorAll("[data-i18n-placeholder]").forEach(node => { node.placeholder = this.t(node.dataset.i18nPlaceholder); });
            root.querySelectorAll("[data-i18n-aria]").forEach(node => { node.setAttribute("aria-label", this.t(node.dataset.i18nAria)); });
            root.querySelectorAll("[data-i18n-tooltip]").forEach(node => { node.dataset.btTooltip = this.t(node.dataset.i18nTooltip); });
        }
    };

    function createFactoryPresets() {
        const external = Array.isArray(window.BATTROCHTEK_EXTERNAL_GROOVES) ? window.BATTROCHTEK_EXTERNAL_GROOVES : [];
        const banks=[]; banks.meta=[];
        const grouped=new Map();
        for (const groove of external) {
            const source=groove?.source || "external";
            const family=groove?.family || "MIDI";
            const key=`${source}::${family}`;
            if (!grouped.has(key)) grouped.set(key,{source,sourceLabel:groove?.sourceLabel || source,name:family,grooves:[]});
            grouped.get(key).grooves.push(groove);
        }
        for (const group of grouped.values()) {
            const bank=Array.from({length:CONFIG.SIGNATURES.length},()=>[]), metaGrooves=[];
            group.grooves.forEach((groove,index)=>{
                const parts=String(groove.signature||"4/4").split("/").map(Number);
                const signatureIndex=signatureIndexOf(parts[0],parts[1]);
                const memories=Array.isArray(groove.memories) ? groove.memories.filter(Boolean).slice(0,CONFIG.MEMORY_SLOTS) : [];
                const preview=memories[0]?.pattern || groove.pattern;
                if (signatureIndex<0 || !Array.isArray(preview)) return;
                bank[signatureIndex][index]=Util.clone(preview);
                metaGrooves[index]={
                    name:groove.name || `Groove ${index+1}`, signatureIndex,
                    signature:CONFIG.SIGNATURES[signatureIndex].label, bpm:Number(groove.bpm)||120,
                    source:group.source, sourceLabel:group.sourceLabel,
                    canonicalId:groove.canonicalId||"", tradition:groove.tradition||groove.substyle||"",
                    validationState:groove.validationState||"", confidence:Number(groove.confidence)||0,
                    provenance:groove.provenance||null, mergedFrom:Array.isArray(groove.mergedFrom)?groove.mergedFrom:[],
                    attribution:groove.attribution||groove.provenance?.attribution||"", origin:groove.origin||groove.provenance?.origin||"",
                    style:groove.style||group.name, substyle:groove.substyle||groove.tradition||"", feel:groove.feel||"",
                    difficulty:groove.difficulty||"", sourceType:groove.sourceType||"",
                    artist:groove.artist||"", song:groove.song||"", drummer:groove.drummer||"",
                    tags:Array.isArray(groove.tags)?groove.tags:[],
                    memories:memories.map(memory=>({
                        signatureIndex:signatureIndexOf(...String(memory.signature||groove.signature||"4/4").split("/").map(Number)),
                        pattern:Util.clone(memory.pattern)
                    })).filter(memory=>memory.signatureIndex>=0)
                };
            });
            const compact=metaGrooves.filter(Boolean);
            if (!compact.length) continue;
            const compactBank=Array.from({length:CONFIG.SIGNATURES.length},()=>[]);
            compact.forEach((meta,index)=>{
                const original=metaGrooves.indexOf(meta);
                compactBank[meta.signatureIndex][index]=bank[meta.signatureIndex][original];
            });
            banks.push(compactBank);
            banks.meta.push({source:group.source,sourceLabel:group.sourceLabel,name:group.name,grooves:compact});
        }
        return banks;
    }

    class PatternStore {
        constructor(storageManager, presets) {
            this.storage = storageManager;
            this.presets = presets;
            this.slots = this.normalizeSlots(this.storage.load(this.createDefaults(presets)));
        }
        createDefaults(presets) {
            const slots=Array(CONFIG.MEMORY_SLOTS);
            const preferred=(presets.meta||[]).findIndex(family=>family.source==="basic");
            const familyIndex=preferred>=0 ? preferred : 0;
            const meta=presets.meta?.[familyIndex]?.grooves?.[0];
            const pattern=meta ? presets[familyIndex]?.[meta.signatureIndex]?.[0] : null;
            if (meta && pattern) {
                const normalized=this.normalizePattern(pattern,meta.signatureIndex);
                if (normalized) slots[0]={signatureIndex:meta.signatureIndex,tempo:normalized[3],grid:this.gridFromPattern(normalized,meta.signatureIndex)};
            }
            return slots;
        }
        normalizePattern(pattern, signatureIndex = 0) {
            if (!Array.isArray(pattern)) return null;
            const steps = CONFIG.SIGNATURES[signatureIndex].steps;
            const rawVolumes = Array.isArray(pattern[2]) ? pattern[2] : [];
            const sourceTrackCount = rawVolumes.length >= CONFIG.LEGACY_TRACK_COUNT ? CONFIG.LEGACY_TRACK_COUNT
                : rawVolumes.length === 8 ? 8 : CONFIG.TRACK_COUNT;
            const legacyMaps = {
                8: [0,1,2,3,4,5,6,8],
                10: [0,1,2,3,4,4,5,6,8,8]
            };
            const remapCells = source => {
                const input = Array.isArray(source) ? source.map(Number).filter(Number.isInteger) : [];
                const trackMap = legacyMaps[sourceTrackCount];
                if (!trackMap) return input.filter(n => n >= 0 && n < steps * CONFIG.TRACK_COUNT);
                return Array.from(new Set(input.map(index => {
                    const oldTrack = Math.floor(index / steps);
                    const step = index % steps;
                    const newTrack = trackMap[oldTrack];
                    return Number.isInteger(newTrack) ? newTrack * steps + step : null;
                }).filter(Number.isInteger))).sort((a,b)=>a-b);
            };
            const cells = remapCells(pattern[0]);
            const kit = Math.round(Util.clamp(pattern[1], 0, CONFIG.KITS.length - 1, 0));
            const migratedVolumes = sourceTrackCount === 10 ? [
                rawVolumes[0], rawVolumes[1], rawVolumes[2], rawVolumes[3],
                Math.max(rawVolumes[4] ?? 1, rawVolumes[5] ?? 1), rawVolumes[6], rawVolumes[7],
                1, Math.max(rawVolumes[8] ?? 1, rawVolumes[9] ?? 1)
            ] : sourceTrackCount === 8 ? [
                rawVolumes[0], rawVolumes[1], rawVolumes[2], rawVolumes[3],
                rawVolumes[4], rawVolumes[5], rawVolumes[6], 1, rawVolumes[7]
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
            const rawPans = Array.isArray(pattern[11]) ? pattern[11] : [];
            const pans = Array.from({ length: CONFIG.TRACK_COUNT }, (_, i) => Util.clamp(rawPans[i], -1, 1, 0));
            return [cells, kit, volumes, tempo, master, swing, accents, weak, strong, ghost, customTracks, pans];
        }
        gridFromPattern(pattern, signatureIndex = 0) {
            const p = this.normalizePattern(pattern, signatureIndex);
            if (!p) return null;
            return [p[0], p[6], p[7], p[8], p[9]];
        }
        normalizeGrid(grid, signatureIndex = 0) {
            if (!Array.isArray(grid)) return null;
            // v4 : [cells, accents, soft, strong, ghost]. Reuse the strict pattern normalizer.
            const p = this.normalizePattern([grid[0], 0, [], CONFIG.TEMPO.default, 1, 0, grid[1], grid[2], grid[3], grid[4], null, []], signatureIndex);
            return p ? [p[0], p[6], p[7], p[8], p[9]] : null;
        }
        normalizeSlots(raw) {
            const out = Array(CONFIG.MEMORY_SLOTS);
            if (!Array.isArray(raw)) return out;
            // v18 et antérieures : banques séparées par signature.
            const looksLikeLegacyBanks = raw.length === CONFIG.SIGNATURES.length && raw.some(item => Array.isArray(item));
            if (looksLikeLegacyBanks) {
                for (let signatureIndex = 0; signatureIndex < raw.length; signatureIndex++) {
                    const bank = Array.isArray(raw[signatureIndex]) ? raw[signatureIndex] : [];
                    for (let slot = 0; slot < CONFIG.MEMORY_SLOTS; slot++) {
                        if (out[slot] || !bank[slot]) continue;
                        const grid = this.gridFromPattern(bank[slot], signatureIndex);
                        if (grid) out[slot] = { signatureIndex, tempo:Math.round(Util.clamp(bank[slot]?.[3], CONFIG.TEMPO.min, CONFIG.TEMPO.max, CONFIG.TEMPO.default)), grid };
                    }
                }
                return out;
            }
            for (let slot = 0; slot < CONFIG.MEMORY_SLOTS; slot++) {
                const entry = raw[slot];
                if (!entry || typeof entry !== "object") continue;
                const signatureIndex = Math.round(Util.clamp(entry.signatureIndex, 0, CONFIG.SIGNATURES.length - 1, 0));
                const grid = Array.isArray(entry.grid)
                    ? this.normalizeGrid(entry.grid, signatureIndex)
                    : this.gridFromPattern(entry.pattern, signatureIndex);
                const patternTempo = Array.isArray(entry.pattern) ? entry.pattern[3] : undefined;
                const tempo = Math.round(Util.clamp(entry.tempo ?? patternTempo, CONFIG.TEMPO.min, CONFIG.TEMPO.max, CONFIG.TEMPO.default));
                if (grid) out[slot] = { signatureIndex, tempo, grid };
            }
            return out;
        }
        get(slot) { return this.slots[slot] || null; }
        set(slot, signatureIndex, patternOrGrid, tempo = null) {
            const normalizedSignature = Math.round(Util.clamp(signatureIndex, 0, CONFIG.SIGNATURES.length - 1, 0));
            const isGrid = Array.isArray(patternOrGrid) && patternOrGrid.length === 5;
            const normalizedPattern = isGrid ? null : this.normalizePattern(patternOrGrid, normalizedSignature);
            const grid = isGrid
                ? this.normalizeGrid(patternOrGrid, normalizedSignature)
                : (normalizedPattern ? this.gridFromPattern(normalizedPattern, normalizedSignature) : null);
            if (!grid) return;
            const previousTempo = this.slots[slot]?.tempo;
            const sourceTempo = tempo ?? normalizedPattern?.[3] ?? previousTempo ?? CONFIG.TEMPO.default;
            const normalizedTempo = Math.round(Util.clamp(sourceTempo, CONFIG.TEMPO.min, CONFIG.TEMPO.max, CONFIG.TEMPO.default));
            this.slots[slot] = { signatureIndex:normalizedSignature, tempo:normalizedTempo, grid };
            this.storage.save(this.slots);
        }
        populated() { return this.slots.map((entry, i) => entry ? i : -1).filter(i => i >= 0); }
        replaceMemories(entries = []) {
            this.slots = Array(CONFIG.MEMORY_SLOTS);
            entries.slice(0, CONFIG.MEMORY_SLOTS).forEach((entry, slot) => {
                if (!entry || !Number.isInteger(entry.signatureIndex)) return;
                const grid = Array.isArray(entry.grid)
                    ? this.normalizeGrid(entry.grid, entry.signatureIndex)
                    : this.gridFromPattern(entry.pattern, entry.signatureIndex);
                const tempo = Math.round(Util.clamp(entry.tempo ?? entry.pattern?.[3], CONFIG.TEMPO.min, CONFIG.TEMPO.max, CONFIG.TEMPO.default));
                if (grid) this.slots[slot] = { signatureIndex:entry.signatureIndex, tempo, grid };
            });
            this.storage.save(this.slots);
        }
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
        async play({ kitIndex, trackIndex, sampleKey = null, time, trackVolume = 1, masterVolume = 1, pan = 0, velocity = "normal", gainScale = 1 }) {
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
            const gain = Util.clamp(Util.finite(trackVolume, 1) * Util.finite(masterVolume, 1) * level * Util.clamp(gainScale, .65, 1.2, 1), 0, 1.5, 0);
            const startTime = Math.max(ctx.currentTime, Util.finite(time, ctx.currentTime));
            gainNode.gain.setValueAtTime(gain, startTime);
            const output = this.analyser || ctx.destination;
            if (typeof ctx.createStereoPanner === "function") {
                const panNode = ctx.createStereoPanner();
                panNode.pan.setValueAtTime(Util.clamp(pan, -1, 1, 0), startTime);
                source.connect(gainNode).connect(panNode).connect(output);
            } else {
                source.connect(gainNode).connect(output);
            }
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
            this.trackPans = Array(CONFIG.TRACK_COUNT).fill(0);
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
        }
        get signature() { return CONFIG.SIGNATURES[this.signatureIndex]; }
        snapshot() {
            return [Array.from(this.activeCells).sort((a,b)=>a-b), this.kitIndex, this.trackVolumes.slice(), this.tempo, this.masterVolume, this.swing, Array.from(this.accentCells).sort((a,b)=>a-b), Array.from(this.weakCells).sort((a,b)=>a-b), Array.from(this.strongCells).sort((a,b)=>a-b), Array.from(this.ghostCells).sort((a,b)=>a-b), this.customTracks ? this.customTracks.slice() : null, this.trackPans.slice()];
        }
        gridSnapshot() {
            return [Array.from(this.activeCells).sort((a,b)=>a-b), Array.from(this.accentCells).sort((a,b)=>a-b), Array.from(this.weakCells).sort((a,b)=>a-b), Array.from(this.strongCells).sort((a,b)=>a-b), Array.from(this.ghostCells).sort((a,b)=>a-b)];
        }
        applyGrid(grid) {
            const normalized = this.store.normalizeGrid(grid, this.signatureIndex);
            if (!normalized) return false;
            this.activeCells = new Set(normalized[0]);
            this.accentCells = new Set(normalized[1]);
            this.weakCells = new Set(normalized[2]);
            this.strongCells = new Set(normalized[3]);
            this.ghostCells = new Set(normalized[4]);
            return true;
        }
        apply(pattern) {
            const p = this.store.normalizePattern(pattern, this.signatureIndex);
            if (!p) return false;
            this.activeCells = new Set(p[0]);
            this.kitIndex = p[1];
            this.customTracks = p[10] ? p[10].slice() : null;
            this.trackVolumes = p[2];
            this.trackPans = p[11] ? p[11].slice() : Array(CONFIG.TRACK_COUNT).fill(0);
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
                this.tempo = Math.round(Util.clamp(entry.tempo, CONFIG.TEMPO.min, CONFIG.TEMPO.max, CONFIG.TEMPO.default));
                this.applyGrid(entry.grid);
            } else {
                this.activeCells.clear(); this.accentCells.clear(); this.weakCells.clear(); this.strongCells.clear(); this.ghostCells.clear();
            }
        }
        saveSlot() { this.store.set(this.memorySlot, this.signatureIndex, this.gridSnapshot(), this.tempo); }
        cycleCell(index) {
            const clearVelocity = () => { this.accentCells.delete(index); this.weakCells.delete(index); this.strongCells.delete(index); this.ghostCells.delete(index); };
            if (!this.activeCells.has(index)) { this.activeCells.add(index); clearVelocity(); return "normal"; }
            if (![this.accentCells,this.weakCells,this.strongCells,this.ghostCells].some(s=>s.has(index))) { this.strongCells.add(index); return "strong"; }
            if (this.strongCells.has(index)) { this.strongCells.delete(index); this.accentCells.add(index); return "accent"; }
            if (this.accentCells.has(index)) { this.accentCells.delete(index); this.weakCells.add(index); return "soft"; }
            if (this.weakCells.has(index)) { this.weakCells.delete(index); this.ghostCells.add(index); return "ghost"; }
            this.activeCells.delete(index); clearVelocity(); return "off";
        }
        clearCell(index) {
            this.activeCells.delete(index);
            this.accentCells.delete(index);
            this.weakCells.delete(index);
            this.strongCells.delete(index);
            this.ghostCells.delete(index);
        }
        shiftTrack(track, deltaSteps) {
            const steps = this.signature.steps;
            const sourceTrack = ((Math.round(track) % CONFIG.TRACK_COUNT) + CONFIG.TRACK_COUNT) % CONFIG.TRACK_COUNT;
            const delta = Math.round(deltaSteps);
            if (!delta || !steps) return;
            const active = [], velocity = new Map();
            for (let step = 0; step < steps; step++) {
                const index = sourceTrack * steps + step;
                if (!this.activeCells.has(index)) continue;
                active.push(step);
                if (this.accentCells.has(index)) velocity.set(step, "accent");
                else if (this.strongCells.has(index)) velocity.set(step, "strong");
                else if (this.weakCells.has(index)) velocity.set(step, "soft");
                else if (this.ghostCells.has(index)) velocity.set(step, "ghost");
            }
            for (let step = 0; step < steps; step++) this.clearCell(sourceTrack * steps + step);
            for (const step of active) {
                const targetStep = ((step + delta) % steps + steps) % steps;
                const index = sourceTrack * steps + targetStep;
                this.activeCells.add(index);
                const kind = velocity.get(step);
                if (kind === "accent") this.accentCells.add(index);
                else if (kind === "strong") this.strongCells.add(index);
                else if (kind === "soft") this.weakCells.add(index);
                else if (kind === "ghost") this.ghostCells.add(index);
            }
        }
        shiftAllTracks(deltaSteps) {
            for (let track = 0; track < CONFIG.TRACK_COUNT; track++) this.shiftTrack(track, deltaSteps);
        }
        translateGrid(deltaTracks, deltaSteps) {
            const steps = this.signature.steps;
            const dt = Math.round(deltaTracks);
            const ds = Math.round(deltaSteps);
            if ((!dt && !ds) || !steps) return;
            const remap = set => new Set(Array.from(set, index => {
                const track = Math.floor(index / steps);
                const step = index % steps;
                const targetTrack = ((track + dt) % CONFIG.TRACK_COUNT + CONFIG.TRACK_COUNT) % CONFIG.TRACK_COUNT;
                const targetStep = ((step + ds) % steps + steps) % steps;
                return targetTrack * steps + targetStep;
            }));
            this.activeCells = remap(this.activeCells);
            this.accentCells = remap(this.accentCells);
            this.weakCells = remap(this.weakCells);
            this.strongCells = remap(this.strongCells);
            this.ghostCells = remap(this.ghostCells);
        }
        translateTrack(sourceTrack, targetTrack, deltaSteps) {
            const steps = this.signature.steps;
            const source = ((Math.round(sourceTrack) % CONFIG.TRACK_COUNT) + CONFIG.TRACK_COUNT) % CONFIG.TRACK_COUNT;
            const target = ((Math.round(targetTrack) % CONFIG.TRACK_COUNT) + CONFIG.TRACK_COUNT) % CONFIG.TRACK_COUNT;
            if (source === target) { this.shiftTrack(source, deltaSteps); return; }
            const notes = [];
            for (let step = 0; step < steps; step++) {
                const index = source * steps + step;
                if (!this.activeCells.has(index)) continue;
                let velocity = "normal";
                if (this.accentCells.has(index)) velocity = "accent";
                else if (this.strongCells.has(index)) velocity = "strong";
                else if (this.weakCells.has(index)) velocity = "soft";
                else if (this.ghostCells.has(index)) velocity = "ghost";
                notes.push([step, velocity]);
            }
            for (let step = 0; step < steps; step++) this.clearCell(source * steps + step);
            for (const [step, velocity] of notes) {
                const targetStep = ((step + Math.round(deltaSteps)) % steps + steps) % steps;
                const index = target * steps + targetStep;
                this.clearCell(index);
                this.activeCells.add(index);
                if (velocity === "accent") this.accentCells.add(index);
                else if (velocity === "strong") this.strongCells.add(index);
                else if (velocity === "soft") this.weakCells.add(index);
                else if (velocity === "ghost") this.ghostCells.add(index);
            }
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
                    if (track === R.tomHigh || track === R.tomMid) probability = step % (group * 2) === group ? 0.14 : 0.03;
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
                    if(bar===1 && Math.random()<.38){addNote(R.tomHigh,base+Math.max(0,barSteps-3),"normal");addNote(R.tomMid,pre,"strong");addNote(R.snare,last,"accent");}
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
                    if(style==="funk" && Math.random()<.26){addNote(R.tomHigh,base+Math.max(0,barSteps-3),"soft");addNote(R.tomMid,pre,"strong");}
                }
            }
            this.activeCells=active; this.weakCells=soft; this.strongCells=strong; this.ghostCells=ghost; this.accentCells=accent;
        }
    }


    class FeelController {
        constructor(sequencer) {
            this.seq = sequencer;
            this.coreGrid = null;
            this.coreSignatureIndex = null;
            this.coreSlot = null;
            this.cores = new Map();
            this.previousPerformances = new Map();
            this.performanceCycles = new Map();
            this.pendingResolutions = new Map();
            this.density = 20;
            this.energy = 50;
            this.fills = 50;
            this.seed = 1;
            // Stable player identity: AUTO changes phrases, not the drummer's underlying pocket.
            this.playerSeed = 0x5d31;
            this.layers = { hihat:true, ride:false, crash:true, toms:false };
            this.familyName = "";
            this.orchestrationMode = "auto";
            this.enabled = false;
            this.auto = true;
        }
        cloneGrid(grid) { return grid?.map(part => Array.isArray(part) ? part.slice() : part) || null; }
        captureCore({ inferLayers = true } = {}) {
            this.coreGrid = this.seq.gridSnapshot().map(part => Array.isArray(part) ? part.slice() : part);
            this.coreSignatureIndex = this.seq.signatureIndex;
            this.coreSlot = this.seq.memorySlot;
            this.cores.set(this.coreSlot, { signatureIndex:this.coreSignatureIndex, grid:this.cloneGrid(this.coreGrid) });
            this.previousPerformances.delete(this.coreSlot);
            this.performanceCycles.set(this.coreSlot, 0);
            this.pendingResolutions.set(this.coreSlot, false);
            if (inferLayers) {
                const active=new Set(this.coreGrid[0]||[]), steps=this.seq.signature.steps, R=TRACK_ROLES;
                const hasTrack=t=>Array.from(active).some(i=>Math.floor(i/steps)===t);
                this.layers.hihat=hasTrack(R.closedHat)||hasTrack(R.openHat);
                this.layers.ride=hasTrack(R.ride);
                this.layers.crash=hasTrack(R.crash);
                this.layers.toms=hasTrack(R.tomHigh)||hasTrack(R.tomMid)||hasTrack(R.tomFloor);
                if (!this.layers.hihat && !this.layers.ride) this.layers.hihat=true;
            }
            return this.coreGrid;
        }
        invalidate(slot = this.seq.memorySlot) {
            this.cores.delete(slot);
            this.previousPerformances.delete(slot);
            this.performanceCycles.delete(slot);
            this.pendingResolutions.delete(slot);
            if (this.coreSlot === slot) { this.coreGrid=null; this.coreSignatureIndex=null; this.coreSlot=null; }
        }
        ensureCore() {
            const saved=this.cores.get(this.seq.memorySlot);
            if (saved && saved.signatureIndex===this.seq.signatureIndex) {
                this.coreGrid=this.cloneGrid(saved.grid); this.coreSignatureIndex=saved.signatureIndex; this.coreSlot=this.seq.memorySlot; return;
            }
            if (!this.coreGrid || this.coreSignatureIndex !== this.seq.signatureIndex || this.coreSlot !== this.seq.memorySlot) this.captureCore();
        }
        reset() {
            this.ensureCore();
            this.seq.applyGrid(this.coreGrid);
            this.previousPerformances.delete(this.seq.memorySlot);
            this.performanceCycles.set(this.seq.memorySlot, 0);
            this.pendingResolutions.set(this.seq.memorySlot, false);
            this.seed=1;
        }
        hash(text) {
            let h = 2166136261 >>> 0;
            for (let i=0;i<text.length;i++) { h ^= text.charCodeAt(i); h = Math.imul(h, 16777619); }
            return h >>> 0;
        }
        randomFor(key) {
            let x = this.hash(`${this.seed}|${key}`) || 1;
            x ^= x << 13; x ^= x >>> 17; x ^= x << 5;
            return (x >>> 0) / 4294967295;
        }
        playerRandomFor(key) {
            let x = this.hash(`${this.playerSeed}|${key}`) || 1;
            x ^= x << 13; x ^= x >>> 17; x ^= x << 5;
            return (x >>> 0) / 4294967295;
        }
        style() {
            const family=String(this.familyName || "").toLowerCase();
            if (/funk|soul|motown|r&b|neo.?soul/.test(family)) return "funk";
            if (/reggae|ska|dub|rocksteady/.test(family)) return "reggae";
            if (/afro|highlife/.test(family)) return "afrobeat";
            if (/hip.?hop|trap|boom bap|lo.?fi/.test(family)) return "hiphop";
            if (/jazz|swing|bebop|bop/.test(family)) return "jazz";
            if (/latin|bossa|samba|salsa|cuban|cumbia|songo|timba/.test(family)) return "latin";
            if (/rock|pop|punk|metal/.test(family)) return "rock";
            return "generic";
        }
        profile(style=this.style()) {
            return ({
                funk:{ ghostSnare:.68, ghostKick:.40, fill:.88, stability:.84, snareLagMs:7, kickLagMs:1, handLeadMs:-2, hhOpen:.85, hhOrn:1.08, ride:.24, crash:.52, toms:.42 },
                hiphop:{ ghostSnare:.54, ghostKick:.36, fill:.62, stability:.90, snareLagMs:12, kickLagMs:5, handLeadMs:1, hhOpen:.38, hhOrn:1.16, ride:.10, crash:.22, toms:.20 },
                afrobeat:{ ghostSnare:.36, ghostKick:.34, fill:.60, stability:.86, snareLagMs:2, kickLagMs:0, handLeadMs:-3, hhOpen:.48, hhOrn:1.22, ride:.62, crash:.24, toms:.54 },
                jazz:{ ghostSnare:.40, ghostKick:.14, fill:.70, stability:.82, snareLagMs:4, kickLagMs:2, handLeadMs:-4, hhOpen:.12, hhOrn:.42, ride:1.35, crash:.20, toms:.72 },
                reggae:{ ghostSnare:.20, ghostKick:.10, fill:.42, stability:.92, snareLagMs:8, kickLagMs:5, handLeadMs:2, hhOpen:.58, hhOrn:.58, ride:.56, crash:.14, toms:.24 },
                latin:{ ghostSnare:.20, ghostKick:.20, fill:.66, stability:.86, snareLagMs:1, kickLagMs:0, handLeadMs:-2, hhOpen:.30, hhOrn:.72, ride:.88, crash:.34, toms:.90 },
                rock:{ ghostSnare:.16, ghostKick:.14, fill:.82, stability:.88, snareLagMs:6, kickLagMs:0, handLeadMs:-1, hhOpen:.74, hhOrn:.52, ride:.70, crash:1.08, toms:.88 },
                generic:{ ghostSnare:.30, ghostKick:.20, fill:.65, stability:.86, snareLagMs:5, kickLagMs:1, handLeadMs:-1, hhOpen:.55, hhOrn:.72, ride:.45, crash:.55, toms:.55 }
            })[style] || null;
        }
        defaultOrchestrationForStyle(style=this.style()) {
            return ({
                funk:"hihat", hiphop:"pocket", jazz:"ride", reggae:"hihat",
                afrobeat:"percussive", latin:"percussive", rock:"openkit", generic:"pocket"
            })[style] || "pocket";
        }
        resolvedOrchestration(mode=this.orchestrationMode) {
            return mode==="auto" ? this.defaultOrchestrationForStyle(this.style()) : mode;
        }
        orchestrationPreset(mode=this.orchestrationMode) {
            const resolved=this.resolvedOrchestration(mode);
            // These switches are permissions/roles, not mutes. In particular, Ride means
            // "move the time hand to ride"; it does not imply tom activity.
            const presets={
                pocket:{ hihat:true, ride:false, crash:false, toms:false },
                hihat:{ hihat:true, ride:false, crash:false, toms:false },
                ride:{ hihat:false, ride:true, crash:false, toms:false },
                openkit:{ hihat:true, ride:true, crash:true, toms:false },
                percussive:{ hihat:true, ride:false, crash:false, toms:true },
                fullkit:{ hihat:true, ride:true, crash:true, toms:true }
            };
            return { ...(presets[resolved] || presets.pocket) };
        }
        orchestrationInfoKey(mode=this.orchestrationMode) {
            const resolved=mode==="auto" ? "auto" : this.resolvedOrchestration(mode);
            return `feel.orchInfo${({auto:"Auto",pocket:"Pocket",hihat:"Hihat",ride:"Ride",openkit:"OpenKit",percussive:"Percussive",fullkit:"FullKit"})[resolved]||"Auto"}`;
        }
        timeVoice(mode=this.orchestrationMode) {
            const resolved=this.resolvedOrchestration(mode);
            if(resolved==="ride") return "ride";
            if(resolved==="hihat"||resolved==="pocket"||resolved==="percussive") return "hihat";
            return "source";
        }
        applyOrchestrationPreset(mode=this.orchestrationMode) {
            this.layers=this.orchestrationPreset(mode);
            return this.layers;
        }
        velocitySets(grid) {
            return { accent:new Set(grid[1]||[]), soft:new Set(grid[2]||[]), strong:new Set(grid[3]||[]), ghost:new Set(grid[4]||[]) };
        }
        humanize({ active, accent, soft, strong, ghost, baseActive, fillSteps = new Set(), style = this.style() }) {
            const steps=this.seq.signature.steps, barSteps=this.seq.signature.barSteps, R=TRACK_ROLES;
            const clearVelocity=i=>{ accent.delete(i); soft.delete(i); strong.delete(i); ghost.delete(i); };
            const drop=(track,step)=>{ const i=track*steps+step; active.delete(i); clearVelocity(i); };
            const has=(track,step)=>active.has(track*steps+step);
            const isBase=(track,step)=>baseActive.has(track*steps+step);
            const isCore=(track,step)=>(track===R.kick||track===R.snare)&&isBase(track,step);
            const isSourceHatStep=step=>isBase(R.closedHat,step)||isBase(R.openHat,step);
            const isQuiet=(track,step)=>{ const i=track*steps+step; return soft.has(i)||ghost.has(i); };
            const primaryHand=this.timeVoice()==='ride' ? R.ride : R.closedHat;
            const priority=(track,step)=>{
                if(isCore(track,step)) return 1000;
                // A source hi-hat hit remains structural even if FEEL only changes its articulation.
                if((track===R.closedHat||track===R.openHat)&&isSourceHatStep(step)) return 770;
                if(track===R.ride && this.timeVoice()==='ride' && isSourceHatStep(step)) return 770;
                if(isBase(track,step)) return 760;
                if(fillSteps.has(step) && (track===R.tomHigh||track===R.tomMid||track===R.tomFloor)) return 710;
                if(fillSteps.has(step) && track===R.snare) return 700;
                if(track===R.crash && step%barSteps===0) return 650;
                if(track===primaryHand) return 590;
                if(style==='jazz' && track===R.ride) return 600;
                if(style!=='jazz' && (track===R.openHat||track===R.closedHat)) return 580;
                if(track===R.snare) return 560;
                if(track===R.tomHigh||track===R.tomMid||track===R.tomFloor) return 540;
                if(track===R.crash) return 520;
                if(track===R.ride) return 500;
                return 450;
            };
            const hands=[R.crash,R.ride,R.openHat,R.closedHat,R.snare,R.tomHigh,R.tomMid,R.tomFloor];
            for(let step=0;step<steps;step++){
                // Open/closed hi-hat are articulations of one instrument: never sound both at once.
                if(has(R.openHat,step)&&has(R.closedHat,step)){
                    const openBase=isBase(R.openHat,step), closedBase=isBase(R.closedHat,step);
                    if(openBase&&!closedBase) drop(R.closedHat,step);
                    else if(closedBase&&!openBase) drop(R.openHat,step);
                    else if(this.energy>=48) drop(R.closedHat,step);
                    else drop(R.openHat,step);
                }
                let played=hands.filter(track=>has(track,step));
                if(fillSteps.has(step)){
                    const fillHands=played.filter(track=>track===R.snare||track===R.tomHigh||track===R.tomMid||track===R.tomFloor);
                    if(fillHands.length>=1){
                        const maxCymbalHands=fillHands.length>=2?0:1;
                        let cymbalsKept=0;
                        for(const track of played){
                            const fillHand=fillHands.includes(track);
                            if(fillHand||isCore(track,step))continue;
                            if([R.crash,R.ride,R.openHat,R.closedHat].includes(track) && cymbalsKept<maxCymbalHands){cymbalsKept++;continue;}
                            drop(track,step);
                        }
                    }
                }
                played=hands.filter(track=>has(track,step));
                if(played.length<=2) continue;
                played.sort((a,b)=>{
                    const pa=priority(a,step)-(isQuiet(a,step)?80:0), pb=priority(b,step)-(isQuiet(b,step)?80:0);
                    if(pb!==pa) return pb-pa;
                    return a-b;
                });
                const keep=new Set(played.slice(0,2));
                for(const track of played){ if(!keep.has(track)) drop(track,step); }
            }
            return { active, accent, soft, strong, ghost };
        }
        performanceTimingOffset(track, step) {
            if (!this.enabled || !this.cores.has(this.seq.memorySlot)) return 0;
            const R=TRACK_ROLES, p=this.profile(), tempo=this.seq.tempo;
            let mean=0;
            if(track===R.snare) mean=p.snareLagMs;
            else if(track===R.kick) mean=p.kickLagMs;
            else if([R.closedHat,R.openHat,R.ride].includes(track)) mean=p.handLeadMs;
            const tempoScale=Math.max(.55,Math.min(1.15,105/Math.max(55,tempo)));
            const limb=[R.closedHat,R.openHat,R.ride,R.crash].includes(track)?"timeHand":track===R.snare||[R.tomHigh,R.tomMid,R.tomFloor].includes(track)?"otherHand":track===R.kick?"rightFoot":"other";
            const jitter=(this.playerRandomFor(`timing:${limb}:${track}:${step}`)-.5)*5.5;
            return (mean+jitter)*tempoScale/1000;
        }
        performanceGainScale(track, step, velocity) {
            if (!this.enabled || !this.cores.has(this.seq.memorySlot)) return 1;
            const R=TRACK_ROLES;
            const spread=velocity==='ghost'?.16:velocity==='soft'?.11:.065;
            let scale=1+(this.playerRandomFor(`velocity:${track}:${step}`)-.5)*spread*2;
            if(track===R.snare && velocity==='ghost') scale*=.88;
            if(track===R.kick && velocity==='ghost') scale*=.82;
            return Math.max(.72,Math.min(1.14,scale));
        }
        addGhostPhrases({ add, active, baseActive, baseStep, barSteps, steps, subdivision, style, d }) {
            const R=TRACK_ROLES, p=this.profile(style);
            const has=(track,st)=>active.has(track*steps+st), coreHas=(track,st)=>baseActive.has(track*steps+st);
            const candidatesAround=(track)=>{
                const out=[];
                for(let st=baseStep;st<Math.min(steps,baseStep+barSteps);st++){
                    if(!coreHas(track,st))continue;
                    for(const delta of [-subdivision,subdivision]){
                        const c=st+delta;
                        if(c>=baseStep&&c<Math.min(steps,baseStep+barSteps)&&!has(track,c))out.push(c);
                    }
                }
                return [...new Set(out)];
            };
            const snareCandidates=candidatesAround(R.snare);
            const kickCandidates=candidatesAround(R.kick);
            // Add response/preparation notes in musically meaningful gaps, not arbitrary cells.
            for(const st of snareCandidates){
                const prob=p.ghostSnare*(.18+.82*d);
                if(this.randomFor(`ghost-sn:${baseStep}:${st}`)<prob)add(R.snare,st,'ghost');
            }
            for(const st of kickCandidates){
                const prob=p.ghostKick*(.12+.72*d);
                if(this.randomFor(`ghost-k:${baseStep}:${st}`)<prob)add(R.kick,st,'ghost');
            }
            // Style-specific response ghosts where the CORE leaves space.
            for(let st=baseStep+subdivision;st<Math.min(steps,baseStep+barSteps);st+=subdivision){
                const local=st-baseStep;
                const offGrid=local%this.seq.signature.group!==0;
                if(!offGrid)continue;
                if(!has(R.snare,st) && this.randomFor(`ghost-gap-sn:${baseStep}:${st}`)<p.ghostSnare*d*.22)add(R.snare,st,'ghost');
                if(!has(R.kick,st) && this.randomFor(`ghost-gap-k:${baseStep}:${st}`)<p.ghostKick*d*.15)add(R.kick,st,'ghost');
            }
        }
        addFillPhrase({ add, remove, active, baseActive, fillSteps, baseStep, bar, bars, barSteps, steps, subdivision, style, f, e, cycle }) {
            // Strict contract: Fills = 0 never creates a fill note. Energy is independent and
            // still reshapes accents/dynamics later in apply(). Above zero, use a gentle curve
            // so very low values retain a small margin of manoeuvre without behaving like 50%.
            if(f<=0)return false;
            const R=TRACK_ROLES, p=this.profile(style);
            const fillAmount=Math.pow(f,1.75);
            const phraseAccent = cycle>0 && (cycle%8===0 ? 1.8 : cycle%4===0 ? 1.45 : cycle%2===0 ? 1.08 : .72);
            const finalBarFactor=bar===bars-1?1.18:.62;
            const chance=Math.min(.94, fillAmount*p.fill*phraseAccent*finalBarFactor);
            if(this.randomFor(`fill:${cycle}:${bar}`)>=chance)return false;
            const intensity=fillAmount*.58+e*.42;
            const tempo=this.seq.tempo;
            const speedLimit=tempo>=180?4:tempo>=145?6:8;
            const maxLen=Math.max(1,Math.min(speedLimit,Math.round(1+intensity*6)));
            const fillLen=Math.max(1,Math.round(maxLen*(.55+this.randomFor(`fill-len:${cycle}:${bar}`)*.45)));
            const end=Math.min(steps-1,baseStep+barSteps-1);
            const first=Math.max(baseStep,end-(fillLen-1)*subdivision);
            const phraseType=this.randomFor(`fill-type:${cycle}:${bar}`);
            const toms=this.layers.toms;
            // Sticking vocabulary: the pattern determines which hand continues the gesture.
            // Surface choices then follow reachable, mostly adjacent movements around the kit.
            const stickings=[["R","L"],["R","L","L","R"],["R","R","L","L"],["R","L","R","R","L","R"]];
            const sticking=stickings[Math.floor(this.randomFor(`sticking:${cycle}:${bar}`)*stickings.length)%stickings.length];
            const tomPath=[R.snare,R.tomHigh,R.tomMid,R.tomFloor];
            const events=[];
            for(let n=0,st=first;st<=end;n++,st+=subdivision){
                const hand=sticking[n%sticking.length];
                let track=R.snare, vel=n===fillLen-1&&e>.62?'accent':n%2?'normal':'strong';
                if(toms && phraseType>.25){
                    // At higher tempi avoid implausible large jumps: descend through adjacent surfaces.
                    const progress=fillLen<=1?1:n/(fillLen-1);
                    let pathIndex=Math.min(tomPath.length-1,Math.floor(progress*tomPath.length));
                    if(hand==="L" && pathIndex>0 && this.randomFor(`stick-reach:${cycle}:${bar}:${n}`)<.28)pathIndex--;
                    track=tomPath[pathIndex];
                } else if(phraseType<.34) {
                    track=n%3===1?R.kick:R.snare; vel=track===R.kick?'strong':(n===fillLen-1?'accent':'normal');
                } else {
                    track=R.snare; vel=n===0?'ghost':n===fillLen-1?'accent':n%2?'ghost':'normal';
                }
                events.push([track,st,vel,hand]); fillSteps.add(st);
            }
            for(const [track,st,vel] of events){
                if(baseActive.has(track*steps+st) && (track===R.snare||track===R.kick))continue;
                add(track,st,vel);
            }
            // A fill is a gesture: free the right hand instead of mechanically sustaining HH/Ride.
            for(const st of fillSteps){
                if(st<first||st>end)continue;
                if(!baseActive.has(R.closedHat*steps+st))remove(R.closedHat,st);
                if(!baseActive.has(R.openHat*steps+st))remove(R.openHat,st);
                if(!baseActive.has(R.ride*steps+st))remove(R.ride,st);
            }
            // Resolution on the next 1 when that step exists in this pattern.
            const resolution=end+1;
            if(resolution<steps && this.layers.crash && e>.38){ add(R.crash,resolution,e>.66?'accent':'strong'); add(R.kick,resolution,'strong'); }
            return end===steps-1;
        }
        apply({ evolve = false } = {}) {
            this.ensureCore();
            const steps=this.seq.signature.steps, barSteps=this.seq.signature.barSteps, group=this.seq.signature.group, R=TRACK_ROLES;
            const base=this.coreGrid, baseActive=new Set(base[0]||[]), active=new Set();
            const baseV=this.velocitySets(base), accent=new Set(), soft=new Set(), strong=new Set(), ghost=new Set(), fillSteps=new Set();
            const clearV=i=>{accent.delete(i);soft.delete(i);strong.delete(i);ghost.delete(i);};
            const copyVelocity=i=>{ if(baseV.accent.has(i))accent.add(i); else if(baseV.strong.has(i))strong.add(i); else if(baseV.soft.has(i))soft.add(i); else if(baseV.ghost.has(i))ghost.add(i); };
            const add=(track,step,velocity="normal")=>{ if(step<0||step>=steps||track<0||track>=CONFIG.TRACK_COUNT)return; const i=track*steps+step; active.add(i); clearV(i); if(velocity==="accent")accent.add(i); else if(velocity==="strong")strong.add(i); else if(velocity==="soft")soft.add(i); else if(velocity==="ghost")ghost.add(i); };
            const remove=(track,step)=>{const i=track*steps+step;active.delete(i);clearV(i);};
            const isCoreTrack=t=>t===R.kick||t===R.snare;
            // Orchestration buttons are permissions to embellish, never destructive mutes.
            // The complete source groove is always copied first so FEEL cannot erase its identity.
            const isLayerAllowed=t=>{ if(t===R.closedHat||t===R.openHat)return this.layers.hihat; if(t===R.ride)return this.layers.ride; if(t===R.crash)return this.layers.crash; if(t===R.tomHigh||t===R.tomMid||t===R.tomFloor)return this.layers.toms; return true; };
            for(const i of baseActive){ active.add(i); copyVelocity(i); }
            const timeVoice=this.timeVoice();
            // Limb orchestration: moving to Ride transfers the source hi-hat time pattern to the
            // ride instead of layering a second independent rhythm. CORE is never modified, so
            // switching back restores the original hi-hat exactly.
            if(timeVoice==="ride"){
                for(let st=0;st<steps;st++){
                    const closedIdx=R.closedHat*steps+st, openIdx=R.openHat*steps+st, rideIdx=R.ride*steps+st;
                    const sourceIdx=baseActive.has(openIdx)?openIdx:(baseActive.has(closedIdx)?closedIdx:null);
                    if(sourceIdx===null)continue;
                    active.delete(closedIdx); active.delete(openIdx); clearV(closedIdx); clearV(openIdx);
                    active.add(rideIdx); clearV(rideIdx);
                    if(baseV.accent.has(sourceIdx))accent.add(rideIdx); else if(baseV.strong.has(sourceIdx))strong.add(rideIdx); else if(baseV.soft.has(sourceIdx))soft.add(rideIdx); else if(baseV.ghost.has(sourceIdx))ghost.add(rideIdx);
                }
            }
            const style=this.style(), d=this.density/100, e=this.energy/100, f=this.fills/100, p=this.profile(style);
            const bars=Math.max(1,Math.ceil(steps/barSteps)), subdivision=Math.max(1,Math.round(group/2));
            const cycle=this.performanceCycles.get(this.seq.memorySlot)||0;
            const previous=evolve?this.previousPerformances.get(this.seq.memorySlot):null;
            if(previous){
                const pv=this.velocitySets(previous), previousActive=new Set(previous[0]||[]);
                for(const i of previousActive){
                    const t=Math.floor(i/steps), st=i%steps;
                    if(baseActive.has(i)||!isLayerAllowed(t))continue;
                    if([R.tomHigh,R.tomMid,R.tomFloor,R.crash].includes(t))continue;
                    if((t===R.kick||t===R.snare) && !pv.ghost.has(i) && !pv.soft.has(i))continue;
                    if(this.randomFor(`continuity:${cycle}:${i}`)>p.stability)continue;
                    active.add(i); clearV(i);
                    if(pv.accent.has(i))accent.add(i); else if(pv.strong.has(i))strong.add(i); else if(pv.soft.has(i))soft.add(i); else if(pv.ghost.has(i))ghost.add(i);
                }
            }
            const addProb=(track,step,prob,vel,key)=>{ if(isLayerAllowed(track)&&this.randomFor(`${key}:${track}:${step}`)<prob)add(track,step,vel); };
            if(evolve && this.pendingResolutions.get(this.seq.memorySlot)){
                const destination=this.timeVoice();
                if(this.layers.crash && e>.68)add(R.crash,0,"accent");
                else if(destination==="ride")add(R.ride,0,e>.62?"strong":"normal");
                else if(destination==="hihat")add(R.closedHat,0,e>.62?"strong":"normal");
                add(R.kick,0,e>.62?"strong":"normal");
            }
            let endsWithFill=false;
            for(let bar=0;bar<bars;bar++){
                const baseStep=bar*barSteps, barEnd=Math.min(steps,baseStep+barSteps);
                if(this.layers.hihat && timeVoice!=="ride"){
                    // Preserve the source hi-hat skeleton. FEEL may articulate existing hits and
                    // add a small number of local ghost/syncopated ornaments, but never rebuild it.
                    const sourceHatSteps=[];
                    for(let st=baseStep;st<barEnd;st++){
                        if(baseActive.has(R.closedHat*steps+st)||baseActive.has(R.openHat*steps+st))sourceHatSteps.push(st);
                    }
                    if(sourceHatSteps.length){
                        // Closed -> open is an articulation replacement at an existing source position.
                        const openBudget=Math.min(2,Math.floor(Math.max(0,e-.42)*2.6 + d*.75));
                        let opened=0;
                        const openCandidates=sourceHatSteps.filter(st=>baseActive.has(R.closedHat*steps+st)).sort((a,b)=>{
                            const pa=(a%group?1:0)+(a>=barEnd-group?1:0), pb=(b%group?1:0)+(b>=barEnd-group?1:0);
                            return pb-pa || a-b;
                        });
                        for(const st of openCandidates){
                            if(opened>=openBudget)break;
                            const offbeat=(st-baseStep)%group!==0;
                            const chance=(.06+d*.12+Math.max(0,e-.45)*.38)*p.hhOpen*(offbeat?1.3:1);
                            if(this.randomFor(`hh-open:${cycle}:${bar}:${st}`)<chance){
                                remove(R.closedHat,st); add(R.openHat,st,e>.78?'accent':'strong'); opened++;
                            }
                        }

                        // Additions are deliberately capped: at default Density 20% usually 0–1 per bar.
                        const maxAdds=Math.min(4,Math.max(0,Math.floor(d*3.2 + (d>.72?1:0))));
                        const existingOrnaments=[];
                        for(let st=baseStep;st<barEnd;st++){
                            const source=baseActive.has(R.closedHat*steps+st)||baseActive.has(R.openHat*steps+st);
                            if(!source&&(active.has(R.closedHat*steps+st)||active.has(R.openHat*steps+st)))existingOrnaments.push(st);
                        }
                        let additions=existingOrnaments.length;
                        if(additions<maxAdds){
                            const candidates=[];
                            for(const src of sourceHatSteps){
                                for(const delta of [-subdivision,subdivision]){
                                    const st=src+delta;
                                    if(st<baseStep||st>=barEnd)continue;
                                    if(baseActive.has(R.closedHat*steps+st)||baseActive.has(R.openHat*steps+st))continue;
                                    if(!candidates.includes(st))candidates.push(st);
                                }
                            }
                            for(const st of candidates){
                                if(additions>=maxAdds)break;
                                if(active.has(R.closedHat*steps+st)||active.has(R.openHat*steps+st))continue;
                                const offbeat=(st-baseStep)%group!==0;
                                const chance=(.08+d*.30)*p.hhOrn*(offbeat?1.18:.72);
                                if(this.randomFor(`hh-orn:${cycle}:${bar}:${st}`)<chance){
                                    add(R.closedHat,st,d<.55?'ghost':'soft'); additions++;
                                }
                            }
                        }
                    }
                }
                if(this.layers.ride && p.ride>0 && timeVoice!=="ride"){
                    const rideStride=style==="jazz"?Math.max(1,subdivision):(style==="afrobeat"||style==="latin"?subdivision:group);
                    const rideChance=(.10+d*.42+Math.max(0,e-.5)*.18)*p.ride;
                    for(let st=0;st<barSteps&&baseStep+st<steps;st+=rideStride)addProb(R.ride,baseStep+st,Math.min(.92,rideChance),st%group===0?"strong":"soft",`ride-${cycle}-${bar}`);
                }
                if(this.layers.crash&&e>.54&&this.randomFor(`crash:${cycle}:${bar}`)<Math.min(.9,(e-.48)*p.crash))add(R.crash,baseStep,e>.78?"accent":"strong");
                this.addGhostPhrases({ add, active, baseActive, baseStep, barSteps, steps, subdivision, style, d });
                endsWithFill = this.addFillPhrase({ add, remove, active, baseActive, fillSteps, baseStep, bar, bars, barSteps, steps, subdivision, style, f, e, cycle }) || endsWithFill;
            }
            // ENERGY is bipolar around 50%. Low energy keeps the rhythmic CORE but softens
            // accents and dynamics; high energy increases contrast without inventing extra notes.
            for(const i of [...active]){
                if(ghost.has(i))continue;
                const isAccent=accent.has(i), isStrong=strong.has(i), isSoft=soft.has(i);
                if(e<.5){
                    const calm=(.5-e)/.5;
                    if(isAccent){
                        clearV(i);
                        if(calm>.72)soft.add(i); else if(calm>.28)strong.add(i);
                    } else if(isStrong && calm>.22){
                        clearV(i);
                        if(calm>.68)soft.add(i);
                    } else if(!isSoft && calm>.76 && this.randomFor(`energy-soft:${cycle}:${i}`)<calm*.34){
                        soft.add(i);
                    }
                } else if(e>.5){
                    const drive=(e-.5)/.5;
                    if(isStrong && drive>.58 && this.randomFor(`energy-accent:${cycle}:${i}`)<drive*.48){ clearV(i); accent.add(i); }
                    else if(!isAccent&&!isStrong&&!isSoft && this.randomFor(`energy-strong:${cycle}:${i}`)<drive*.26){ strong.add(i); }
                }
            }
            this.humanize({ active, accent, soft, strong, ghost, baseActive, fillSteps, style });
            this.seq.activeCells=active; this.seq.accentCells=accent; this.seq.weakCells=soft; this.seq.strongCells=strong; this.seq.ghostCells=ghost;
            const result=this.seq.gridSnapshot();
            this.previousPerformances.set(this.seq.memorySlot,this.cloneGrid(result));
            this.pendingResolutions.set(this.seq.memorySlot,endsWithFill);
        }
        regenerate({ evolve = false } = {}) {
            this.seed=(this.seed+1)>>>0;
            if(evolve)this.performanceCycles.set(this.seq.memorySlot,(this.performanceCycles.get(this.seq.memorySlot)||0)+1);
            this.apply({ evolve });
        }
    }

    class PracticeController {
        constructor(sequencer, audio, preferences = null) {
            this.seq = sequencer;
            this.audio = audio;
            this.preferences = preferences;
            this.ui = null;
            this.scheduler = null;
            this.enabled = false;
            const savedTraining = preferences?.data?.training || {};
            this.mode = ["layers", "tempo", "combined"].includes(savedTraining.mode) ? savedTraining.mode : "tempo";
            this.startTempo = Math.round(Util.clamp(savedTraining.startTempo, CONFIG.TEMPO.min, CONFIG.TEMPO.max, 60));
            this.targetTempo = Math.round(Util.clamp(savedTraining.targetTempo, CONFIG.TEMPO.min, CONFIG.TEMPO.max, 90));
            this.tempoStep = Math.round(Util.clamp(savedTraining.tempoStep, 1, 20, 3));
            this.loopsPerLevel = Math.round(Util.clamp(savedTraining.loopsPerLevel, 1, 32, 4));
            this.countInBars = Math.round(Util.clamp(savedTraining.countInBars, 0, 2, 1));
            this.loopCount = 0;
            this.layerLevel = 0;
            this.phase = "tempo";
            this.targetAnnounced = false;
        }
        attach(ui, scheduler) { this.ui = ui; this.scheduler = scheduler; }
        configure(options = {}) {
            const clampInt = (value, min, max, fallback) => Math.round(Util.clamp(value, min, max, fallback));
            this.mode = ["layers", "tempo", "combined"].includes(options.mode) ? options.mode : "tempo";
            this.startTempo = clampInt(options.startTempo, CONFIG.TEMPO.min, CONFIG.TEMPO.max, 60);
            this.targetTempo = clampInt(options.targetTempo, CONFIG.TEMPO.min, CONFIG.TEMPO.max, Math.max(90, this.startTempo));
            if (this.targetTempo < this.startTempo) [this.startTempo, this.targetTempo] = [this.targetTempo, this.startTempo];
            this.tempoStep = clampInt(options.tempoStep, 1, 20, 3);
            this.loopsPerLevel = clampInt(options.loopsPerLevel, 1, 32, 4);
            this.countInBars = clampInt(options.countInBars, 0, 2, 1);
            this.preferences?.setTraining({
                mode:this.mode, startTempo:this.startTempo, targetTempo:this.targetTempo, tempoStep:this.tempoStep, loopsPerLevel:this.loopsPerLevel, countInBars:this.countInBars
            });
        }
        activate(options = {}, { announce = false } = {}) {
            this.configure(options);
            this.enabled = true;
            this.resetForTransport({ announce:false });
            this.ui?.renderButtons();
            this.ui?.renderPractice();
            if (announce) this.ui?.status(I18N.t("practice.started", { tempo:this.startTempo }));
        }
        start(options = {}) {
            this.activate(options, { announce:true });
        }
        stop({ silent = false } = {}) {
            if (!this.enabled) return;
            this.enabled = false;
            this.loopCount = 0;

            // Le tempo d'entraînement est temporaire : en quittant le mode,
            // restaurer le BPM propre à la mémoire actuellement sélectionnée.
            const memory = this.seq.store.get(this.seq.memorySlot);
            if (memory && Number.isFinite(Number(memory.tempo))) {
                this.seq.tempo = Math.round(Util.clamp(
                    Number(memory.tempo),
                    CONFIG.TEMPO.min,
                    CONFIG.TEMPO.max,
                    CONFIG.TEMPO.default
                ));
                this.ui?.renderTempo();
            }

            this.ui?.renderButtons();
            this.ui?.renderPractice();
            if (!silent) this.ui?.status(I18N.t("practice.stopped"));
        }
        resetForTransport({ announce = false } = {}) {
            if (!this.enabled) return;
            this.loopCount = 0;
            this.layerLevel = this.mode === "tempo" ? this.maxLayerLevel : 0;
            this.phase = this.mode === "tempo" ? "tempo" : "layers";
            this.targetAnnounced = false;
            this.seq.tempo = this.startTempo;
            this.ui?.renderTempo();
            this.ui?.renderPractice();
            if (announce) this.ui?.status(I18N.t("practice.started", { tempo:this.startTempo }));
        }
        trackHasNotes(track) {
            const steps = this.seq.signature.steps;
            for (let step = 0; step < steps; step++) if (this.seq.activeCells.has(track * steps + step)) return true;
            return false;
        }
        get layerPlan() {
            const R = TRACK_ROLES;
            const hats = [R.closedHat, R.openHat].filter(track => this.trackHasNotes(track));
            const pulse = hats.length ? hats : (this.trackHasNotes(R.ride) ? [R.ride] : []);
            const stages = [];
            const current = new Set(pulse);
            stages.push({ tracks:new Set(current), label:I18N.t("practice.hihat") });
            if (this.trackHasNotes(R.snare)) current.add(R.snare);
            stages.push({ tracks:new Set(current), label:I18N.t("practice.snare") });
            if (this.trackHasNotes(R.kick)) current.add(R.kick);
            stages.push({ tracks:new Set(current), label:I18N.t("practice.kick") });
            const extras = [R.ride, R.tomHigh, R.tomMid, R.tomFloor, R.crash]
                .filter(track => !current.has(track) && this.trackHasNotes(track));
            const extraLabels = {
                [R.ride]:I18N.t("track.ride"), [R.tomHigh]:I18N.t("track.tomHigh"), [R.tomMid]:I18N.t("track.tomMid"),
                [R.tomFloor]:I18N.t("track.tomFloor"), [R.crash]:I18N.t("track.crash")
            };
            extras.forEach(track => { current.add(track); stages.push({ tracks:new Set(current), label:`+ ${extraLabels[track]}` }); });
            stages.push({ tracks:new Set(current), label:I18N.t("practice.accents"), accents:true });
            stages.push({ tracks:new Set(current), label:I18N.t("practice.ghosts"), accents:true, ghosts:true });
            return stages;
        }
        get maxLayerLevel() { return Math.max(0, this.layerPlan.length - 1); }
        get currentLayer() { return this.layerPlan[Math.min(this.layerLevel, this.maxLayerLevel)]; }
        get currentLayerLabel() { return this.currentLayer?.label || I18N.t("practice.hihat"); }
        get progressLabel() {
            if (!this.enabled) return I18N.t("practice.ready");
            if (this.phase === "layers") return this.currentLayerLabel;
            return I18N.t("practice.tempoStatus", { tempo:this.seq.tempo, target:this.targetTempo });
        }
        get beatSteps() { return Math.max(1, this.seq.signature.group); }
        get beatsPerBar() { return Math.max(1, Math.round(this.seq.signature.barSteps / this.beatSteps)); }
        get countInDuration() {
            if (!this.enabled || this.countInBars <= 0) return 0;
            const sixteenth = 60 / Util.clamp(this.seq.tempo, CONFIG.TEMPO.min, CONFIG.TEMPO.max, CONFIG.TEMPO.default) / 4;
            return this.seq.signature.barSteps * sixteenth * this.countInBars;
        }
        scheduleCountIn(startTime) {
            if (!this.enabled || this.countInBars <= 0) return;
            const sixteenth = 60 / Util.clamp(this.seq.tempo, CONFIG.TEMPO.min, CONFIG.TEMPO.max, CONFIG.TEMPO.default) / 4;
            const beatDuration = sixteenth * this.beatSteps;
            const totalBeats = this.beatsPerBar * this.countInBars;
            for (let beat = 0; beat < totalBeats; beat++) {
                this.audio.play({
                    kitIndex:this.seq.kitIndex,
                    trackIndex:CONFIG.METRONOME_TRACK_INDEX,
                    sampleKey:CONFIG.KITS[this.seq.kitIndex].tracks[CONFIG.METRONOME_TRACK_INDEX],
                    time:startTime + beat * beatDuration,
                    trackVolume:beat % this.beatsPerBar === 0 ? 0.95 : 0.7,
                    masterVolume:this.seq.masterVolume,
                    velocity:beat % this.beatsPerBar === 0 ? "accent" : "normal"
                });
            }
        }
        isTrackAllowed(track) {
            if (!this.enabled || this.mode === "tempo" || this.phase === "tempo") return true;
            return this.currentLayer?.tracks?.has(track) ?? true;
        }
        isCellAllowed(cellIndex, track) {
            if (!this.enabled) return true;
            if (!this.isTrackAllowed(track)) return false;
            if (this.mode === "tempo" || this.phase === "tempo") return true;
            if (!this.currentLayer?.ghosts && this.seq.ghostCells.has(cellIndex)) return false;
            return true;
        }
        velocityForCell(cellIndex, velocity) {
            if (!this.enabled || this.mode === "tempo" || this.phase === "tempo") return velocity;
            if (!this.currentLayer?.accents && this.seq.accentCells.has(cellIndex)) return "normal";
            return velocity;
        }
        onLoopEnd() {
            if (!this.enabled) return;
            this.loopCount += 1;
            if (this.loopCount < this.loopsPerLevel) { this.ui?.renderPractice(); return; }
            this.loopCount = 0;
            if (this.phase === "layers") {
                if (this.layerLevel < this.maxLayerLevel) {
                    this.layerLevel += 1;
                    this.ui?.status(I18N.t("practice.level", { label:this.currentLayerLabel }));
                    this.ui?.renderPractice();
                    return;
                }
                if (this.mode === "combined") {
                    this.phase = "tempo";
                    this.ui?.status(I18N.t("practice.layersToTempo", { target:this.targetTempo }));
                } else if (!this.targetAnnounced) {
                    this.targetAnnounced = true;
                    this.ui?.status(I18N.t("practice.layersDone"));
                }
                this.ui?.renderPractice();
                return;
            }
            if (this.seq.tempo < this.targetTempo) {
                this.seq.tempo = Math.min(this.targetTempo, this.seq.tempo + this.tempoStep);
                this.ui?.renderTempo();
                this.ui?.status(I18N.t("practice.tempo", { tempo:this.seq.tempo }));
            } else if (!this.targetAnnounced) {
                this.targetAnnounced = true;
                this.ui?.status(I18N.t("practice.targetReached", { tempo:this.seq.tempo }));
            }
            this.ui?.renderPractice();
        }
    }

    class Scheduler {
        constructor(audio, sequencer, ui, practice = null) {
            this.audio = audio; this.seq = sequencer; this.ui = ui; this.practice = practice;
            this.playing = false; this.step = 0; this.nextTime = 0; this.timer = null;
        }
        async start() {
            if (this.playing) return;
            if (this.ui?.previewEnabled) this.ui.stopGroovePreview({ silent:true });
            const ctx = await this.audio.resume();
            this.playing = true; this.step = 0;
            const countInStart = ctx.currentTime + 0.02;
            if (this.practice?.enabled) this.practice.scheduleCountIn(countInStart);
            this.nextTime = countInStart + (this.practice?.countInDuration || 0);
            this.ui.setPlaying(true);
            this.ui.renderPractice?.();
            this.loop();
        }
        stop() {
            this.playing = false;
            clearTimeout(this.timer); this.timer = null;
            this.ui.setPlaying(false); this.ui.clearPlayhead();
        }
        toggle() {
            return this.playing ? this.stop() : this.start();
        }
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
                if (finishing) this.ui.onFeelLoopEnd?.();
                if (finishing && this.seq.chainEnabled) {
                    this.seq.nextChainSlot();
                    this.ui.syncSchedulerStructure();
                    this.ui.buildGrid();
                    this.ui.renderState();
                    this.ui.makeKeyboardAccessible();
                }
                if (finishing && this.practice?.enabled) this.practice.onLoopEnd();
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
                if (!this.seq.activeCells.has(cellIndex) || !this.seq.isTrackAudible(track) || !this.practice?.isCellAllowed(cellIndex, track)) continue;
                const baseVelocity = this.seq.accentCells.has(cellIndex) ? "accent" : this.seq.strongCells.has(cellIndex) ? "strong" : this.seq.weakCells.has(cellIndex) ? "soft" : this.seq.ghostCells.has(cellIndex) ? "ghost" : "normal";
                const velocity = this.practice?.velocityForCell(cellIndex, baseVelocity) || baseVelocity;
                const feelTiming = this.ui?.feel?.performanceTimingOffset?.(track, step) || 0;
                const feelGain = this.ui?.feel?.performanceGainScale?.(track, step, velocity) || 1;
                this.audio.play({
                    kitIndex: this.seq.kitIndex,
                    trackIndex: track,
                    sampleKey: this.seq.sampleForTrack(track),
                    time: time + feelTiming,
                    trackVolume: this.seq.trackVolumes[track],
                    masterVolume: this.seq.masterVolume,
                    pan: this.seq.trackPans[track],
                    velocity,
                    gainScale: feelGain
                });
            }
        }
    }

    class StorageManager {
        constructor(key) { this.key = key; this.saveTimer = null; this.pendingSlots = null; }
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
            return { v: 5, s: slots.map(entry => entry ? [entry.signatureIndex, entry.tempo, entry.grid] : null) };
        }
        static packCells(values) {
            let previous = 0;
            return (Array.isArray(values) ? values : []).map((value, index) => {
                const current = Number(value) || 0;
                const delta = index === 0 ? current : current - previous;
                previous = current;
                return delta.toString(36);
            }).join(".");
        }
        static unpackCells(value) {
            if (!value) return [];
            let previous = 0;
            return String(value).split(".").map((part, index) => {
                const delta = Number.parseInt(part, 36) || 0;
                previous = index === 0 ? delta : previous + delta;
                return previous;
            });
        }
        static packPattern(pattern) {
            const p = Array.isArray(pattern) ? pattern : [];
            const volumes = Array.from({ length:CONFIG.TRACK_COUNT }, (_, i) => Math.round(Util.clamp(p[2]?.[i], 0, 1, 1) * 35).toString(36)).join("");
            const pans = Array.from({ length:CONFIG.TRACK_COUNT }, (_, i) => Math.round((Util.clamp(p[11]?.[i], -1, 1, 0) + 1) * 17.5).toString(36)).join("");
            return [
                this.packCells(p[0]), p[1] || 0, volumes, p[3] || CONFIG.TEMPO.default,
                Math.round(Util.clamp(p[4], 0, 1, 1) * 100), p[5] || 0,
                this.packCells(p[6]), this.packCells(p[7]), this.packCells(p[8]), this.packCells(p[9]), p[10] || null, pans
            ];
        }
        static unpackPattern(pattern) {
            if (!Array.isArray(pattern)) return pattern;
            const volumeText = String(pattern[2] || "");
            const volumes = Array.from({ length:CONFIG.TRACK_COUNT }, (_, i) => {
                const value = Number.parseInt(volumeText[i] || "z", 36);
                return Util.clamp(value / 35, 0, 1, 1);
            });
            const panText = String(pattern[11] || "");
            const pans = Array.from({ length:CONFIG.TRACK_COUNT }, (_, i) => {
                if (!panText[i]) return 0;
                const value = Number.parseInt(panText[i], 36);
                return Util.clamp(value / 17.5 - 1, -1, 1, 0);
            });
            return [
                this.unpackCells(pattern[0]), pattern[1], volumes, pattern[3], Number(pattern[4]) / 100, pattern[5],
                this.unpackCells(pattern[6]), this.unpackCells(pattern[7]), this.unpackCells(pattern[8]), this.unpackCells(pattern[9]), pattern[10] || null, pans
            ];
        }
        static compactShareSlots(slots) {
            return { v:5, s:slots.map(entry => entry ? [entry.signatureIndex, entry.tempo, entry.grid] : null) };
        }
        load(defaults) {
            try {
                const params = new URLSearchParams(location.hash.slice(1));
                const encoded = params.get(this.key);
                if (!encoded) return defaults;
                const payload = StorageManager.decode(encoded);
                if (payload?.v === 5 && Array.isArray(payload.s)) return payload.s.map(entry => entry ? { signatureIndex:entry[0], tempo:entry[1], grid:entry[2] } : null);
                if (payload?.v === 4 && Array.isArray(payload.s)) return payload.s.map(entry => entry ? { signatureIndex:entry[0], tempo:CONFIG.TEMPO.default, grid:entry[1] } : null);
                if (payload?.v === 3 && Array.isArray(payload.s)) return payload.s.map(entry => entry ? { signatureIndex:entry[0], pattern:StorageManager.unpackPattern(entry[1]) } : null);
                if (payload?.v === 2 && Array.isArray(payload.slots)) return payload.slots;
                if (payload?.v === 1 && Array.isArray(payload.banks)) return payload.banks;
                throw new Error("Format de mémoires URL inconnu.");
            } catch (error) {
                console.warn("Hash Battrochtek invalide, chargement des valeurs sûres.", error);
                return defaults;
            }
        }
        save(slots, { immediate = false } = {}) {
            this.pendingSlots = slots;
            clearTimeout(this.saveTimer);
            if (immediate) return this.flush();
            this.saveTimer = setTimeout(() => this.flush(), 260);
        }
        flush() {
            if (!this.pendingSlots) return;
            try {
                const params = new URLSearchParams(location.hash.slice(1));
                params.delete("state");
                params.set(this.key, StorageManager.encode(this.compact(this.pendingSlots)));
                const hash = params.toString();
                history.replaceState(null, "", `${location.pathname}${location.search}#${hash}`);
            } catch (error) {
                console.warn("Impossible d’écrire les mémoires dans l’URL.", error);
            } finally {
                this.pendingSlots = null;
                clearTimeout(this.saveTimer);
                this.saveTimer = null;
            }
        }
    }

    class UIController {
        constructor(seq, audio, practice = null, preferences = null) {
            this.seq = seq; this.audio = audio; this.practice = practice; this.preferences = preferences; this.scheduler = null; this.feel = new FeelController(seq);
            this.cells = []; this.memoryButtons = []; this.trackLabels = []; this.trackRows = []; this.trackSampleSelects = []; this.trackMuteButtons = []; this.trackSoloButtons = []; this.trackShiftLeftButtons = []; this.trackShiftRightButtons = []; this.trackPanKnobs = []; this.trackVolumeKnobs = []; this.kitButtons = [];
            this.copySnapshot = null; this.playheadTimeouts = []; this.tapTimes = []; this.meterFrame = null; this.gridDrag = null; this.suppressGridClick = false;
            this.undoStack = []; this.redoStack = []; this.historyLimit = 30;
            this.previewTimer = null; this.previewEnabled = false; this.previewStep = 0; this.previewNextTime = 0; this.previewData = null;
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
            ui.practice = !!this.practice?.enabled;
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
                masterButton: $("master-level"), masterIcon: $("master-level-icon"), swingInput: $("swing-input"), swingValue: $("swing-value"), vu: $("vu-meter"), presetSource: $("preset-source"), presetFamily: $("preset-family"), presetGroove: $("preset-groove"), groovePreview: $("groove-preview"), grooveAdd: $("groove-add"), gridShiftLeft: $("grid-shift-left"), gridShiftUp: $("grid-shift-up"), gridShiftDown: $("grid-shift-down"), gridShiftRight: $("grid-shift-right"), memory: $("memory"), clear: $("clear"), signatureButton: $("signature-button"),
                signature: $("signature"), signatureNumerator: $("signature-numerator"), signatureDenominator: $("signature-denominator"), metro: $("metronome-button"), chain: $("chain"), play: $("play-button"), icon: $("play-pause-icon"),
                minus: $("minus-button"), plus: $("plus-button"), tap: $("tap-tempo"), tempo: $("metronome-tempo"), random: $("random"), feelPanel: $("feel-panel"), feelXy: $("feel-xy"), feelDot: $("feel-dot"), feelReadout: $("feel-readout"), feelDensity: $("feel-density"), feelDensityValue: $("feel-density-value"), feelAuto: $("feel-auto"), feelStyle: $("feel-style"), feelOrchInfo: $("feel-orchestration-info"),
                undo: $("undo"), redo: $("redo"), practiceButton: $("practice-button"), practicePanel: $("practice-panel"), practiceMode: $("practice-mode"), practiceStartTempo: $("practice-start-tempo"), practiceTargetTempo: $("practice-target-tempo"), practiceTempoStep: $("practice-tempo-step"), practiceLoops: $("practice-loops"), practiceCountIn: $("practice-count-in"), practiceStatus: $("practice-status"), kitSelect: $("kit-select"), cacheClear: $("cache-clear"), languageSelect: $("language-select"), themeToggle: $("theme-toggle"), themeIcon: $("theme-toggle-icon"), themeColorMeta: $("theme-color-meta"),
                grooveSearch: $("groove-search"), grooveSearchList: $("groove-search-list"), shareButton: $("share-button"), shareDialog: $("share-dialog"), shareClose: $("share-close"), shareQr: $("share-qr"), shareQrError: $("share-qr-error"), shareUrl: $("share-url"), shareCopy: $("share-copy"), shareNative: $("share-native")
            };
        }
        init(scheduler) {
            this.scheduler = scheduler;
            this.setupLanguage(); this.setupTheme(); this.setupShare(); this.setupPractice(); this.setupFeel(); this.buildKits(); this.buildTrackLabels(); this.buildMemory(); this.buildSliders(); this.buildGrid(); this.buildPresetSelector(); this.buildGlobalSearch(); this.bindControls(); this.bindUnlock(); this.startVuMeter(); this.renderState(); this.makeKeyboardAccessible();
        }
        setupFeel() {
            if (!this.dom.random || !this.dom.feelPanel || !this.dom.feelXy) return;
            const familyName = () => this.seq.store.presets.meta?.[Number(this.dom.presetFamily?.value)||0]?.name || "";
            const commit = (save=true) => {
                if (!this.feel.enabled) return;
                this.feel.familyName = familyName();
                this.feel.apply();
                this.renderGrid();
                if (save) this.autoSaveMemory();
                this.renderFeel();
            };
            const setXY = (fills,energy,save=true) => {
                this.feel.fills = Math.round(Util.clamp(fills,0,100,50));
                this.feel.energy = Math.round(Util.clamp(energy,0,100,50));
                commit(save);
            };
            const fromPointer = e => {
                const r=this.dom.feelXy.getBoundingClientRect();
                if(!r.width||!r.height)return;
                setXY((e.clientX-r.left)/r.width*100, (1-(e.clientY-r.top)/r.height)*100, false);
            };
            let dragging=false, before=null;
            this.dom.feelXy.addEventListener("pointerdown",e=>{ if(e.button!==0||!this.feel.enabled)return; e.preventDefault(); this.feel.ensureCore(); before=this.captureState(); dragging=true; this.dom.feelXy.setPointerCapture?.(e.pointerId); fromPointer(e); });
            this.dom.feelXy.addEventListener("pointermove",e=>{ if(dragging)fromPointer(e); });
            const finish=()=>{ if(!dragging)return; dragging=false; if(before)this.pushHistory(before); this.autoSaveMemory(); before=null; };
            this.dom.feelXy.addEventListener("pointerup",finish); this.dom.feelXy.addEventListener("pointercancel",finish);
            this.dom.feelXy.addEventListener("keydown",e=>{ if(!this.feel.enabled)return; const dx=e.key==="ArrowRight"?3:e.key==="ArrowLeft"?-3:0, dy=e.key==="ArrowUp"?3:e.key==="ArrowDown"?-3:0; if(!dx&&!dy)return; e.preventDefault(); this.pushHistory(); setXY(this.feel.fills+dx,this.feel.energy+dy); });
            this.dom.feelStyle?.addEventListener("change",()=>{
                if(!this.feel.enabled)return;
                this.pushHistory();
                this.feel.orchestrationMode=this.dom.feelStyle.value||"auto";
                this.feel.applyOrchestrationPreset(this.feel.orchestrationMode);
                commit();
                this.status(`${I18N.t("feel.orchestrationProfile")} : ${this.dom.feelStyle.options[this.dom.feelStyle.selectedIndex]?.text || "AUTO"}`);
            });
            this.dom.feelDensity?.addEventListener("input",()=>{ if(!this.feel.enabled)return; this.feel.density=Number(this.dom.feelDensity.value); commit(false); });
            this.dom.feelDensity?.addEventListener("change",()=>{ if(this.feel.enabled)this.autoSaveMemory(); });
            document.querySelectorAll(".feel-layer").forEach(button=>button.addEventListener("click",()=>{ if(!this.feel.enabled)return; this.pushHistory(); const key=button.dataset.layer; this.feel.layers[key]=!this.feel.layers[key]; commit(); }));
            this.dom.feelAuto?.addEventListener("click",()=>{
                if(!this.feel.enabled)return;
                this.feel.auto=!this.feel.auto;
                this.renderFeel();
                this.autoSaveMemory();
                this.status(this.feel.auto ? "FEEL AUTO activé · nouvelle interprétation à chaque tour." : "FEEL AUTO désactivé · performance conservée jusqu’au prochain changement.");
            });
        }
        setFeelEnabled(enabled, { applyNow = true, save = true } = {}) {
            const next=!!enabled;
            // Idempotent by design: asking for the current state must never regenerate,
            // re-arm AUTO or alter the grid. This keeps external actions (e.g. + groove)
            // from accidentally changing FEEL state.
            if(next===this.feel.enabled){
                this.dom.feelPanel.hidden=!next;
                this.dom.random.setAttribute("aria-expanded",String(next));
                this.renderFeel();
                return;
            }
            if(next){
                // The current memory/grid is always the source of truth when FEEL starts.
                // Any manual edits performed while FEEL was OFF therefore become the new CORE.
                this.feel.captureCore({ inferLayers:false });
                this.feel.enabled=true;
                this.feel.auto=true;
                this.feel.familyName=this.seq.store.presets.meta?.[Number(this.dom.presetFamily?.value)||0]?.name || "";
                this.dom.feelPanel.hidden=false;
                this.dom.random.setAttribute("aria-expanded","true");
                if(applyNow)this.feel.apply();
                this.renderGrid();
                if(save)this.autoSaveMemory();
                this.status("FEEL activé · performance automatique à chaque tour.");
            }else{
                // FEEL OFF = freeze exactly the visible performance and make it the new CORE.
                this.feel.captureCore({ inferLayers:false });
                this.feel.seed=1;
                this.feel.enabled=false;
                this.feel.auto=false;
                this.dom.feelPanel.hidden=true;
                this.dom.random.setAttribute("aria-expanded","false");
                if(save)this.autoSaveMemory();
                this.renderFeel();
                this.status("FEEL désactivé · performance figée et sauvegardée comme CORE.");
            }
        }
        renderFeel() {
            if (!this.dom.feelDot) return;
            this.dom.feelDot.style.left=`${this.feel.fills}%`;
            this.dom.feelDot.style.top=`${100-this.feel.energy}%`;
            if(this.dom.feelReadout)this.dom.feelReadout.textContent=`${I18N.t("feel.fills")} ${this.feel.fills} · ${I18N.t("feel.energy")} ${this.feel.energy}`;
            if(this.dom.feelStyle)this.dom.feelStyle.value=this.feel.orchestrationMode||"auto";
            if(this.dom.feelOrchInfo)this.dom.feelOrchInfo.textContent=I18N.t(this.feel.orchestrationInfoKey());
            if(this.dom.feelDensity)this.dom.feelDensity.value=String(this.feel.density);
            if(this.dom.feelDensityValue)this.dom.feelDensityValue.textContent=`${this.feel.density}%`;
            document.querySelectorAll(".feel-layer").forEach(button=>{ const active=!!this.feel.layers[button.dataset.layer]; button.classList.toggle("active",active); button.setAttribute("aria-pressed",String(active)); });
            if(this.dom.feelAuto){ const active=this.feel.enabled&&this.feel.auto; this.dom.feelAuto.classList.toggle("active",active); this.dom.feelAuto.setAttribute("aria-pressed",String(active)); }
            this.dom.random?.classList.toggle("active",this.feel.enabled);
            this.dom.random?.setAttribute("aria-pressed",String(this.feel.enabled));
        }
        onFeelLoopEnd() {
            if (!this.feel.enabled || !this.feel.auto || this.dom.feelPanel?.hidden) return;
            this.feel.familyName = this.seq.store.presets.meta?.[Number(this.dom.presetFamily?.value)||0]?.name || this.feel.familyName || "";
            this.feel.ensureCore();
            this.feel.regenerate({ evolve:true });
            this.renderGrid();
            this.autoSaveMemory();
            this.renderFeel();
        }
        setupLanguage() {
            if (!this.dom.languageSelect) return;
            this.dom.languageSelect.value = I18N.language;
            this.dom.languageSelect.setAttribute("aria-label", I18N.t("language.label"));
            this.dom.languageSelect.addEventListener("change", () => I18N.setLanguage(this.dom.languageSelect.value));
            window.addEventListener("battrochtek-language", () => {
                this.dom.languageSelect.value = I18N.language;
                this.dom.languageSelect.setAttribute("aria-label", I18N.t("language.label"));
                this.buildTrackLabels();
                this.buildSliders();
                this.renderKit();
                this.renderTrackControls();
                this.renderMemory();
                this.renderPractice();
                this.setPlaying(!!this.scheduler?.playing);
                this.makeKeyboardAccessible();
            });
            I18N.apply(document);
        }
        setupTheme() {
            const systemDark = window.matchMedia?.("(prefers-color-scheme: dark)");
            let explicitTheme = ["light", "dark"].includes(this.preferences?.data?.theme) ? this.preferences.data.theme : null;
            const apply = theme => {
                const resolved = theme || (systemDark?.matches ? "dark" : "light");
                document.documentElement.dataset.theme = resolved;
                document.documentElement.style.colorScheme = resolved;
                document.body.dataset.theme = resolved;
                if (this.dom.themeIcon) {
                    this.dom.themeIcon.classList.toggle("fa-sun", resolved === "dark");
                    this.dom.themeIcon.classList.toggle("fa-moon", resolved !== "dark");
                }
                this.dom.themeToggle?.setAttribute("aria-label", resolved === "dark" ? I18N.t("theme.toLight") : I18N.t("theme.toDark"));
                this.dom.themeToggle && (this.dom.themeToggle.dataset.btTooltip = resolved === "dark" ? I18N.t("theme.light") : I18N.t("theme.dark"));
                this.dom.themeColorMeta?.setAttribute("content", resolved === "dark" ? "#101419" : "#f8fafc");
            };
            apply(explicitTheme);
            this.dom.themeToggle?.addEventListener("click", () => {
                const current = document.documentElement.dataset.theme || (systemDark?.matches ? "dark" : "light");
                explicitTheme = current === "dark" ? "light" : "dark";
                this.preferences?.setTheme(explicitTheme);
                apply(explicitTheme);
            });
            systemDark?.addEventListener?.("change", () => { if (!explicitTheme) apply(null); });
        }
        compactPageState() {
            const state = this.capturePageState();
            const muted = state.muted.reduce((mask, value, i) => value ? mask | (1 << i) : mask, 0);
            const solo = state.solo.reduce((mask, value, i) => value ? mask | (1 << i) : mask, 0);
            const p = state.practice;
            return [1, state.memorySlot, muted, solo, state.chain ? 1 : 0, state.metronome ? 1 : 0,
                [state.preset.source, state.preset.family, state.preset.groove], state.search, state.language, state.theme,
                p ? [p.panel?1:0,p.enabled?1:0,p.mode,p.startTempo,p.targetTempo,p.tempoStep,p.loopsPerLevel,p.countInBars,p.loopCount,p.layerLevel,p.phase] : null];
        }
        expandPageState(value) {
            if (!Array.isArray(value) || value[0] !== 1) return value;
            const p = value[10];
            return {
                v:1, memorySlot:value[1],
                muted:Array.from({length:CONFIG.TRACK_COUNT},(_,i)=>!!(value[2] & (1 << i))),
                solo:Array.from({length:CONFIG.TRACK_COUNT},(_,i)=>!!(value[3] & (1 << i))),
                chain:!!value[4], metronome:!!value[5],
                preset:{source:value[6]?.[0] || "",family:value[6]?.[1],groove:value[6]?.[2]},
                search:value[7] || "", language:value[8] || "fr", theme:value[9] || "",
                practice:p ? {panel:!!p[0],enabled:!!p[1],mode:p[2],startTempo:p[3],targetTempo:p[4],tempoStep:p[5],loopsPerLevel:p[6],countInBars:p[7],loopCount:p[8],layerLevel:p[9],phase:p[10]} : null
            };
        }
        capturePageState() {
            return {
                v: 1,
                memorySlot: this.seq.memorySlot,
                muted: this.seq.trackMuted.slice(),
                solo: this.seq.trackSolo.slice(),
                chain: !!this.seq.chainEnabled,
                metronome: !!this.seq.metronomeEnabled,
                preset: {
                    source: this.dom.presetSource?.value || "",
                    family: Number(this.dom.presetFamily?.value),
                    groove: Number(this.dom.presetGroove?.value)
                },
                search: this.dom.grooveSearch?.value || "",
                language: I18N.language,
                theme: document.documentElement.dataset.theme || "",
                practice: this.practice ? {
                    // Partager les préférences de Practice, jamais son état d'exécution.
                    panel: false,
                    mode: this.dom.practiceMode?.value || this.practice.mode,
                    startTempo: Number(this.dom.practiceStartTempo?.value || this.practice.startTempo),
                    targetTempo: Number(this.dom.practiceTargetTempo?.value || this.practice.targetTempo),
                    tempoStep: Number(this.dom.practiceTempoStep?.value || this.practice.tempoStep),
                    loopsPerLevel: Number(this.dom.practiceLoops?.value || this.practice.loopsPerLevel),
                    countInBars: Number(this.dom.practiceCountIn?.value || this.practice.countInBars)
                } : null
            };
        }
        restorePageState(state) {
            if (!state || state.v !== 1) return;
            this.seq.memorySlot = Math.round(Util.clamp(state.memorySlot, 0, CONFIG.MEMORY_SLOTS - 1, this.seq.memorySlot));
            this.seq.loadSlot(this.seq.memorySlot);
            this.seq.trackMuted = Array.from({ length:CONFIG.TRACK_COUNT }, (_, i) => !!state.muted?.[i]);
            this.seq.trackSolo = Array.from({ length:CONFIG.TRACK_COUNT }, (_, i) => !!state.solo?.[i]);
            this.seq.chainEnabled = !!state.chain;
            this.seq.metronomeEnabled = !!state.metronome;

            if (["fr", "en", "es"].includes(state.language) && state.language !== I18N.language) I18N.setLanguage(state.language);
            if (["light", "dark"].includes(state.theme)) {
                document.documentElement.dataset.theme = state.theme;
                document.documentElement.style.colorScheme = state.theme;
                document.body.dataset.theme = state.theme;
                if (this.dom.themeIcon) {
                    this.dom.themeIcon.classList.toggle("fa-sun", state.theme === "dark");
                    this.dom.themeIcon.classList.toggle("fa-moon", state.theme !== "dark");
                }
                this.dom.themeColorMeta?.setAttribute("content", state.theme === "dark" ? "#101419" : "#f8fafc");
            }

            const preset = state.preset || {};
            if (this.dom.presetSource && [...this.dom.presetSource.options].some(o => o.value === preset.source)) {
                this.dom.presetSource.value = preset.source;
                this.populateFamilies(preset.source, Number.isInteger(preset.family) ? preset.family : null);
                if (Number.isInteger(preset.family)) {
                    this.dom.presetFamily.value = String(preset.family);
                    this.populateGrooves(preset.family, Number.isInteger(preset.groove) ? preset.groove : 0);
                }
            }
            if (this.dom.grooveSearch) this.dom.grooveSearch.value = String(state.search || "");

            if (this.practice && state.practice) {
                const p = state.practice;
                this.practice.configure({
                    mode:p.mode,
                    startTempo:p.startTempo,
                    targetTempo:p.targetTempo,
                    tempoStep:p.tempoStep,
                    loopsPerLevel:p.loopsPerLevel,
                    countInBars:p.countInBars
                });
                // Un chargement de page/lien ne reprend jamais une session Practice en cours.
                // Le prochain Play appellera start() et initialisera le bon mode proprement.
                this.practice.enabled = false;
                this.practice.loopCount = 0;
                this.practice.layerLevel = 0;
                this.practice.phase = this.practice.mode === "tempo" ? "tempo" : "layers";
                const restoredMemory = this.seq.store.get(this.seq.memorySlot);
                if (restoredMemory && Number.isFinite(Number(restoredMemory.tempo))) {
                    this.seq.tempo = Math.round(Util.clamp(
                        Number(restoredMemory.tempo),
                        CONFIG.TEMPO.min,
                        CONFIG.TEMPO.max,
                        CONFIG.TEMPO.default
                    ));
                }
                if (this.dom.practicePanel) this.dom.practicePanel.hidden = true;
                if (this.dom.practiceMode) this.dom.practiceMode.value = this.practice.mode;
                if (this.dom.practiceStartTempo) this.dom.practiceStartTempo.value = String(this.practice.startTempo);
                if (this.dom.practiceTargetTempo) this.dom.practiceTargetTempo.value = String(this.practice.targetTempo);
                if (this.dom.practiceTempoStep) this.dom.practiceTempoStep.value = String(this.practice.tempoStep);
                if (this.dom.practiceLoops) this.dom.practiceLoops.value = String(this.practice.loopsPerLevel);
                if (this.dom.practiceCountIn) this.dom.practiceCountIn.value = String(this.practice.countInBars);
            }
            this.syncSchedulerStructure();
            this.renderState();
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
                        this.dom.shareCopy.innerHTML = `<i class="fa-solid fa-check" aria-hidden="true"></i> ${I18N.t("share.copied")}`;
                        setTimeout(() => { if (this.dom.shareCopy) this.dom.shareCopy.innerHTML = original; }, 1600);
                    }
                    this.status(I18N.t("status.linkCopied"));
                } catch (error) {
                    console.warn("Copie du lien impossible.", error);
                    this.status(I18N.t("status.copyFailed"));
                    this.dom.shareUrl?.focus();
                    this.dom.shareUrl?.select();
                }
            };
            const open = () => {
                // Copie : lien complet avec les huit mémoires. QR : adresse simple de l’application.
                this.autoSaveMemory();
                this.seq.store.storage.flush();
                const shareLocation = new URL(location.href);
                const shareParams = new URLSearchParams();
                shareParams.set("mem", StorageManager.encode(StorageManager.compactShareSlots(this.seq.store.slots)));
                shareLocation.hash = shareParams.toString();
                const url = shareLocation.href;
                const appUrl = `${location.origin}${location.pathname}${location.search}`;
                if (this.dom.shareUrl) this.dom.shareUrl.value = url;
                if (this.dom.shareQrError) { this.dom.shareQrError.hidden = true; this.dom.shareQrError.textContent = ""; }
                if (this.dom.shareQr) this.dom.shareQr.hidden = false;
                try {
                    if (!window.BtQRCode?.renderCanvas) throw new Error("Générateur QR indisponible");
                    window.BtQRCode.renderCanvas(this.dom.shareQr, appUrl, { size: 280, quiet: 4 });
                } catch (error) {
                    console.warn("QR code impossible à générer.", error);
                    if (this.dom.shareQr) this.dom.shareQr.hidden = true;
                    if (this.dom.shareQrError) {
                        this.dom.shareQrError.hidden = false;
                        this.dom.shareQrError.textContent = I18N.t("share.qrTooLong");
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
        setupPractice() {
            if (!this.practice || !this.dom.practicePanel || !this.dom.practiceButton) return;
            const fill = () => {
                this.dom.practiceStartTempo.value = String(this.practice.startTempo);
                this.dom.practiceTargetTempo.value = String(this.practice.targetTempo);
                this.dom.practiceTempoStep.value = String(this.practice.tempoStep);
                this.dom.practiceLoops.value = String(this.practice.loopsPerLevel);
                this.dom.practiceCountIn.value = String(this.practice.countInBars);
                this.dom.practiceMode.value = this.practice.mode;
            };
            const saveOptions = () => {
                this.practice.configure({
                    mode:this.dom.practiceMode.value,
                    startTempo:Number(this.dom.practiceStartTempo.value),
                    targetTempo:Number(this.dom.practiceTargetTempo.value),
                    tempoStep:Number(this.dom.practiceTempoStep.value),
                    loopsPerLevel:Number(this.dom.practiceLoops.value),
                    countInBars:Number(this.dom.practiceCountIn.value)
                });
                fill();
            };
            const optionChanged = () => {
                saveOptions();
                if (!this.practice.enabled) return;
                if (this.scheduler?.playing) this.scheduler.stop();
                // Tant que le panneau Practice est ouvert, le mode reste actif.
                // Une modification repart simplement du nouveau niveau de départ.
                this.practice.resetForTransport({ announce:false });
                this.renderPractice();
            };
            [this.dom.practiceMode, this.dom.practiceStartTempo, this.dom.practiceTargetTempo, this.dom.practiceTempoStep, this.dom.practiceLoops, this.dom.practiceCountIn]
                .filter(Boolean).forEach(control => { control.addEventListener("change", optionChanged); });
            fill();
            // Practice est toujours OFF au chargement ; seuls ses paramètres persistent.
            this.dom.practicePanel.hidden = true;
            this.press(this.dom.practiceButton, () => {
                this.scheduler?.stop();
                const show = this.dom.practicePanel.hidden;
                this.dom.practicePanel.hidden = !show;
                if (show) {
                    // Le panneau visible EST le mode Practice : il est armé immédiatement,
                    // avec son tempo de départ, avant même le premier clic sur Lecture.
                    this.practice.activate({
                        mode:this.dom.practiceMode.value,
                        startTempo:Number(this.dom.practiceStartTempo.value),
                        targetTempo:Number(this.dom.practiceTargetTempo.value),
                        tempoStep:Number(this.dom.practiceTempoStep.value),
                        loopsPerLevel:Number(this.dom.practiceLoops.value),
                        countInBars:Number(this.dom.practiceCountIn.value)
                    });
                } else if (this.practice.enabled) {
                    this.practice.stop({ silent:true });
                }
                this.renderPractice();
            });
        }
        renderPractice() {
            if (!this.practice) return;
            const active = this.practice.enabled;
            const panelVisible = !!this.dom.practicePanel && !this.dom.practicePanel.hidden;
            this.dom.practiceButton?.setAttribute("aria-pressed", String(active));
            this.dom.practiceButton?.setAttribute("aria-expanded", String(panelVisible));
            this.dom.practiceButton?.classList.toggle("bt-buttondown", active || panelVisible);
            if (this.dom.practiceStatus) {
                const counter = I18N.t("practice.loop", { current:Math.min(this.practice.loopCount + 1, this.practice.loopsPerLevel), total:this.practice.loopsPerLevel });
                this.dom.practiceStatus.textContent = active ? `${this.practice.progressLabel} · ${counter}` : I18N.t("practice.ready");
            }
            this.applyPracticeTrackHighlight();
            this.syncUiStore();
        }
        applyPracticeTrackHighlight() {
            const active = !!this.practice?.enabled;
            const steps = this.seq.signature.steps;
            for (let track = 0; track < CONFIG.TRACK_COUNT; track++) {
                const played = active && this.practice.isTrackAllowed(track);
                this.trackRows?.[track]?.classList.toggle("practice-played", played);
                for (let step = 0; step < steps; step++) this.cells[track * steps + step]?.classList.toggle("practice-played", played);
            }
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
                this.status(I18N.t("status.loadingKit", { kit:kit.name }));
                const buffers = await this.audio.preloadTracks(this.seq.currentTrackSamples());
                this.status(buffers.every(Boolean) ? I18N.t("status.kitReady", { kit:kit.name }) : I18N.t("status.kitPartial"));
            });
        }
        buildTrackLabels() {
            this.dom.tracks.innerHTML = "";
            this.trackLabels = []; this.trackRows = []; this.trackSampleSelects = []; this.trackShiftLeftButtons = []; this.trackShiftRightButtons = [];
            for (let i = 0; i < CONFIG.TRACK_COUNT; i++) {
                const row = document.createElement("div");
                row.className = "track-row";
                const label = document.createElement("div"); label.className = "bt-led track";
                const select = document.createElement("select"); select.className = "track-sample-select"; const trackName = I18N.t(TRACK_I18N_KEYS[i]);
                select.setAttribute("aria-label", `${trackName} — son`);
                label.dataset.btTooltip = trackName;
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
                    this.status(I18N.t("track.custom", { n:i + 1, sample:SAMPLE_INDEX[event.target.value]?.label || event.target.value }));
                });
                label.appendChild(select);
                const controls = document.createElement("div"); controls.className = "track-controls track-shift-controls";
                const shiftLeft = document.createElement("button"); shiftLeft.type = "button"; shiftLeft.className = "track-toggle pattern-shift"; shiftLeft.textContent = "‹"; shiftLeft.dataset.btTooltip = I18N.t("track.shiftLeft");
                const shiftRight = document.createElement("button"); shiftRight.type = "button"; shiftRight.className = "track-toggle pattern-shift"; shiftRight.textContent = "›"; shiftRight.dataset.btTooltip = I18N.t("track.shiftRight");
                const shiftTrack = (direction, e) => {
                    e.preventDefault(); e.stopPropagation();
                    this.pushHistory();
                    const amount = e.shiftKey ? this.seq.signature.group : 1;
                    this.seq.shiftTrack(i, direction * amount);
                    this.renderGrid();
                    this.autoSaveMemory();
                    this.status(I18N.t("track.shifted", { n:i + 1, amount:amount === 1 ? "1 step" : "1 beat" }));
                };
                shiftLeft.addEventListener("click", e => shiftTrack(-1, e));
                shiftRight.addEventListener("click", e => shiftTrack(1, e));
                controls.append(shiftLeft, shiftRight);
                row.append(label, controls);
                this.dom.tracks.appendChild(row);
                this.trackLabels.push(label); this.trackRows.push(row); this.trackSampleSelects.push(select); this.trackShiftLeftButtons.push(shiftLeft); this.trackShiftRightButtons.push(shiftRight);
            }
        }
        buildMemory() {
            this.dom.memory.querySelectorAll(".pattern").forEach(el => el.remove());
            this.memoryButtons = [];
            const separator = this.dom.memory.querySelector(".memory-separator");
            for (let i = 0; i < CONFIG.MEMORY_SLOTS; i++) {
                const button = document.createElement("button"); button.type = "button"; button.className = "bt-button pattern"; button.innerHTML = `<span>${i + 1}</span>`;
                button.dataset.btTooltip = I18N.t("memory.tooltip", { n:i + 1, state:I18N.t("memory.empty") }); button.setAttribute("aria-label", button.dataset.btTooltip); button.setAttribute("aria-pressed", "false");
                button.addEventListener("pointerdown", e => { e.preventDefault(); this.selectMemorySlot(i); });
                this.dom.memory.insertBefore(button, separator); this.memoryButtons.push(button);
            }
        }
        makeRotary({ label, tooltip, min, max, step, value, defaultValue = value, onChange }) {
            const knob = document.createElement("button");
            knob.type = "button"; knob.className = "rotary-knob"; knob.textContent = label;
            knob.setAttribute("role", "slider"); knob.setAttribute("aria-label", tooltip); knob.dataset.btTooltip = tooltip;
            const clampValue = raw => Util.clamp(raw, min, max, value);
            const setValue = raw => {
                const next = Math.round(clampValue(raw) / step) * step;
                knob.dataset.value = String(next);
                knob.setAttribute("aria-valuemin", String(min)); knob.setAttribute("aria-valuemax", String(max)); knob.setAttribute("aria-valuenow", String(Math.round(next * 100) / 100));
                const ratio = (next - min) / (max - min);
                knob.style.setProperty("--knob-angle", `${-135 + ratio * 270}deg`);
                onChange(next);
            };
            knob._setRotaryValue = raw => setValue(raw);
            let drag = null;
            knob.addEventListener("pointerdown", e => {
                if (e.button !== 0) return;
                e.preventDefault();
                drag = { id:e.pointerId, y:e.clientY, value:Number(knob.dataset.value || value), before:this.captureState(), moved:false };
                knob.setPointerCapture?.(e.pointerId);
            });
            knob.addEventListener("pointermove", e => {
                if (!drag || drag.id !== e.pointerId) return;
                const range = max - min;
                const next = drag.value + (drag.y - e.clientY) / 70 * range;
                if (Math.abs(e.clientY - drag.y) > 1) drag.moved = true;
                setValue(next);
            });
            const finish = e => { if (!drag || drag.id !== e.pointerId) return; const before=drag.before, moved=drag.moved; drag=null; if (moved) this.pushHistory(before); };
            knob.addEventListener("pointerup", finish); knob.addEventListener("pointercancel", finish);
            knob.addEventListener("keydown", e => {
                const dir = e.key === "ArrowUp" || e.key === "ArrowRight" ? 1 : e.key === "ArrowDown" || e.key === "ArrowLeft" ? -1 : 0;
                if (!dir) return; e.preventDefault(); this.pushHistory(); setValue(Number(knob.dataset.value || value) + dir * step * (e.shiftKey ? 5 : 1));
            });
            knob.addEventListener("wheel", e => { e.preventDefault(); this.pushHistory(); setValue(Number(knob.dataset.value || value) + (e.deltaY < 0 ? step : -step)); }, { passive:false });
            knob.addEventListener("dblclick", e => { e.preventDefault(); e.stopPropagation(); this.pushHistory(); setValue(defaultValue); });
            knob.dataset.btTooltip = `${tooltip} — ${I18N.t("rotary.reset")}`;
            knob.setAttribute("aria-label", `${tooltip}. ${I18N.t("rotary.reset")}`);
            setValue(value);
            return knob;
        }
        buildSliders() {
            this.dom.sliders.innerHTML = "";
            this.trackMuteButtons = []; this.trackSoloButtons = []; this.trackPanKnobs = []; this.trackVolumeKnobs = [];
            for (let i = 0; i < CONFIG.TRACK_COUNT; i++) {
                const row = document.createElement("div"); row.className = "track-mix-row";
                const mute = document.createElement("button"); mute.type = "button"; mute.className = "track-toggle mute mix-toggle"; mute.textContent = "M"; mute.dataset.btTooltip = I18N.t("track.mute", { n:i + 1 }); mute.setAttribute("aria-label", I18N.t("track.mute", { n:i + 1 })); mute.setAttribute("aria-pressed", "false");
                const solo = document.createElement("button"); solo.type = "button"; solo.className = "track-toggle solo mix-toggle"; solo.textContent = "S"; solo.dataset.btTooltip = I18N.t("track.solo", { n:i + 1 }); solo.setAttribute("aria-label", I18N.t("track.solo", { n:i + 1 })); solo.setAttribute("aria-pressed", "false");
                mute.addEventListener("click", e => { e.stopPropagation(); this.seq.toggleMute(i); this.renderTrackControls(); });
                solo.addEventListener("click", e => { e.stopPropagation(); this.seq.toggleSolo(i); this.renderTrackControls(); });
                const pan = this.makeRotary({ label:"P", tooltip:I18N.t("track.pan", { n:i + 1 }), min:-1, max:1, step:0.05, value:this.seq.trackPans[i], defaultValue:0, onChange:v => { this.seq.trackPans[i] = v; } });
                const volume = this.makeRotary({ label:"V", tooltip:I18N.t("track.volume", { n:i + 1 }), min:0, max:1, step:0.02, value:this.seq.trackVolumes[i], defaultValue:1, onChange:v => { this.seq.trackVolumes[i] = v; } });
                row.append(mute, solo, pan, volume);
                this.dom.sliders.appendChild(row);
                this.trackMuteButtons.push(mute); this.trackSoloButtons.push(solo); this.trackPanKnobs.push(pan); this.trackVolumeKnobs.push(volume);
            }
        }
        buildPresetSelector() {
            const meta=this.seq.store.presets.meta || [];
            if (!this.dom.presetSource || !this.dom.presetFamily || !this.dom.presetGroove) return;
            const sourceMap=new Map();
            for (const family of meta) {
                if (!sourceMap.has(family.source)) sourceMap.set(family.source,{id:family.source,label:family.sourceLabel||family.source,count:0});
                sourceMap.get(family.source).count+=family.grooves.length;
            }
            const ordered=[...sourceMap.values()].sort((a,b)=>{
                if (a.id==="basic") return -1;
                if (b.id==="basic") return 1;
                return a.label.localeCompare(b.label,undefined,{numeric:true,sensitivity:"base"});
            });
            this.dom.presetSource.replaceChildren(...ordered.map(source => {
                const option = document.createElement("option");
                option.value = String(source.id);
                option.textContent = `${source.label} · ${source.count}`;
                return option;
            }));
            const first=ordered[0]?.id;
            if (first) { this.dom.presetSource.value=first; this.populateFamilies(first); }
        }
        populateFamilies(source, selectedFamily = null) {
            const meta=this.seq.store.presets.meta || [];
            const families=meta.map((family,index)=>({family,index})).filter(item=>item.family.source===source);
            if (!families.length) return;
            this.dom.presetFamily.replaceChildren(...families.map(({ family, index }) => {
                const option = document.createElement("option");
                option.value = String(index);
                option.textContent = String(family.name);
                return option;
            }));
            const index=families.some(item=>item.index===selectedFamily) ? selectedFamily : families[0].index;
            this.dom.presetFamily.value=String(index);
            this.populateGrooves(index,0);
        }
        populateGrooves(familyIndex, selected = 0) {
            const meta = this.seq.store.presets.meta || [];
            const family = meta[familyIndex];
            if (!family || !this.dom.presetGroove) return;
            this.dom.presetGroove.replaceChildren(...family.grooves.map((groove, i) => {
                const option = document.createElement("option");
                option.value = String(i);
                const tradition = groove.tradition && groove.tradition !== family.name ? `${groove.tradition} · ` : "";
                option.textContent = `${String(i + 1).padStart(2,"0")} · ${tradition}${groove.name} · ${groove.signature}`;
                return option;
            }));
            this.dom.presetGroove.dataset.btTooltip = family.sourceLabel || "Groove";
            this.dom.presetGroove.value = String(Util.clamp(selected, 0, family.grooves.length - 1, 0));
        }
        buildGlobalSearch() {
            if (!this.dom.grooveSearch || !this.dom.grooveSearchList) return;
            this.grooveSearchEntries=[];
            (this.seq.store.presets.meta||[]).forEach((family,familyIndex)=>family.grooves.forEach((groove,grooveIndex)=>{
                const source=family.sourceLabel||family.source;
                const entry={
                    source:family.source,
                    sourceLabel:source,
                    familyIndex,
                    family:family.name,
                    grooveIndex,
                    groove:groove.name,
                    signature:groove.signature||"",
                    bpm:groove.bpm||"",
                    style:groove.style||"", substyle:groove.substyle||"", tradition:groove.tradition||"", feel:groove.feel||"",
                    canonicalId:groove.canonicalId||"", validationState:groove.validationState||"", confidence:groove.confidence||0,
                    difficulty:groove.difficulty||"", origin:groove.origin||"", sourceType:groove.sourceType||"",
                    artist:groove.artist||"", song:groove.song||"", drummer:groove.drummer||"", tags:groove.tags||[]
                };
                entry.search=`${entry.groove} ${entry.family} ${entry.tradition} ${entry.canonicalId} ${entry.sourceLabel} ${entry.signature} ${entry.bpm} ${entry.style} ${entry.substyle} ${entry.feel} ${entry.difficulty} ${entry.origin} ${entry.sourceType} ${entry.artist} ${entry.song} ${entry.drummer} ${(entry.tags||[]).join(" ")}`.toLocaleLowerCase();
                this.grooveSearchEntries.push(entry);
            }));

            let activeIndex=-1;
            let visible=[];

            const close=()=>{
                this.dom.grooveSearchList.hidden=true;
                this.dom.grooveSearch.setAttribute("aria-expanded","false");
                this.dom.grooveSearch.removeAttribute("aria-activedescendant");
                activeIndex=-1;
            };
            const activate=index=>{
                if (!visible.length) return;
                activeIndex=(index+visible.length)%visible.length;
                [...this.dom.grooveSearchList.querySelectorAll(".groove-search-result")].forEach((button,i)=>{
                    const active=i===activeIndex;
                    button.classList.toggle("is-active",active);
                    button.setAttribute("aria-selected",String(active));
                    if (active) {
                        this.dom.grooveSearch.setAttribute("aria-activedescendant",button.id);
                        button.scrollIntoView({block:"nearest"});
                    }
                });
            };
            const choose=index=>{
                const entry=visible[index];
                if (!entry) return;
                this.selectGlobalGroove(entry);
                close();
            };
            const render=()=>{
                const query=this.dom.grooveSearch.value.trim().toLocaleLowerCase();
                if (!query) { close(); return; }
                const words=query.split(/\s+/).filter(Boolean);
                visible=this.grooveSearchEntries
                    .map(entry=>{
                        let score=0;
                        const groove=entry.groove.toLocaleLowerCase();
                        if (groove===query) score+=100;
                        else if (groove.startsWith(query)) score+=70;
                        else if (groove.includes(query)) score+=45;
                        if (entry.sourceLabel.toLocaleLowerCase().includes(query)) score+=18;
                        if (entry.family.toLocaleLowerCase().includes(query)) score+=14;
                        if (words.every(word=>entry.search.includes(word))) score+=25;
                        return {entry,score};
                    })
                    .filter(item=>item.score>0)
                    .sort((a,b)=>b.score-a.score || a.entry.groove.localeCompare(b.entry.groove,undefined,{numeric:true,sensitivity:"base"}))
                    .slice(0,12)
                    .map(item=>item.entry);

                if (!visible.length) {
                    this.dom.grooveSearchList.innerHTML=`<div class="groove-search-empty">${I18N.t("status.noGroove")}</div>`;
                    this.dom.grooveSearchList.hidden=false;
                    this.dom.grooveSearch.setAttribute("aria-expanded","true");
                    activeIndex=-1;
                    return;
                }

                this.dom.grooveSearchList.innerHTML=visible.map((entry,index)=>`
                    <button type="button" class="groove-search-result" id="groove-search-result-${index}" role="option" aria-selected="false" data-index="${index}">
                        <span class="groove-search-result-main">${Util.escapeHtml ? Util.escapeHtml(entry.groove) : entry.groove}</span>
                        <span class="groove-search-result-meta">
                            <span>${Util.escapeHtml ? Util.escapeHtml(entry.sourceLabel) : entry.sourceLabel}</span>
                            <span>${Util.escapeHtml ? Util.escapeHtml(entry.family) : entry.family}</span>
                            <span>${entry.signature}${entry.bpm ? ` · ${entry.bpm} BPM` : ""}</span>
                        </span>
                    </button>`).join("");
                this.dom.grooveSearchList.hidden=false;
                this.dom.grooveSearch.setAttribute("aria-expanded","true");
                activeIndex=-1;
            };

            this.dom.grooveSearch.addEventListener("input",render);
            this.dom.grooveSearch.addEventListener("focus",()=>{ if (this.dom.grooveSearch.value.trim()) render(); });
            this.dom.grooveSearch.addEventListener("keydown",event=>{
                if (event.key==="ArrowDown") {
                    event.preventDefault();
                    if (this.dom.grooveSearchList.hidden) render();
                    activate(activeIndex+1);
                } else if (event.key==="ArrowUp") {
                    event.preventDefault();
                    if (this.dom.grooveSearchList.hidden) render();
                    activate(activeIndex-1);
                } else if (event.key==="Enter") {
                    if (!visible.length) return;
                    event.preventDefault();
                    choose(activeIndex>=0 ? activeIndex : 0);
                } else if (event.key==="Escape") {
                    event.preventDefault();
                    close();
                }
            });
            this.dom.grooveSearchList.addEventListener("pointerdown",event=>{
                const button=event.target.closest(".groove-search-result");
                if (!button) return;
                event.preventDefault();
                choose(Number(button.dataset.index));
            });
            document.addEventListener("pointerdown",event=>{
                if (!event.target.closest(".groove-search-wrap")) close();
            });
        }
        selectGlobalGroove(result) {
            if (!result) return;
            this.dom.presetSource.value=result.source;
            this.populateFamilies(result.source,result.familyIndex);
            this.populateGrooves(result.familyIndex,result.grooveIndex);
            if (this.previewEnabled) this.restartGroovePreview();
            this.dom.grooveSearch.value="";
            this.dom.grooveSearch.removeAttribute("aria-activedescendant");
        }
        selectedPresetData() {
            if (!this.dom.presetFamily || !this.dom.presetGroove) return null;
            const family = Number(this.dom.presetFamily.value) || 0;
            const groove = Number(this.dom.presetGroove.value) || 0;
            const info = this.seq.store.presets.meta?.[family]?.grooves?.[groove];
            if (!info) return null;
            const bank = this.seq.store.presets[family]?.[info.signatureIndex];
            const basePattern = bank?.[groove];
            if (!basePattern) return null;
            const entries = Array.isArray(info.memories) && info.memories.length
                ? info.memories.map(memory => ({ signatureIndex:memory.signatureIndex, pattern:memory.pattern }))
                : [{ signatureIndex:info.signatureIndex, pattern:basePattern }];
            return { family, groove, info, basePattern, entries };
        }
        addSelectedPatch() {
            const selected = this.selectedPresetData();
            if (!selected) return;
            // Loading a groove must never toggle FEEL or AUTO. Preserve both states exactly.
            const feelWasEnabled = this.feel.enabled;
            const autoWasEnabled = this.feel.auto;
            const startSlot = this.seq.memorySlot;
            const available = CONFIG.MEMORY_SLOTS - startSlot;
            const entries = selected.entries.slice(0, available);
            if (!entries.length) return;
            this.pushHistory();
            const previousSlots = this.seq.store.populated().filter(slot => slot < startSlot);
            const previousSlot = previousSlots.length ? previousSlots[previousSlots.length - 1] : null;
            const inheritedTempo = previousSlot === null ? null : this.seq.store.get(previousSlot)?.tempo;
            entries.forEach((entry, offset) => {
                this.feel.invalidate(startSlot + offset);
                this.seq.store.set(startSlot + offset, entry.signatureIndex, entry.pattern, inheritedTempo);
            });
            this.seq.loadSlot(startSlot);
            this.syncSchedulerStructure();
            this.buildGrid(); this.renderState(); this.makeKeyboardAccessible();
            // The newly loaded groove becomes the CORE for this memory, but FEEL/AUTO state is untouched.
            this.feel.invalidate(startSlot);
            this.feel.captureCore();
            this.feel.enabled = feelWasEnabled;
            this.feel.auto = feelWasEnabled ? autoWasEnabled : false;
            if (feelWasEnabled) {
                this.feel.familyName=this.seq.store.presets.meta?.[Number(this.dom.presetFamily?.value)||0]?.name || "";
                this.feel.apply();
                this.renderGrid();
                this.seq.saveSlot();
            }
            this.renderFeel();
            this.renderMemory();
            this.status(I18N.t("status.patchAdded", { count:entries.length, memory:startSlot + 1 }));
        }
        stopGroovePreview({ silent = false } = {}) {
            this.previewEnabled = false;
            clearTimeout(this.previewTimer); this.previewTimer = null;
            this.previewData = null;
            if (this.dom.groovePreview) {
                this.dom.groovePreview.classList.remove("bt-buttondown");
                this.dom.groovePreview.setAttribute("aria-pressed", "false");
            }
            if (!silent) this.status(I18N.t("status.previewStopped"));
        }
        async startGroovePreview() {
            const selected = this.selectedPresetData();
            if (!selected) return;
            if (this.scheduler?.playing) this.scheduler.stop();
            clearTimeout(this.previewTimer);
            const first = selected.entries[0];
            const normalized = this.seq.store.normalizePattern(first.pattern, first.signatureIndex);
            if (!normalized) return;
            await this.audio.resume();
            this.previewData = { signatureIndex:first.signatureIndex, pattern:normalized, tempo:normalized[3], swing:normalized[5] };
            this.previewEnabled = true; this.previewStep = 0;
            this.previewNextTime = this.audio.ensureContext().currentTime + 0.03;
            if (this.dom.groovePreview) {
                this.dom.groovePreview.classList.add("bt-buttondown");
                this.dom.groovePreview.setAttribute("aria-pressed", "true");
            }
            this.status(I18N.t("status.previewing", { groove:selected.info.name }));
            this.previewLoop();
        }
        restartGroovePreview() {
            if (!this.previewEnabled) return;
            this.startGroovePreview();
        }
        previewLoop() {
            if (!this.previewEnabled || !this.previewData) return;
            const ctx = this.audio.ensureContext();
            const signature = CONFIG.SIGNATURES[this.previewData.signatureIndex];
            const pattern = this.previewData.pattern;
            const cells = new Set(pattern[0]), accents = new Set(pattern[6]), soft = new Set(pattern[7]), strong = new Set(pattern[8] || []), ghost = new Set(pattern[9] || []);
            while (this.previewNextTime < ctx.currentTime + CONFIG.SCHEDULER.scheduleAheadSec) {
                const duration = 60 / Util.clamp(this.previewData.tempo, CONFIG.TEMPO.min, CONFIG.TEMPO.max, CONFIG.TEMPO.default) / 4;
                const swingDelay = this.previewStep % 2 === 1 ? duration * CONFIG.SWING.maxDelayRatio * (Util.clamp(this.previewData.swing, CONFIG.SWING.min, CONFIG.SWING.max, 0) / 100) : 0;
                const time = this.previewNextTime + swingDelay;
                for (let track = 0; track < CONFIG.TRACK_COUNT; track++) {
                    const cellIndex = track * signature.steps + this.previewStep;
                    if (!cells.has(cellIndex)) continue;
                    const velocity = accents.has(cellIndex) ? "accent" : strong.has(cellIndex) ? "strong" : soft.has(cellIndex) ? "soft" : ghost.has(cellIndex) ? "ghost" : "normal";
                    this.audio.play({
                        kitIndex:this.seq.kitIndex, trackIndex:track, sampleKey:this.seq.sampleForTrack(track), time,
                        trackVolume:this.seq.trackVolumes[track], masterVolume:this.seq.masterVolume, pan:this.seq.trackPans[track], velocity
                    });
                }
                this.previewNextTime += duration;
                this.previewStep = (this.previewStep + 1) % signature.steps;
            }
            this.previewTimer = setTimeout(() => this.previewLoop(), CONFIG.SCHEDULER.lookAheadMs);
        }
        toggleGroovePreview() {
            if (this.previewEnabled) this.stopGroovePreview();
            else this.startGroovePreview();
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
            if (!this.dom.grid.dataset.ctrlContextBound) {
                this.dom.grid.dataset.ctrlContextBound = "1";
                this.dom.grid.addEventListener("contextmenu", event => { if (event.ctrlKey || event.metaKey) event.preventDefault(); });
            }
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
                    cell.addEventListener("pointerdown", event => {
                        if (!event.altKey || event.button !== 0) return;
                        event.preventDefault();
                        this.gridDrag = {
                            pointerId:event.pointerId, sourceTrack:track, startX:event.clientX, startY:event.clientY,
                            before:this.captureState(), deltaSteps:0, deltaTracks:0, moved:false, wholeGrid:event.shiftKey
                        };
                        cell.setPointerCapture?.(event.pointerId);
                        this.dom.grid.classList.add("is-pattern-dragging");
                    });
                    cell.addEventListener("pointermove", event => {
                        const drag = this.gridDrag;
                        if (!drag || drag.pointerId !== event.pointerId) return;
                        event.preventDefault();
                        const rect = this.dom.grid.getBoundingClientRect();
                        const stepWidth = rect.width / steps;
                        const rowHeight = rect.height / CONFIG.TRACK_COUNT;
                        const deltaSteps = Math.round((event.clientX - drag.startX) / stepWidth);
                        const deltaTracks = Math.round((event.clientY - drag.startY) / rowHeight);
                        if (deltaSteps === drag.deltaSteps && deltaTracks === drag.deltaTracks) return;
                        drag.deltaSteps = deltaSteps; drag.deltaTracks = deltaTracks; drag.moved = drag.moved || !!deltaSteps || !!deltaTracks;
                        this.seq.signatureIndex = drag.before.signatureIndex;
                        this.seq.apply(drag.before.pattern);
                        if (drag.wholeGrid) {
                            this.seq.translateGrid(deltaTracks, deltaSteps);
                        } else {
                            const targetTrack = ((drag.sourceTrack + deltaTracks) % CONFIG.TRACK_COUNT + CONFIG.TRACK_COUNT) % CONFIG.TRACK_COUNT;
                            this.seq.translateTrack(drag.sourceTrack, targetTrack, deltaSteps);
                        }
                        this.renderGrid();
                    });
                    const finishDrag = event => {
                        const drag = this.gridDrag;
                        if (!drag || drag.pointerId !== event.pointerId) return;
                        event.preventDefault();
                        this.gridDrag = null;
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
                        } else {
                            this.seq.signatureIndex = drag.before.signatureIndex;
                            this.seq.apply(drag.before.pattern);
                            this.renderGrid();
                        }
                    };
                    cell.addEventListener("pointerup", finishDrag);
                    cell.addEventListener("pointercancel", finishDrag);
                    cell.addEventListener("click", event => {
                        if (this.suppressGridClick || event.altKey) { this.suppressGridClick = false; return; }
                        this.pushHistory();
                        if ((event.ctrlKey || event.metaKey) && event.shiftKey) {
                            const beatSize = this.seq.signature.group;
                            const offsetInBeat = step % beatSize;
                            for (let targetStep = offsetInBeat; targetStep < steps; targetStep += beatSize) {
                                const targetIndex = track * steps + targetStep;
                                this.seq.clearCell(targetIndex);
                                this.renderCell(targetIndex);
                            }
                            this.autoSaveMemory();
                            this.status(I18N.t("grid.deleteBeatStatus", { position:offsetInBeat + 1, beatSize }));
                            return;
                        }
                        if (event.ctrlKey || event.metaKey) {
                            this.seq.clearCell(index);
                            this.renderCell(index);
                            this.autoSaveMemory();
                            this.status(I18N.t("grid.deleteCellStatus"));
                            return;
                        }
                        if (event.shiftKey) {
                            const beatSize = this.seq.signature.group;
                            const offsetInBeat = step % beatSize;
                            for (let targetStep = offsetInBeat; targetStep < steps; targetStep += beatSize) {
                                const targetIndex = track * steps + targetStep;
                                this.seq.cycleCell(targetIndex);
                                this.renderCell(targetIndex);
                            }
                            this.autoSaveMemory();
                            this.status(I18N.t("grid.repeatBeatStatus", { position:offsetInBeat + 1, beatSize }));
                            return;
                        }
                        this.seq.cycleCell(index);
                        this.renderCell(index);
                        this.autoSaveMemory();
                    });
                    cell.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); cell.click(); } });
                    this.dom.grid.appendChild(cell); this.cells.push(cell);
                }
            }
        }
        autoSaveMemory() {
            // Memory always mirrors the visible grid immediately, regardless of FEEL/AUTO state.
            this.seq.saveSlot();
            // While FEEL is OFF, manual edits are the new musical truth. Keep the hidden CORE
            // synchronized so re-enabling FEEL starts from the latest edited memory, never stale data.
            if (!this.feel.enabled) this.feel.captureCore({ inferLayers:false });
            this.renderMemory();
        }
        selectMemorySlot(index) {
            const slot = Math.round(Util.clamp(index, 0, CONFIG.MEMORY_SLOTS - 1, 0));
            this.seq.loadSlot(slot);
            this.syncSchedulerStructure();
            this.buildGrid();
            this.renderState();
            this.makeKeyboardAccessible();
            this.status(I18N.t("memory.selectedStatus", { n:slot + 1 }));
        }
        copyCurrentPattern() {
            this.copySnapshot = this.seq.snapshot();
            this.status(I18N.t("status.patternCopied"));
        }
        pastePatternToCurrentMemory() {
            if (!this.copySnapshot) { this.status(I18N.t("status.nothingToPaste")); return; }
            const before = this.captureState();
            this.feel.invalidate(this.seq.memorySlot);
            this.seq.store.set(this.seq.memorySlot, this.seq.signatureIndex, this.copySnapshot);
            this.seq.loadSlot(this.seq.memorySlot);
            this.syncSchedulerStructure();
            this.pushHistory(before);
            this.renderState();
            this.status(I18N.t("status.patternPasted", { n:this.seq.memorySlot + 1 }));
        }
        duplicateToNextMemory() {
            const next = (this.seq.memorySlot + 1) % CONFIG.MEMORY_SLOTS;
            const snapshot = this.seq.snapshot();
            this.feel.invalidate(next);
            this.seq.store.set(next, this.seq.signatureIndex, snapshot);
            this.seq.loadSlot(next);
            this.syncSchedulerStructure();
            this.buildGrid();
            this.renderState();
            this.makeKeyboardAccessible();
            this.status(I18N.t("status.patternDuplicated", { n:next + 1 }));
        }
        bindControls() {
            this.press(this.dom.clear, () => { this.pushHistory(); this.feel.invalidate(); this.seq.clear(); this.resetPresetSelectors(); this.renderGrid(); this.autoSaveMemory(); });
            const applySignature = () => { const n=Number(this.dom.signatureNumerator?.value), d=Number(this.dom.signatureDenominator?.value); const before=this.captureState(); if(this.seq.setSignature(n,d,true)){ this.pushHistory(before); this.syncSchedulerStructure(); this.buildGrid(); this.renderState(); this.makeKeyboardAccessible(); this.autoSaveMemory(); } };
            this.dom.signatureNumerator?.addEventListener("change", applySignature);
            this.dom.signatureDenominator?.addEventListener("change", applySignature);
            this.dom.metro.addEventListener("pointerdown", e => { e.preventDefault(); this.seq.metronomeEnabled = !this.seq.metronomeEnabled; this.preferences?.setAudio({ metronomeEnabled:this.seq.metronomeEnabled }); this.renderButtons(); });
            this.dom.chain.addEventListener("pointerdown", e => { e.preventDefault(); if (this.seq.store.populated().length >= 2) this.seq.chainEnabled = !this.seq.chainEnabled; this.renderButtons(); });
            this.dom.play.addEventListener("pointerdown", async e => {
                e.preventDefault();
                if (this.scheduler.playing) {
                    // Stoppe uniquement le transport. Le mode Practice reste armé
                    // tant que son panneau reste ouvert.
                    this.scheduler.stop();
                    return;
                }
                if (this.previewEnabled) this.stopGroovePreview({ silent:true });
                if (this.dom.practicePanel && !this.dom.practicePanel.hidden) {
                    this.practice.start({
                        mode:this.dom.practiceMode.value,
                        startTempo:Number(this.dom.practiceStartTempo.value),
                        targetTempo:Number(this.dom.practiceTargetTempo.value),
                        tempoStep:Number(this.dom.practiceTempoStep.value),
                        loopsPerLevel:Number(this.dom.practiceLoops.value),
                        countInBars:Number(this.dom.practiceCountIn.value)
                    });
                }
                await this.scheduler.start();
            });
            this.bindTempo(this.dom.minus, -1); this.bindTempo(this.dom.plus, 1);
            if (this.dom.tap) this.press(this.dom.tap, () => this.handleTapTempo());
            if (this.dom.presetSource) this.dom.presetSource.addEventListener("change", () => {
                this.populateFamilies(this.dom.presetSource.value);
                if (this.previewEnabled) this.restartGroovePreview();
            });
            if (this.dom.presetFamily) this.dom.presetFamily.addEventListener("change", () => {
                const family = Number(this.dom.presetFamily.value) || 0;
                this.populateGrooves(family, 0);
                if (this.previewEnabled) this.restartGroovePreview();
            });
            if (this.dom.presetGroove) this.dom.presetGroove.addEventListener("change", () => { if (this.previewEnabled) this.restartGroovePreview(); });
            if (this.dom.groovePreview) this.press(this.dom.groovePreview, () => this.toggleGroovePreview());
            if (this.dom.grooveAdd) this.press(this.dom.grooveAdd, () => this.addSelectedPatch());
            const shiftGrid = (direction, event) => {
                this.pushHistory();
                const amount = event?.shiftKey ? this.seq.signature.group : 1;
                this.seq.shiftAllTracks(direction * amount);
                this.renderGrid();
                this.autoSaveMemory();
                this.status(I18N.t("status.gridShifted", { direction:I18N.t(direction < 0 ? "status.left" : "status.right"), amount:amount === 1 ? "1 step" : "1 beat" }));
            };
            this.dom.gridShiftLeft?.addEventListener("click", event => { event.preventDefault(); shiftGrid(-1, event); });
            this.dom.gridShiftRight?.addEventListener("click", event => { event.preventDefault(); shiftGrid(1, event); });
            const shiftGridTracks = direction => {
                this.pushHistory();
                this.seq.translateGrid(direction, 0);
                this.renderGrid();
                this.autoSaveMemory();
                this.status(direction < 0 ? "Grille décalée d’une piste vers le haut." : "Grille décalée d’une piste vers le bas.");
            };
            this.dom.gridShiftUp?.addEventListener("click", event => { event.preventDefault(); shiftGridTracks(-1); });
            this.dom.gridShiftDown?.addEventListener("click", event => { event.preventDefault(); shiftGridTracks(1); });
            this.press(this.dom.random, () => this.setFeelEnabled(!this.feel.enabled));
            if (this.dom.cacheClear) this.press(this.dom.cacheClear, () => {
                this.seq.store.resetMemories();
                this.feel.cores.clear(); this.feel.invalidate();
                this.seq.memorySlot = 0;
                this.seq.loadSlot(0);
                this.syncSchedulerStructure();
                this.seq.chainEnabled = false;
                this.undoStack.length = 0;
                this.redoStack.length = 0;
                this.buildGrid();
                this.renderState();
                this.makeKeyboardAccessible();
                this.status(I18N.t("status.memoriesReset"));
            });
            if (this.dom.undo) this.press(this.dom.undo, () => this.undo());
            if (this.dom.redo) this.press(this.dom.redo, () => this.redo());
            if (this.dom.tempo) {
                const commitTempo = () => {
                    this.seq.tempo = Math.round(Util.clamp(Number(this.dom.tempo.value), CONFIG.TEMPO.min, CONFIG.TEMPO.max, CONFIG.TEMPO.default));
                    this.renderTempo();
                    this.autoSaveMemory();
                };
                this.dom.tempo.addEventListener("change", commitTempo);
                this.dom.tempo.addEventListener("keydown", e => { if (e.key === "Enter") { commitTempo(); this.dom.tempo.blur(); } });
                this.bindNumberWheel(this.dom.tempo, 1, CONFIG.TEMPO.min, CONFIG.TEMPO.max, value => { this.seq.tempo = value; this.renderTempo(); this.autoSaveMemory(); });
            }
            if (this.dom.swingInput) {
                const commitSwing = () => {
                    this.seq.swing = Math.round(Util.clamp(Number(this.dom.swingInput.value), CONFIG.SWING.min, CONFIG.SWING.max, CONFIG.SWING.default));
                    this.renderSwing();
                };
                this.dom.swingInput.addEventListener("input", commitSwing);
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
                if (e.target === this.dom.grooveSearch && e.code === "Space") return;
                if (e.code === "Space" && !mod && !e.altKey) { e.preventDefault(); if (this.previewEnabled) this.stopGroovePreview({ silent:true }); this.scheduler.toggle(); return; }
                if (editing || mod || e.altKey) return;
                if (/^[1-8]$/.test(e.key)) { e.preventDefault(); this.selectMemorySlot(Number(e.key) - 1); return; }
                if (key === "t") { e.preventDefault(); this.handleTapTempo(); return; }
                if (key === "m") { e.preventDefault(); this.seq.metronomeEnabled = !this.seq.metronomeEnabled; this.preferences?.setAudio({ metronomeEnabled:this.seq.metronomeEnabled }); this.renderButtons(); return; }
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
            this.preferences?.setAudio({ masterVolume:this.seq.masterVolume });
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
            this.autoSaveMemory();
        }
        bindTempo(button, delta) {
            let timer = null;
            const change = () => { this.seq.tempo = Math.round(Util.clamp(this.seq.tempo + delta, CONFIG.TEMPO.min, CONFIG.TEMPO.max, CONFIG.TEMPO.default)); this.renderTempo(); this.autoSaveMemory(); };
            button.addEventListener("pointerdown", e => { e.preventDefault(); button.classList.add("bt-buttondown"); change(); timer = setTimeout(function repeat(){ change(); timer=setTimeout(repeat,80); },500); });
            ["pointerup","pointerleave","pointercancel"].forEach(type => button.addEventListener(type, () => { clearTimeout(timer); button.classList.remove("bt-buttondown"); }));
        }
        press(button, action) {
            button.addEventListener("pointerdown", e => { e.preventDefault(); button.classList.add("bt-buttondown"); action(); });
            ["pointerup","pointerleave","pointercancel"].forEach(type => button.addEventListener(type, () => button.classList.remove("bt-buttondown")));
        }
        bindUnlock() {
            const unlock = async () => { try { this.status(I18N.t("status.loadingAudio")); await this.audio.resume(); const buffers = await this.audio.preloadTracks(this.seq.currentTrackSamples()); const missing = buffers.filter(Boolean).length !== buffers.length; this.status(missing ? "Kit chargé partiellement : certains samples sont indisponibles." : "Kit audio prêt."); } catch (e) { console.warn(e); this.status(`Erreur audio : ${e.message || e}`); } };
            ["pointerdown","keydown","touchstart"].forEach(type => document.addEventListener(type, unlock, { once: true, passive: true }));
        }
        renderState() { this.renderSignature(); this.renderTempo(); this.renderKit(); this.renderGrid(); this.renderSliders(); this.renderSwing(); this.renderTrackControls(); this.renderMemory(); this.renderButtons(); this.renderPractice(); this.renderFeel(); }
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
            const label=I18N.t(accent?"note.accent":strong?"note.strong":soft?"note.soft":ghost?"note.ghost":on?"note.normal":"note.off"); cell.setAttribute("aria-label", I18N.t("note.aria", { level:label }));
        }
        renderGrid() { this.cells.forEach((cell,i)=>this.renderCell(i)); }
        renderTrackControls() {
            this.trackMuteButtons.forEach((b,i)=>{ const active=!!this.seq.trackMuted[i]; b.classList.toggle("active", active); b.setAttribute("aria-pressed", String(active)); b.setAttribute("aria-label", I18N.t("track.mute", { n:i + 1 })); });
            this.trackSoloButtons.forEach((b,i)=>{ const active=!!this.seq.trackSolo[i]; b.classList.toggle("active", active); b.setAttribute("aria-pressed", String(active)); b.setAttribute("aria-label", I18N.t("track.solo", { n:i + 1 })); });
        }
        renderSwing() {
            if (this.dom.swingInput) this.dom.swingInput.value = String(this.seq.swing);
            if (this.dom.swingValue) this.dom.swingValue.textContent = `${Math.round(this.seq.swing)}%`;
        }
        renderMaster() {
            if (!this.dom.masterButton) return;
            const value = Util.clamp(this.seq.masterVolume, 0, 1, 1);
            const state = value <= 0.1 ? "off" : value < 0.75 ? "low" : "high";
            const label = I18N.t(state === "off" ? "master.off" : state === "low" ? "master.low" : "master.high");
            const icon = state === "off" ? "fa-volume-xmark" : state === "low" ? "fa-volume-low" : "fa-volume-high";
            this.dom.masterButton.classList.remove("volume-off", "volume-low", "volume-high");
            this.dom.masterButton.classList.add(`volume-${state}`);
            if (this.dom.masterIcon) this.dom.masterIcon.className = `fa-solid ${icon}`;
            this.dom.masterButton.setAttribute("aria-label", I18N.t("master.tooltip", { level:label }));
            this.dom.masterButton.dataset.btTooltip = I18N.t("master.tooltip", { level:label });
            this.syncUiStore();
        }
        renderSliders() {
            this.trackPanKnobs?.forEach((knob,i)=>knob?._setRotaryValue?.(this.seq.trackPans[i]));
            this.trackVolumeKnobs?.forEach((knob,i)=>knob?._setRotaryValue?.(this.seq.trackVolumes[i]));
            this.renderMaster();
        }
        renderMemory() {
            this.memoryButtons.forEach((b,i)=>{
                const saved = !!this.seq.store.get(i);
                const selected = i === this.seq.memorySlot;
                b.classList.toggle("bt-buttondown", selected);
                b.classList.toggle("memory-selected", selected);
                b.classList.toggle("memory-saved", saved);
                b.classList.toggle("memory-empty", !saved);
                b.dataset.btTooltip = `${I18N.t("memory.slot", { n:i + 1 })} — ${saved ? I18N.t("memory.saved") : I18N.t("memory.empty")}${selected ? ` — ${I18N.t("memory.selected")}` : ""} — ${i + 1}`;
                b.setAttribute("aria-label", b.dataset.btTooltip);
                b.setAttribute("aria-pressed", String(selected));
            });
            if (this.seq.store.populated().length < 2) this.seq.chainEnabled = false;
            this.syncUiStore();
        }
        renderButtons() {
            this.dom.metro.setAttribute("aria-pressed", String(this.seq.metronomeEnabled));
            this.dom.metro.classList.toggle("bt-buttondown", this.seq.metronomeEnabled);
            this.dom.chain.setAttribute("aria-pressed", String(this.seq.chainEnabled));
            this.dom.chain.classList.toggle("bt-buttondown", this.seq.chainEnabled);
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
            this.autoSaveMemory();
            this.status(I18N.t("status.undo"));
        }
        redo() {
            if (!this.redoStack.length) return;
            this.undoStack.push(this.captureState());
            this.restoreState(this.redoStack.pop());
            this.autoSaveMemory();
            this.status(I18N.t("status.redo"));
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
            this.dom.play.setAttribute("aria-label", value ? I18N.t("transport.stop") : I18N.t("transport.play"));
            this.dom.play.setAttribute("aria-pressed", String(value));
            this.dom.play.classList.toggle("bt-buttondown", value);
            if (this.dom.icon) {
                this.dom.icon.classList.toggle("fa-play", !value);
                this.dom.icon.classList.toggle("fa-stop", value);
                this.dom.icon.classList.remove("fa-pause");
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
            I18N.init();
            const presets = createFactoryPresets();
            const storage = new StorageManager("mem");
            const store = new PatternStore(storage, presets);
            // Les 8 mémoires sont autonomes : chacune transporte signature, tempo et pattern.
            storage.save(store.slots);
            const sequencer = new Sequencer(store);
            const first = store.populated()[0] ?? 0;
            sequencer.loadSlot(first);
            const preferences = new UserPreferences();
            sequencer.masterVolume = preferences.data.audio.masterVolume;
            sequencer.metronomeEnabled = preferences.data.audio.metronomeEnabled;
            const audio = new AudioEngine();
            const practice = new PracticeController(sequencer, audio, preferences);
            const ui = new UIController(sequencer, audio, practice, preferences);
            const scheduler = new Scheduler(audio, sequencer, ui, practice);
            practice.attach(ui, scheduler);
            ui.init(scheduler);
            try {
                const params = new URLSearchParams(location.hash.slice(1));
                const encodedState = params.get("state");
                if (encodedState) ui.restorePageState(ui.expandPageState(StorageManager.decode(encodedState)));
            } catch (error) {
                console.warn("État complet de page invalide, réglages par défaut conservés.", error);
            }
            window.Battrochtek = { CONFIG, TRACK_ROLES, store, sequencer, audio, scheduler, practice, ui, preferences };
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
