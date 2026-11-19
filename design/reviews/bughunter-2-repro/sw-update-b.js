// SW update flow, part B (after changing the served sw.js): an update check while on the title should reload once,
// come back to the title, and not reload again.
async page => {
  let navs = 0; page.on('framenavigated', (f) => { if (f === page.mainFrame()) navs++; });
  await page.evaluate(() => navigator.serviceWorker.getRegistration().then((r) => r.update()));
  for (let i = 0; i < 60 && navs === 0; i++) await page.waitForTimeout(1000);
  const afterUpdate = navs;
  await page.waitForFunction(() => window.__G?.ready && window.__G.screen === 'title', null, { timeout: 400000 });
  await page.waitForTimeout(60000);
  return { reloadsAfterUpdate: afterUpdate, totalReloads: navs, title: await page.evaluate(() => window.__G.screen), errors: await page.evaluate(() => window.__errors) };
}
