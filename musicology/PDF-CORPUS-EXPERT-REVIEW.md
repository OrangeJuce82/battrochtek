# Professional drum-method PDF corpus review

## Scope and method

The supplied pack contains 74 PDF files (2,586 pages after exact-hash deduplication): 57 unique files representing 50 identified works. Every unique file was text-extracted or OCR-processed page by page, and every cover/title page was visually checked. Full extracted text is temporary and excluded from version control; the repository retains only bibliographic facts, hashes, classifications, and page-level evidence pointers.

This is a documentary and score-level desk review, not a signed endorsement by an external human expert. Published methods can corroborate vocabulary, orchestration practice, progression, and named styles; they do not make every transcription in the pack equally authoritative.

## Source grading

- 21 files are grade A and 9 are grade A-: established professional methods, scholarly work, university curricula, or excerpted professional publications.
- 3 are grade B, 4 B+, and 6 B-: useful pedagogical corroboration with a narrower evidential role.
- 9 are grade C: bibliographies, reading lists, incomplete excerpts, or unidentified course material; contextual leads only.
- 5 are grade D: anonymous worksheets or insufficiently attributable material; not accepted as validation evidence.

The strongest core includes Frank Malabe and Bob Weiner, Lincoln Goines and Robby Ameen, Duduka Da Fonseca and Bob Weiner (transcribed by John Riley), Royal Hartigan with Abraham Adzenyah and Freeman Donkor, Mike Clark, Billy Hart, John Riley, Dante Agostini, Maria Martinez, Franck Agulhon, and the University of Melbourne doctoral study of Candomblé drum-kit adaptation.

## Effect on the canonical corpus

- 74 of 217 canonical names occur explicitly in the supplied PDFs; the original corpus had 59 grade A/A- matches before the four pedagogical additions.
- The pack is especially strong for Afro-Cuban, Brazilian, funk/linear, jazz, reading, coordination, and general timekeeping material.
- The existing broader literature map still carries styles outside those domains. After rebuilding, 183 taxonomies are directly literature-supported and all 217 have an adjudicated taxonomy state.
- All 217 scores retain complete desk review. The playability validator reports no same-limb hi-hat open/closed conflict, ride/bell conflict, or other rejected physical collision.
- Every canonical groove now stores its local-PDF-pack state and, when present, source ID, title, authors, grade, SHA-256, relative pack path, and matching pages.

## Pedagogical additions

Four explicitly labelled teaching scores were added after accepting pedagogical adaptation as the publication threshold:

- **Guajira Drum-Set Adaptation** (`CAN-214`)
- **Pilón Drum-Set Adaptation** (`CAN-215`)
- **Cáscara Coordination Exercise** (`CAN-216`)
- **Mambo Bell Coordination Exercise** (`CAN-217`)

Each carries a taxonomy caveat stating that it is a practical reduction or coordination study rather than a definitive traditional transcription. Mardi Gras Indian, Street Beat, and Funeral March remain deferred because the supplied excerpt is too short for score-level triangulation.

## Learning proposal

`Learning` is a pedagogical curriculum, not a musical genre. Its second version contains 48 English-titled lessons in eight numbered levels, informed by the PAS rudimental framework, Rockschool Debut–Grade 8, Trinity percussion requirements, Vic Firth's tiered rudiment applications, and *A Fresh Approach to the Drum Set*:

1. Starter · Pulse and Setup
2. Foundation · Reading and Subdivision
3. Elementary · Technique and Sound
4. Intermediate · Coordination and Independence
5. Upper Intermediate · Pocket and Phrasing
6. Advanced · Stylistic Fluency
7. Proficient · Meter and Advanced Vocabulary
8. Expert · Interpretation and Performance

Each lesson (for example `1.1 Seat, Grip and Rebound`) points to an existing canonical groove as its musical application. This preserves the single-score rule, avoids exact duplicates, and lets difficulty/order evolve independently of musicological taxonomy. Canonical groove and lesson titles stay in English; level descriptions, skill tags, progress text, and mastery criteria are localized in French, English, and Spanish. The application exposes level navigation, start/target tempos, persistent progress, and direct Practice-mode configuration.

## Reproducibility

- `npm run grooves:pdf-audit` rebuilds the bibliographic and explicit-name evidence maps when the temporary OCR corpus is present.
- `npm run grooves:build` reapplies evidence, rebuilds all JSON/MIDI/runtime outputs, and validates playability and documentary state.
- `npm run check` validates the application after the corpus rebuild.
