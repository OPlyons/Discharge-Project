import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {JSDOM} from 'jsdom';
import {readDocxEntry} from '../docx.js';
const read=p=>fs.readFileSync(p,'utf8'),data=JSON.parse(read('config/crisis-pathways.json'));
const guidance={...data,...JSON.parse(read('config/workbook-guidance.json'))};
test('every supported borough has sourced crisis routes in the site and every customised Word form',()=>{
 const page=new JSDOM(read('dist/index.html'),{runScripts:'outside-only'});page.window.eval(read('site/crisis-pathways.js'));
 const pack=JSON.parse(read('public/assets/word-packs.json'));
 const mainNs='http://schemas.openxmlformats.org/wordprocessingml/2006/main';
 for(const [area,info] of Object.entries(data.areas)){
  assert.ok(page.window.document.getElementById('crisis-'+area),area+' is available without JS');
  for(const template of Object.values(pack.templates)){
   const document=template['word/document.xml'].text.replace('{{AREA}}',info.name).replace('{{TEAM}}','Test team').replace('{{CRISIS_ROUTES_XML}}',()=>page.window.DTPCrisis.wordXml(area));
   const parsed=new JSDOM(document,{contentType:'text/xml'}).window.document;
   assert.equal(parsed.querySelector('parsererror'),null);
   assert.ok(!document.includes('{{CRISIS_'));
   for(const route of info.routes){
    assert.ok(parsed.documentElement.textContent.includes(route.name));assert.ok(parsed.documentElement.textContent.includes(route.text));assert.ok(document.includes(route.url.replaceAll('&','&amp;')));
    const instruction=[...parsed.getElementsByTagNameNS(mainNs,'p')].find(p=>p.textContent===route.text);
    assert.ok(instruction.getElementsByTagNameNS(mainNs,'keepLines').length,'keep the whole safety instruction on one page');
    assert.ok(instruction.getElementsByTagNameNS(mainNs,'keepNext').length,'keep the access link with its instruction');
   }
   assert.ok(parsed.getElementsByTagNameNS(mainNs,'text').length>0,'editable controls preserved');
  }
 }
 assert.ok(page.window.DTPCrisis.wordXml('other').includes('choose your borough'));
 assert.match(data.areas.hillingdon.routes.find(r=>r.name.includes('Lighthouse')).text,/only after assessment and referral/);
 assert.ok(!data.areas.camden.routes.some(r=>r.name.includes('St Charles')),'no unsupported cross-borough MHCAS mapping');
});
test('offer captures risks and service safeguarding lead before coordinator handover',()=>{
 const source=readDocxEntry(fs.readFileSync('dist/assets/Offer_a_Call_v12.docx'),'word/document.xml');
 for(const text of ['Are there any risks the coordinator and peer worker should be aware of?','No known risks','Not yet checked','Relevant risks and agreed safety steps','Who is the safeguarding lead for this service?'])assert.ok(source.includes(text),text);
 assert.ok(source.includes('w:val="safeguarding_lead"'));
});

test('every blank workbook includes current emergency, age and community guidance',()=>{
 const pack=JSON.parse(read('public/assets/word-packs.json'));
 const page=new JSDOM(read('dist/index.html')).window.document;
 for(const key of ['emergency','urgent','ageNote','community','staff']){
  assert.ok(page.getElementById('borough-crisis-content').textContent.includes(guidance[key]),key+' is visible in the public guidance');
  for(const template of Object.values(pack.templates)){
   const parsed=new JSDOM(template['word/document.xml'].text.replace('{{CRISIS_ROUTES_XML}}',''),{contentType:'text/xml'}).window.document;
   assert.ok(parsed.documentElement.textContent.includes(guidance[key]),key+' is current in every workbook');
  }
 }
});

test('handover records the named safeguarding lead separately from clinical and backup contacts',()=>{
 const parsed=new JSDOM(readDocxEntry(fs.readFileSync('dist/assets/Arrange_and_Hand_Over_v12.docx'),'word/document.xml'),{contentType:'text/xml'}).window.document;
 const ns='http://schemas.openxmlformats.org/wordprocessingml/2006/main';
 for(const tag of ['safeguarding_lead','clinical_help','backup_help']){
  assert.equal([...parsed.getElementsByTagNameNS(ns,'tag')].filter(n=>n.getAttributeNS(ns,'val')===tag).length,1,tag+' has its own editable box');
 }
 assert.ok(parsed.documentElement.textContent.includes('Service safeguarding lead name role and contact'));
 assert.ok(parsed.documentElement.textContent.includes('If unknown, ask the service manager before the call.'));
});
