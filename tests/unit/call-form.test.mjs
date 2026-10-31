import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {JSDOM} from 'jsdom';
import {readDocxEntry,readDocxEntries} from '../docx.js';

const root=path.resolve(import.meta.dirname,'../..'),read=p=>fs.readFileSync(path.join(root,p));
const namespace='http://schemas.openxmlformats.org/wordprocessingml/2006/main';
const checkboxNamespace='http://schemas.microsoft.com/office/word/2010/wordml';
const xml=s=>new JSDOM(s,{contentType:'text/xml'}).window.document;
const nodes=(document,name)=>[...document.getElementsByTagNameNS(namespace,name)];
const forms={offer:'Offer_a_Call_v12.docx',handover:'Arrange_and_Hand_Over_v12.docx',call_service:'Person_Call_and_Feedback_v13.docx',call_carer:'Carer_Call_and_Feedback_v12.docx'};
const questions=[
 'How has it been since you left hospital?',
 'What helped you get ready to leave?',
 'What was difficult or could have been better?',
 'Are your next steps clear?',
 'Do you know who to contact if you need help?',
 'Is there any support you would like to explore?',
 'What would you like the ward to know?'
];

test('all four customised downloads preserve the full approved form and its formatting',()=>{
 const pack=JSON.parse(read('dist/assets/word-packs.json'));
 const page=new JSDOM(read('dist/index.html').toString()).window.document;
 const links=[...page.querySelectorAll('#blank-task-downloads a[download]')].map(a=>a.download);
 assert.deepEqual(links,Object.values(forms));
 for(const [key,filename] of Object.entries(forms)){
  const parts=readDocxEntries(read('dist/assets/'+filename));
  const customised={...pack.common,...pack.templates[key]};
  assert.deepEqual(Object.keys(customised).sort(),[...parts.keys()].sort(),filename+' has every Word part');
  for(const [name,bytes] of parts){
   let expected=bytes;
   if(name==='word/document.xml')expected=Buffer.from(bytes.toString().replace('Area: [optional]','Area: {{AREA}}').replace('Team: [optional]','Team: {{TEAM}}'));
   const item=customised[name],actual=item.text!==undefined?Buffer.from(item.text):Buffer.from(item.base64,'base64');
   assert.deepEqual(actual,expected,filename+' keeps '+name);
  }
  const source=customised['word/document.xml'].text;
  assert.equal((source.match(/\{\{AREA\}\}/g)||[]).length,1,filename+' supports area');
  assert.equal((source.match(/\{\{TEAM\}\}/g)||[]).length,1,filename+' supports team');
 }
});

test('all four Word forms have expanding white answer boxes and editable controls',()=>{
 for(const filename of Object.values(forms)){
  const parts=readDocxEntries(read('dist/assets/'+filename));
  const document=xml(parts.get('word/document.xml').toString());
  const settings=xml(parts.get('word/settings.xml').toString());
  assert.equal(nodes(document,'background')[0]?.getAttributeNS(namespace,'color'),'EDF2F3',filename+' has a pale page');
  assert.ok(nodes(document,'shd').some(n=>n.getAttributeNS(namespace,'fill')==='FFFFFF'),filename+' has white answer boxes');
  const heights=nodes(document,'trHeight');
  assert.ok(heights.length>0,filename+' has answer rows');
  assert.ok(heights.every(n=>n.getAttributeNS(namespace,'hRule')==='atLeast'),filename+' uses minimum, not fixed, heights');
  assert.equal(nodes(document,'cantSplit').length,0,filename+' allows long answers across pages');
  assert.equal(nodes(settings,'documentProtection').length,0,filename+' remains editable');
  assert.ok(nodes(document,'text').some(n=>n.getAttributeNS(namespace,'multiLine')==='1'),filename+' accepts multiline answers');
  assert.ok(document.getElementsByTagNameNS(checkboxNamespace,'checkbox').length>0,filename+' has working tick boxes');
  const ids=nodes(document,'sdtPr').map(p=>p.getElementsByTagNameNS(namespace,'id')[0]?.getAttributeNS(namespace,'val'));
  assert.ok(ids.every(Boolean),filename+' labels all controls');
  assert.equal(new Set(ids).size,ids.length,filename+' has unique control IDs');
  assert.match(parts.get('word/styles.xml').toString(),/Frutiger LT Com/);
  assert.ok(![...parts.keys()].some(name=>name.startsWith('word/fonts/')),filename+' does not distribute restricted editable font binaries');
 }
});

test('the person call form keeps all seven promised feedback prompts with usable answer controls',()=>{
 const page=new JSDOM(read('dist/index.html').toString()).window.document;
 assert.deepEqual([...page.querySelectorAll('#call-questions .question-list li')].map(n=>n.textContent),questions);
 const document=xml(readDocxEntry(read('dist/assets/'+forms.call_service),'word/document.xml'));
 for(const question of questions){
  const label=nodes(document,'p').find(p=>p.textContent===question);
  assert.ok(label,question+' is visible');
  const answer=label.nextElementSibling;
  assert.ok(answer,question+' has an answer area');
  const textFields=nodes(answer,'text'),choiceFields=answer.getElementsByTagNameNS(checkboxNamespace,'checkbox');
  assert.ok(textFields.some(n=>n.getAttributeNS(namespace,'multiLine')==='1')||choiceFields.length>=3,question+' has a multiline box or clear choices');
 }
 assert.match(document.documentElement.textContent,/They can skip(?: any)? questions?(?: or stop)?/);
 assert.match(document.documentElement.textContent,/May we use an anonymous summary/);
 assert.match(document.documentElement.textContent,/The team (?:or service )?handles any referral(?: needed)?/);
});
