import {test,expect} from '@playwright/test';import AxeBuilder from '@axe-core/playwright';import {interceptSentry} from './support.js';
test.beforeEach(async({page})=>{await interceptSentry(page);});
for(const route of ['home','about','carers','privacy','contact','accessibility','staff-call','resources'])test('axe: '+route,async({page})=>{await page.goto('/#'+route);const result=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21a','wcag21aa','best-practice']).analyze();expect(result.violations).toEqual([]);});
