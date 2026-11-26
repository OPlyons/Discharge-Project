import fs from 'node:fs/promises';import {readDocxEntry} from './docx.js';
import {test,expect} from '@playwright/test';import {interceptSentry, openReadingOptions, showStaffCrisisRoutes} from './support.js';
test.beforeEach(async({page})=>{await interceptSentry(page);});
test('discharge home and call pages retain their navigation',async({page})=>{
 await page.goto('/');await expect(page.getByRole('heading',{name:'Peer support after hospital',exact:true})).toBeVisible();
 for(const [link,heading] of [['About the calls','About the calls'],['For carers','Support for family and carers'],['Staff guide','Staff call guide']]){
  const main=page.getByRole('navigation',{name:'Main navigation',exact:true});
  const mobile=!(await main.isVisible());
  if (mobile) await page.getByRole('button',{name:'Menu',exact:true}).click();
  const nav=mobile?page.getByRole('navigation',{name:'Site menu'}):main;
  await nav.getByRole('link',{name:link,exact:true}).click();
  await expect(page.locator('main h1:visible')).toHaveText(heading);
 }
});
test('staff can read each task and download the same full form', async ({page}) => {
  const tasks = [
    ['Before the call', 'Offer a call', 'Discharge_and_Transition_Form.docx'],
    ['Before the call', 'Arrange the call', 'Discharge_and_Transition_Form.docx'],
    ['Making a call', 'Call a person leaving hospital', 'Discharge_and_Transition_Form.docx'],
    ['Making a call', 'Call a carer', 'Discharge_and_Transition_Form.docx']
  ];
  await page.goto('/#downloads');
  for (const [group, task, filename] of tasks) {
    const choice = page.getByRole('region', {name: group, exact: true}).getByRole('link', {name: task, exact: true});
    await expect(choice).toBeInViewport();
    await choice.click();
    await expect(page.getByRole('heading', {level: 1, name: task, exact: true})).toBeVisible();
    await expect(page.locator('#download-main')).toHaveAttribute('download', filename);
    await page.goBack();
  }
  await expect(page.locator('#blank-task-downloads a[download]:visible')).toHaveCount(1);
});
test('old support bookmarks and new Find support links open the standalone navigator',async({page})=>{
 await page.route('https://navigator.lxportal.space/**',route=>route.fulfill({status:200,contentType:'text/html',body:'<h1>Community Navigator</h1>'}));
 await page.goto('/#support');await expect(page).toHaveURL('https://navigator.lxportal.space/');
 await page.goto('/');
 const support=page.getByRole('link',{name:'Find support',exact:true});
 await expect(support).toHaveCount(1);
 await expect(support).toBeInViewport();
 await expect(page.locator('.header-actions [data-nav="support"] + .urgent-link')).toHaveAttribute('href','#urgent');
 await support.click();await expect(page).toHaveURL('https://navigator.lxportal.space/');
 await page.goto('/');await page.evaluate(()=>{location.hash='support';});await expect(page).toHaveURL('https://navigator.lxportal.space/');
});
test('the full form and separate call guidance preserve the chosen area',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('/#staff-call');await expect(page.locator('#download-main')).toHaveAttribute('download','Discharge_and_Transition_Form.docx');
 const download=page.waitForEvent('download');await page.locator('#download-main').click();expect((await download).suggestedFilename()).toBe('Discharge_and_Transition_Form.docx');
 await page.getByRole('link',{name:'Carer call guidance'}).click();await expect(page.locator('#download-main')).toHaveAttribute('download','Discharge_and_Transition_Form.docx');
 await page.locator('#pack-customisation > summary').click();await page.locator('#staff-area').selectOption('harrow');
 await page.route('https://navigator.lxportal.space/**',route=>route.fulfill({status:200,contentType:'text/html',body:'<h1>Community Navigator</h1>'}));await page.locator('#local-support-link').click();await expect(page).toHaveURL('https://navigator.lxportal.space/#area-harrow');expect(errors).toEqual([]);
});
test('the full form is available without JavaScript and after a customised download fails', async ({browser, page, baseURL}) => {
 const context = await browser.newContext({javaScriptEnabled: false, baseURL});
 const plain = await context.newPage();
 await plain.goto('/#staff-handover');
 const plainDownload = plain.waitForEvent('download');
 await plain.locator('#plain-downloads a[download$=".docx"]').click();
 const file = await plainDownload;
 expect(file.suggestedFilename()).toBe('Discharge_and_Transition_Form.docx');
 const text = readDocxEntry(await fs.readFile(await file.path()), 'word/document.xml');
 for (const section of ['Offer a peer support call', 'Arrange the call', 'Call a person leaving hospital', 'Call a carer']) expect(text).toContain(section);
 await context.close();

 await page.route('**/assets/word-packs.json', route => route.fulfill({status: 503, body: 'Unavailable'}));
 await page.goto('/#staff-call');
 await page.locator('#pack-customisation > summary').click();
 await page.locator('#staff-area').selectOption('harrow');
 await page.locator('#download-main').click();
 const fallback = page.getByRole('link', {name: 'Download the blank form', exact: true});
 await expect(fallback).toHaveAttribute('download', 'Discharge_and_Transition_Form.docx');
 await expect(fallback).toHaveAttribute('href', 'assets/Discharge_and_Transition_Form.docx');
 await page.unroute('**/assets/word-packs.json');
 const retried = page.waitForEvent('download');
 await page.locator('#download-main').click();
 const retriedFile = await retried;
 expect(readDocxEntry(await fs.readFile(await retriedFile.path()), 'word/document.xml')).toContain('Harrow crisis routes');
});
test('larger text does not overflow the discharge homepage',async({page})=>{
 await page.goto('/');await openReadingOptions(page);await page.locator('#larger-text').click();expect(await page.locator('html').evaluate(el=>el.scrollWidth<=el.clientWidth)).toBeTruthy();
});

