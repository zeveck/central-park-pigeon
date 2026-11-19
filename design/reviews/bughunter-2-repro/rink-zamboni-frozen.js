// Repro (finding 4): Save & quit during the Rink Job, then Continue in the same tab: the Zamboni keeps v.scripted
// (set by setpiece.rinkjob, cleared only by its last beat's V.park), so it can't be driven to re-launch.
// Setup shortcut: the part-talons step-3 fixture; Pause > Save (the save Continue will load); the Rink Job script
// started as the engine starts it when rink.launched is set (design/solutions/part-talons.json does it for real).
// Run: playwright-cli -s=<session> run-code "$(cat design/reviews/bughunter-2-repro/rink-zamboni-frozen.js)"
async page => {
  const g = (f, a) => page.evaluate(f, a);
  await g(() => window.__game.goToScheme('part-talons', 3)); await g(() => window.__game.resume());
  await page.waitForTimeout(1000);
  await page.keyboard.press('Escape'); await page.waitForTimeout(300);
  await page.click('#pause [data-act="save"]'); await page.waitForTimeout(300);
  await page.click('#pause [data-act="resume"]'); await page.waitForTimeout(500);
  await g(() => { const G = window.__G; G.state.flags['rink.launched'] = true; G.schemes.busy.add('part-talons'); G.schemes.scripts['setpiece.rinkjob']({ scheme: 'part-talons', step: 2, abort: () => G.schemes.busy.delete('part-talons') }, () => G.schemes.busy.delete('part-talons')); });
  await page.waitForTimeout(3000);
  await page.keyboard.press('Escape'); await page.waitForTimeout(300);
  await page.click('#pause [data-act="quit"]'); await page.waitForTimeout(800);
  await page.click('#title [data-act="continue"]'); await page.waitForTimeout(2000);
  const z0 = await g(() => { const v = window.__G.vehicles.byId.zamboni; return { scripted: !!v.scripted, x: +v.x.toFixed(2), z: +v.z.toFixed(2), launched: !!window.__G.state.flags['rink.launched'] }; });
  // get in (as Peck at the Zamboni does) and floor it for 3 s
  const entered = await g(() => window.__G.vehicles.enter(window.__G.vehicles.byId.zamboni));
  await page.waitForTimeout(500);
  await page.keyboard.down('Space'); await page.waitForTimeout(3000); await page.keyboard.up('Space');
  const z1 = await g(() => { const v = window.__G.vehicles.byId.zamboni; return { x: +v.x.toFixed(2), z: +v.z.toFixed(2), speed: v.speed, driving: !!window.__G.vehicles.driving }; });
  return { afterContinue: z0, entered, afterGas: z1 };
}
