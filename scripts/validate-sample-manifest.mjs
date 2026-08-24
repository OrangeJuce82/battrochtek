import { access, readFile } from "node:fs/promises";

const manifest = JSON.parse(await readFile("samples/manifest-v2.json", "utf8"));
const errors = [];
if (manifest.schemaVersion !== 2) errors.push("schemaVersion doit être 2");
const seen = new Set();
for (const sample of manifest.samples || []) {
  if (!sample.key || seen.has(sample.key)) errors.push(`clé absente ou dupliquée: ${sample.key || "<vide>"}`);
  seen.add(sample.key);
  if (!sample.file || !sample.instrument || !sample.articulation || !sample.bank) errors.push(`métadonnées incomplètes: ${sample.key}`);
  const min = sample.velocity?.min, max = sample.velocity?.max;
  if (!Number.isInteger(min) || !Number.isInteger(max) || min < 1 || max > 127 || min > max) errors.push(`plage vélocité invalide: ${sample.key}`);
  try { await access(sample.file); } catch { errors.push(`fichier absent: ${sample.file}`); }
}
if (errors.length) {
  console.error(errors.map(error => `✗ ${error}`).join("\n"));
  process.exit(1);
}
console.log(`✓ Sample Manifest v2 valide: ${manifest.samples.length} samples, ${seen.size} clés uniques.`);
