import {test,expect} from '@playwright/test';import AxeBuilder from '@axe-core/playwright';import {interceptSentry,showStaffCrisisRoutes} from './support.js';
test.beforeEach(async({page})=>{await interceptSentry(page);});
for(const route of ['home','about','carers','privacy','contact','accessibility','staff-call','resources','urgent'])test('axe: '+route,async({page})=>{await page.goto('/#'+route);const result=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21a','wcag21aa','best-practice']).analyze();expect(result.violations).toEqual([]);});

test('axe: all borough crisis guidance expanded',async({page})=>{
 test.setTimeout(120000);
 await page.goto('/#urgent');
 const areas=await page.locator('#urgent-area option').evaluateAll(options=>options.map(o=>o.value).filter(Boolean));
 for(const id of areas){
  await page.locator('#urgent-area').selectOption(id);
  await page.locator('#borough-crisis-content details:visible').evaluateAll(details=>details.forEach(el=>el.open=true));
  const result=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21a','wcag21aa','best-practice']).analyze();
  expect(result.violations,id).toEqual([]);
 }
});
test('axe: handover with local routes and provider notice expanded',async({page})=>{
 await page.goto('/#staff-handover');await page.locator('#staff-area').selectOption('westminster');await showStaffCrisisRoutes(page);
 await page.locator('#staff-crisis-routes details').evaluateAll(details=>details.forEach(el=>el.open=true));
 const result=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21a','wcag21aa','best-practice']).analyze();
 expect(result.violations).toEqual([]);
});
