// Repro (finding 1, no reload needed): give the peas, press Esc during the join scene, "Save & quit to title", Continue.
// Run from /workspaces/gg-test1 with the page on the title (http://127.0.0.1:8251/):
//   playwright-cli -s=<session> run-code "$(cat design/reviews/bughunter-2-repro/give-then-save-quit.js)"
async page => {
  const g = (f, a) => page.evaluate(f, a);
  await g(() => window.__game.goToScheme('den-ducks', 3)); await g(() => window.__game.resume());
  await page.waitForTimeout(1000);
  await g(() => { const G = window.__G, c = G.chars.find('puddles'); window.__game.teleport(c.x + 1.5, c.z); G.gus.yaw = Math.atan2(c.x - G.gus.position.x, c.z - G.gus.position.z); });
  await page.waitForTimeout(800);
  await page.keyboard.press('KeyE');            // Peck Puddles with the peas: the join scene starts
  await page.waitForTimeout(1500);
  await page.keyboard.press('Escape');          // pause mid-scene
  await page.waitForTimeout(300);
  await page.click('#pause [data-act="quit"]'); // Save & quit to title (mid-scene: keeps the last autosave)
  await page.waitForTimeout(500);
  await page.click('#title [data-act="continue"]');
  await page.waitForTimeout(1500);
  const st = await g(() => window.__game.state({ measure: false }));
  await page.screenshot({ path: 'design/screenshots/review-bughunter-2/ducks-softlock-after-continue.png' });
  return { carried: st.carried, step: st.schemes.steps['den-ducks'], goal: st.goal?.goal, peasInWorld: st.items.filter((i) => i.id === 'peas').length, ducksJoined: st.crews.includes('ducks') };
}
