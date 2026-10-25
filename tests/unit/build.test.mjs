import {test} from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import path from 'node:path';import {createHash} from 'node:crypto';
const root=path.resolve(import.meta.dirname,'../..'),read=p=>fs.readFileSync(path.join(root,p));
test('all 786 directory records and original download assets are preserved',()=>{
 const hashes=JSON.parse(read('tests/fixtures/asset-sha256.json'));
 for(const [file,hash] of Object.entries(hashes))assert.equal(createHash('sha256').update(read('dist/'+file)).digest('hex'),hash,file);
 assert.equal(JSON.parse(read('dist/assets/directory.json')).resources.length,786);
});
test('public build uses same-origin API, limited monitoring and restricted indexing',()=>{
 const html=read('dist/index.html').toString();assert.ok(html.includes('"endpoint":"/api/navigate"'));assert.ok(html.includes('/assets/monitoring.js'));
 assert.doesNotMatch(html,/discharge-community-navigator-dev\.oscar/);assert.ok(read('dist/_headers').toString().includes('noindex, nofollow'));assert.ok(read('dist/robots.txt').toString().includes('Disallow: /'));
 assert.deepEqual(JSON.parse(read('dist/_routes.json')),{version:1,include:['/api/*'],exclude:[]});
 assert.ok(!fs.existsSync(path.join(root,'dist/assets/monitoring.js.map')));
});
