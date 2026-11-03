import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';

const root=path.resolve(import.meta.dirname,'..');
const pointerPart=value=>String(value).replaceAll('~','~0').replaceAll('/','~1');

// Compare JSON values, ignoring object-key order but preserving route order.
// Every field is shared; there are deliberately no ignored eligibility or source fields.
export function crisisDifferences(local,canonical,pointer=''){
 if(Object.is(local,canonical))return [];
 const localObject=local!==null&&typeof local==='object';
 const canonicalObject=canonical!==null&&typeof canonical==='object';
 if(!localObject||!canonicalObject||Array.isArray(local)!==Array.isArray(canonical))return [pointer||'/'];
 const keys=[...new Set([...Object.keys(local),...Object.keys(canonical)])].sort();
 const differences=[];
 for(const key of keys){
  const location=pointer+'/'+pointerPart(key);
  if(!Object.hasOwn(local,key)||!Object.hasOwn(canonical,key))differences.push(location);
  else differences.push(...crisisDifferences(local[key],canonical[key],location));
 }
 return differences;
}

export function readCrisisSource(filename){
 const source=JSON.parse(fs.readFileSync(filename,'utf8'));
 if(source.repository!=='OPlyons/Navigator'||!/^[a-f0-9]{40}$/.test(source.revision||'')){
  throw new Error('Crisis source must name OPlyons/Navigator and an exact 40-character commit SHA.');
 }
 return source;
}

export function checkCrisisConsistency(canonicalFile,localFile=path.join(root,'config/crisis-pathways.json')){
 const local=JSON.parse(fs.readFileSync(localFile,'utf8'));
 const canonical=JSON.parse(fs.readFileSync(canonicalFile,'utf8'));
 const differences=crisisDifferences(local,canonical);
 if(differences.length)throw new Error('Shared crisis guidance differs at:\n'+differences.map(p=>'  '+p).join('\n')+'\nReview the NHS/provider sources and update both projects in paired PRs. Do not auto-copy or publish.');
 return 'Shared crisis guidance matches Navigator in every JSON field.';
}

if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){
 try{
  if(process.argv.length!==3)throw new Error('Usage: node scripts/check-crisis-consistency.mjs <Navigator crisis-pathways.json>');
  console.log(checkCrisisConsistency(process.argv[2]));
 }catch(error){console.error(error.message);process.exitCode=1;}
}
