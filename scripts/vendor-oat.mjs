import { copyFile, mkdir } from "node:fs/promises";
import { dirname } from "node:path";

const assets = [
  ["node_modules/@knadh/oat/oat.min.css", "vendor/oat/oat.min.css"],
  ["node_modules/@knadh/oat/oat.min.js", "vendor/oat/oat.min.js"],
];

for (const [source, target] of assets) {
  await mkdir(dirname(target), { recursive: true });
  await copyFile(source, target);
}

console.log("Oat UI copié dans vendor/oat.");
