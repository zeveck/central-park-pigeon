// Phone: start in portrait, turn to landscape while loading, check canvas/backing size, the turn card and the title.
// Open first: playwright-cli -s=<s> open --device "iPhone 15" http://127.0.0.1:8251/
async page => {
  await page.waitForTimeout(15000);
  const during = await page.evaluate(() => ({ ready: !!window.__G?.ready, turn: getComputedStyle(document.getElementById('turn')).display }));
  await page.setViewportSize({ width: 852, height: 393 });
  await page.waitForFunction(() => window.__G?.ready, null, { timeout: 300000 });
  await page.waitForTimeout(1500);
  const c = await page.evaluate(() => { const cv = window.__G.renderer.domElement; const r = cv.getBoundingClientRect(); return { css: [Math.round(r.width), Math.round(r.height)], backing: [cv.width, cv.height], dpr: window.__G.renderer.getPixelRatio(), cam: +window.__G.renderCam.aspect.toFixed(3), win: [innerWidth, innerHeight], turn: getComputedStyle(document.getElementById('turn')).display, scrollY, errors: window.__errors }; });
  await page.screenshot({ path: 'design/screenshots/review-bughunter-2/phone-title-after-rotate.png' });
  return { during, c };
}
