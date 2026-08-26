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

- 70 of 213 canonical names occur explicitly in the supplied PDFs; 59 have at least one grade A/A- match.
- The pack is especially strong for Afro-Cuban, Brazilian, funk/linear, jazz, reading, coordination, and general timekeeping material.
- The existing broader literature map still carries styles outside those domains. After rebuilding, 183 taxonomies are directly literature-supported and all 213 have an adjudicated taxonomy state.
- All 213 scores retain complete desk review. The playability validator reports no same-limb hi-hat open/closed conflict, ride/bell conflict, or other rejected physical collision.
- Every canonical groove now stores its local-PDF-pack state and, when present, source ID, title, authors, grade, SHA-256, relative pack path, and matching pages.

## Missing-style decision

The pack identifies plausible additions, especially **Guajira** and **Pilón**, plus the technical vocabulary **Cáscara** and **Mambo Bell**. They are not added to the canonical runtime library in this pass:

- Guajira is well named in strong publications, but the supplied pages located in the most authoritative drumset method are glossary/discography material rather than a complete canonical drumset orchestration.
- Pilón has an actual transcription in the DrumGenius companion, but that source explicitly describes itself as an informal transcription set and is not sufficient alone for a canonical reference score.
- Cáscara and Mambo Bell are orchestration/timeline concepts used across styles, not independent genres. They belong in the learning path.
- Mardi Gras Indian, Street Beat, and Funeral March appear as useful New Orleans vocabulary, but the supplied excerpt is too short to justify three new universal archetypes without stronger score-level triangulation.

This conservative decision avoids manufacturing stylistic certainty from titles or glossaries. These candidates remain documented for a later source-complete supplement.

## Learning proposal

`Learning` is appropriate as a pedagogical view, not as a musical genre. The implemented curriculum contains 30 English-titled lessons in five numbered levels:

1. Timekeeping Foundations
2. Subdivision and Coordination
3. Pocket and Independence
4. Essential Styles
5. Advanced Language

Each lesson (for example `1.1 Quarter-Note Pulse`) points to an existing canonical groove. This preserves the single-score rule, avoids exact duplicates, and lets difficulty/order evolve independently of musicological taxonomy. The curriculum is ready as data; UI exposure should be a virtual Learning filter rather than a second groove library.

## Reproducibility

- `npm run grooves:pdf-audit` rebuilds the bibliographic and explicit-name evidence maps when the temporary OCR corpus is present.
- `npm run grooves:build` reapplies evidence, rebuilds all JSON/MIDI/runtime outputs, and validates playability and documentary state.
- `npm run check` validates the application after the corpus rebuild.
