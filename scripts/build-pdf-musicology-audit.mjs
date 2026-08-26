import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const inventory = JSON.parse(await readFile('musicology/pdf-source-inventory.json', 'utf8'));
const taxonomy = (await readFile('musicology/canonical-taxonomy-v1.csv', 'utf8')).trim().split('\n').slice(1).map(line => {
  const cells = line.match(/(?:"(?:[^"]|"")*"|[^,])+/g)?.map(x => x.replace(/^"|"$/g, '').replace(/""/g, '"')) || [];
  return { id: cells[0], family: cells[1], tradition: cells[2], archetype: cells[3] };
});

const unique = [...new Map(inventory.rows.map(row => [row.sha256, row])).values()];
const norm = value => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const pageSplit = text => text.split(/\f(?:=== PAGE \d+ ===\s*)?/).map((text, index) => ({ page: index + 1, text }));

const catalog = [
  [/Funkifying the Clave|Afro-Cuban Grooves for Bass/, 'Funkifying the Clave: Afro-Cuban Grooves for Bass and Drums', ['Lincoln Goines', 'Robby Ameen'], 'Manhattan Music', 1990, 'professional-method', 'A'],
  [/Afro-Cuban Rhythms/, 'Afro-Cuban Rhythms for Drumset', ['Frank Malabe', 'Bob Weiner'], 'Manhattan Music / Alfred Music', 1990, 'professional-method', 'A'],
  [/^Afro-Cuban Grooves\.pdf$/, 'Afro-Cuban Keyboard Grooves', ['Manny Patiño', 'Jorge Moreno'], 'Musicians Institute Press / Hal Leonard', null, 'professional-method', 'A'],
  [/DrumGenius/, 'DrumGenius Afro-Cuban Groove Transcriptions', ['Mauro Battisti'], 'ProJazzLab', null, 'transcription-companion', 'B'],
  [/Timba-Go/, 'Timba-Go: Afro-Latin Hybrid Grooves for Drumset', ['James Dreier'], 'Percussive Arts Society article', null, 'professional-article', 'A-'],
  [/Basic Course Drummer Notes/, 'Basic Course Drummer Notes', [], null, null, 'unidentified-course-notes', 'C'],
  [/Bass & Drum Grooves/, 'Bass & Drum Grooves', [], null, null, 'unidentified-excerpt', 'C'],
  [/^Drum Book/, 'Instant Guide to Drum Grooves', ['Maria Martinez'], 'Hal Leonard', null, 'professional-method', 'A'],
  [/Brazilian Coordination/, 'Brazilian Coordination for Drumset', ['Maria Martinez'], 'Hal Leonard', 1999, 'professional-method', 'A'],
  [/Brazilian Drumming Rhythms/, 'Brazilian Rhythms in the Drums', [], null, null, 'unidentified-excerpt', 'C'],
  [/Brazilian Rhythms for Drumset — Duduka/, 'Brazilian Rhythms for Drumset', ['Duduka Da Fonseca', 'Bob Weiner'], 'Manhattan Music / Alfred Music', 1991, 'professional-method', 'A'],
  [/Vera Figueiredo/, 'Brazilian Rhythms for Drumset', ['Vera Figueiredo', 'Daniel Oliveira'], 'Hudson Music', null, 'professional-method-excerpt', 'A-'],
  [/Candomblé/, "A Cannibalist's Manifesto: Candomblé Rhythms for Drum Kit", ['Peter Alastair McGrath-Kerr'], 'University of Melbourne', 2019, 'doctoral-thesis', 'A'],
  [/Brazilian Groove Book/, 'The Brazilian Groove Book', ['Kiko Freitas'], null, null, 'professional-method-excerpt', 'A-'],
  [/Solfège Rhythmique/, 'Solfège Rythmique, Cahier No. 1', ['Dante Agostini'], 'École Dante Agostini', null, 'professional-method', 'A'],
  [/Methode de Batterie Dante Agostini Vol\. 1-2/, 'Méthode de Batterie, Volumes I–II', ['Dante Agostini'], 'École Dante Agostini', null, 'professional-method', 'A'],
  [/^(?:Methode de Batterie|Méthode de Batterie|dante agostini 2)/i, 'Méthode de Batterie, Volume II', ['Dante Agostini'], 'École Dante Agostini', null, 'professional-method', 'A'],
  [/Déchiffrages - Vol\.1|Déchiffrages - Vol\.1/, 'Preparation for Sight-Reading, Volume I', ['Dante Agostini'], 'École Dante Agostini', null, 'professional-method', 'A'],
  [/paration aux D.chiffrages - Vol\.2/, 'Preparation for Sight-Reading, Volume II', ['Dante Agostini'], 'École Dante Agostini', null, 'professional-method', 'A'],
  [/paration aux D.chiffrages - Vol\.3/, 'Preparation for Sight-Reading, Volume III', ['Dante Agostini'], 'École Dante Agostini', null, 'professional-method', 'A'],
  [/Funk Drumming 101/, 'Funk Drumming 101', ['Simone Pannozzo'], 'Self-published educational excerpt', null, 'promotional-excerpt', 'B-'],
  [/Linear Patterns Made Easy/, 'Linear Patterns Made Easy', [], null, null, 'magazine-excerpt', 'C'],
  [/Musical Linear Drum Fills/, 'Linear Drum Fills', ['Blake Paulson'], 'Alfred Music', 2014, 'professional-method-excerpt', 'A-'],
  [/Mike Clark/, 'Funk Drumming: Innovative Grooves & Advanced Concepts', ['Mike Clark'], 'Hal Leonard', null, 'professional-method', 'A'],
  [/Mike Johnston/, 'Linear Drumming', ['Mike Johnston'], null, null, 'professional-method', 'A-'],
  [/100 Grooves Every/, '100 Grooves Every Drummer Needs to Know', [], 'Musora / Drumeo', null, 'published-method', 'B+'],
  [/1000 Drum Grooves/, '1000 Drum Grooves', ['Steve Mansfield'], null, null, 'published-method', 'B+'],
  [/1001 Drum Grooves/, '1001 Drum Grooves', ['Steve Mansfield'], null, null, 'web-reproduced-method', 'B-'],
  [/20 Essential/, '20 Essential Grooves', ['Jesvin Mathew'], null, null, 'educational-handout', 'B-'],
  [/Advanced Drum Grooves/, 'Advanced Drum Grooves', [], null, null, 'anonymous-worksheet', 'D'],
  [/Drum Patterns for Musicians/, 'Drum Patterns for Musicians', [], null, null, 'educational-handout', 'C'],
  [/Drumset FUNdamentals/, 'Drumset FUNdamentals', ['Dave Black', 'Mark Dorr'], 'Percussive Arts Society handout', 2001, 'professional-clinic-handout', 'A-'],
  [/Essential Drum Grooves/, 'Essential Drum Grooves: 16 Rhythms', [], null, null, 'educational-handout', 'C'],
  [/Richard Hemmings/, 'Free Drum Book', ['Richard Hemmings'], 'Leicester Drum School', 2024, 'teacher-method', 'B+'],
  [/Franck Agulhon/, 'Drum Book', ['Franck Agulhon'], null, null, 'professional-method', 'A'],
  [/Grooves List/, 'Grooves List (Bass Drum Focus)', [], null, null, 'anonymous-worksheet', 'D'],
  [/Craig Lauritsen|Progressive (?:1,000,000 )?Drum Grooves/, 'Progressive 1,000,000 Drum Grooves in 4/4 Time', ['Craig Lauritsen'], 'Progressive Publishing', null, 'professional-method', 'B+'],
  [/Billy Hart/, 'Jazz Drumming', ['Billy Hart'], 'Advance Music', null, 'professional-method', 'A'],
  [/Drummer Essentials/, 'Drummer Essentials: Jazz Drumming', [], 'DrummerLessons.com', null, 'web-course', 'B-'],
  [/Jazz Comping/, '3/4 Comping: The Basics of Jazz Drumming in 3/4', [], 'On Jazz Drumming', null, 'educational-handout', 'B-'],
  [/Jazz Drum Patterns/, 'Jazz Drum Patterns: 32 Patterns', [], null, null, 'unidentified-handout', 'C'],
  [/Jazz Drumming Phrases/, 'Jazz Drumming Phrases 1–30', ['Gabor Turi'], null, null, 'educational-handout', 'B-'],
  [/John Riley/, "The Jazz Drummer's Workshop", ['John Riley'], null, null, 'professional-method', 'A'],
  [/Afro-Cuban Songs/, 'Afro-Cuban Songs and Rhythms Guide', [], null, null, 'listening-guide', 'C'],
  [/100 Years of New Orleans/, '100 Years of New Orleans Drumming', ['Dan Thress', 'Antoon Aukes'], null, null, 'professional-method-excerpt', 'A-'],
  [/17 Book Bibliography/, 'Afro-Cuban Drumming Resources: 17-Book Bibliography', [], null, null, 'bibliography', 'C'],
  [/Large Method Catalogue/, 'Drums & Percussion Method Catalogue', [], null, null, 'publisher-catalog', 'B'],
  [/Student Book List/, 'Drumset Student Book List', [], null, null, 'teacher-reading-list', 'B'],
  [/Repertoire Guide/, 'Percussion Repertoire Guide', ['James Campbell', 'Brad Meyer'], null, null, 'academic-repertoire-guide', 'A-'],
  [/UNT Jazz/, 'UNT Percussion Applied Lesson Syllabus: Drum Set — Jazz', [], 'University of North Texas', 2019, 'university-curriculum', 'A'],
  [/West African Rhythms/, 'West African Rhythms for Drumset', ['Royal Hartigan', 'Abraham Adzenyah', 'Freeman Donkor'], 'Manhattan Music / Alfred Music', 1995, 'professional-method-excerpt', 'A'],
];

