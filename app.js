/*
 * BATTROCHTEK - Drum Machine / Step Sequencer
 * Refonte 2026 : architecture modulaire, Web Audio sécurisé, migration storage.
 */
(function () {
    "use strict";

    const CONFIG = Object.freeze({
        SIGNATURES: Object.freeze([
            Object.freeze({ label: "4/4", steps: 32, group: 4 }),
            Object.freeze({ label: "3/4", steps: 24, group: 4 }),
            Object.freeze({ label: "12/8", steps: 24, group: 3 })
        ]),
        TRACK_COUNT: 10,
        MEMORY_SLOTS: 10,
        TEMPO: Object.freeze({ min: 40, max: 240, default: 120 }),
        SCHEDULER: Object.freeze({ lookAheadMs: 25, scheduleAheadSec: 0.1 }),
        STORAGE_KEY: "patternStore",
        SAMPLE_MAP: Object.freeze({
            crash1: ["sounds/crash1.wav", "CRASH"],
            china1: ["sounds/china1.wav", "CHINA"],
            ride1: ["sounds/ride1.wav", "RIDE"],
            bell1: ["sounds/bell1.wav", "BELL"],
            open2: ["sounds/open2.wav", "OPEN"],
            hihat2: ["sounds/hihat2.wav", "HIHAT"],
            cowbell: ["sounds/cowbell.wav", "BELL"],
            rim: ["sounds/rim.wav", "RIM"],
            pad2: ["sounds/pad2.wav", "PAD"],
            ride3: ["sounds/ride3.wav", "RIDE"],
            s01a: ["sounds/01snare1.wav", "SNARE"], s01b: ["sounds/01snare2.wav", "SNARE"],
            t01a: ["sounds/01tom1.wav", "TOM"], t01b: ["sounds/01tom2.wav", "TOM"],
            k01a: ["sounds/01kick1.wav", "KICK"], k01b: ["sounds/01kick2.wav", "KICK"],
            s02a: ["sounds/02snare1.wav", "SNARE"], s02b: ["sounds/02snare2.wav", "SNARE"],
            t02a: ["sounds/02tom1.wav", "TOM"], t02b: ["sounds/02tom2.wav", "TOM"],
            k02a: ["sounds/02kick1.wav", "KICK"], k02b: ["sounds/02kick2.wav", "KICK"],
            s03a: ["sounds/03snare1.wav", "SNARE"], t03a: ["sounds/03tom1.wav", "TOM"], t03b: ["sounds/03tom2.wav", "TOM"],
            s04a: ["sounds/04snare1.wav", "SNARE"], k04a: ["sounds/04kick1.wav", "KICK"], k04b: ["sounds/04kick2.wav", "KICK"],
            s05a: ["sounds/05snare1.wav", "SNARE"], s05b: ["sounds/05snare2.wav", "SNARE"],
            t05a: ["sounds/05tom1.wav", "TOM"], t05b: ["sounds/05tom2.wav", "TOM"],
            k05a: ["sounds/05kick1.wav", "KICK"], k05b: ["sounds/05kick2.wav", "KICK"],
            s06a: ["sounds/06snare1.wav", "SNARE"], s06b: ["sounds/06snare2.wav", "SNARE"],
            t06a: ["sounds/06tom1.wav", "TOM"], t06b: ["sounds/06tom2.wav", "TOM"],
            k06a: ["sounds/06kick1.wav", "KICK"], k06b: ["sounds/06kick2.wav", "KICK"],
            s07a: ["sounds/07snare1.wav", "SNARE"], s07b: ["sounds/07snare2.wav", "SNARE"],
            t07a: ["sounds/07tom1.wav", "TOM"], t07b: ["sounds/07tom2.wav", "TOM"],
            k07a: ["sounds/07kick1.wav", "KICK"], k07b: ["sounds/07kick2.wav", "KICK"],
            s08a: ["sounds/08snare1.wav", "SNARE"], s08b: ["sounds/08snare2.wav", "SNARE"],
            t08a: ["sounds/08tom1.wav", "TOM"], t08b: ["sounds/08tom2.wav", "TOM"],
            k08a: ["sounds/08kick1.wav", "KICK"], k08b: ["sounds/08kick2.wav", "KICK"],
            tick: ["sounds/tick.wav", "METRO"]
        }),
        KITS: Object.freeze([
            Object.freeze({ name: "POWER KIT", tracks: ["crash1","ride1","open2","hihat2","s01a","s01b","t01a","t01b","k01a","k01b","tick"] }),
            Object.freeze({ name: "SHOCK KIT", tracks: ["china1","bell1","open2","hihat2","s02a","s02b","t02a","t02b","k02a","k02b","tick"] }),
            Object.freeze({ name: "RUDE KIT", tracks: ["crash1","ride3","open2","hihat2","s03a","s01b","t03a","t03b","k01a","k01b","tick"] }),
            Object.freeze({ name: "COOL KIT", tracks: ["crash1","ride1","open2","hihat2","s04a","s01b","t01a","t01b","k04a","k04b","tick"] }),
            Object.freeze({ name: "HYBRID KIT", tracks: ["crash1","pad2","open2","hihat2","s05a","s05b","t05a","t05b","k05a","k05b","tick"] }),
            Object.freeze({ name: "ETHNIC KIT", tracks: ["china1","cowbell","open2","hihat2","s06a","s06b","t06a","t06b","k06a","k06b","tick"] }),
            Object.freeze({ name: "WILD KIT", tracks: ["crash1","bell1","open2","hihat2","s07a","s07b","t07a","t07b","k07a","k07b","tick"] }),
            Object.freeze({ name: "LARGE KIT", tracks: ["china1","ride3","open2","hihat2","s08a","s08b","t08a","t08b","k08a","k08b","tick"] })
        ])
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
        let rockPatterns = [[], [], []];
        let hipHopPatterns = [[], [], []];
        let latinPatterns = [[], [], []];
        rockPatterns[0][0] = [];
        rockPatterns[0][0][0] = [
            96, 98, 100, 102, 104, 106, 108, 110,
            112, 114, 116, 118, 120, 122, 124, 126,
            132, 140, 148, 156,
            256, 264, 272, 280
        ];

        rockPatterns[0][1] = [];
        rockPatterns[0][1][0] = [
            96, 98, 100, 102, 104, 108, 110, 112,
            114, 116, 118, 120, 124, 126,
            132, 140, 148, 156,
            256, 264, 272, 280,
            298, 314, 318
        ];

        rockPatterns[0][2] = [];
        rockPatterns[0][2][0] = [
            92, 96, 98, 100, 102, 104, 106, 108,
            110, 112, 114, 116, 118, 120, 122, 126,
            132, 140, 148, 156,
            256, 262, 272, 278,
            302, 314
        ];

        rockPatterns[0][3] = [];
        rockPatterns[0][3][0] = [
            84, 94, 96, 100, 102, 104, 108, 110,
            112, 114, 118, 120, 122, 124,
            132, 140, 148, 156,
            256, 264, 272, 278,
            290, 298, 306, 314, 318
        ];

        rockPatterns[0][4] = [];
        rockPatterns[0][4][0] = [
            74, 90, 94, 96, 98, 100, 104, 108,
            110, 112, 114, 116, 120, 124,
            132, 138, 148, 154,
            256, 264, 272, 280,
            294, 310, 318
        ];

        rockPatterns[0][5] = [];
        rockPatterns[0][5][0] = [
            92, 96, 99, 100, 102, 104, 106, 108,
            110, 112, 115, 116, 118, 120, 122, 126,
            140, 156,
            256, 262, 272, 278,
            296, 314
        ];

        rockPatterns[0][6] = [];
        rockPatterns[0][6][0] = [
            92, 96, 98, 100, 102, 104, 106, 108,
            110, 112, 114, 116, 118, 120, 122, 126,
            132, 140, 148, 156, 166, 182,
            256, 264, 272, 280,
            295, 298, 311, 314, 318
        ];

        rockPatterns[0][7] = [];
        rockPatterns[0][7][0] = [
            90, 96, 98, 100, 102, 104, 106, 108,
            110, 112, 114, 116, 118, 120, 124, 126,
            132, 140, 148, 151, 156,
            167, 169, 185, 191,
            256, 264, 272, 280,
            298, 302, 310, 314, 318
        ];

        rockPatterns[0][8] = [];
        rockPatterns[0][8][0] = [
            68, 84, 96, 98, 102, 104, 106, 108,
            110, 112, 114, 118, 120, 122, 124, 126,
            132, 140, 148, 156,
            256, 262, 266, 272, 278, 282,
            295, 297, 302, 311, 313, 318
        ];

        rockPatterns[0][9] = [];
        rockPatterns[0][9][0] = [
            96, 98, 100, 102, 104, 106, 108, 110,
            112, 114, 116, 118, 120, 122, 124, 126,
            132, 140, 148, 156,
            167, 175, 182, 183, 185, 190, 191,
            256, 264, 272, 280,
            290, 298, 299, 301, 303,
            306, 314, 315, 317, 319
        ];

        /*
         * Paramètres communs aux presets ROCK en 4/4.
         */
        for (var presetIndex = 0;
             presetIndex < rockPatterns[0].length;
             presetIndex++) {

            rockPatterns[0][presetIndex][1] = 0;

            rockPatterns[0][presetIndex][2] = [
                1, 1, 1, 1, 1,
                1, 1, 1, 1, 1
            ];

            rockPatterns[0][presetIndex][3] = 120;
        }


        /*
         * ------------------------------------------------------------------------
         * ROCK - signature suivante
         * ------------------------------------------------------------------------
         */

        rockPatterns[1][0] = [];
        rockPatterns[1][0][0] = [
            72, 74, 76, 78, 80, 82, 84, 86,
            88, 90, 92, 94,
            100, 104, 112, 116,
            192, 204
        ];

        rockPatterns[1][1] = [];
        rockPatterns[1][1][0] = [
            68, 72, 74, 76, 78, 80, 82, 84,
            86, 88, 90, 94,
            100, 112, 116,
            192, 204,
            226, 234, 238
        ];

        rockPatterns[1][2] = [];
        rockPatterns[1][2][0] = [
            72, 74, 76, 78, 80, 82, 84, 86,
            88, 90, 92, 94,
            104, 116,
            192, 196, 204, 208, 238
        ];

        rockPatterns[1][3] = [];
        rockPatterns[1][3][0] = [
            70, 72, 74, 76, 78, 80, 82, 84,
            86, 88, 90, 92,
            100, 112,
            192, 204,
            226, 234, 238
        ];

        rockPatterns[1][4] = [];
        rockPatterns[1][4][0] = [
            64, 72, 74, 76, 78, 80, 82, 84,
            86, 90, 92, 94,
            102, 112, 116,
            192, 204,
            218, 230, 238
        ];

        rockPatterns[1][5] = [];
        rockPatterns[1][5][0] = [
            68, 72, 74, 75, 78, 80, 82, 84,
            86, 88, 90, 94, 95,
            102, 112, 116,
            122, 134,
            192, 204,
            220, 226, 234
        ];

        rockPatterns[1][6] = [];
        rockPatterns[1][6][0] = [
            70, 72, 74, 76, 78, 80, 82, 84,
            86, 88, 90, 92,
            104, 116, 120, 124, 132, 136,
            192, 204,
            218, 222, 226, 230, 234
        ];

        rockPatterns[1][7] = [];
        rockPatterns[1][7][0] = [
            68, 72, 75, 76, 78, 80, 82, 84,
            87, 88, 90, 94,
            104, 116, 124, 138,
            192, 204,
            218, 222, 226, 232, 238
        ];

        rockPatterns[1][8] = [];
        rockPatterns[1][8][0] = [
            72, 74, 76, 78, 79, 80, 82, 84,
            86, 88, 90, 91, 92, 94, 95,
            104, 116, 122, 134,
            192, 196, 204, 208,
            222, 234, 238
        ];

        rockPatterns[1][9] = [];
        rockPatterns[1][9][0] = [
            56, 68, 72, 74, 76, 78,
            82, 83, 84, 86, 87, 88,
            90, 94, 95,
            104, 116,
            192, 196, 204, 208,
            222, 223, 226, 234, 235, 238
        ];

        for (var presetIndex = 0;
             presetIndex < rockPatterns[1].length;
             presetIndex++) {

            rockPatterns[1][presetIndex][1] = 0;

            rockPatterns[1][presetIndex][2] = [
                1, 1, 1, 1, 1,
                1, 1, 1, 1, 1
            ];

            rockPatterns[1][presetIndex][3] = 120;
        }
            /*
         * ------------------------------------------------------------------------
         * ROCK - troisième signature
         * ------------------------------------------------------------------------
         */

        rockPatterns[2][0] = [];
        rockPatterns[2][0][0] = [
            72, 75, 77, 78, 81, 83, 84, 87,
            89, 90, 93, 95,
            99, 105, 111, 117,
            192, 197, 204, 209
        ];

        rockPatterns[2][1] = [];
        rockPatterns[2][1][0] = [
            72, 74, 75, 77, 78, 81, 83, 84,
            86, 87, 89, 90, 93, 95,
            99, 105, 111, 117,
            192, 197, 204, 209,
            227, 236, 239
        ];

        rockPatterns[2][2] = [];
        rockPatterns[2][2][0] = [
            71, 72, 75, 77, 78, 81, 83, 84,
            87, 89, 90, 93, 94,
            99, 105, 111, 117,
            192, 198, 204, 210,
            221, 233, 239
        ];

        rockPatterns[2][3] = [];
        rockPatterns[2][3][0] = [
            71, 72, 75, 77, 78, 81, 83, 84,
            87, 89, 90, 93,
            99, 105, 111, 117,
            131, 143,
            192, 198, 204, 210,
            218, 224, 230, 232
        ];

        rockPatterns[2][4] = [];
        rockPatterns[2][4][0] = [
            72, 75, 77, 78, 81, 83, 84, 87,
            89, 90, 93, 95,
            99, 105, 111, 117,
            122, 125, 128, 131, 134, 137, 140, 143,
            192, 198, 204, 210,
            227, 239
        ];

        rockPatterns[2][5] = [];
        rockPatterns[2][5][0] = [
            72, 75, 77, 78, 81, 83, 84, 87,
            89, 90, 93, 95,
            99, 105, 111, 117,
            121, 127, 133, 139, 143,
            192, 198, 204, 210,
            218, 224, 227, 230, 236
        ];

        rockPatterns[2][6] = [];
        rockPatterns[2][6][0] = [
            54, 66,
            72, 75, 77, 80, 81, 83, 84,
            87, 89, 92, 93, 95,
            102, 114,
            131, 143,
            192, 204,
            218, 220, 230, 232, 235, 237
        ];

        rockPatterns[2][7] = [];
        rockPatterns[2][7][0] = [
            72, 74, 75, 77, 79, 81, 83, 84,
            85, 87, 89, 91, 93, 95,
            99, 104, 111, 116,
            131, 143,
            192, 198, 204, 210,
            221, 230, 233
        ];

        rockPatterns[2][8] = [];
        rockPatterns[2][8][0] = [
            72, 74, 75, 77, 78, 80, 81, 83,
            84, 86, 87, 89, 90, 92, 93, 95,
            102, 114, 124,
            131, 136, 143,
            192, 204,
            219, 221, 224, 230, 233, 236
        ];

        rockPatterns[2][9] = [];
        rockPatterns[2][9][0] = [
            72, 74, 75, 77, 78, 80, 81, 83,
            84, 86, 87, 89, 90, 92, 93, 95,
            99, 105, 111, 117,
            127, 133, 139, 142,
            192, 200, 204, 212,
            220, 221, 223, 227,
            230, 232, 233, 235, 239
        ];

        /*
         * Tous les presets ROCK de cette signature utilisent :
         *
         * - le kit 0 par défaut ;
         * - toutes les pistes à volume maximum ;
         * - 120 BPM.
         */
        for (
            var presetIndex = 0;
            presetIndex < rockPatterns[2].length;
            presetIndex++
        ) {
            rockPatterns[2][presetIndex][1] = 0;

            rockPatterns[2][presetIndex][2] = [
                1, 1, 1, 1, 1,
                1, 1, 1, 1, 1
            ];

            rockPatterns[2][presetIndex][3] = 120;
        }


        /*
         * ========================================================================
         * PRESETS HIPHOP
         * ========================================================================
         *
         * Même structure que les presets ROCK.
         *
         * La différence importante dans la version originale est le tempo :
         * les patterns HIPHOP sont initialisés à 100 BPM.
         */

        hipHopPatterns[0][0] = [];
        hipHopPatterns[0][0][0] = [
            96, 98, 100, 102, 104, 108,
            112, 114, 116, 118, 120, 124,
            132, 140, 148, 156,
            256, 262, 272, 278
        ];

        hipHopPatterns[0][1] = [];
        hipHopPatterns[0][1][0] = [
            96, 98, 100, 102, 104, 106, 108,
            112, 114, 116, 118, 120, 122, 124,
            132, 140, 148, 156,
            256, 262, 272, 278,
            291, 307, 314
        ];

        hipHopPatterns[0][2] = [];
        hipHopPatterns[0][2][0] = [
            66, 82,
            96, 100, 102, 104, 108, 110,
            112, 116, 118, 120, 124, 126,
            132, 140, 148, 156,
            256, 272, 278,
            290, 303, 306, 317, 319
        ];

        hipHopPatterns[0][3] = [];
        hipHopPatterns[0][3][0] = [
            92, 96, 98, 100, 104, 106,
            108, 110, 112, 114, 116,
            120, 122, 126,
            132, 140, 148, 156,
            256, 272,
            291, 294, 297, 298,
            307, 310, 313, 314, 318
        ];

        hipHopPatterns[0][4] = [];
        hipHopPatterns[0][4][0] = [
            66, 82,
            96, 100, 102, 104, 106, 108,
            110, 112, 116, 118, 120, 122, 124, 126,
            132, 140, 148, 156, 191,
            256, 262, 272, 278,
            289, 295, 305, 311, 314, 318
        ];

        hipHopPatterns[0][5] = [];
        hipHopPatterns[0][5][0] = [
            96, 98, 100, 104, 106, 108,
            110, 112, 114, 116, 120, 122,
            124, 126, 131, 140, 147, 156,
            256, 262, 272, 278,
            297, 298, 302,
            313, 314, 317, 319
        ];

        hipHopPatterns[0][6] = [];
        hipHopPatterns[0][6][0] = [
            90,
            96, 98, 100, 102, 104, 106, 108,
            112, 114, 116, 118, 120, 124,
            132, 140, 148, 156, 186,
            256, 262, 272, 278,
            291, 301, 302, 306,
            313, 317, 318
        ];

        hipHopPatterns[0][7] = [];
        hipHopPatterns[0][7][0] = [
            97, 98, 100, 101, 102, 104, 106, 108,
            110, 111, 113, 114, 116, 117, 118,
            120, 122, 124, 126, 127,
            132, 135, 140, 148, 151, 156,
            171, 187, 190, 191,
            256, 262, 272, 278,
            291, 297, 302, 307, 313, 318
        ];

        hipHopPatterns[0][8] = [];
        hipHopPatterns[0][8][0] = [
            66, 82,
            96, 100, 102, 104, 108, 110,
            112, 116, 118, 120, 124, 126,
            132, 140, 148, 156,
            169, 171, 175, 183, 185, 187, 191,
            256, 262, 272, 278,
            289, 290, 295, 298,
            301, 305, 306, 314, 317
        ];

        hipHopPatterns[0][9] = [];
        hipHopPatterns[0][9][0] = [
            96, 99, 102, 104, 106, 108,
            110, 112, 115, 118, 120,
            122, 124, 126,
            132, 140, 148, 156,
            161, 167, 171, 177, 181, 183, 187, 190,
            256, 262, 272, 278,
            290, 297, 298, 303,
            306, 313, 314, 319
        ];

        /*
         * Initialisation commune des patterns HIPHOP en 4/4.
         */
        for (
            var presetIndex = 0;
            presetIndex < hipHopPatterns[0].length;
            presetIndex++
        ) {
            hipHopPatterns[0][presetIndex][1] = 0;

            hipHopPatterns[0][presetIndex][2] = [
                1, 1, 1, 1, 1,
                1, 1, 1, 1, 1
            ];

            hipHopPatterns[0][presetIndex][3] = 100;
        }


        /*
         * ------------------------------------------------------------------------
         * HIPHOP - deuxième signature
         * ------------------------------------------------------------------------
         */

        hipHopPatterns[1][0] = [];
        hipHopPatterns[1][0][0] = [
            72, 74, 76, 78, 80, 82, 84, 86,
            88, 90, 92, 94,
            100, 104, 112, 116,
            192, 198, 204, 210
        ];

        hipHopPatterns[1][1] = [];
        hipHopPatterns[1][1][0] = [
            72, 74, 76, 78, 80, 82, 84, 86,
            88, 90, 92, 94,
            104, 116,
            192, 198, 204, 210,
            219, 231, 238
        ];

        hipHopPatterns[1][2] = [];
        hipHopPatterns[1][2][0] = [
            72, 74, 76, 78, 80, 82, 84, 86,
            88, 90, 92, 94,
            100, 112,
            192, 198, 200, 204, 210, 212,
            219, 231
        ];

        hipHopPatterns[1][3] = [];
        hipHopPatterns[1][3][0] = [
            70,
            72, 74, 76, 78, 80, 82, 84,
            86, 88, 90, 92,
            100, 104, 112, 116,
            192, 198, 204, 210,
            225, 231, 237, 238
        ];

        hipHopPatterns[1][4] = [];
        hipHopPatterns[1][4][0] = [
            72, 74, 76, 78, 80, 82, 84, 86,
            88, 90, 92, 94,
            104, 116,
            131, 141, 143,
            192, 198, 204, 210,
            219, 221, 231, 233, 238
        ];

        hipHopPatterns[1][5] = [];
        hipHopPatterns[1][5][0] = [
            72, 74, 76, 78, 80, 82, 84, 86,
            88, 90, 92, 94,
            100, 104, 112, 116,
            127, 130, 139, 143,
            192, 198, 204, 210,
            219, 227, 231, 237, 238
        ];

        hipHopPatterns[1][6] = [];
        hipHopPatterns[1][6][0] = [
            68,
            72, 74, 76, 78, 80, 82, 84,
            86, 88, 90, 94,
            104, 116,
            122, 125, 134, 137, 142, 143,
            192, 198, 204, 210,
            219, 231, 237
        ];

        hipHopPatterns[1][7] = [];
        hipHopPatterns[1][7][0] = [
            72, 74, 76, 78, 80, 82, 83, 84,
            86, 88, 90, 91, 92, 94,
            104, 116,
            123, 125, 130, 135, 137, 142,
            192, 198, 204, 210, 237
        ];

        hipHopPatterns[1][8] = [];
        hipHopPatterns[1][8][0] = [
            58, 70,
            72, 74, 76, 78, 80, 81, 84,
            86, 88, 90, 92, 93,
            104, 116,
            125, 127, 137, 139, 141, 143,
            192, 198, 204, 210,
            217, 219, 229, 231
        ];

        hipHopPatterns[1][9] = [];
        hipHopPatterns[1][9][0] = [
            50, 62,
            72, 73, 76, 78, 80, 81, 82,
            84, 85, 88, 90, 92, 94,
            100, 112,
            121, 127, 131, 133, 139, 142, 143,
            192, 194, 198, 204, 206, 210,
            219, 231, 237
        ];

        for (
            var presetIndex = 0;
            presetIndex < hipHopPatterns[1].length;
            presetIndex++
        ) {
            hipHopPatterns[1][presetIndex][1] = 0;

            hipHopPatterns[1][presetIndex][2] = [
                1, 1, 1, 1, 1,
                1, 1, 1, 1, 1
            ];

            hipHopPatterns[1][presetIndex][3] = 100;
        }
            /*
         * ------------------------------------------------------------------------
         * HIPHOP - troisième signature
         * ------------------------------------------------------------------------
         */

        hipHopPatterns[2][0] = [];
        hipHopPatterns[2][0][0] = [
            72, 74, 75, 77, 78, 80, 81, 83,
            84, 86, 87, 89, 90, 92, 93, 95,
            99, 105, 111, 117,
            192, 197, 204, 209
        ];

        hipHopPatterns[2][1] = [];
        hipHopPatterns[2][1][0] = [
            72, 73, 74, 75, 77, 78, 81, 82,
            83, 84, 85, 86, 87, 89, 90,
            93, 94, 95,
            99, 105, 111, 117,
            192, 197, 204, 209,
            227, 239
        ];

        hipHopPatterns[2][2] = [];
        hipHopPatterns[2][2][0] = [
            72, 74, 75, 77, 78, 80, 81, 83,
            84, 86, 87, 89, 90, 92, 93, 95,
            99, 105, 111, 117,
            192, 198, 204, 210,
            221, 230, 232
        ];

        hipHopPatterns[2][3] = [];
        hipHopPatterns[2][3][0] = [
            50,
            72, 73, 75, 76, 77, 78, 79,
            80, 81, 82, 83, 84, 85, 86,
            87, 88, 89, 90, 91, 92, 93,
            94, 95,
            99, 105, 111, 117,
            142,
            192, 197, 204, 209,
            218, 227, 239
        ];

        hipHopPatterns[2][4] = [];
        hipHopPatterns[2][4][0] = [
            72, 74, 75, 77, 78, 80, 82, 83,
            84, 86, 87, 89, 90, 92, 94, 95,
            99, 105, 111, 117,
            125, 137, 142,
            192, 204,
            218, 220, 226, 230, 232
        ];

        hipHopPatterns[2][5] = [];
        hipHopPatterns[2][5][0] = [
            57, 69,
            72, 73, 74, 75, 77, 78, 80,
            83, 84, 85, 86, 87, 89, 90,
            92, 95,
            99, 105, 111, 117,
            192, 204,
            223, 224, 232, 233, 235
        ];

        hipHopPatterns[2][6] = [];
        hipHopPatterns[2][6][0] = [
            56, 68,
            72, 73, 74, 75, 77, 78,
            81, 83, 84, 85, 86, 87,
            89, 90, 93, 95,
            99, 104, 111, 116,
            131, 141, 143,
            192, 197, 204, 209,
            217, 226, 229, 238
        ];

        hipHopPatterns[2][7] = [];
        hipHopPatterns[2][7][0] = [
            72, 74, 75, 77, 78, 80, 81, 83,
            84, 86, 87, 89, 90, 92, 93, 95,
            99, 106, 111, 118,
            124, 131, 136, 143,
            192, 198, 201, 204, 210, 213,
            221, 230, 233
        ];

        hipHopPatterns[2][8] = [];
        hipHopPatterns[2][8][0] = [
            71, 72, 74, 75, 76, 77, 78,
            80, 81, 82, 83, 84,
            86, 87, 88, 89, 90,
            92, 93, 94,
            99, 105, 111, 117,
            131, 142,
            192, 200, 204, 212,
            217, 218, 229, 230, 239
        ];

        hipHopPatterns[2][9] = [];
        hipHopPatterns[2][9][0] = [
            68,
            72, 73, 75, 77, 78, 80, 81,
            83, 84, 85, 87, 89, 90,
            93, 95,
            99, 105, 111, 117,
            122, 130, 131, 134, 142, 143,
            192, 197, 204,
            223, 224, 232, 233, 235, 236, 239
        ];

        for (
            var presetIndex = 0;
            presetIndex < hipHopPatterns[2].length;
            presetIndex++
        ) {
            hipHopPatterns[2][presetIndex][1] = 0;

            hipHopPatterns[2][presetIndex][2] = [
                1, 1, 1, 1, 1,
                1, 1, 1, 1, 1
            ];

            hipHopPatterns[2][presetIndex][3] = 100;
        }


        /*
         * ========================================================================
         * PRESETS LATIN
         * ========================================================================
         *
         * La troisième banque de grooves est nettement plus rapide :
         * tempo par défaut = 150 BPM.
         */

        latinPatterns[0][0] = [];
        latinPatterns[0][0][0] = [
            96, 100, 102, 104, 108, 110,
            112, 116, 118, 120, 124, 126,
            134, 140, 150, 156,
            256, 264, 272, 280
        ];

        latinPatterns[0][1] = [];
        latinPatterns[0][1][0] = [
            96, 98, 102, 104, 108, 110,
            112, 114, 118, 120, 124, 126,
            134, 140, 150, 156,
            164, 174, 180, 190,
            256, 264, 272, 280,
            300, 316, 318
        ];

        latinPatterns[0][2] = [];
        latinPatterns[0][2][0] = [
            96, 98, 100, 102, 104,
            108, 110, 112, 114, 116,
            118, 120, 124, 126,
            140, 156,
            160, 166, 176, 182,
            256, 264, 272, 280,
            294, 302, 310, 318
        ];

        latinPatterns[0][3] = [];
        latinPatterns[0][3][0] = [
            76, 90,
            96, 98, 100, 102, 104,
            110, 112, 114, 116, 118,
            124, 126,
            140, 154, 160, 166, 180,
            256, 264, 272, 280,
            294, 302, 310, 318
        ];

        latinPatterns[0][4] = [];
        latinPatterns[0][4][0] = [
            96, 98, 102, 104, 108,
            112, 114, 118, 120, 124, 126,
            134, 140, 150, 154,
            164, 170, 180, 188,
            256, 272, 284,
            294, 300, 310
        ];

        latinPatterns[0][5] = [];
        latinPatterns[0][5][0] = [
            92, 96, 98, 100, 104, 106, 108,
            112, 114, 116, 120, 122, 126,
            134, 140, 150, 156,
            160, 163, 176, 178, 179, 181,
            256, 264, 272, 280,
            302, 318
        ];

        latinPatterns[0][6] = [];
        latinPatterns[0][6][0] = [
            96, 99, 100, 102, 104,
            108, 110, 112, 113, 115,
            116, 118, 120, 124, 126,
            134, 140, 150, 156,
            164, 168, 176, 180, 184,
            256, 264, 272, 280,
            291, 294, 307, 310
        ];

        latinPatterns[0][7] = [];
        latinPatterns[0][7][0] = [
            96, 97, 100, 102, 104,
            108, 110, 112, 113,
            116, 118, 120, 124, 126,
            134, 140, 150, 156,
            160, 163, 170, 176, 178, 186, 189,
            256, 264, 272, 280,
            303, 319
        ];

        latinPatterns[0][8] = [];
        latinPatterns[0][8][0] = [
            96, 99, 102, 104, 107,
            108, 110, 112, 115,
            118, 120, 123, 124, 126,
            134, 150, 156,
            160, 163, 170, 172, 176, 179, 186,
            260, 268, 276, 284,
            288, 302, 318
        ];

        latinPatterns[0][9] = [];
        latinPatterns[0][9][0] = [
            86,
            96, 97, 100, 102, 104, 107,
            108, 110, 112, 113, 116,
            120, 123, 124, 126,
            134, 140, 150, 156,
            162, 170, 178, 186, 190,
            256, 264, 272, 280,
            299, 302, 315, 318
        ];

        /*
         * Il existe exceptionnellement un onzième preset dans ce groupe.
         */
        latinPatterns[0][10] = [];
        latinPatterns[0][10][0] = [
            67, 80, 85,
            96, 101, 104, 108, 109,
            116, 120, 127,
            142, 143, 146, 149,
            161, 168, 172, 179,
            184, 186, 188, 189, 190,
            198, 227, 231, 235, 251,
            256, 259, 260, 279, 287,
            294, 296, 300, 307, 308
        ];

        for (
            var presetIndex = 0;
            presetIndex < latinPatterns[0].length;
            presetIndex++
        ) {
            latinPatterns[0][presetIndex][1] = 0;

            latinPatterns[0][presetIndex][2] = [
                1, 1, 1, 1, 1,
                1, 1, 1, 1, 1
            ];

            latinPatterns[0][presetIndex][3] = 150;
        }


        /*
         * ------------------------------------------------------------------------
         * LATIN - deuxième signature
         * ------------------------------------------------------------------------
         */

        latinPatterns[1][0] = [];
        latinPatterns[1][0][0] = [
            72, 76, 78, 80, 82, 84,
            88, 90, 92, 94,
            104, 116, 124, 136,
            192, 204, 222, 234
        ];

        latinPatterns[1][1] = [];
        latinPatterns[1][1][0] = [
            72, 74, 76, 78, 80, 82, 84,
            86, 88, 90, 92, 94,
            104, 116, 124, 136,
            192, 204,
            222, 226, 234, 238
        ];

        latinPatterns[1][2] = [];
        latinPatterns[1][2][0] = [
            72, 76, 78, 82, 84,
            88, 90, 94,
            104, 116, 122, 134,
            192, 204, 222, 234, 238
        ];

        latinPatterns[1][3] = [];
        latinPatterns[1][3][0] = [
            66,
            72, 74, 76, 78, 80, 82, 84, 86,
            88, 92, 94,
            104, 114, 124, 134,
            192, 204, 222, 226, 238
        ];

        latinPatterns[1][4] = [];
        latinPatterns[1][4][0] = [
            72, 75, 76, 78, 80, 82, 84,
            87, 88, 90, 92, 94,
            104, 116, 124, 134, 138,
            192, 204, 226, 238
        ];

        latinPatterns[1][5] = [];
        latinPatterns[1][5][0] = [
            56,
            72, 74, 78, 82, 84, 86,
            88, 92, 94,
            104, 116, 142,
            192, 204,
            220, 231, 234
        ];

        latinPatterns[1][6] = [];
        latinPatterns[1][6][0] = [
            72, 74, 76, 78, 80, 84,
            86, 88, 90, 92,
            100, 112,
            128, 130, 140, 142,
            192, 204,
            218, 230, 234
        ];

        latinPatterns[1][7] = [];
        latinPatterns[1][7][0] = [
            66,
            72, 74, 76, 80, 82, 84,
            88, 92,
            102, 108, 118,
            122, 136, 140,
            192, 226, 230, 234
        ];

        latinPatterns[1][8] = [];
        latinPatterns[1][8][0] = [
            72, 73, 75, 76, 79, 80, 82, 84,
            85, 87, 88, 91, 92, 94,
            102, 114,
            123, 135, 140, 142,
            192, 204,
            220, 224, 232, 236
        ];

        latinPatterns[1][9] = [];
        latinPatterns[1][9][0] = [
            72, 74, 75, 78, 80, 82, 84,
            87, 88, 90, 92, 94,
            100, 114, 120,
            128, 132, 134, 142,
            192, 204,
            222, 226, 233, 236
        ];

        for (
            var presetIndex = 0;
            presetIndex < latinPatterns[1].length;
            presetIndex++
        ) {
            latinPatterns[1][presetIndex][1] = 0;

            latinPatterns[1][presetIndex][2] = [
                1, 1, 1, 1, 1,
                1, 1, 1, 1, 1
            ];

            latinPatterns[1][presetIndex][3] = 150;
        }


        /*
         * ------------------------------------------------------------------------
         * LATIN - troisième signature
         * ------------------------------------------------------------------------
         */

        latinPatterns[2][0] = [];
        latinPatterns[2][0][0] = [
            72, 75, 77, 78, 81, 83, 84,
            87, 89, 90, 93, 95,
            101, 105, 113, 117,
            192, 204, 222, 234
        ];

        latinPatterns[2][1] = [];
        latinPatterns[2][1][0] = [
            72, 75, 77, 78, 80, 81,
            84, 87, 89, 90, 92, 93,
            101, 105, 111, 116,
            192, 204, 222, 234, 237
        ];

        latinPatterns[2][2] = [];
        latinPatterns[2][2][0] = [
            65,
            72, 74, 75, 77, 81, 83, 84,
            86, 87, 93, 95,
            101, 113,
            128, 140,
            192, 204, 225, 237
        ];

        latinPatterns[2][3] = [];
        latinPatterns[2][3][0] = [
            69,
            72, 74, 75, 77, 80, 81,
            84, 86, 87, 89, 92,
            105, 117,
            125, 134, 137,
            192, 204, 222, 234
        ];

        latinPatterns[2][4] = [];
        latinPatterns[2][4][0] = [
            72, 75, 77, 78, 81, 83, 84,
            87, 89, 90, 93, 95,
            99, 105, 111, 117,
            125, 137, 140,
            192, 204, 222, 234
        ];

        latinPatterns[2][5] = [];
        latinPatterns[2][5][0] = [
            56, 68,
            72, 74, 75, 77, 78, 81, 83,
            84, 86, 87, 89, 90, 93, 95,
            101, 113,
            129, 141,
            192, 204,
            225, 230, 237
        ];

        latinPatterns[2][6] = [];
        latinPatterns[2][6][0] = [
            72, 74, 76, 77, 79, 81, 83, 84,
            86, 88, 89, 91, 93, 95,
            99, 111,
            128, 130, 140, 142, 143,
            192, 204, 222, 234
        ];

        latinPatterns[2][7] = [];
        latinPatterns[2][7][0] = [
            57, 67, 69,
            72, 74, 76, 77, 79,
            83, 84, 86, 88, 89, 95,
            101, 113,
            122, 128, 134, 139, 141,
            192, 204,
            222, 225, 234, 237
        ];

        latinPatterns[2][8] = [];
        latinPatterns[2][8][0] = [
            71, 72, 74, 76, 77, 79, 81, 83,
            84, 86, 88, 89, 91, 93,
            105, 117,
            124, 136, 143,
            192, 204,
            218, 221, 222, 230, 233, 234
        ];

        latinPatterns[2][9] = [];
        latinPatterns[2][9][0] = [
            72, 74, 76, 77, 79, 81, 83, 84,
            86, 88, 89, 91, 93, 95,
            99, 111,
            125, 128, 137, 140, 141,
            192, 204,
            221, 222, 225, 233, 234, 237
        ];

        for (
            var presetIndex = 0;
            presetIndex < latinPatterns[2].length;
            presetIndex++
        ) {
            latinPatterns[2][presetIndex][1] = 0;

            latinPatterns[2][presetIndex][2] = [
                1, 1, 1, 1, 1,
                1, 1, 1, 1, 1
            ];

            latinPatterns[2][presetIndex][3] = 150;
        }
        return [rockPatterns, hipHopPatterns, latinPatterns];
    }

    class PatternStore {
        constructor(storageManager, presets) {
            this.storage = storageManager;
            this.presets = presets;
            this.banks = this.storage.load(this.createDefaults(presets));
        }
        createDefaults(presets) {
            const banks = Array.from({ length: 3 }, () => Array(CONFIG.MEMORY_SLOTS));
            banks[0][0] = this.normalizePattern(presets[1][0][8], 0);
            banks[0][0][3] = 100;
            banks[1][0] = this.normalizePattern([[72,74,76,80,82,84,86,88,92,94,100,112,116,192,204,226,238],0,Array(10).fill(1),120],1);
            banks[2][0] = this.normalizePattern([[72,75,77,78,81,83,84,86,87,89,90,92,93,95,99,105,111,117,192,198,204,210,227,236,239],0,Array(10).fill(1),120],2);
            return banks;
        }
        normalizePattern(pattern, signatureIndex = 0) {
            if (!Array.isArray(pattern)) return null;
            const maxCells = CONFIG.SIGNATURES[signatureIndex].steps * CONFIG.TRACK_COUNT;
            const cells = Array.isArray(pattern[0]) ? pattern[0].map(Number).filter(n => Number.isInteger(n) && n >= 0 && n < maxCells) : [];
            const kit = Math.round(Util.clamp(pattern[1], 0, CONFIG.KITS.length - 1, 0));
            const rawVolumes = Array.isArray(pattern[2]) ? pattern[2] : [];
            const volumes = Array.from({ length: CONFIG.TRACK_COUNT }, (_, i) => Util.clamp(rawVolumes[i], 0, 1, 1));
            const tempo = Math.round(Util.clamp(pattern[3], CONFIG.TEMPO.min, CONFIG.TEMPO.max, CONFIG.TEMPO.default));
            const master = Util.clamp(pattern[4], 0, 1, 1);
            const human = Util.clamp(pattern[5], 0, 1, 0);
            return [cells, kit, volumes, tempo, master, human];
        }
        normalizeBanks(raw, defaults) {
            const out = Array.from({ length: 3 }, () => Array(CONFIG.MEMORY_SLOTS));
            for (let s = 0; s < 3; s++) {
                const sourceBank = Array.isArray(raw?.[s]) ? raw[s] : [];
                for (let slot = 0; slot < CONFIG.MEMORY_SLOTS; slot++) {
                    const p = sourceBank[slot];
                    out[s][slot] = p == null ? undefined : this.normalizePattern(p, s);
                }
                if (!out[s].some(Boolean) && defaults[s][0]) out[s][0] = this.normalizePattern(defaults[s][0], s);
            }
            return out;
        }
        get(signature, slot) { return this.banks[signature]?.[slot] || null; }
        set(signature, slot, pattern) {
            this.banks[signature][slot] = this.normalizePattern(pattern, signature);
            this.storage.save(this.banks);
        }
        populated(signature) {
            return this.banks[signature].map((p, i) => p ? i : -1).filter(i => i >= 0);
        }
    }

    class AudioEngine {
        constructor() {
            this.context = null;
            this.buffers = new Map();
            this.loading = new Map();
        }
        ensureContext() {
            if (this.context) return this.context;
            const Ctx = window.AudioContext || window.webkitAudioContext;
            if (!Ctx) throw new Error("Web Audio API non supportée par ce navigateur.");
            this.context = new Ctx();
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
        async play({ kitIndex, trackIndex, time, trackVolume = 1, masterVolume = 1, human = 0 }) {
            const ctx = this.ensureContext();
            const kit = CONFIG.KITS[Math.round(Util.clamp(kitIndex, 0, CONFIG.KITS.length - 1, 0))] || CONFIG.KITS[0];
            const safeTrack = Math.round(Util.clamp(trackIndex, 0, 10, 0));
            const sampleKey = kit.tracks[safeTrack];
            const buffer = await this.loadSample(sampleKey);
            if (!buffer) return;
            const source = ctx.createBufferSource();
            const gainNode = ctx.createGain();
            source.buffer = buffer;
            const variation = safeTrack === 10 ? 1 : 1 - Math.random() * Util.clamp(human, 0, 1, 0) * 0.8;
            const gain = Util.clamp(Util.finite(trackVolume, 1) * Util.finite(masterVolume, 1) * Util.finite(variation, 1), 0, 1, 0);
            gainNode.gain.setValueAtTime(gain, Math.max(ctx.currentTime, Util.finite(time, ctx.currentTime)));
            source.connect(gainNode).connect(ctx.destination);
            source.start(Math.max(ctx.currentTime, Util.finite(time, ctx.currentTime)));
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
            this.trackVolumes = Array(CONFIG.TRACK_COUNT).fill(1);
            this.masterVolume = 1;
            this.human = 0;
            this.tempo = CONFIG.TEMPO.default;
            this.activeCells = new Set();
            this.chainEnabled = false;
            this.metronomeEnabled = false;
        }
        get signature() { return CONFIG.SIGNATURES[this.signatureIndex]; }
        snapshot() {
            return [Array.from(this.activeCells).sort((a,b)=>a-b), this.kitIndex, this.trackVolumes.slice(), this.tempo, this.masterVolume, this.human];
        }
        apply(pattern) {
            const p = this.store.normalizePattern(pattern, this.signatureIndex);
            if (!p) return false;
            this.activeCells = new Set(p[0]);
            this.kitIndex = p[1];
            this.trackVolumes = p[2];
            this.tempo = p[3];
            this.masterVolume = p[4];
            this.human = p[5];
            return true;
        }
        loadSlot(slot) {
            this.memorySlot = Math.round(Util.clamp(slot, 0, CONFIG.MEMORY_SLOTS - 1, 0));
            const p = this.store.get(this.signatureIndex, this.memorySlot);
            if (p) this.apply(p);
            else this.activeCells.clear();
        }
        saveSlot() { this.store.set(this.signatureIndex, this.memorySlot, this.snapshot()); }
        toggleCell(index) { this.activeCells.has(index) ? this.activeCells.delete(index) : this.activeCells.add(index); }
        clear() { this.activeCells.clear(); }
        cycleSignature() {
            this.signatureIndex = (this.signatureIndex + 1) % CONFIG.SIGNATURES.length;
            const slots = this.store.populated(this.signatureIndex);
            this.memorySlot = slots[0] ?? 0;
            this.loadSlot(this.memorySlot);
        }
        loadPreset(bankIndex, presetIndex) {
            const bank = this.store.presets[bankIndex]?.[this.signatureIndex];
            if (!bank?.length) return;
            this.apply(bank[presetIndex % bank.length]);
            this.chainEnabled = false;
        }
        nextChainSlot() {
            const slots = this.store.populated(this.signatureIndex);
            if (slots.length < 2) { this.chainEnabled = false; return this.memorySlot; }
            const pos = slots.indexOf(this.memorySlot);
            const next = slots[(pos < 0 ? 0 : pos + 1) % slots.length];
            this.loadSlot(next);
            return next;
        }
        randomize() {
            this.clear();
            const steps = this.signature.steps;
            const group = this.signature.group;
            for (let track = 0; track < CONFIG.TRACK_COUNT; track++) {
                for (let step = 0; step < steps; step++) {
                    let probability = 0.04;
                    if (track === 3) probability = step % 2 === 0 ? 0.72 : 0.18;
                    if (track === 4 || track === 5) probability = step % (group * 2) === group ? 0.58 : 0.06;
                    if (track >= 8) probability = step % group === 0 ? 0.46 : 0.08;
                    if (track < 2) probability = step % (group * 4) === 0 ? 0.2 : 0.025;
                    if (Math.random() < probability) this.activeCells.add(track * steps + step);
                }
            }
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
                this.scheduleCurrentStep(this.step, this.nextTime);
                const duration = 60 / this.seq.signature.group / Util.clamp(this.seq.tempo, CONFIG.TEMPO.min, CONFIG.TEMPO.max, CONFIG.TEMPO.default);
                const finishing = this.step === this.seq.signature.steps - 1;
                this.nextTime += duration;
                this.step = (this.step + 1) % this.seq.signature.steps;
                if (finishing && this.seq.chainEnabled) {
                    this.seq.nextChainSlot();
                    this.ui.renderState();
                }
            }
            this.timer = setTimeout(() => this.loop(), CONFIG.SCHEDULER.lookAheadMs);
        }
        scheduleCurrentStep(step, time) {
            const steps = this.seq.signature.steps;
            this.ui.schedulePlayhead(step, time);
            if (this.seq.metronomeEnabled && step % this.seq.signature.group === 0) {
                this.audio.play({ kitIndex: this.seq.kitIndex, trackIndex: 10, time, trackVolume: 0.75, masterVolume: this.seq.masterVolume, human: 0 });
            }
            for (let track = 0; track < CONFIG.TRACK_COUNT; track++) {
                if (!this.seq.activeCells.has(track * steps + step)) continue;
                this.audio.play({ kitIndex: this.seq.kitIndex, trackIndex: track, time, trackVolume: this.seq.trackVolumes[track], masterVolume: this.seq.masterVolume, human: this.seq.human });
            }
        }
    }

    class StorageManager {
        constructor(key) { this.key = key; }
        load(defaults) {
            try {
                const raw = localStorage.getItem(this.key);
                if (!raw) return defaults;
                const parsed = JSON.parse(raw);
                const helper = Object.create(PatternStore.prototype);
                return helper.normalizeBanks(parsed, defaults);
            } catch (error) {
                console.warn("Sauvegarde Battrochtek invalide, migration vers les valeurs sûres.", error);
                return defaults;
            }
        }
        save(banks) {
            try { localStorage.setItem(this.key, JSON.stringify(banks)); }
            catch (error) { console.warn("Impossible de sauvegarder le pattern.", error); }
        }
    }

    class UIController {
        constructor(seq, audio) {
            this.seq = seq; this.audio = audio; this.scheduler = null;
            this.cells = []; this.memoryButtons = []; this.trackLabels = []; this.kitButtons = [];
            this.copySnapshot = null; this.presetPositions = [0,0,0]; this.playheadTimeouts = [];
            this.dom = this.cacheDom();
        }
        cacheDom() {
            const $ = id => document.getElementById(id);
            return {
                sets: $("sets"), leds: $("leds"), tracks: $("tracks"), grid: document.querySelector(".grid"), sliders: $("sliders"),
                master: $("master"), dynamics: $("dynamics"), memory: $("memory"), clear: $("clear"), signatureButton: $("signature-button"),
                signature: $("signature"), metro: $("metronome-button"), chain: $("chain"), play: $("play-button"), icon: $("play-pause-icon"),
                minus: $("minus-button"), plus: $("plus-button"), tempo: $("metronome-tempo"), random: $("random"), save: $("save"), copy: $("copy-paste"),
                styles: Array.from(document.getElementsByClassName("style")), presetDisplays: Array.from(document.getElementsByClassName("preset-drum-beats"))
            };
        }
        init(scheduler) {
            this.scheduler = scheduler;
            this.buildKits(); this.buildTrackLabels(); this.buildMemory(); this.buildSliders(); this.buildGrid(); this.bindControls(); this.bindUnlock(); this.renderState();
        }
        buildKits() {
            this.dom.sets.innerHTML = "";
            CONFIG.KITS.forEach((kit, i) => {
                const button = document.createElement("div");
                button.className = "bt-button drums"; button.innerHTML = `<p>${kit.name}</p>`;
                button.addEventListener("pointerdown", e => { e.preventDefault(); this.seq.kitIndex = i; this.audio.preloadKit(i); this.renderKit(); });
                this.dom.sets.appendChild(button); this.kitButtons.push(button);
            });
        }
        buildTrackLabels() {
            this.dom.tracks.innerHTML = "";
            for (let i = 0; i < CONFIG.TRACK_COUNT; i++) {
                const label = document.createElement("div"); label.className = "bt-led track";
                label.style.color = i < 4 ? "#dde" : i < 8 ? "#9df" : "#d9f";
                this.dom.tracks.appendChild(label); this.trackLabels.push(label);
            }
        }
        buildMemory() {
            this.dom.memory.querySelectorAll(".pattern").forEach(el => el.remove());
            for (let i = 0; i < CONFIG.MEMORY_SLOTS; i++) {
                const button = document.createElement("div"); button.className = "bt-button pattern"; button.innerHTML = `<span>${i + 1}</span>`;
                button.addEventListener("pointerdown", e => { e.preventDefault(); this.scheduler.stop(); this.seq.loadSlot(i); this.renderState(); });
                this.dom.memory.appendChild(button); this.memoryButtons.push(button);
            }
        }
        slider(className, label, onInput) {
            const input = document.createElement("input"); input.type = "range"; input.min = "0"; input.max = "100"; input.step = "1"; input.className = className;
            input.setAttribute("aria-label", label); input.addEventListener("input", onInput); return input;
        }
        buildSliders() {
            this.dom.sliders.innerHTML = ""; this.dom.master.innerHTML = ""; this.dom.dynamics.innerHTML = "";
            for (let i = 0; i < CONFIG.TRACK_COUNT; i++) {
                const kind = i < 4 ? "cymbal" : i < 8 ? "snare" : "kick";
                this.dom.sliders.appendChild(this.slider(`slider-thin ${kind}`, `Volume piste ${i+1}`, e => { this.seq.trackVolumes[i] = Util.clamp(Number(e.target.value)/100,0,1,1); }));
            }
            this.dom.master.appendChild(this.slider("slider-high", "Volume master", e => { this.seq.masterVolume = Util.clamp(Number(e.target.value)/100,0,1,1); }));
            this.dom.dynamics.appendChild(this.slider("slider-high", "Humanisation", e => { this.seq.human = Util.clamp(Number(e.target.value)/100,0,1,0); }));
        }
        buildGrid() {
            this.dom.grid.innerHTML = ""; this.dom.leds.innerHTML = ""; this.cells = [];
            const { steps, group } = this.seq.signature;
            for (let i = 0; i < steps; i++) {
                const led = document.createElement("div"); led.className = "bt-led beat-led"; led.style.width = `${100/steps - 0.2}%`;
                if (i % group === 0) led.classList.add("beat-accent"); if (i === 0) led.classList.add("bar-accent"); this.dom.leds.appendChild(led);
            }
            const width = (100 - 0.2 * steps) / steps;
            for (let track = 0; track < CONFIG.TRACK_COUNT; track++) {
                for (let step = 0; step < steps; step++) {
                    const index = track * steps + step;
                    const cell = document.createElement("div"); cell.className = "cell beat"; cell.style.width = `${width}%`;
                    if (step === 0) cell.classList.add("first","capo"); else if (step === steps/2) cell.classList.add("capo"); else if (step % group === 0) cell.classList.add("quarto");
                    cell.addEventListener("click", () => { this.seq.toggleCell(index); cell.classList.toggle("on", this.seq.activeCells.has(index)); });
                    this.dom.grid.appendChild(cell); this.cells.push(cell);
                }
            }
        }
        bindControls() {
            this.press(this.dom.clear, () => { this.seq.clear(); this.resetPresetSelectors(); this.renderGrid(); });
            this.press(this.dom.signatureButton, () => { this.scheduler.stop(); this.seq.cycleSignature(); this.buildGrid(); this.resetPresetSelectors(); this.renderState(); });
            this.dom.metro.addEventListener("pointerdown", e => { e.preventDefault(); this.seq.metronomeEnabled = !this.seq.metronomeEnabled; this.renderButtons(); });
            this.dom.chain.addEventListener("pointerdown", e => { e.preventDefault(); if (this.seq.store.populated(this.seq.signatureIndex).length >= 2) this.seq.chainEnabled = !this.seq.chainEnabled; this.renderButtons(); });
            this.dom.play.addEventListener("pointerdown", e => { e.preventDefault(); this.scheduler.toggle(); });
            this.bindTempo(this.dom.minus, -1); this.bindTempo(this.dom.plus, 1);
            this.dom.styles.forEach((button, bankIndex) => this.press(button, () => {
                const bank = this.seq.store.presets[bankIndex][this.seq.signatureIndex]; const pos = this.presetPositions[bankIndex] % bank.length;
                this.seq.loadPreset(bankIndex, pos); this.presetPositions = this.presetPositions.map((v,i)=>i===bankIndex?(pos+1)%bank.length:0);
                this.renderPresetDisplays(bankIndex, pos + 1); this.renderState();
            }));
            this.press(this.dom.random, () => { this.seq.randomize(); this.resetPresetSelectors(); this.renderGrid(); });
            this.press(this.dom.save, () => { this.scheduler.stop(); this.seq.saveSlot(); this.renderMemory(); });
            this.dom.copy.addEventListener("pointerdown", e => {
                e.preventDefault();
                if (!this.copySnapshot) this.copySnapshot = this.seq.snapshot();
                else { this.seq.store.set(this.seq.signatureIndex, this.seq.memorySlot, this.copySnapshot); this.seq.loadSlot(this.seq.memorySlot); this.copySnapshot = null; this.renderState(); }
                this.renderMemory();
            });
            window.addEventListener("keydown", e => { if (e.code === "Space" && e.target === document.body) { e.preventDefault(); this.scheduler.toggle(); } });
            document.addEventListener("visibilitychange", () => { if (document.hidden) { this.scheduler.stop(); this.audio.suspend(); } });
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
            const unlock = async () => { try { await this.audio.resume(); await this.audio.preloadKit(this.seq.kitIndex); } catch (e) { console.warn(e); } };
            ["pointerdown","keydown","touchstart"].forEach(type => document.addEventListener(type, unlock, { once: true, passive: true }));
        }
        renderState() { this.renderSignature(); this.renderTempo(); this.renderKit(); this.renderGrid(); this.renderSliders(); this.renderMemory(); this.renderButtons(); }
        renderSignature() { this.dom.signature.innerHTML = `<span>${this.seq.signature.label}</span>`; }
        renderTempo() { this.dom.tempo.textContent = String(this.seq.tempo); }
        renderKit() {
            this.kitButtons.forEach((b,i)=>b.classList.toggle("bt-buttondown",i===this.seq.kitIndex));
            const kit = CONFIG.KITS[this.seq.kitIndex] || CONFIG.KITS[0];
            this.trackLabels.forEach((label,i)=>label.textContent = CONFIG.SAMPLE_MAP[kit.tracks[i]]?.[1] || `TRACK ${i+1}`);
        }
        renderGrid() { this.cells.forEach((cell,i)=>cell.classList.toggle("on",this.seq.activeCells.has(i))); }
        renderSliders() {
            this.dom.sliders.querySelectorAll("input").forEach((input,i)=>input.value=String(Math.round(Util.clamp(this.seq.trackVolumes[i],0,1,1)*100)));
            const master=this.dom.master.querySelector("input"), human=this.dom.dynamics.querySelector("input");
            if(master) master.value=String(Math.round(Util.clamp(this.seq.masterVolume,0,1,1)*100)); if(human) human.value=String(Math.round(Util.clamp(this.seq.human,0,1,0)*100));
        }
        renderMemory() {
            this.memoryButtons.forEach((b,i)=>{ const saved=!!this.seq.store.get(this.seq.signatureIndex,i); b.classList.toggle("bt-buttondown",i===this.seq.memorySlot); b.classList.toggle("memory-saved",saved); b.classList.toggle("memory-empty",!saved); });
            this.dom.copy.classList.toggle("copy-armed",!!this.copySnapshot); this.dom.copy.innerHTML=this.copySnapshot?"<p>PASTE</p>":"<p>COPY</p>";
            if (this.seq.store.populated(this.seq.signatureIndex).length < 2) this.seq.chainEnabled = false;
        }
        renderButtons() { this.dom.metro.classList.toggle("bt-buttondown",this.seq.metronomeEnabled); this.dom.chain.classList.toggle("bt-buttondown",this.seq.chainEnabled); }
        resetPresetSelectors() { this.presetPositions=[0,0,0]; ["ROCK","HIPHOP","LATIN"].forEach((label,i)=>{ if(this.dom.presetDisplays[i]) this.dom.presetDisplays[i].innerHTML=`<p>${label}</p>`; }); }
        renderPresetDisplays(active, number) { ["ROCK","HIPHOP","LATIN"].forEach((label,i)=>{ if(i !== active && this.dom.presetDisplays[i]) this.dom.presetDisplays[i].innerHTML=`<p>${label}</p>`; }); this.dom.presetDisplays[active].innerHTML=`<span>${number}</span>`; }
        setPlaying(value) { this.dom.icon.className=value?"metronome-pause":"metronome-play"; this.dom.play.classList.toggle("bt-buttondown",value); }
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
            const storage = new StorageManager(CONFIG.STORAGE_KEY);
            const store = new PatternStore(storage, presets);
            // La normalisation complète est faite ici après construction de PatternStore.
            store.banks = store.normalizeBanks(store.banks, store.createDefaults(presets));
            const sequencer = new Sequencer(store);
            const first = store.populated(0)[0] ?? 0;
            sequencer.loadSlot(first);
            const audio = new AudioEngine();
            const ui = new UIController(sequencer, audio);
            const scheduler = new Scheduler(audio, sequencer, ui);
            ui.init(scheduler);
            window.Battrochtek = { CONFIG, store, sequencer, audio, scheduler, ui };
        }
    };

    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", () => App.init(), { once: true });
    else App.init();
})();
