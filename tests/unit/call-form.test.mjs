import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {JSDOM} from 'jsdom';
import {readDocxEntry} from '../docx.js';

const root=path.resolve(import.meta.dirname,'../..'),read=p=>fs.readFileSync(path.join(root,p));
const namespace='http://schemas.openxmlformats.org/wordprocessingml/2006/main';
const xml=s=>new JSDOM(s,{contentType:'text/xml'}).window.document;
const questions=[
 'How has it been since you left hospital?',
 'What helped you get ready to leave?',
 'What was difficult or could have been better?',
 'Are your next steps clear?',
 'Do you know who to contact if you need help?',
 'Is there any support you would like to explore?',
 'What would you like the ward to know?'
];

test('both downloadable person call forms cover the questions promised to service users',()=>{
 const page=new JSDOM(read('dist/index.html').toString()).window.document;
 assert.deepEqual([...page.querySelectorAll('#call-questions .question-list li')].map(n=>n.textContent),questions);
 const link=page.querySelector('#blank-task-downloads a[download^="Person_Call"]');
 const blank=readDocxEntry(read('dist/'+link.getAttribute('href')),'word/document.xml');
 const pack=JSON.parse(read('dist/assets/word-packs.json'));
 for(const document of [xml(blank),xml(pack.templates.call_service['word/document.xml'].text)]){
  const aliases=[...document.getElementsByTagNameNS(namespace,'sdtPr')].map(p=>p.getElementsByTagNameNS(namespace,'alias')[0]?.getAttributeNS(namespace,'val'));
  for(const question of questions){
   assert.equal(aliases.filter(a=>a===question).length,1,question+' has one answer control');
   const label=[...document.getElementsByTagNameNS(namespace,'p')].find(p=>p.textContent===question);
   assert.ok(label,question+' is a visible prompt');
   const answer=label.nextElementSibling;
   assert.equal(answer.getElementsByTagNameNS(namespace,'alias')[0]?.getAttributeNS(namespace,'val'),question);
   assert.equal(answer.getElementsByTagNameNS(namespace,'text')[0]?.getAttributeNS(namespace,'multiLine'),'1');
  }
  const ids=[...document.getElementsByTagNameNS(namespace,'sdtPr')].map(p=>p.getElementsByTagNameNS(namespace,'id')[0].getAttributeNS(namespace,'val'));
  assert.equal(new Set(ids).size,ids.length,'Word controls have unique IDs');
  assert.match(document.documentElement.textContent,/They can skip any question/);
  assert.match(document.documentElement.textContent,/May we use an anonymous summary/);
  assert.match(document.documentElement.textContent,/The team or service handles any referral needed/);
 }
 assert.equal(readDocxEntry(read('dist/'+link.getAttribute('href')),'word/footer1.xml'),pack.templates.call_service['word/footer1.xml'].text);
});
