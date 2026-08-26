import { appendFile, mkdir, readFile, readdir, rm, stat, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import path from 'node:path';

const inventoryPath=new URL('../musicology/pdf-source-inventory.json',import.meta.url);
const inventory=JSON.parse(await readFile(inventoryPath,'utf8'));
const workRoot=path.resolve('tmp/pdfs');
const textRoot=path.join(workRoot,'ocr-text');
const renderRoot=path.join(workRoot,'render');
const ocrBinary=process.argv[2]||'/tmp/battrochtek-ocr';
await mkdir(textRoot,{recursive:true});await mkdir(renderRoot,{recursive:true});

const unique=new Map();for(const row of inventory.rows)if(!unique.has(row.sha256))unique.set(row.sha256,row);
const rows=[...unique.values()];
function pageNumber(file){return Number(file.match(/-(\d+)\.jpg$/)?.[1]||0);}
async function nonempty(file){try{return (await stat(file)).size>100;}catch{return false;}}

for(let index=0;index<rows.length;index++){
  const row=rows[index],out=path.join(textRoot,`${row.sha256}.txt`);
  if(await nonempty(out)){console.log(`[${index+1}/${rows.length}] cached ${row.filename}`);continue;}
  console.log(`[${index+1}/${rows.length}] extracting ${row.filename} (${row.pages} pages, ${row.textLayer})`);
  if(row.textLayer==='present'){
    execFileSync('pdftotext',['-layout',row.path,out],{maxBuffer:8e6});
    continue;
  }
  const dir=path.join(renderRoot,row.sha256);await rm(dir,{recursive:true,force:true});await mkdir(dir,{recursive:true});
  const prefix=path.join(dir,'page');
  execFileSync('pdftoppm',['-jpeg','-r','120','-jpegopt','quality=82',row.path,prefix],{stdio:'inherit'});
  const images=(await readdir(dir)).filter(x=>/\.jpg$/i.test(x)).sort((a,b)=>pageNumber(a)-pageNumber(b));
  await writeFile(out,`SOURCE: ${row.relativePath}\nSHA256: ${row.sha256}\n\n`);
  for(let i=0;i<images.length;i++){
    const image=path.join(dir,images[i]);
    let text='';try{text=execFileSync(ocrBinary,[image],{encoding:'utf8',maxBuffer:6e6});}catch(e){text=`OCR ERROR: ${e.message}`;}
    text=text.replace(/^\s*=== .*? ===\s*/s,'').trim();
    await appendFile(out,`\n\f=== PAGE ${i+1} ===\n${text}\n`);
    if((i+1)%10===0||i+1===images.length)console.log(`  ${i+1}/${images.length} pages`);
  }
  await rm(dir,{recursive:true,force:true});
}
await writeFile(path.join(workRoot,'ocr-complete.json'),JSON.stringify({generatedAt:new Date().toISOString(),uniqueFiles:rows.length,textRoot},null,2));
console.log(`✓ OCR/extraction complete for ${rows.length} unique PDF files.`);
