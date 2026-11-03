import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {crisisDifferences,readCrisisSource,checkCrisisConsistency} from '../../scripts/check-crisis-consistency.mjs';

const data=JSON.parse(fs.readFileSync('config/crisis-pathways.json','utf8'));
const route=(copy,area,name)=>copy.areas[area].routes.find(r=>r.name===name);

test('the shared comparison detects each of the original six guidance differences',()=>{
 for(const area of ['brent','harrow','hillingdon','kensington-chelsea','westminster']){
  const copy=structuredClone(data);
  route(copy,area,'MHCAS at St Charles Hospital').text=route(copy,area,'MHCAS at St Charles Hospital').text.replace(/^For residents of .*?\. /,'');
  assert.deepEqual(crisisDifferences(copy,data),['/areas/'+area+'/routes/2/text']);
 }
 const copy=structuredClone(data);
 route(copy,'milton-keynes','Urgent NHS advice and SPA').text='General SPA advice without the local and out-of-hours distinction.';
 assert.deepEqual(crisisDifferences(copy,data),['/areas/milton-keynes/routes/0/text']);
});

test('source links, contacts, notices, check dates and route additions cannot silently diverge',()=>{
 const mutations=[
  copy=>{copy.checkedOn='2000-01-01';},
  copy=>{copy.emergency='Changed emergency advice';},
  copy=>{copy.ageNote='Changed age advice';},
  copy=>{copy.staff='Changed safeguarding advice';},
  copy=>{copy.areas.brent.routes[0].url='https://example.invalid/';},
  copy=>{delete copy.areas.westminster.notice;},
  copy=>{copy.areas.camden.routes.push({name:'Unreviewed service',text:'Walk in',url:'https://example.invalid/'});},
  copy=>{copy.areas.hillingdon.routes.pop();},
  copy=>{delete copy.areas.surrey;}
 ];
 for(const mutate of mutations){const copy=structuredClone(data);mutate(copy);assert.ok(crisisDifferences(copy,data).length);}
});

test('formatting and object-key order do not create false differences',()=>{
 const reorder=value=>Array.isArray(value)?value.map(reorder):value&&typeof value==='object'?Object.fromEntries(Object.entries(value).reverse().map(([k,v])=>[k,reorder(v)])):value;
 assert.deepEqual(crisisDifferences(reorder(data),data),[]);
 const copy=structuredClone(data);copy.areas.brent.routes.reverse();assert.ok(crisisDifferences(copy,data).length);
});

test('comparison handles type changes and escapes JSON Pointer paths',()=>{
 assert.deepEqual(crisisDifferences({areas:{}},{areas:null}),['/areas']);
 assert.deepEqual(crisisDifferences({areas:[]},{areas:{}}),['/areas']);
 assert.deepEqual(crisisDifferences({'a/b~':1},{'a/b~':2}),['/a~1b~0']);
});

test('the exact canonical repository revision is required',t=>{
 const source=readCrisisSource('config/crisis-source.json');assert.equal(source.repository,'OPlyons/Navigator');
 const temp=fs.mkdtempSync(path.join(os.tmpdir(),'crisis-source-'));t.after(()=>fs.rmSync(temp,{recursive:true,force:true}));
 for(const invalid of [{repository:source.repository,revision:'main'},{repository:'other/repo',revision:source.revision},{repository:source.repository,revision:''}]){
  const file=path.join(temp,'source.json');fs.writeFileSync(file,JSON.stringify(invalid));assert.throws(()=>readCrisisSource(file),/exact 40-character commit SHA/);
 }
});

test('the CLI passes matching data and fails drift, invalid JSON or an unavailable source',t=>{
 const temp=fs.mkdtempSync(path.join(os.tmpdir(),'crisis-check-'));t.after(()=>fs.rmSync(temp,{recursive:true,force:true}));
 const file=path.join(temp,'canonical.json');fs.writeFileSync(file,JSON.stringify(data));
 assert.match(checkCrisisConsistency(file),/matches Navigator/);
 const run=(...args)=>spawnSync(process.execPath,['scripts/check-crisis-consistency.mjs',...args],{encoding:'utf8'});
 assert.equal(run(file).status,0);
 const changed=structuredClone(data);changed.areas.brent.routes[2].text='Incorrectly changed eligibility';fs.writeFileSync(file,JSON.stringify(changed));
 const drift=run(file);assert.equal(drift.status,1);assert.match(drift.stderr,/\/areas\/brent\/routes\/2\/text/);
 fs.writeFileSync(file,'not JSON');assert.equal(run(file).status,1);
 assert.equal(run(path.join(temp,'missing.json')).status,1);
 assert.equal(run().status,1);
});