test('the homepage fits a laptop and a phone with photographs and both reading links',async({page})=>{
 for(const [width,height] of [[1280,720],[375,812]]){
  await page.setViewportSize({width,height});
  await page.goto('/');
  await page.evaluate(()=>document.fonts.ready);
  await expect(page.locator('#home img.photo')).toHaveCount(3);
  const photos=await page.locator('#home img.photo').evaluateAll(images=>images.every(image=>
   image.complete&&image.naturalWidth>0&&image.getBoundingClientRect().width>0
  ));
  expect(photos).toBe(true);
  const reading=page.getByRole('navigation',{name:'More about the call'});
  await expect(reading.getByRole('link',{name:/How the call works/})).toHaveAttribute('href','#process');
  await expect(reading.getByRole('link',{name:/Download the call leaflet/})).toHaveAttribute('download','');
  const fits=await page.evaluate(()=>document.documentElement.scrollHeight<=innerHeight+1&&
   document.documentElement.scrollWidth<=innerWidth);
  expect(fits).toBe(true);
 }
});

test('compact and tablet headers keep both support buttons clear of the project name',async({page})=>{
 for(const width of [320,390,768,1024]){
  await page.setViewportSize({width,height:800});
  await page.goto('/');
  await page.evaluate(()=>document.fonts.ready);
  for(const large of [false,true]){
   const layout=await page.evaluate(larger=>{
    document.documentElement.classList.toggle('large',larger);
    const rect=selector=>document.querySelector(selector).getBoundingClientRect();
    const range=document.createRange();range.selectNodeContents(document.querySelector('.brand strong'));
    const title=range.getBoundingClientRect(),menu=rect('.menu-toggle');
    const support=rect('.navigator-button'),urgent=rect('.urgent-link');
    return {
     separate:title.right<=menu.left+1||title.bottom<=menu.top||menu.bottom<=title.top,
     adjacent:support.right<=urgent.left&&Math.abs(support.top-urgent.top)<5,
     fits:document.documentElement.scrollWidth<=window.innerWidth
    };
   },large);
   expect(layout).toEqual({separate:true,adjacent:true,fits:true});
  }
 }
});

