import { access, mkdir } from "node:fs/promises";
import { basename, resolve } from "node:path";
import { importSourceFolder, importGrooveRoot, walkGrooveFiles, writeGrooveBundle, slug } from "./groove-import-lib.mjs";

const outFile=new URL("../grooves/external-grooves.js",import.meta.url);
const args=process.argv.slice(2).filter(arg=>!arg.startsWith("--"));
let grooves=[],sourceInfo=[];

if (args.length) {
  for (const input of args) {
    const path=resolve(input);
    try { await access(path); }
    catch { console.warn(`⚠ Dossier introuvable: ${input}`); continue; }
    if (!(await walkGrooveFiles(path)).length) continue;
    const label=basename(path), imported=await importSourceFolder(path,label);
    grooves.push(...imported);
    sourceInfo.push({id:slug(label),label,available:imported.length>0,count:imported.length});
    console.log(`✓ ${label}: ${imported.length} groove(s)`);
  }
} else {
  try {
    const imported=await importGrooveRoot("grooves");
    grooves=imported.grooves; sourceInfo=imported.sourceInfo;
    sourceInfo.forEach(source=>console.log(`✓ ${source.label}: ${source.count} groove(s)`));
  } catch (error) {
    console.warn(`⚠ ./grooves indisponible: ${error.message}`);
  }
}

await mkdir(new URL("../grooves/",import.meta.url),{recursive:true});
await writeGrooveBundle(outFile,grooves,sourceInfo);
console.log(`✓ Bundle brut: ${grooves.length} groove(s), ${sourceInfo.length} source(s)`);
