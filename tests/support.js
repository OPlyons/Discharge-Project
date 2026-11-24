export async function interceptSentry(page){const envelopes=[];await page.route('**/*.ingest.de.sentry.io/**',async route=>{envelopes.push(route.request().postData()||'');await route.fulfill({status:200,contentType:'application/json',body:'{}'});});return envelopes;}

export async function openReadingOptions(page) {
 const toggle=page.locator('#reading-toggle');
 if (await toggle.isVisible()) await toggle.click();
 else {
  await page.getByRole('button',{name:'Menu',exact:true}).click();
  await page.locator('#mobile-menu').getByRole('button',{name:'Reading options'}).click();
 }
}

export async function showStaffCrisisRoutes(page) {
 const stage=page.getByRole('button',{name:'Step guidance',exact:true});
 if (await stage.isVisible()) await stage.click();
 await page.getByRole('button',{name:'Crisis routes',exact:true}).click();
}
