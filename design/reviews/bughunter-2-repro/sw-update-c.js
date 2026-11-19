// SW update flow, part C: an update mid-game shows the toast and doesn't reload; Save & quit then reloads once.
async page => {
  let navs = 0; page.on('framenavigated', (f) => { if (f === page.mainFrame()) navs++; });
  await page.click('#title [data-act="continue"]').catch(() => page.click('#title [data-act="new"]'));
  await page.waitForTimeout(3000);
  await page.evaluate(() => navigator.serviceWorker.getRegistration().then((r) => r.update()));
  for (let i = 0; i < 60 && !(await page.evaluate(() => !!window.__G.updateReady)); i++) await page.waitForTimeout(1000);
  const mid = await page.evaluate(() => ({ updateReady: !!window.__G.updateReady, toasts: [...document.querySelectorAll('#toasts > *')].map((t) => t.textContent), screen: window.__G.screen }));
  const navsMid = navs;
  await page.keyboard.press('Escape'); await page.waitForTimeout(400);
  await page.click('#pause [data-act="quit"]');
  await page.waitForFunction(() => window.__G?.ready && window.__G.screen === 'title', null, { timeout: 400000 });
  await page.waitForTimeout(30000);
  return { mid, navsMid, navsTotal: navs };
}
