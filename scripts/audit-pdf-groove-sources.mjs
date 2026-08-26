import { readdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import path from 'node:path';

const root=process.argv[2];
if(!root) throw new Error('Usage: node scripts/audit-pdf-groove-sources.mjs <pdf-root>');
const outJson=new URL('../musicology/pdf-source-inventory.json',import.meta.url);
const outCsv=new URL('../musicology/pdf-source-inventory.csv',import.meta.url);

async function walk(dir){const out=[];for(const e of await readdir(dir,{withFileTypes:true})){const p=path.join(dir,e.name);if(e.isDirectory())out.push(...await walk(p));else if(e.isFile()&&/\.pdf$/i.test(e.name))out.push(p);}return out;}
function parseInfo(s){const o={};for(const line of s.split(/\r?\n/)){const m=line.match(/^([^:]+):\s*(.*)$/);if(m)o[m[1].trim()]=m[2].trim();}return o;}
function esc(v){return `"${String(v??'').replaceAll('"','""')}"`;}

const files=(await walk(root)).sort();const rows=[];
for(let i=0;i<files.length;i++){
  const file=files[i],data=await readFile(file),sha256=createHash('sha256').update(data).digest('hex');
  let info={},sample='',error='';
  try{info=parseInfo(execFileSync('pdfinfo',[file],{encoding:'utf8',maxBuffer:4e6}));}catch(e){error=`pdfinfo: ${e.message}`;}
  const pages=Math.max(0,Number(info.Pages||0));
  try{sample=execFileSync('pdftotext',['-f','1','-l',String(Math.min(24,pages||24)),'-layout',file,'-'],{encoding:'utf8',maxBuffer:24e6});}catch(e){error=`${error} pdftotext: ${e.message}`.trim();}
  const normalized=sample.replace(/\s+/g,' ').trim();
  rows.push({path:file,relativePath:path.relative(root,file),folder:path.relative(root,path.dirname(file))||'.',filename:path.basename(file),sha256,pages,title:info.Title||'',author:info.Author||'',creator:info.Creator||'',producer:info.Producer||'',creationDate:info.CreationDate||'',encrypted:info.Encrypted||'',pageSize:info['Page size']||'',sampleTextCharacters:normalized.length,textLayer:normalized.length>=200?'present':'weak-or-scanned',sampleText:normalized.slice(0,12000),error});
  console.log(`[${i+1}/${files.length}] ${path.basename(file)} — ${pages} pages — ${normalized.length} sample chars`);
}
const groups=new Map();for(const r of rows)(groups.get(r.sha256)??groups.set(r.sha256,[]).get(r.sha256)).push(r.relativePath);
const exactDuplicateGroups=[...groups.entries()].filter(([,v])=>v.length>1).map(([sha256,paths])=>({sha256,paths}));
const uniqueFiles=[...groups.values()].length;
await writeFile(outJson,JSON.stringify({schema:'battrochtek.pdf-source-inventory/v1',generatedAt:new Date().toISOString(),root,fileCount:rows.length,uniqueFiles,exactDuplicateGroups,rows},null,2));
const keys=['relativePath','folder','filename','sha256','pages','title','author','creator','producer','creationDate','encrypted','pageSize','sampleTextCharacters','textLayer','error'];
await writeFile(outCsv,[keys.join(','),...rows.map(r=>keys.map(k=>esc(r[k])).join(','))].join('\n'));
console.log(`✓ PDF inventory: ${rows.length} paths, ${uniqueFiles} unique files, ${exactDuplicateGroups.length} duplicate groups.`);
