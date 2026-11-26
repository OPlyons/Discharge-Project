import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {JSDOM} from 'jsdom';
import {readDocxEntries} from '../docx.js';

const filename = 'Harrow_Peer_Support_Follow_Up_Form_Working_Draft.docx';
const ns = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';
const nodes = (document, name) => [...document.getElementsByTagNameNS(ns, name)];

test('the Harrow draft preserves role ownership, confidentiality and unsettled pilot decisions', () => {
  const parts = readDocxEntries(fs.readFileSync('dist/assets/' + filename));
  const document = new JSDOM(parts.get('word/document.xml').toString(), {contentType: 'text/xml'}).window.document;
  const text = document.documentElement.textContent;
  for (const phrase of [
    'Section 1  Ward staff offer and prepare',
    'Section 2  LX Coordinator checks and arranges',
    'Section 3  Peer Support Caller person call',
    'Section 4  Peer Support Caller carer call',
    'Use a separate copy for each person or carer',
    'the other person’s clinical team',
    'Record a named acknowledgement and next action before closing',
    'Clinical team — decides further clinical follow-up',
    'does not replace or delay the clinical team’s required post-discharge follow-up',
    'No answer does not confirm safety',
    'Pilot decisions still to agree',
    'Safety information sharing explained'
  ]) assert.ok(text.includes(phrase), phrase);
  const crisis = JSON.parse(fs.readFileSync('config/crisis-pathways.json'));
  assert.ok(text.includes(crisis.emergency));
  assert.ok(text.includes(crisis.urgent));
  assert.match(text, /three-attempt limit.*still need local agreement/);

  const controls = nodes(document, 'sdtPr');
  for (const attr of ['id', 'tag']) {
    const values = controls.map(c => nodes(c, attr)[0]?.getAttributeNS(ns, 'val'));
    assert.ok(values.every(Boolean));
    assert.equal(new Set(values).size, values.length, 'Unique control ' + attr);
  }
  const tags = new Set(nodes(document, 'tag').map(n => n.getAttributeNS(ns, 'val')));
  for (const tag of ['relevant_risks', 'safety_steps', 'clinical_route', 'safeguarding_route', 'backup_route', 'no_answer_plan', 'clinical_acknowledgement', 'episode_closed_by', 'person_feedback_exclusions', 'carer_feedback_exclusions']) {
    assert.ok(tags.has('harrow_' + tag), tag + ' has an editable answer');
  }
  for (const owner of ['person', 'carer']) for (const attempt of [1, 2, 3]) {
    assert.ok(tags.has(`harrow_${owner}_attempt_${attempt}_1`));
    assert.ok(tags.has(`harrow_${owner}_attempt_${attempt}_2`));
  }
  assert.ok(nodes(document, 'text').every(n => n.getAttributeNS(ns, 'multiLine') === '1'));
  assert.ok(nodes(document, 'trHeight').every(n => n.getAttributeNS(ns, 'hRule') === 'atLeast'));
  assert.equal(nodes(document, 'cantSplit').length, 0);
  assert.doesNotMatch(parts.get('word/settings.xml').toString(), /documentProtection/);
});

test('Harrow is an explicit separate download on the guide, local page, area choice and no-JavaScript fallback', () => {
  const document = new JSDOM(fs.readFileSync('dist/index.html').toString()).window.document;
  for (const selector of ['.harrow-download', '#harrow-pilot', '#harrow-form-option', '#plain-downloads']) {
    const link = document.querySelector(`${selector} a[download="${filename}"]`);
    assert.ok(link, selector);
    assert.equal(link.getAttribute('href'), 'assets/' + filename);
  }
  assert.ok(document.querySelector('#harrow-form-option').hidden);
  assert.match(document.querySelector('#harrow-pilot').textContent, /still need local agreement/);
  assert.equal(document.querySelector('#blank-task-downloads a[download]').getAttribute('download'), 'Discharge_and_Transition_Form.docx');
});
