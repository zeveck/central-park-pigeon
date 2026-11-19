// Repro (finding 3): leave the Rink Job while the cab horn is jammed (Save & quit, or Continue) and the horn loops
// for the rest of the session: on the title, and into the next game. The script's onDone (which stops it) is dropped
// by cutscene.cancel(), and rinkjob.js restore() doesn't know the loop.
// Setup shortcut: the part-talons step-3 fixture, then the Rink Job script started the way the engine starts it
// (the real trigger is the Zamboni launch; design/solutions/part-talons.json replays it).
// Run: playwright-cli -s=<session> run-code "$(cat design/reviews/bughunter-2-repro/rink-horn-loop.js)"
async page => {
  const g = (f, a) => page.evaluate(f, a);
  await g(() => window.__game.goToScheme('part-talons', 3)); await g(() => window.__game.resume());
  await page.waitForTimeout(1000);
  await g(() => { const G = window.__G; G.schemes.busy.add('part-talons'); G.schemes.scripts['setpiece.rinkjob']({ scheme: 'part-talons', step: 2, abort: () => G.schemes.busy.delete('part-talons') }, () => G.schemes.busy.delete('part-talons')); });
  let loops = 0;
  for (let i = 0; i < 150 && !loops; i++) { await page.waitForTimeout(300); loops = await g(() => window.__G.audio.loops.size); }
  await page.waitForTimeout(500);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);
  await page.click('#pause [data-act="quit"]');
  await page.waitForTimeout(2000);
  const onTitle = await g(() => ({ screen: window.__G.screen, loops: [...window.__G.audio.loops].map((l) => ({ vol: l.vol, gain: +l.gain.gain.value.toFixed(3), playing: !!l.src && !l.stopped })), ctx: window.__G.audio.ctx?.state, muted: window.__G.settings.muted }));
  await page.click('#title [data-act="new"]').catch(() => {});
  await page.waitForTimeout(400);
  await page.click('#confirm [data-act="yes"]').catch(() => {});
  await page.waitForTimeout(3000);
  const newGame = await g(() => ({ screen: window.__G.screen, loops: [...window.__G.audio.loops].map((l) => ({ gain: +l.gain.gain.value.toFixed(3), playing: !!l.src && !l.stopped })) }));
  return { loopsBeforeQuit: loops, onTitle, newGame };
}
