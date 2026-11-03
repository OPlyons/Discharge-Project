import {test,expect} from '@playwright/test';import AxeBuilder from '@axe-core/playwright';import {interceptSentry} from './support.js';
test.beforeEach(async({page})=>{await interceptSentry(page);});
for(const route of ['home','about','carers','privacy','contact','accessibility','staff-call','resources','urgent'])test('axe: '+route,async({page})=>{await page.goto('/#'+route);const result=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21a','wcag21aa','best-practice']).analyze();expect(result.violations).toEqual([]);});

test('axe: all borough crisis guidance expanded',async({page})=>{
 await page.goto('/#urgent');
 await page.locator('#borough-crisis-content details').evaluateAll(details=>details.forEach(el=>el.open=true));
 const result=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21a','wcag21aa','best-practice']).analyze();
 expect(result.violations).toEqual([]);
});
test('axe: handover with local routes and provider notice expanded',async({page})=>{
 await page.goto('/#staff-handover');await page.locator('#staff-area').selectOption('westminster');
 await page.locator('#staff-crisis-routes details').evaluateAll(details=>details.forEach(el=>el.open=true));
 const result=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21a','wcag21aa','best-practice']).analyze();
 expect(result.violations).toEqual([]);
});