const aliases = {
  'Four-on-the-Floor': ['four on the floor'], '8th-note Shuffle': ['eighth note shuffle', '8th note shuffle'],
  '16th-note Shuffle': ['sixteenth note shuffle', '16th note shuffle'], 'Ghost-Note Pocket': ['ghost note'],
  'Linear Groove': ['linear groove', 'linear drumming'], 'Jazz Waltz 3/4': ['jazz waltz', '3 4 comping'],
  'Bebop Comping': ['bebop comping', 'jazz comping'], 'Afro-Cuban Jazz 6/8': ['afro cuban 6 8'],
  'New Orleans Funk / Second Line': ['second line', 'new orleans funk'], 'Meters-style New Orleans Funk': ['meters', 'new orleans funk'],
  'Bossa Nova': ['bossa nova'], 'Samba Batucada': ['batucada'], 'Samba Partido Alto': ['partido alto'],
  'Ijexá / Afoxê': ['ijexa', 'afoxe'], 'Ewe 12/8 / Agbekor Adaptation': ['agbekor', 'ewe 12 8'],
  'Jùjú / Yoruba-derived Drum-Set': ['juju', 'yoruba'], 'Guaguancó': ['guaguanco'],
  'Guajira Drum-Set Adaptation': ['guajira'], 'Pilón Drum-Set Adaptation': ['pilon'],
  'Cáscara Coordination Exercise': ['cascara'], 'Mambo Bell Coordination Exercise': ['mambo bell'],
};

