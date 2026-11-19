// Repro (finding 3, second half): Save & quit while driving leaves the engine loop playing on the title.
// Setup shortcut: the part-talons step-3 fixture (Zamboni unlocked), then G.vehicles.enter() as Peck at the Zamboni does.
// Run: playwright-cli -s=<session> run-code "$(cat design/reviews/bughunter-2-repro/vehicle-loop-on-title.js)"
async page => {
  const g = (f, a) => page.evaluate(f, a);
  await page.evaluate(() => { for (const l of [...window.__G.audio.loops]) l.gain.gain.value = 0; window.__G.audio.loops.clear(); });   // forget the horn from the last repro
  await g(() => window.__game.goToScheme('part-talons', 3)); await g(() => window.__game.resume());
  await page.waitForTimeout(1000);
  const entered = await g(() => { const G = window.__G; const v = G.vehicles.list.find((q) => G.vehicles.canDrive(q) && !q.def.remote); return v ? { id: v.id, ok: G.vehicles.enter(v) } : null; });
  await page.waitForTimeout(2500);
  await page.keyboard.press('Escape'); await page.waitForTimeout(300);
  await page.click('#pause [data-act="quit"]'); await page.waitForTimeout(2000);
  return { entered, onTitle: await g(() => ({ screen: window.__G.screen, loops: [...window.__G.audio.loops].map((l) => ({ gain: +l.gain.gain.value.toFixed(3), playing: !!l.src && !l.stopped })), labels: [...document.querySelectorAll('#touch .tb')].map((b) => b.textContent) })) };
}
