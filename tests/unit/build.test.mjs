import {test} from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import path from 'node:path';import {createHash} from 'node:crypto';import {JSDOM} from 'jsdom';
const root=path.resolve(import.meta.dirname,'../..'),read=p=>fs.readFileSync(path.join(root,p));
test('discharge downloads and branding match their approved assets',()=>{
 const hashes=JSON.parse(read('tests/fixtures/asset-sha256.json'));
 for(const [file,hash] of Object.entries(hashes))assert.equal(createHash('sha256').update(read('dist/'+file)).digest('hex'),hash,file);
});
test('discharge site links to one canonical navigator and packages no duplicate directory',()=>{
 const html=read('dist/index.html').toString(),d=new JSDOM(html).window.document;
 assert.equal(d.querySelector('[data-nav="support"]').href,'https://navigator.lxportal.space/');
 assert.equal(d.querySelector('#local-support-link').href,'https://navigator.lxportal.space/');
 assert.ok(!d.querySelector('#service-search'));assert.ok(!d.querySelector('#navigator-ui'));
 assert.ok(!fs.existsSync(path.join(root,'dist/assets/directory.json')));assert.ok(!fs.existsSync(path.join(root,'data/directory.json')));
 for(const a of d.querySelectorAll('#public-area-links a'))assert.ok(a.href.startsWith('https://navigator.lxportal.space/assets/'));
 assert.match(read('dist/_redirects').toString(),/\/assets\/directory.json https:\/\/navigator.lxportal.space\/assets\/directory.json 302/);
});
test('public build retains limited monitoring and restricted indexing',()=>{
 const html=read('dist/index.html').toString();assert.ok(html.includes('/assets/monitoring.js'));
 assert.doesNotMatch(html,/discharge-community-navigator-dev\.oscar/);assert.ok(read('dist/_headers').toString().includes('noindex, nofollow'));
 assert.ok(!fs.existsSync(path.join(root,'dist/maintenance')));
});
