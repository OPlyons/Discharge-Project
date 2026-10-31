import fs from 'node:fs/promises';import {readDocxEntry} from './docx.js';
import {test,expect} from '@playwright/test';import {interceptSentry} from './support.js';
test.beforeEach(async({page})=>{await interceptSentry(page);});
test('discharge home and call pages retain their navigation',async({page})=>{
 await page.goto('/');await expect(page.getByRole('heading',{name:'Support for your next steps',exact:true})).toBeVisible();
 for(const [link,heading]of [['About the calls','About the calls'],['For carers','Support for you as a carer'],['Staff call guide','Staff call guide']]){await page.locator('nav[aria-label="Main navigation"]').getByRole('link',{name:link,exact:true}).click();await expect(page.locator('.page.active h1')).toHaveText(heading);}
});
test('old support bookmarks and new Find support links open the standalone navigator',async({page})=>{
 await page.route('https://navigator.lxportal.space/**',route=>route.fulfill({status:200,contentType:'text/html',body:'<h1>Community Navigator</h1>'}));
 await page.goto('/#support');await expect(page).toHaveURL('https://navigator.lxportal.space/');
 await page.goto('/');await page.locator('[data-nav="support"]').click();await expect(page).toHaveURL('https://navigator.lxportal.space/');
 await page.goto('/');await page.evaluate(()=>{location.hash='support';});await expect(page).toHaveURL('https://navigator.lxportal.space/');
});
test('combined call forms and staff area handover still work',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('/#staff-call');await expect(page.locator('#download-main')).toHaveAttribute('download','Person_Call_and_Feedback_v13.docx');
 const download=page.waitForEvent('download');await page.locator('#download-main').click();expect((await download).suggestedFilename()).toBe('Person_Call_and_Feedback_v13.docx');
 await page.locator('#carer-call-link').click();await expect(page.locator('#download-main')).toHaveAttribute('download','Carer_Call_and_Feedback_v12.docx');
 await page.locator('#pack-customisation > summary').click();await page.locator('#staff-area').selectOption('harrow');
 await page.route('https://navigator.lxportal.space/**',route=>route.fulfill({status:200,contentType:'text/html',body:'<h1>Community Navigator</h1>'}));await page.locator('#local-support-link').click();await expect(page).toHaveURL('https://navigator.lxportal.space/#area-harrow');expect(errors).toEqual([]);
});
test('larger text does not overflow the discharge homepage',async({page})=>{
 await page.goto('/');await page.locator('#reading-options > summary').click();await page.locator('#larger-text').click();expect(await page.locator('html').evaluate(el=>el.scrollWidth<=el.clientWidth)).toBeTruthy();
});

test('all customised workbook forms retain expanding boxes and safe team text',async({page})=>{
 for(const [route,filename] of [['staff-offer','Offer_a_Call_v12.docx'],['staff-handover','Arrange_and_Hand_Over_v12.docx'],['staff-call','Person_Call_and_Feedback_v13.docx'],['staff-carer','Carer_Call_and_Feedback_v12.docx']]){
  await page.goto('/#'+route);
  await expect(page.locator('#pack-includes')).toContainText('Expanding answer boxes');
  await expect(page.locator('.download-instruction')).toContainText('they grow as you write');
  await page.locator('#pack-customisation > summary').click();
  await page.locator('#staff-area').selectOption('harrow');
  await page.locator('#staff-team').fill('Example & <Team>');
  const downloading=page.waitForEvent('download');await page.locator('#download-main').click();
  const file=await downloading;expect(file.suggestedFilename()).toBe(filename);
  const bytes=await fs.readFile(await file.path()),xml=readDocxEntry(bytes,'word/document.xml');
  expect(xml).toContain('Area: Harrow');expect(xml).toContain('Example &amp; &lt;Team&gt;');expect(xml).not.toContain('{{AREA}}');
  expect(xml).toContain('w:hRule="atLeast"');expect(xml).not.toContain('w:hRule="exact"');expect(xml).not.toContain('<w:cantSplit');
  expect(readDocxEntry(bytes,'word/styles.xml')).toContain('Frutiger LT Com');
  if(route==='staff-call'){
   await page.goto('/#about');
   const questions=await page.locator('#call-questions .question-list li').allTextContents();expect(questions).toHaveLength(7);
   for(const question of questions)expect(xml).toContain(question);
  }
 }
});
