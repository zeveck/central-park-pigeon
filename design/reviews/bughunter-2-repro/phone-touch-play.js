// Phone landscape: New Game by tap, stick + Flap together, HUD pause by tap, resume, a camera swipe; errors collected.
async page => {
  const errs = []; page.on('pageerror', (e) => errs.push(e.message));
  const box = async (sel) => { const b = await page.locator(sel).first().boundingBox(); return b && { x: b.x + b.width / 2, y: b.y + b.height / 2 }; };
  const t = await box('#title [data-act="new"]'); await page.touchscreen.tap(t.x, t.y);
  await page.waitForTimeout(800);
  if (await page.evaluate(() => window.__G.menus.top?.id === 'confirm')) { const y = await box('#confirm [data-act="yes"]'); await page.touchscreen.tap(y.x, y.y); }
  for (let i = 0; i < 60 && await page.evaluate(() => window.__G.cutscene.running); i++) await page.waitForTimeout(500);
  const cdp = await page.context().newCDPSession(page);
  const touch = (type, points) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: points });
  const s = await box('#touch .stick'), f = await box('#touch .flap');
  const p0 = await page.evaluate(() => ({ ...window.__game.state({ measure: false }).player }));
  await touch('touchStart', [{ x: s.x, y: s.y - 40, id: 1 }]);
  await page.waitForTimeout(1500);
  await touch('touchStart', [{ x: s.x, y: s.y - 40, id: 1 }, { x: f.x, y: f.y, id: 2 }]);
  await page.waitForTimeout(1200);
  await touch('touchEnd', [{ x: s.x, y: s.y - 40, id: 1 }]);
  await touch('touchEnd', []);
  await page.waitForTimeout(800);
  const p1 = await page.evaluate(() => ({ ...window.__game.state({ measure: false }).player }));
  const pb = await box('#hud [data-act="pause"]'); await page.touchscreen.tap(pb.x, pb.y);
  await page.waitForTimeout(600);
  const menu = await page.evaluate(() => window.__G.menus.top?.id);
  await page.screenshot({ path: 'design/screenshots/review-bughunter-2/phone-pause.png' });
  const r = await box('#pause [data-act="resume"]'); await page.touchscreen.tap(r.x, r.y);
  await page.waitForTimeout(600);
  await touch('touchStart', [{ x: 600, y: 150, id: 3 }]);
  for (let k = 1; k <= 6; k++) { await touch('touchMove', [{ x: 600 + k * 20, y: 150, id: 3 }]); await page.waitForTimeout(60); }
  await touch('touchEnd', []);
  await page.waitForTimeout(800);
  const st = await page.evaluate(() => ({ menu: window.__G.menus.top?.id || 'play', stick: window.__G.input.move?.(), audio: window.__game.audioState() }));
  return { moved: Math.hypot(p1.x - p0.x, p1.z - p0.z).toFixed(1), modeAfter: p1.mode, flewY: (p1.y - p0.y).toFixed(1), menu, st, errs, logged: await page.evaluate(() => window.__errors) };
}