function identify(row) {
  const found = catalog.find(([pattern]) => pattern.test(row.filename));
  const data = found?.slice(1) || [row.filename.replace(/\.pdf$/i, ''), [], null, null, 'unidentified', 'D'];
  return { title: data[0], authors: data[1], publisher: data[2], year: data[3], sourceKind: data[4], evidenceGrade: data[5] };
}

const sources = [];
for (const row of unique) {
  const raw = await readFile(path.join('tmp/pdfs/ocr-text', `${row.sha256}.txt`), 'utf8');
  const pages = pageSplit(raw);
  const identity = identify(row);
  sources.push({
    sourceId: `PDF-${row.sha256.slice(0, 12)}`,
    sha256: row.sha256,
    relativePaths: inventory.rows.filter(x => x.sha256 === row.sha256).map(x => x.relativePath),
    pageCount: row.pages,
    textLayer: row.textLayer,
    ...identity,
    workKey: norm(identity.title),
    extractedCharacters: raw.length,
    assessment: ['A', 'A-'].includes(identity.evidenceGrade)
      ? 'Strong published or academic evidence; suitable for taxonomy and drum-set orchestration corroboration.'
      : identity.evidenceGrade.startsWith('B')
        ? 'Useful pedagogical corroboration; use with stronger sources for historical or cultural claims.'
        : identity.evidenceGrade === 'C'
          ? 'Contextual lead only; incomplete authorship or publication context limits evidential weight.'
          : 'Not accepted as musicological evidence; retained only for corpus completeness.',
    _pages: pages,
  });
}

