import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const manifestUrl = new URL("samples/manifest-v2.json", root);
const manifestJsUrl = new URL("samples/manifest-v2.js", root);
const provenanceUrl = new URL("samples/provenance.jsonl", root);
const licenseUrl = "https://creativecommons.org/publicdomain/zero/1.0/";
const collectionUrl = "https://freesound.org/people/HenKonen/packs/39146/";
const processingByKey = {
  bt_analog_short_bell: "mono/resample, low-pass, compression, 1.15 s envelope",
  bt_digital80_bell: "mono/resample, 12-bit reduction, band-pass shaping, 1.8 s envelope",
  bt_spdust_bell: "mono/resample, dark low-pass, 11-bit reduction, compression, 2.3 s envelope",
  bt_glitch_metal_bell: "mono/resample, 7-bit reduction, metallic multiband EQ, 1.25 s envelope",
};

const definitions = [
  ["henkonen_ridebell_vl1", "sounds/imported/henkonen-bells/henkonen_ridebell_vl1.wav", "HenKonen Ride Bell Piano", [1, 42], "henkonen_ridebell_vl1", "700811__henkonen__ride-bell-p.wav", "https://freesound.org/people/HenKonen/sounds/700811/", "Acoustique", "studio-clean"],
  ["henkonen_ridebell_vl2", "sounds/imported/henkonen-bells/henkonen_ridebell_vl2.wav", "HenKonen Ride Bell Mezzo Piano", [43, 84], "henkonen_ridebell_vl2", "700810__henkonen__ride-bell-mp.wav", "https://freesound.org/people/HenKonen/sounds/700810/", "Acoustique", "studio-clean"],
  ["henkonen_ridebell_vl3", "sounds/imported/henkonen-bells/henkonen_ridebell_vl3.wav", "HenKonen Ride Bell Forte", [85, 127], "henkonen_ridebell_vl3", "700809__henkonen__ride-bell-f.wav", "https://freesound.org/people/HenKonen/sounds/700809/", "Acoustique", "studio-clean"],
  ["henkonen_ride2bell_vl1", "sounds/imported/henkonen-bells/henkonen_ride2bell_vl1.wav", "HenKonen Ride 2 Bell Mezzo Forte", [1, 84], "henkonen_ride2bell_vl1", "700805__henkonen__ride-2-alt-bell-mf.wav", "https://freesound.org/people/HenKonen/sounds/700805/", "Acoustique", "soul-warm"],
  ["henkonen_ride2bell_vl2", "sounds/imported/henkonen-bells/henkonen_ride2bell_vl2.wav", "HenKonen Ride 2 Bell Forte", [85, 127], "henkonen_ride2bell_vl2", "700806__henkonen__ride-2-bell-f-long.wav", "https://freesound.org/people/HenKonen/sounds/700806/", "Acoustique", "soul-warm"],
  ["bt_analog_short_bell", "sounds/derived/kit-bells/bt_analog_short_bell.wav", "Analog Classic Short Bell", [1, 127], null, "700811__henkonen__ride-bell-p.wav", "https://freesound.org/people/HenKonen/sounds/700811/", "Électro", "analog-short"],
  ["bt_digital80_bell", "sounds/derived/kit-bells/bt_digital80_bell.wav", "Digital 80 Ride Bell", [1, 127], null, "700809__henkonen__ride-bell-f.wav", "https://freesound.org/people/HenKonen/sounds/700809/", "Électro", "digital-80"],
  ["bt_spdust_bell", "sounds/derived/kit-bells/bt_spdust_bell.wav", "SP Dust Ride Bell", [1, 127], null, "700805__henkonen__ride-2-alt-bell-mf.wav", "https://freesound.org/people/HenKonen/sounds/700805/", "Électro", "lo-fi-dark"],
  ["bt_glitch_metal_bell", "sounds/derived/kit-bells/bt_glitch_metal_bell.wav", "Glitch Lab Metal Bell", [1, 127], null, "700806__henkonen__ride-2-bell-f-long.wav", "https://freesound.org/people/HenKonen/sounds/700806/", "Électro", "glitch-metal"],
];

const sha256 = async relativePath => createHash("sha256").update(await readFile(new URL(relativePath, root))).digest("hex");
const samples = [];
for (const [key, file, label, velocity, roundRobinGroup, sourceFile, sourceUrl, category, color] of definitions) {
  const sample = {
    key, file, label, legacyType: "cymbal", instrument: "ride", articulation: "bell",
    velocity: { min: velocity[0], max: velocity[1] }, roundRobinGroup, roundRobinIndex: roundRobinGroup ? 1 : null,
    chokeGroup: null, bank: key.startsWith("henkonen_") ? "henkonen-bells" : `bt-${color}`,
    sourceFile, sourceCollection: "Sounds and Scapes 4 — Drumkit Oneshots", sourceUrl,
    collectionUrl, license: "CC0-1.0", licenseUrl, importProfile: "henkonen-kit-bells",
    tags: ["ride", "bell", "cc0", color], category, displayLabel: label,
    sha256: await sha256(file),
  };
  if (processingByKey[key]) sample.processing = processingByKey[key];
  samples.push(sample);
}

const manifest = JSON.parse(await readFile(manifestUrl, "utf8"));
const keys = new Set(samples.map(sample => sample.key));
manifest.samples = [...manifest.samples.filter(sample => !keys.has(sample.key)), ...samples];
await writeFile(manifestUrl, `${JSON.stringify(manifest, null, 2)}\n`);
await writeFile(manifestJsUrl, `window.BATTROCHTEK_SAMPLE_MANIFEST = ${JSON.stringify(manifest)};\n`);

const provenanceLines = (await readFile(provenanceUrl, "utf8")).trim().split("\n").filter(Boolean);
const retainedLines = provenanceLines.filter(line => !keys.has(JSON.parse(line).key));
const newLines = samples.map(({ key, file, sha256, sourceCollection, sourceUrl, sourceFile, license, importProfile }) => JSON.stringify({ key, file, sha256, sourceCollection, sourceUrl, sourceFile, license, importProfile }));
await writeFile(provenanceUrl, `${[...retainedLines, ...newLines].join("\n")}\n`);
console.log(`Registered ${samples.length} CC0 kit bell samples.`);
