import fs from 'node:fs/promises';
import {test,expect} from '@playwright/test';
import {readDocxEntry} from './docx.js';
import {interceptSentry} from './support.js';

const data=JSON.parse(await fs.readFile(new URL('../config/crisis-pathways.json',import.meta.url),'utf8'));
const guidance=JSON.parse(await fs.readFile(new URL('../config/workbook-guidance.json',import.meta.url),'utf8'));
const routes=['staff-offer','staff-handover','staff-call','staff-carer'];
test.beforeEach(async({page})=>{await interceptSentry(page);});

for(const [area,info] of Object.entries(data.areas))test('local safety guidance follows '+info.name+' into all four forms',async({page})=>{
 await page.goto('/#staff-offer');
 await page.locator('#staff-area').selectOption(area);
 await expect(page.locator('#staff-crisis-routes h3')).toHaveText(info.name+' crisis routes');
 for(const route of routes){
  await page.goto('/#'+route);
  await expect(page.locator('#staff-area')).toHaveValue(area);
  const downloading=page.waitForEvent('download');await page.locator('#download-main').click();
  const download=await downloading;
  const xml=readDocxEntry(await fs.readFile(await download.path()),'word/document.xml');
  const text=await page.evaluate(source=>new DOMParser().parseFromString(source,'text/xml').documentElement.textContent,xml);
  expect(text).toContain(info.name+' crisis routes');
  for(const service of info.routes){expect(text).toContain(service.name);expect(text).toContain(service.text);}
  expect(text).toContain(data.emergency);expect(text).toContain(guidance.community);expect(text).toContain(data.ageNote);
  expect(xml).not.toContain('{{CRISIS_');
  if(info.notice)expect(xml).toContain(info.notice.url);
 }
 await page.goto('/#urgent');
 const section=page.locator('#crisis-'+area);
 await section.locator(':scope > summary').focus();await page.keyboard.press('Enter');
 for(const service of info.routes)await expect(section).toContainText(service.text);
 if(info.notice)await expect(section.getByRole('link',{name:info.notice.text,exact:true})).toHaveAttribute('href',info.notice.url);
 await page.locator('#reading-options > summary').click();await page.locator('#larger-text').click();
 expect(await page.locator('html').evaluate(el=>el.scrollWidth<=el.clientWidth)).toBeTruthy();
});
