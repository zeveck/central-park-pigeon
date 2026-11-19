// SW update flow, part A: fresh session on a copy of game/ with ?sw=1; wait for the title and for the worker to control the page.
async page => {
  await page.waitForFunction(() => window.__G?.ready && window.__G.screen === 'title', null, { timeout: 400000 });
  await page.waitForFunction(() => !!navigator.serviceWorker.controller, null, { timeout: 120000 });
  return await page.evaluate(() => ({ controlled: !!navigator.serviceWorker.controller, screen: window.__G.screen, swUpdated: !!window.__swUpdated }));
}
