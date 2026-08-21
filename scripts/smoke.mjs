import { readFile } from "node:fs/promises";

const [app, html, sw, css, manifest] = await Promise.all([
  readFile("app.js", "utf8"),
  readFile("index.html", "utf8"),
  readFile("service-worker.js", "utf8"),
  readFile("styles.css", "utf8"),
  readFile("manifest.webmanifest", "utf8"),
]);

const checks = [
  [html.includes('href="vendor/oat/oat.min.css"'), "Oat UI local référencé"],
  [html.includes('src="vendor/alpine/alpine.min.js"'), "Alpine local référencé"],
  [html.includes('id="theme-toggle"'), "toggle clair/sombre présent"],
  [css.includes("--bt-bg:") && css.includes("--bt-grid-width:"), "variables CSS centralisées"],
  [css.includes('#play-pause-icon:not(.fa-play):not(.fa-pause)::before'), "icône Play initiale présente"],
  [app.includes("event.shiftKey"), "Shift+clic de grille présent"],
  [app.includes('new StorageManager("mem")'), "mémoires URL activées"],
  [app.includes("new URLSearchParams(location.hash.slice(1))"), "lecture du hash URL présente"],
  [!app.includes("localStorage.getItem") && !app.includes("localStorage.setItem"), "localStorage retiré des mémoires"],
  [app.includes("history.replaceState"), "mise à jour du hash sans navigation"],
  [sw.includes('"./vendor/oat/oat.min.css"') && sw.includes('"./vendor/oat/oat.min.js"'), "Oat inclus dans l’app shell PWA"],
  [sw.includes('battrochtek-v23'), "cache PWA v23"],
  [css.includes('--bt-instrument-text:') && !app.includes('label.style.color'), "couleur des instruments pilotée par le thème"],
  [css.includes('.bt-tooltip') && html.includes('id="bt-tooltip"'), "tooltips adaptatifs présents"],
  [!html.includes('id="bt-help"'), "ancienne aide au survol retirée"],
  [!css.includes('.memory-saved::after'), "pastille mémoire supprimée"],
  [css.includes('margin-top: 14px') && css.includes('.transport-bar'), "espacement grille / transport présent"],
  [app.includes("SAMPLE_LIBRARY") && app.includes("setTrackSample"), "bibliothèque de samples et Kit Custom présents"],
  [app.includes("ARENA 909") && app.includes("NEON 808") && app.includes("GLITCH LAB"), "nouveaux kits distincts présents"],
  [html.includes("data-bt-tooltip=") && !html.includes(" title="), "une seule implémentation de tooltip"],
  [html.includes('id="share-button"') && html.includes('id="share-dialog"'), "dialog de partage présent"],
  [html.includes('src="vendor/qrcode/qrcode.js"') && sw.includes('"./vendor/qrcode/qrcode.js"'), "QR code local inclus dans la PWA"],
  [app.includes('shareParams.set("mem"') && app.includes('navigator.clipboard'), "lien de groove QR/copie présent"],
  [app.includes('{ v: 2, slots:') && app.includes('payload?.v === 1'), "mémoires v2 avec migration v1"],
  [app.includes('this.store.set(this.memorySlot, this.signatureIndex, this.snapshot())'), "signature et tempo propres à chaque mémoire"],
  [!app.includes('this.scheduler.stop();') && !app.includes('this.scheduler?.stop();'), "aucune action UI secondaire ne coupe Play"],
  [app.includes('e.code === "Space" && !mod') && app.indexOf('e.code === "Space" && !mod') < app.indexOf('if (editing || mod || e.altKey) return;'), "Espace prioritaire même dans les selects"],
  [app.includes('i % this.seq.signature.barSteps === 0'), "bar-accent sur chaque début de mesure"],
  [manifest.includes('icons/icon-512.png'), "icônes PWA déclarées"],
];

const failed = checks.filter(([ok]) => !ok);
for (const [ok, label] of checks) console.log(`${ok ? "✓" : "✗"} ${label}`);
if (failed.length) process.exit(1);
