// Repro (finding 2): a crew-join polaroid (or any overlay cleared by a G.later timer) stays on screen for good when
// the game is left while it shows: applyState() drops the timer that would clear it.
// Run from /workspaces/gg-test1 with the page on the title or in play (http://127.0.0.1:8251/):
//   playwright-cli -s=<session> run-code "$(cat design/reviews/bughunter-2-repro/polaroid-stuck.js)"
async page => {
  const g = (f, a) => page.evaluate(f, a);
  await g(() => window.__game.goToScheme('den-ducks', 3)); await g(() => window.__game.resume());
  await page.waitForTimeout(1000);
  await g(() => { const G = window.__G, c = G.chars.find('puddles'); window.__game.teleport(c.x + 1.5, c.z); G.gus.yaw = Math.atan2(c.x - G.gus.position.x, c.z - G.gus.position.z); });
  await page.waitForTimeout(800);
  await page.keyboard.press('KeyE');                       // give the peas: the join scene
  let on = false;
  for (let i = 0; i < 120 && !on; i++) {                   // read the lines (Enter) until "+1 CREW" shows
    if (await g(() => window.__G.dialogue.open)) await page.keyboard.press('Enter');
    await page.waitForTimeout(400);
    on = await g(() => document.getElementById('polaroid').className.includes('on'));
  }
  await page.keyboard.press('Escape');                     // pause while the polaroid shows
  await page.waitForTimeout(300);
  const atPause = await g(() => ({ menu: window.__G.menus.top?.id, cls: document.getElementById('polaroid').className }));
  await page.click('#pause [data-act="quit"]');            // Save & quit to title
  await page.waitForTimeout(500);
  const atTitle = await g(() => document.getElementById('polaroid').className);
  await page.click('#title [data-act="continue"]');        // Continue
  await page.waitForTimeout(8000);                         // well past the polaroid's 3.5 s
  const cls = await g(() => document.getElementById('polaroid').className);
  await page.screenshot({ path: 'design/screenshots/review-bughunter-2/polaroid-stuck-after-continue.png' });
  return { atPause, atTitle, polaroidShownBeforeQuit: on, polaroidClassAfterContinue: cls, crews: await g(() => window.__G.state.crews) };
}