const evidence = [];
for (const groove of taxonomy) {
  const terms = [...new Set([groove.archetype, ...(aliases[groove.archetype] || [])].map(norm).filter(x => x.length >= 4))];
  const hits = [];
  for (const source of sources) {
    const matchedPages = source._pages.filter(page => terms.some(term => norm(page.text).includes(term))).map(page => page.page);
    if (matchedPages.length) hits.push({ sourceId: source.sourceId, pages: matchedPages.slice(0, 24), evidenceGrade: source.evidenceGrade });
  }
  evidence.push({ ...groove, terms, sourceHits: hits, strongSourceCount: hits.filter(x => /^A/.test(x.evidenceGrade)).length, anySourceCount: hits.length });
}

const works = [...new Map(sources.map(source => [source.workKey, source])).keys()].map(workKey => {
  const editions = sources.filter(source => source.workKey === workKey);
  return { workKey, title: editions[0].title, sourceIds: editions.map(x => x.sourceId), copies: editions.reduce((sum, x) => sum + x.relativePaths.length, 0) };
});

const cleanSources = sources.map(({ _pages, ...source }) => source);
const report = {
  schema: 'battrochtek.pdf-musicology-audit/v1', generatedAt: new Date().toISOString(),
  sourcePack: { suppliedFiles: inventory.fileCount, uniqueFiles: unique.length, uniqueWorks: works.length, pages: unique.reduce((sum, x) => sum + x.pages, 0) },
  grading: { A: 'professional or peer-reviewed/academic', 'A-': 'professional but excerpted', B: 'published pedagogical corroboration', C: 'context only', D: 'not evidence' },
  sources: cleanSources, works,
};
await writeFile('musicology/pdf-source-audit.json', JSON.stringify(report, null, 2) + '\n');
await writeFile('musicology/pdf-groove-evidence-map.json', JSON.stringify({ schema: 'battrochtek.pdf-groove-evidence/v1', generatedAt: new Date().toISOString(), grooves: evidence }, null, 2) + '\n');

const csv = rows => rows.map(row => row.map(value => `"${String(value ?? '').replaceAll('"', '""')}"`).join(',')).join('\n') + '\n';
await writeFile('musicology/pdf-source-audit.csv', csv([
  ['sourceId', 'title', 'authors', 'publisher', 'year', 'sourceKind', 'evidenceGrade', 'pageCount', 'sha256', 'relativePaths'],
  ...cleanSources.map(x => [x.sourceId, x.title, x.authors.join('; '), x.publisher, x.year, x.sourceKind, x.evidenceGrade, x.pageCount, x.sha256, x.relativePaths.join('; ')]),
]));
await writeFile('musicology/pdf-groove-evidence-map.csv', csv([
  ['canonicalId', 'family', 'tradition', 'archetype', 'strongSourceCount', 'anySourceCount', 'sourcePages'],
  ...evidence.map(x => [x.id, x.family, x.tradition, x.archetype, x.strongSourceCount, x.anySourceCount, x.sourceHits.map(h => `${h.sourceId}:${h.pages.join('|')}`).join('; ')]),
]));

console.log(`Audited ${cleanSources.length} unique files / ${works.length} identified works; mapped ${evidence.filter(x => x.anySourceCount).length}/${evidence.length} grooves to explicit PDF mentions.`);
