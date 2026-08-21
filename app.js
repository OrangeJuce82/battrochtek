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

    const I18N_RESOURCES = Object.freeze({
        fr: { translation: {
            "toolbar.source":"SOURCE", "toolbar.style":"STYLE", "toolbar.groove":"GROOVE", "toolbar.variant":"VARIANTE", "toolbar.swing":"SWING",
            "search.placeholder":"Rechercher un groove…", "search.aria":"Rechercher dans tous les grooves", "search.results":"Résultats de recherche", "common.off":"Off", "language.tooltip":"Langue", "theme.toggle":"Basculer le thème clair / sombre", "share.tooltip":"Partager ou sauvegarder ce groove", "audio.output":"Niveau de sortie audio", "audio.outputAria":"VU-mètre de sortie", "toolbar.sourceTooltip":"Source des grooves", "toolbar.styleTooltip":"Style musical", "toolbar.grooveTooltip":"Groove", "toolbar.reload":"Recharger le groove original", "toolbar.variantTooltip":"Créer une variante musicale du groove courant", "kit.tooltip":"Kit de batterie", "swing.tooltip":"Swing en pourcentage", "transport.playPause":"Lecture / stop (Espace)","transport.stop":"Stop", "transport.tap":"Tap tempo (T)", "transport.tempoDown":"Diminuer le tempo", "transport.tempoUp":"Augmenter le tempo", "transport.tempo":"Tempo en BPM", "transport.signature":"Signature rythmique", "practice.countIn":"COUNT-IN", "memory.chain":"Chaîner les mémoires", "memory.undo":"Annuler", "memory.redo":"Rétablir", "memory.save":"Sauvegarder dans la mémoire sélectionnée (Ctrl+S)", "memory.new":"Nouveau pattern vierge", "memory.clear":"Vider les mémoires",
            "practice.title":"Entraînement", "practice.subtitle":"Travaille le groove par tempo ou par couches.", "practice.progression":"PROGRESSION", "practice.modeTempo":"Tempo", "practice.modeLayers":"Couches", "practice.modeCombined":"Couches + tempo", "practice.start":"DÉPART", "practice.target":"OBJECTIF", "practice.step":"PALIER", "practice.loops":"TOURS / NIVEAU", "practice.oneBar":"1 mesure", "practice.twoBars":"2 mesures", "practice.startButton":"Démarrer", "practice.stopButton":"Arrêter", "practice.ready":"Prêt à démarrer", "practice.explainer":"Couches : charley → caisse claire → kick → autres éléments du groove → accents → ghost notes.",
            "practice.hihat":"Charley", "practice.snare":"Charley + caisse claire", "practice.kick":"Charley + caisse claire + kick", "practice.accents":"+ accents", "practice.ghosts":"+ ghost notes", "practice.tempoStatus":"{{tempo}} → {{target}} BPM", "practice.loop":"tour {{current}}/{{total}}", "practice.started":"Entraînement démarré à {{tempo}} BPM.", "practice.stopped":"Entraînement arrêté.", "practice.targetReached":"Objectif atteint : {{tempo}} BPM. On continue.", "practice.layersDone":"Toutes les couches sont en place.", "practice.layersToTempo":"Couches acquises. Progression tempo vers {{target}} BPM.", "practice.level":"Entraînement : {{label}}.", "practice.tempo":"Entraînement : {{tempo}} BPM.",
            "track.crash":"Crash", "track.ride":"Ride", "track.openHat":"HH ouvert", "track.closedHat":"HH fermé", "track.snare":"Caisse claire", "track.tomHigh":"Tom aigu", "track.tomMid":"Tom médium", "track.tomFloor":"Tom basse", "track.kick":"Kick",
            "language.label":"Langue", "common.close":"Fermer", "share.title":"Partager ce groove", "share.subtitle":"Le lien contient l’état complet de la page. Scanne-le, partage-le ou enregistre-le dans tes favoris.", "share.link":"LIEN", "share.copy":"Copier le lien", "share.share":"Partager", "transport.metronome":"Métronome (M)", "transport.practice":"Entraînement", "transport.play":"Lecture", "transport.pause":"Pause", "transport.practice":"Entraînement", "memory.slot":"Mémoire {{n}}", "memory.saved":"sauvegardée", "memory.empty":"vide", "memory.selected":"sélectionnée"
        }},
        en: { translation: {
            "toolbar.source":"SOURCE", "toolbar.style":"STYLE", "toolbar.groove":"GROOVE", "toolbar.variant":"VARIATION", "toolbar.swing":"SWING",
            "search.placeholder":"Search grooves…", "search.aria":"Search all grooves", "search.results":"Search results", "common.off":"Off", "language.tooltip":"Language", "theme.toggle":"Toggle light / dark theme", "share.tooltip":"Share or save this groove", "audio.output":"Audio output level", "audio.outputAria":"Output VU meter", "toolbar.sourceTooltip":"Groove source", "toolbar.styleTooltip":"Music style", "toolbar.grooveTooltip":"Groove", "toolbar.reload":"Reload original groove", "toolbar.variantTooltip":"Create a musical variation of the current groove", "kit.tooltip":"Drum kit", "swing.tooltip":"Swing percentage", "transport.playPause":"Play / stop (Space)","transport.stop":"Stop", "transport.tap":"Tap tempo (T)", "transport.tempoDown":"Decrease tempo", "transport.tempoUp":"Increase tempo", "transport.tempo":"Tempo in BPM", "transport.signature":"Time signature", "practice.countIn":"COUNT-IN", "memory.chain":"Chain memories", "memory.undo":"Undo", "memory.redo":"Redo", "memory.save":"Save to selected memory (Ctrl+S)", "memory.new":"New empty pattern", "memory.clear":"Clear memories",
            "practice.title":"Practice", "practice.subtitle":"Practice the groove by tempo or by layers.", "practice.progression":"PROGRESSION", "practice.modeTempo":"Tempo", "practice.modeLayers":"Layers", "practice.modeCombined":"Layers + tempo", "practice.start":"START", "practice.target":"TARGET", "practice.step":"STEP", "practice.loops":"LOOPS / LEVEL", "practice.oneBar":"1 bar", "practice.twoBars":"2 bars", "practice.startButton":"Start", "practice.stopButton":"Stop", "practice.ready":"Ready to start", "practice.explainer":"Layers: hi-hat → snare → kick → other groove parts → accents → ghost notes.",
            "practice.hihat":"Hi-hat", "practice.snare":"Hi-hat + snare", "practice.kick":"Hi-hat + snare + kick", "practice.accents":"+ accents", "practice.ghosts":"+ ghost notes", "practice.tempoStatus":"{{tempo}} → {{target}} BPM", "practice.loop":"loop {{current}}/{{total}}", "practice.started":"Practice started at {{tempo}} BPM.", "practice.stopped":"Practice stopped.", "practice.targetReached":"Target reached: {{tempo}} BPM. Keep going.", "practice.layersDone":"All layers are active.", "practice.layersToTempo":"Layers complete. Tempo progression to {{target}} BPM.", "practice.level":"Practice: {{label}}.", "practice.tempo":"Practice: {{tempo}} BPM.",
            "track.crash":"Crash", "track.ride":"Ride", "track.openHat":"Open HH", "track.closedHat":"Closed HH", "track.snare":"Snare", "track.tomHigh":"High Tom", "track.tomMid":"Mid Tom", "track.tomFloor":"Floor Tom", "track.kick":"Kick",
            "language.label":"Language", "common.close":"Close", "share.title":"Share this groove", "share.subtitle":"The link contains the complete page state. Scan it, share it or save it to your favorites.", "share.link":"LINK", "share.copy":"Copy link", "share.share":"Share", "transport.metronome":"Metronome (M)", "transport.practice":"Practice", "transport.play":"Play", "transport.pause":"Pause", "transport.practice":"Practice", "memory.slot":"Memory {{n}}", "memory.saved":"saved", "memory.empty":"empty", "memory.selected":"selected"
        }},
        es: { translation: {
            "toolbar.source":"FUENTE", "toolbar.style":"ESTILO", "toolbar.groove":"GROOVE", "toolbar.variant":"VARIACIÓN", "toolbar.swing":"SWING",
            "search.placeholder":"Buscar grooves…", "search.aria":"Buscar en todos los grooves", "search.results":"Resultados de búsqueda", "common.off":"Off", "language.tooltip":"Idioma", "theme.toggle":"Cambiar tema claro / oscuro", "share.tooltip":"Compartir o guardar este groove", "audio.output":"Nivel de salida de audio", "audio.outputAria":"VU-metro de salida", "toolbar.sourceTooltip":"Fuente de grooves", "toolbar.styleTooltip":"Estilo musical", "toolbar.grooveTooltip":"Groove", "toolbar.reload":"Recargar el groove original", "toolbar.variantTooltip":"Crear una variación musical del groove actual", "kit.tooltip":"Kit de batería", "swing.tooltip":"Swing en porcentaje", "transport.playPause":"Reproducir / stop (Espacio)","transport.stop":"Stop", "transport.tap":"Tap tempo (T)", "transport.tempoDown":"Disminuir tempo", "transport.tempoUp":"Aumentar tempo", "transport.tempo":"Tempo en BPM", "transport.signature":"Compás", "practice.countIn":"COUNT-IN", "memory.chain":"Encadenar memorias", "memory.undo":"Deshacer", "memory.redo":"Rehacer", "memory.save":"Guardar en la memoria seleccionada (Ctrl+S)", "memory.new":"Nuevo patrón vacío", "memory.clear":"Vaciar memorias",
            "practice.title":"Práctica", "practice.subtitle":"Practica el groove por tempo o por capas.", "practice.progression":"PROGRESIÓN", "practice.modeTempo":"Tempo", "practice.modeLayers":"Capas", "practice.modeCombined":"Capas + tempo", "practice.start":"INICIO", "practice.target":"OBJETIVO", "practice.step":"PASO", "practice.loops":"VUELTAS / NIVEL", "practice.oneBar":"1 compás", "practice.twoBars":"2 compases", "practice.startButton":"Empezar", "practice.stopButton":"Parar", "practice.ready":"Listo para empezar", "practice.explainer":"Capas: charles → caja → bombo → otras partes del groove → acentos → ghost notes.",
            "practice.hihat":"Charles", "practice.snare":"Charles + caja", "practice.kick":"Charles + caja + bombo", "practice.accents":"+ acentos", "practice.ghosts":"+ ghost notes", "practice.tempoStatus":"{{tempo}} → {{target}} BPM", "practice.loop":"vuelta {{current}}/{{total}}", "practice.started":"Práctica iniciada a {{tempo}} BPM.", "practice.stopped":"Práctica detenida.", "practice.targetReached":"Objetivo alcanzado: {{tempo}} BPM. Continúa.", "practice.layersDone":"Todas las capas están activas.", "practice.layersToTempo":"Capas completadas. Progresión de tempo hasta {{target}} BPM.", "practice.level":"Práctica: {{label}}.", "practice.tempo":"Práctica: {{tempo}} BPM.",
            "track.crash":"Crash", "track.ride":"Ride", "track.openHat":"Charles abierto", "track.closedHat":"Charles cerrado", "track.snare":"Caja", "track.tomHigh":"Tom agudo", "track.tomMid":"Tom medio", "track.tomFloor":"Tom base", "track.kick":"Bombo",
            "language.label":"Idioma", "common.close":"Cerrar", "share.title":"Compartir este groove", "share.subtitle":"El enlace contiene el estado completo de la página. Escanéalo, compártelo o guárdalo en tus favoritos.", "share.link":"ENLACE", "share.copy":"Copiar enlace", "share.share":"Compartir", "transport.metronome":"Metrónomo (M)", "transport.practice":"Práctica", "transport.play":"Reproducir", "transport.pause":"Pausa", "transport.practice":"Práctica", "memory.slot":"Memoria {{n}}", "memory.saved":"guardada", "memory.empty":"vacía", "memory.selected":"seleccionada"
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
                    attribution:groove.attribution||"", origin:groove.origin||"",
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
            if (meta && pattern) slots[0]={signatureIndex:meta.signatureIndex,pattern:this.normalizePattern(pattern,meta.signatureIndex)};
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
        replaceMemories(entries = []) {
            this.slots = Array(CONFIG.MEMORY_SLOTS);
            entries.slice(0, CONFIG.MEMORY_SLOTS).forEach((entry, slot) => {
                if (!entry || !Number.isInteger(entry.signatureIndex) || !Array.isArray(entry.pattern)) return;
                const pattern = this.normalizePattern(entry.pattern, entry.signatureIndex);
                if (pattern) this.slots[slot] = { signatureIndex:entry.signatureIndex, pattern };
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
        async play({ kitIndex, trackIndex, sampleKey = null, time, trackVolume = 1, masterVolume = 1, pan = 0, velocity = "normal" }) {
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
        loadPreset(bankIndex, presetIndex) {
            const info = this.store.presets.meta?.[bankIndex]?.grooves?.[presetIndex];
            if (!info) return false;
            const bank = this.store.presets[bankIndex]?.[info.signatureIndex];
            const pattern = bank?.[presetIndex];
            if (!pattern) return false;
            if (info.source === "basic") this.store.replaceMemories([{ signatureIndex:info.signatureIndex, pattern }]);
            else if (Array.isArray(info.memories) && info.memories.length) this.store.replaceMemories(info.memories);
            else this.store.replaceMemories([{ signatureIndex:info.signatureIndex, pattern }]);
            this.memorySlot = 0;
            this.loadSlot(0);
            return true;
        }
        reloadPresetMemory(bankIndex, presetIndex) {
            const info = this.store.presets.meta?.[bankIndex]?.grooves?.[presetIndex];
            if (!info) return false;

            const slot = this.memorySlot;
            const bank = this.store.presets[bankIndex]?.[info.signatureIndex];
            const basePattern = bank?.[presetIndex];
            if (!basePattern) return false;

            const sourceMemory = Array.isArray(info.memories) && info.memories.length
                ? (info.memories[slot] || info.memories[0])
                : null;
            const signatureIndex = sourceMemory?.signatureIndex ?? info.signatureIndex;
            const sourcePattern = sourceMemory?.pattern || basePattern;
            const pattern = this.store.normalizePattern(sourcePattern, signatureIndex);
            if (!pattern) return false;

            this.store.set(slot, signatureIndex, pattern);
            this.loadSlot(slot);
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


    class PracticeController {
        constructor(sequencer, audio) {
            this.seq = sequencer;
            this.audio = audio;
            this.ui = null;
            this.scheduler = null;
            this.enabled = false;
            this.mode = "tempo";
            this.startTempo = 60;
            this.targetTempo = 90;
            this.tempoStep = 3;
            this.loopsPerLevel = 4;
            this.countInBars = 1;
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
        }
        start(options = {}) {
            this.configure(options);
            this.enabled = true;
            this.resetForTransport({ announce:false });
            this.ui?.renderButtons();
            this.ui?.renderPractice();
            this.ui?.status(I18N.t("practice.started", { tempo:this.startTempo }));
        }
        stop({ silent = false } = {}) {
            if (!this.enabled) return;
            this.enabled = false;
            this.loopCount = 0;
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
                this.audio.play({
                    kitIndex: this.seq.kitIndex,
                    trackIndex: track,
                    sampleKey: this.seq.sampleForTrack(track),
                    time,
                    trackVolume: this.seq.trackVolumes[track],
                    masterVolume: this.seq.masterVolume,
                    pan: this.seq.trackPans[track],
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
            return { v:3, s:slots.map(entry => entry ? [entry.signatureIndex, this.packPattern(entry.pattern)] : null) };
        }
        load(defaults) {
            try {
                const params = new URLSearchParams(location.hash.slice(1));
                const encoded = params.get(this.key);
                if (!encoded) return defaults;
                const payload = StorageManager.decode(encoded);
                if (payload?.v === 3 && Array.isArray(payload.s)) return payload.s.map(entry => entry ? { signatureIndex:entry[0], pattern:StorageManager.unpackPattern(entry[1]) } : null);
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
        constructor(seq, audio, practice = null) {
            this.seq = seq; this.audio = audio; this.practice = practice; this.scheduler = null;
            this.cells = []; this.memoryButtons = []; this.trackLabels = []; this.trackRows = []; this.trackSampleSelects = []; this.trackMuteButtons = []; this.trackSoloButtons = []; this.trackShiftLeftButtons = []; this.trackShiftRightButtons = []; this.trackPanKnobs = []; this.trackVolumeKnobs = []; this.kitButtons = [];
            this.copySnapshot = null; this.playheadTimeouts = []; this.tapTimes = []; this.meterFrame = null; this.gridDrag = null; this.suppressGridClick = false;
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
                masterButton: $("master-level"), masterIcon: $("master-level-icon"), swingInput: $("swing-input"), vu: $("vu-meter"), presetSource: $("preset-source"), presetFamily: $("preset-family"), presetGroove: $("preset-groove"), grooveRefresh: $("groove-refresh"), gridShiftLeft: $("grid-shift-left"), gridShiftRight: $("grid-shift-right"), memory: $("memory"), clear: $("clear"), signatureButton: $("signature-button"),
                signature: $("signature"), signatureNumerator: $("signature-numerator"), signatureDenominator: $("signature-denominator"), metro: $("metronome-button"), chain: $("chain"), play: $("play-button"), icon: $("play-pause-icon"),
                minus: $("minus-button"), plus: $("plus-button"), tap: $("tap-tempo"), tempo: $("metronome-tempo"), random: $("random"), save: $("save"),
                undo: $("undo"), redo: $("redo"), practiceButton: $("practice-button"), practicePanel: $("practice-panel"), practiceMode: $("practice-mode"), practiceStartTempo: $("practice-start-tempo"), practiceTargetTempo: $("practice-target-tempo"), practiceTempoStep: $("practice-tempo-step"), practiceLoops: $("practice-loops"), practiceCountIn: $("practice-count-in"), practiceStatus: $("practice-status"), kitSelect: $("kit-select"), cacheClear: $("cache-clear"), languageSelect: $("language-select"), themeToggle: $("theme-toggle"), themeIcon: $("theme-toggle-icon"), themeColorMeta: $("theme-color-meta"),
                grooveSearch: $("groove-search"), grooveSearchList: $("groove-search-list"), shareButton: $("share-button"), shareDialog: $("share-dialog"), shareClose: $("share-close"), shareQr: $("share-qr"), shareQrError: $("share-qr-error"), shareUrl: $("share-url"), shareCopy: $("share-copy"), shareNative: $("share-native")
            };
        }
        init(scheduler) {
            this.scheduler = scheduler;
            this.setupLanguage(); this.setupTheme(); this.setupShare(); this.setupPractice(); this.buildKits(); this.buildTrackLabels(); this.buildMemory(); this.buildSliders(); this.buildGrid(); this.buildPresetSelector(); this.buildGlobalSearch(); this.bindControls(); this.bindUnlock(); this.startVuMeter(); this.renderState(); this.makeKeyboardAccessible();
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
                    panel: !!this.dom.practicePanel && !this.dom.practicePanel.hidden,
                    enabled: !!this.practice.enabled,
                    mode: this.dom.practiceMode?.value || this.practice.mode,
                    startTempo: Number(this.dom.practiceStartTempo?.value || this.practice.startTempo),
                    targetTempo: Number(this.dom.practiceTargetTempo?.value || this.practice.targetTempo),
                    tempoStep: Number(this.dom.practiceTempoStep?.value || this.practice.tempoStep),
                    loopsPerLevel: Number(this.dom.practiceLoops?.value || this.practice.loopsPerLevel),
                    countInBars: Number(this.dom.practiceCountIn?.value || this.practice.countInBars),
                    loopCount: this.practice.loopCount,
                    layerLevel: this.practice.layerLevel,
                    phase: this.practice.phase
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
                this.practice.enabled = !!p.enabled;
                this.practice.loopCount = Math.max(0, Number(p.loopCount) || 0);
                this.practice.layerLevel = Math.max(0, Number(p.layerLevel) || 0);
                this.practice.phase = ["layers", "tempo"].includes(p.phase) ? p.phase : (this.practice.mode === "tempo" ? "tempo" : "layers");
                if (this.dom.practicePanel) this.dom.practicePanel.hidden = !p.panel;
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
                /* Le lien et le QR code transportent l’état complet de la page :
                   les 8 mémoires, le slot courant et tous les réglages d’interface. */
                const shareLocation = new URL(location.href);
                const shareParams = new URLSearchParams(shareLocation.hash.slice(1));
                shareParams.set("mem", StorageManager.encode(StorageManager.compactShareSlots(this.seq.store.slots)));
                shareParams.set("state", StorageManager.encode(this.compactPageState()));
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
        setupPractice() {
            if (!this.practice || !this.dom.practicePanel || !this.dom.practiceButton) return;
            const fill = () => {
                this.dom.practiceStartTempo.value = String(this.practice.enabled ? this.practice.startTempo : Math.max(CONFIG.TEMPO.min, Math.min(this.seq.tempo, 80)));
                this.dom.practiceTargetTempo.value = String(this.practice.enabled ? this.practice.targetTempo : Math.max(this.seq.tempo, 90));
                this.dom.practiceTempoStep.value = String(this.practice.tempoStep);
                this.dom.practiceLoops.value = String(this.practice.loopsPerLevel);
                this.dom.practiceCountIn.value = String(this.practice.countInBars);
                this.dom.practiceMode.value = this.practice.enabled ? this.practice.mode : "tempo";
            };
            this.press(this.dom.practiceButton, () => {
                // Opening or closing the practice panel always stops playback.
                this.scheduler?.stop();

                const show = this.dom.practicePanel.hidden;
                if (show) {
                    fill();
                    this.dom.practicePanel.hidden = false;
                } else {
                    this.dom.practicePanel.hidden = true;
                    if (this.practice.enabled) this.practice.stop({ silent:true });
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
                this.status(`Chargement ${kit.name}…`);
                const buffers = await this.audio.preloadTracks(this.seq.currentTrackSamples());
                this.status(buffers.every(Boolean) ? `${kit.name} prêt.` : "Kit chargé partiellement : samples manquants.");
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
                    this.status(`Kit Custom : piste ${i + 1} → ${SAMPLE_INDEX[event.target.value]?.label || event.target.value}.`);
                });
                label.appendChild(select);
                const controls = document.createElement("div"); controls.className = "track-controls track-shift-controls";
                const shiftLeft = document.createElement("button"); shiftLeft.type = "button"; shiftLeft.className = "track-toggle pattern-shift"; shiftLeft.textContent = "‹"; shiftLeft.dataset.btTooltip = `Décaler la piste à gauche — Shift : 1 temps`;
                const shiftRight = document.createElement("button"); shiftRight.type = "button"; shiftRight.className = "track-toggle pattern-shift"; shiftRight.textContent = "›"; shiftRight.dataset.btTooltip = `Décaler la piste à droite — Shift : 1 temps`;
                const shiftTrack = (direction, e) => {
                    e.preventDefault(); e.stopPropagation();
                    this.pushHistory();
                    const amount = e.shiftKey ? this.seq.signature.group : 1;
                    this.seq.shiftTrack(i, direction * amount);
                    this.renderGrid();
                    this.status(`Piste ${i + 1} décalée de ${amount === 1 ? "1 step" : "1 temps"}.`);
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
                button.dataset.btTooltip = `Mémoire ${i + 1} — vide — raccourci ${i + 1}`;
                button.addEventListener("pointerdown", e => { e.preventDefault(); this.selectMemorySlot(i); });
                this.dom.memory.insertBefore(button, separator); this.memoryButtons.push(button);
            }
        }
        makeRotary({ label, tooltip, min, max, step, value, onChange }) {
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
            setValue(value);
            return knob;
        }
        buildSliders() {
            this.dom.sliders.innerHTML = "";
            this.trackMuteButtons = []; this.trackSoloButtons = []; this.trackPanKnobs = []; this.trackVolumeKnobs = [];
            for (let i = 0; i < CONFIG.TRACK_COUNT; i++) {
                const row = document.createElement("div"); row.className = "track-mix-row";
                const mute = document.createElement("button"); mute.type = "button"; mute.className = "track-toggle mute mix-toggle"; mute.textContent = "M"; mute.dataset.btTooltip = `Mute piste ${i + 1}`;
                const solo = document.createElement("button"); solo.type = "button"; solo.className = "track-toggle solo mix-toggle"; solo.textContent = "S"; solo.dataset.btTooltip = `Solo piste ${i + 1}`;
                mute.addEventListener("click", e => { e.stopPropagation(); this.seq.toggleMute(i); this.renderTrackControls(); });
                solo.addEventListener("click", e => { e.stopPropagation(); this.seq.toggleSolo(i); this.renderTrackControls(); });
                const pan = this.makeRotary({ label:"P", tooltip:`Pan piste ${i + 1}`, min:-1, max:1, step:0.05, value:this.seq.trackPans[i], onChange:v => { this.seq.trackPans[i] = v; } });
                const volume = this.makeRotary({ label:"V", tooltip:`Volume piste ${i + 1}`, min:0, max:1, step:0.02, value:this.seq.trackVolumes[i], onChange:v => { this.seq.trackVolumes[i] = v; } });
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
            this.dom.presetSource.innerHTML=ordered.map(source=>`<option value="${source.id}">${source.label} · ${source.count}</option>`).join("");
            const first=ordered[0]?.id;
            if (first) { this.dom.presetSource.value=first; this.populateFamilies(first); }
        }
        populateFamilies(source, selectedFamily = null) {
            const meta=this.seq.store.presets.meta || [];
            const families=meta.map((family,index)=>({family,index})).filter(item=>item.family.source===source);
            if (!families.length) return;
            this.dom.presetFamily.innerHTML=families.map(({family,index})=>`<option value="${index}">${family.name}</option>`).join("");
            const index=families.some(item=>item.index===selectedFamily) ? selectedFamily : families[0].index;
            this.dom.presetFamily.value=String(index);
            this.populateGrooves(index,0);
        }
        populateGrooves(familyIndex, selected = 0) {
            const meta = this.seq.store.presets.meta || [];
            const family = meta[familyIndex];
            if (!family || !this.dom.presetGroove) return;
            this.dom.presetGroove.innerHTML = family.grooves.map((groove, i) => `<option value="${i}">${String(i + 1).padStart(2,"0")} · ${groove.name} · ${groove.signature}</option>`).join("");
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
                };
                entry.search=`${entry.groove} ${entry.family} ${entry.sourceLabel} ${entry.signature} ${entry.bpm}`.toLocaleLowerCase();
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
                    this.dom.grooveSearchList.innerHTML='<div class="groove-search-empty">Aucun groove trouvé</div>';
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
            this.loadSelectedPreset();
            const family=this.seq.store.presets.meta?.[result.familyIndex];
            const groove=family?.grooves?.[result.grooveIndex];
            if (groove) this.dom.grooveSearch.value=`${groove.name} — ${family.name} — ${family.sourceLabel||family.source}`;
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
        reloadSelectedPresetMemory(recordHistory = true) {
            if (!this.dom.presetFamily || !this.dom.presetGroove) return;
            const family = Number(this.dom.presetFamily.value) || 0;
            const groove = Number(this.dom.presetGroove.value) || 0;
            const before = recordHistory ? this.captureState() : null;
            const slot = this.seq.memorySlot;
            if (this.seq.reloadPresetMemory(family, groove)) {
                if (recordHistory) this.pushHistory(before);
                this.syncSchedulerStructure();
                this.buildGrid(); this.renderState(); this.makeKeyboardAccessible();
                this.status(`Mémoire ${slot + 1} restaurée depuis le groove source.`);
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
                            if (drag.wholeGrid) {
                                this.status(`Alt+Shift+glisser : grille déplacée de ${drag.deltaTracks} piste(s) et ${drag.deltaSteps} step(s) (bouclage modulo).`);
                            } else {
                                const targetTrack = ((drag.sourceTrack + drag.deltaTracks) % CONFIG.TRACK_COUNT + CONFIG.TRACK_COUNT) % CONFIG.TRACK_COUNT;
                                this.status(`Alt+glisser : piste ${drag.sourceTrack + 1} → ${targetTrack + 1}, décalage ${drag.deltaSteps} step${Math.abs(drag.deltaSteps) === 1 ? "" : "s"} (bouclage modulo).`);
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
                            this.status(`Ctrl/Cmd+Shift+clic : position ${offsetInBeat + 1}/${beatSize} supprimée sur tous les temps de la piste.`);
                            return;
                        }
                        if (event.ctrlKey || event.metaKey) {
                            this.seq.clearCell(index);
                            this.renderCell(index);
                            this.status(`Ctrl/Cmd+clic : cellule supprimée.`);
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
            this.dom.play.addEventListener("pointerdown", async e => {
                e.preventDefault();
                if (this.scheduler.playing) {
                    this.scheduler.stop();
                    if (this.practice?.enabled) this.practice.stop({ silent:true });
                    return;
                }
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
                this.loadSelectedPreset();
            });
            if (this.dom.presetFamily) this.dom.presetFamily.addEventListener("change", () => {
                const family = Number(this.dom.presetFamily.value) || 0;
                this.populateGrooves(family, 0);
                this.loadSelectedPreset();
            });
            if (this.dom.presetGroove) this.dom.presetGroove.addEventListener("change", () => this.loadSelectedPreset());
            if (this.dom.grooveRefresh) this.press(this.dom.grooveRefresh, () => this.reloadSelectedPresetMemory());
            const shiftGrid = (direction, event) => {
                this.pushHistory();
                const amount = event?.shiftKey ? this.seq.signature.group : 1;
                this.seq.shiftAllTracks(direction * amount);
                this.renderGrid();
                this.status(`Grille décalée ${direction < 0 ? "à gauche" : "à droite"} de ${amount === 1 ? "1 step" : "1 temps"}.`);
            };
            this.dom.gridShiftLeft?.addEventListener("click", event => { event.preventDefault(); shiftGrid(-1, event); });
            this.dom.gridShiftRight?.addEventListener("click", event => { event.preventDefault(); shiftGrid(1, event); });
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
                if (e.target === this.dom.grooveSearch && e.code === "Space") return;
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
        renderState() { this.renderSignature(); this.renderTempo(); this.renderKit(); this.renderGrid(); this.renderSliders(); this.renderSwing(); this.renderTrackControls(); this.renderMemory(); this.renderButtons(); this.renderPractice(); }
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
            const audio = new AudioEngine();
            const practice = new PracticeController(sequencer, audio);
            const ui = new UIController(sequencer, audio, practice);
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
            window.Battrochtek = { CONFIG, TRACK_ROLES, store, sequencer, audio, scheduler, practice, ui };
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
