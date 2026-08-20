import { readFile } from "node:fs/promises";

const [app, html, sw] = await Promise.all([
  readFile("app.js", "utf8"),
  readFile("index.html", "utf8"),
  readFile("service-worker.js", "utf8"),
]);

const checks = [
  [html.includes('src="vendor/alpine/alpine.min.js"'), "Alpine local référencé"],
  [(await readFile("styles.css", "utf8")).includes('#play-pause-icon:not(.fa-play):not(.fa-pause)::before'), "icône Play initiale présente"],
  [app.includes("event.shiftKey"), "Shift+clic de grille présent"],
  [app.includes("Array.from({ length: CONFIG.SIGNATURES.length }, () => Array(CONFIG.MEMORY_SLOTS))"), "reset mémoires vide"],
  [sw.includes('"./vendor/alpine/alpine.min.js"'), "Alpine inclus dans l'app shell PWA"],
];

const failed = checks.filter(([ok]) => !ok);
for (const [ok, label] of checks) console.log(`${ok ? "✓" : "✗"} ${label}`);
if (failed.length) process.exit(1);