test('the full form from every staff task keeps expanding boxes and safe team text',async({page})=>{
 for(const [route,filename] of [['staff-offer','Discharge_and_Transition_Form.docx'],['staff-handover','Discharge_and_Transition_Form.docx'],['staff-call','Discharge_and_Transition_Form.docx'],['staff-carer','Discharge_and_Transition_Form.docx']]){
  await page.goto('/#'+route);
  await expect(page.locator('.download-box')).toContainText('white answer boxes grow as you write');
  await expect(page.locator('#download-main')).toHaveAttribute('download',filename);
  await page.locator('#pack-customisation > summary').click();
  await page.locator('#staff-area').selectOption('harrow');
  await page.locator('#staff-team').fill('Example & <Team>');
  const downloading=page.waitForEvent('download');await page.locator('#download-main').click();
  const file=await downloading;expect(file.suggestedFilename()).toBe(filename);
  const bytes=await fs.readFile(await file.path()),xml=readDocxEntry(bytes,'word/document.xml');
  expect(xml).toContain('Area: Harrow');expect(xml).toContain('Example &amp; &lt;Team&gt;');expect(xml).not.toContain('{{AREA}}');
  expect(xml).toContain('w:hRule="atLeast"');expect(xml).not.toContain('w:hRule="exact"');expect(xml).not.toContain('<w:cantSplit');
  expect(readDocxEntry(bytes,'word/styles.xml')).toContain('Frutiger LT Com');
  for (const section of ['Offer a peer support call','Arrange the call','Call a person leaving hospital','Call a carer']) expect(xml).toContain(section);
  expect(xml.match(/If someone needs urgent help/g)).toHaveLength(1);
  if(route==='staff-call'){
   await page.goto('/#call-questions');
   const questions=await page.locator('#call-questions .question-list li').allTextContents();expect(questions).toHaveLength(7);
   for(const question of questions)expect(xml).toContain(question);
  }
 }
});

test('borough crisis routes reach the full form from all four staff tasks',async({page})=>{
 await page.goto('/#staff-offer');
 await expect(page.locator('#staff-area')).toBeVisible();
 await page.locator('#staff-area').selectOption('hillingdon');
 await expect(page.locator('#staff-crisis-routes')).toContainText('Hillingdon crisis routes');
 await showStaffCrisisRoutes(page);
 await page.locator('#staff-crisis-routes summary').filter({hasText:'Lighthouse'}).click();
 await expect(page.locator('#staff-crisis-routes')).toContainText('only after assessment and referral by Hillingdon A&E');
 for(const route of ['staff-offer','staff-handover','staff-call','staff-carer']){
  await page.goto('/#'+route);
  const formStage=page.getByRole('button',{name:'Word form',exact:true});
  if (await formStage.isVisible()) await formStage.click();
  const downloading=page.waitForEvent('download');await page.locator('#download-main').click();
  const file=await downloading,xml=readDocxEntry(await fs.readFile(await file.path()),'word/document.xml');
  expect(xml).toContain('Hillingdon Cove');expect(xml).toContain('Lighthouse at Hillingdon Hospital');expect(xml).toContain('999');expect(xml).toContain('NHS 111');expect(xml).not.toContain('{{CRISIS_');
 }
 await page.goto('/#urgent');await page.locator('#urgent-area').selectOption('camden');await expect(page.locator('#crisis-camden')).toBeVisible();await expect(page.locator('#crisis-camden')).toContainText('Camden Crisis Sanctuary');
 expect(await page.locator('html').evaluate(el=>el.scrollWidth<=el.clientWidth)).toBeTruthy();
});

test('MHCAS eligibility and Milton Keynes SPA details reach every full form download',async({page})=>{
 for(const [area,advice] of [
  ['brent','For residents of Brent, Harrow, Hillingdon, Kensington and Chelsea or Westminster.'],
  ['milton-keynes','Milton Keynes SPA: 01908 724365 (24/7 crisis help)']
 ]){
  await page.goto('/#staff-offer');await page.locator('#staff-area').selectOption(area);
  for(const route of ['staff-offer','staff-handover','staff-call','staff-carer']){
   await page.goto('/#'+route);
   await expect(page.locator('#staff-crisis-routes')).toContainText(advice);
   const downloading=page.waitForEvent('download');await page.locator('#download-main').click();
   const file=await downloading,xml=readDocxEntry(await fs.readFile(await file.path()),'word/document.xml');
   expect(xml).toContain(advice);
   if(area==='milton-keynes')expect(xml).toContain('Central CNWL SPA: 0800 0234 650 (Milton Keynes out-of-hours cover)');
   expect(xml).toContain('NHS 111');expect(xml).toContain('999');expect(xml).not.toContain('{{CRISIS_');
  }
  await page.goto('/#urgent');await page.locator('#urgent-area').selectOption(area);await expect(page.locator('#crisis-'+area)).toBeVisible();
  await expect(page.locator('#crisis-'+area)).toContainText(advice);
  expect(await page.locator('html').evaluate(el=>el.scrollWidth<=el.clientWidth)).toBeTruthy();
 }
});
