import { cp, mkdir, rm, writeFile } from "node:fs/promises";
const out = new URL("../dist/", import.meta.url);
await rm(out, { recursive: true, force: true });
await mkdir(out, { recursive: true });
for (const entry of ["index.html","styles.css","app.js","service-worker.js","manifest.webmanifest","favicon-16.png","favicon-32.png","apple-touch-icon.png","logo.png","icons","sounds","vendor"]) {
  await cp(new URL(`../${entry}`, import.meta.url), new URL(entry, out), { recursive: true });
}
await writeFile(new URL(".nojekyll", out), "");
console.log("GitHub Pages build ready in dist/");
