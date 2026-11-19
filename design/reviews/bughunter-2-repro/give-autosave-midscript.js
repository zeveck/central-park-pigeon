// Repro (finding 1): the autosave right after a scripted "give" stores the item as gone but the step as not done.
// Run from /workspaces/gg-test1 with the page on the title (http://127.0.0.1:8251/):
//   playwright-cli -s=<session> run-code "$(cat design/reviews/bughunter-2-repro/give-autosave-midscript.js)"
async page => {
  const g = (f, a) => page.evaluate(f, a);
  await g(() => window.__game.goToScheme('den-ducks', 3)); await g(() => window.__game.resume());   // goToScheme freezes the clock
  await page.waitForTimeout(1000);
  // setup: stand next to Puddles, facing her (teleport is the debug hook's screenshot helper)
  await g(() => { const G = window.__G, c = G.chars.find('puddles'); window.__game.teleport(c.x + 1.5, c.z); G.gus.yaw = Math.atan2(c.x - G.gus.position.x, c.z - G.gus.position.z); });
  await page.waitForTimeout(800);
  const before = await g(() => ({ prompt: window.__game.state({ measure: false }).prompt, carried: window.__G.state.carried?.id }));
  // the player's real Peck
  await page.keyboard.press('KeyE');
  await page.waitForTimeout(400);
  const during = await g(() => { const G = window.__G; const s = JSON.parse(localStorage.getItem('cpp-save-v1')); return { cutscene: G.cutscene.name, busy: [...G.schemes.busy], savedCarried: s.carried?.id || null, savedStep: s.steps['den-ducks'], savedJoined: s.crews.includes('ducks') }; });
  // the player closes the tab / the phone kills it while the join scene plays: pagehide keeps that autosave (midScene)
  await page.reload();
  await page.waitForFunction(() => window.__game?.state({ measure: false }).screen === 'title', null, { timeout: 180000 });
  await g(() => window.__G.continueGame());
  await page.waitForTimeout(1500);
  const after = await g(() => { const st = window.__game.state({ measure: false }); return { carried: st.carried, step: st.schemes.steps['den-ducks'], goal: st.goal, items: st.items.filter((i) => i.id === 'peas'), crews: st.crews }; });
  return { before, during, after };
}
