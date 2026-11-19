// Opens every Pause entry (and Tab map / J board in play) at three sizes and collects page errors.
// Run in play: playwright-cli -s=<session> run-code "$(cat design/reviews/bughunter-2-repro/menu-sweep.js)"
async page => {
  const errs = [];
  page.on('pageerror', (e) => errs.push('pageerror ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') errs.push('console ' + m.text()); });
  const out = [];
  for (const [w, h] of [[1280, 720], [800, 600], [568, 320]]) {
    await page.setViewportSize({ width: w, height: h });
    await page.waitForTimeout(500);
    for (const act of ['board', 'map', 'roster', 'controls', 'settings', 'nap']) {
      await page.keyboard.press('Escape'); await page.waitForTimeout(300);
      const top0 = await page.evaluate(() => window.__G.menus.top?.id);
      if (top0 !== 'pause') { out.push(`${w}x${h} ${act}: pause not open (${top0})`); await page.evaluate(() => window.__G.resume()); continue; }
      await page.click(`#pause [data-act="${act}"]`).catch((e) => out.push(`${w}x${h} ${act}: click failed ${e.message.slice(0, 60)}`));
      await page.waitForTimeout(500);
      const top = await page.evaluate(() => window.__G.menus.top?.id);
      await page.keyboard.press('Escape'); await page.waitForTimeout(300);
      const back = await page.evaluate(() => window.__G.menus.top?.id);
      await page.keyboard.press('Escape'); await page.waitForTimeout(300);
      const fin = await page.evaluate(() => window.__G.menus.top?.id || 'play');
      out.push(`${w}x${h} ${act}: opened ${top}, back to ${back}, then ${fin}`);
    }
    await page.keyboard.press('Tab'); await page.waitForTimeout(400);
    const m = await page.evaluate(() => window.__G.menus.top?.id);
    await page.keyboard.press('Tab'); await page.waitForTimeout(400);
    const m2 = await page.evaluate(() => window.__G.menus.top?.id || 'play');
    await page.keyboard.press('Escape'); await page.waitForTimeout(300);
    out.push(`${w}x${h} Tab: ${m}, Tab again: ${m2}`);
    if (await page.evaluate(() => window.__G.menus.open)) await page.evaluate(() => window.__G.resume());
  }
  await page.setViewportSize({ width: 1280, height: 720 });
  return { out, errs, logged: await page.evaluate(() => window.__errors) };
}
