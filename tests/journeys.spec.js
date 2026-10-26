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
 const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('/#staff-call');await expect(page.locator('#download-main')).toHaveAttribute('download','Person_Call_and_Feedback_v12.docx');
 const download=page.waitForEvent('download');await page.locator('#download-main').click();expect((await download).suggestedFilename()).toBe('Person_Call_and_Feedback_v12.docx');
 await page.locator('#carer-call-link').click();await expect(page.locator('#download-main')).toHaveAttribute('download','Carer_Call_and_Feedback_v12.docx');
 await page.locator('#pack-customisation > summary').click();await page.locator('#staff-area').selectOption('harrow');
 await page.route('https://navigator.lxportal.space/**',route=>route.fulfill({status:200,contentType:'text/html',body:'<h1>Community Navigator</h1>'}));await page.locator('#local-support-link').click();await expect(page).toHaveURL('https://navigator.lxportal.space/#area-harrow');expect(errors).toEqual([]);
});
test('larger text does not overflow the discharge homepage',async({page})=>{
 await page.goto('/');await page.locator('#reading-options > summary').click();await page.locator('#larger-text').click();expect(await page.locator('html').evaluate(el=>el.scrollWidth<=el.clientWidth)).toBeTruthy();
});
