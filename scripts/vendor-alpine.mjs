import { copyFile, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const source = resolve(projectRoot, "node_modules/alpinejs/dist/cdn.min.js");
const target = resolve(projectRoot, "vendor/alpine/alpine.min.js");

await mkdir(dirname(target), { recursive: true });
await copyFile(source, target);
console.log("Alpine.js copié dans vendor/alpine/alpine.min.js");
