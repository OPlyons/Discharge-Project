import {test,expect} from '@playwright/test';
import {interceptSentry,mockNavigator,openSupport,records} from './support.js';
test.beforeEach(async({page})=>{await interceptSentry(page);});
test('wizard, borough map and support icons share the opening dashboard',async({page,isMobile})=>{
 const calls=await mockNavigator(page);
 if(!isMobile)await page.setViewportSize({width:1280,height:720});
 await page.goto('/');await page.locator('nav[aria-label="Main navigation"]').getByRole('link',{name:'Find support',exact:true}).click();await expect(page.locator('#service-search')).toBeEnabled();
 await expect(page.locator('.wizard-panel')).toBeVisible();await expect(page.locator('#borough-map')).toBeVisible();await expect(page.locator('#activity-choices')).toBeVisible();
 const workforce=page.locator('#workforce-advice-link');await expect(workforce).toBeVisible();await expect(workforce).toHaveAttribute('href','https://map.lxportal.space/');await expect(workforce).toHaveAttribute('target','_blank');await expect(workforce).toContainText('on behalf of the service user');await expect(workforce).toContainText('Not a referral process.');
 await expect(page.locator('[data-search-mode]')).toHaveCount(0);await expect(page.locator('#activity-choices > button')).toHaveCount(14);
 if(!isMobile){
  const wizard=await page.locator('.wizard-panel').boundingBox(),map=await page.locator('.support-area').boundingBox(),types=await page.locator('.support-types').boundingBox();
  expect(Math.abs(wizard.y-map.y)).toBeLessThan(2);expect(map.x).toBeGreaterThan(wizard.x+wizard.width);expect(types.x).toBeGreaterThan(map.x+map.width);
  const sizing=await page.evaluate(()=>Object.fromEntries(['.brand-inner','.navigation-wrap','.utility-bar','main','.support-heading','.wizard-panel','.support-area','.support-types'].map(selector=>{const n=document.querySelector(selector),s=getComputedStyle(n),r=n.getBoundingClientRect();return[selector,{y:r.y,height:r.height,padding:s.padding,fontSize:s.fontSize,has:document.body.matches(':has(#support.active)')}];})));
  expect(Math.max(wizard.y+wizard.height,map.y+map.height,types.y+types.height),JSON.stringify(sizing)).toBeLessThanOrEqual(720);
  const more=await page.locator('#support-more-filters').boundingBox();expect(more.y+more.height).toBeLessThanOrEqual(720);
  const workforceBox=await workforce.boundingBox();expect(workforceBox.y+workforceBox.height).toBeLessThanOrEqual(wizard.y);expect(workforceBox.y).toBeGreaterThanOrEqual(0);
 }
 expect(calls).toHaveLength(0);
 await test.info().attach('Opening support dashboard',{body:await page.screenshot(),contentType:'image/png'});
});
test('map and support icons refine AI results locally',async({page})=>{
 const calls=await mockNavigator(page);await openSupport(page);await page.locator('#service-search').fill('Housing and benefits in Brent tonight');await page.locator('#navigator-submit').click();
 await expect(page.locator('#navigator-cards article')).toHaveCount(3);await expect(page.locator('#area')).toHaveValue('brent');
 await page.locator('#borough-map [data-area="harrow"]').click();await expect(page.locator('#navigator-cards article').first()).toHaveAttribute('data-resource-id','harrow-housing');
 await page.locator('[data-activity="money"]').click();await expect(page.locator('#navigator-cards article').first()).toBeVisible();
 const ids=await page.locator('#navigator-cards article').evaluateAll(nodes=>nodes.map(n=>n.dataset.resourceId));
 for(const id of ids)expect(['Money and benefits','Legal advice and rights','Voice and advocacy']).toContain(records.find(r=>r.id===id).category);
 expect(calls).toHaveLength(1);
 await page.locator('#navigator-reset').click();await expect(page.locator('#area')).toHaveValue('');await expect(page.locator('#service-search')).toHaveValue('');await expect(page.locator('[data-activity="all"]')).toHaveAttribute('aria-pressed','true');await expect(page.locator('#navigator-results')).toBeHidden();await expect(page.locator('#support-start')).toBeVisible();
});
test('a support icon and borough browse locally and clear together',async({page})=>{
 const calls=await mockNavigator(page);await openSupport(page);await page.locator('[data-activity="housing"]').press('Enter');await page.locator('#borough-map [data-area="brent"]').click();
 await expect(page.locator('#directory-explorer')).toBeVisible();await expect(page.locator('#resource-list')).toContainText('Brent housing and homelessness');
 await expect(page.locator('[data-activity="housing"]')).toHaveAttribute('aria-pressed','true');await expect(page.locator('#area')).toHaveValue('brent');
 expect(calls).toHaveLength(0);await page.locator('#clear-filters').click();await expect(page.locator('#resource-count')).toContainText('786 listings');await expect(page.locator('[data-activity="all"]')).toHaveAttribute('aria-pressed','true');
});
test('the compact wizard keeps a local text search available',async({page})=>{
 const calls=await mockNavigator(page);await openSupport(page);await page.locator('#area').selectOption('camden');await page.locator('#service-search').fill('board games');await page.locator('#navigator-local').click();
 await expect(page.locator('#resource-list')).toContainText(/board.game/i);expect(calls).toHaveLength(0);await expect(page.locator('#navigator-results')).toBeHidden();
});
