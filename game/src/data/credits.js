// The credits, in one place: the finale's roll (finale/shout.js) and the
// Credits screen on the title and in Settings (ui/screens.js) show the same
// text. CREDIT_NAME is GAMEGEN_CREDIT from .env (design/STATUS.md: "Credit").
// Licences: three.js and gh-feedback are MIT (vendor/LICENSE,
// vendor/gh-feedback-SOURCE.txt); the fonts are SIL OFL 1.1 (fonts/OFL-*.txt).

import { CREW } from './crews.js';

export const CREDIT_NAME = 'Rich Conlan';

/** The credits as HTML: `roll` (the finale) adds the title and the closing thanks. */
export function creditsHtml({ roll = false } = {}) {
  return `
${roll ? '<h1>Central Park Pigeon</h1>\n<p class="big">Feed the Birds</p>' : ''}
<h2>A game by</h2><p class="big">${CREDIT_NAME}</p>
<h2>Starring</h2><p>Gus, a pigeon with a plan</p><p>and the Mecha-Pigeon (one hot dog cart, two drainpipes, two sails, a traffic cone, two hubcaps, a megaphone, a rowboat battery and a lot of spike strips)</p>
<h2>The crews</h2>
<div class="crewlist">${Object.values(CREW).map((c) => `<p class="crew">${c.name}</p>`).join('')}</div>
<p class="small">and every squirrel, rat, cat, crow, duck, goose, dog, horse, turtle, songbird and stray in the park</p>
<h2>Design, code, art, models and sound</h2>
<p>Made with gamegen: AI tools under the direction of ${CREDIT_NAME}</p>
<p class="small">Game design, code and play-testing: Claude (Anthropic), with the gamegen skills</p>
<h2>Art</h2>
<p>Character cards, mock-ups, textures, skies and the post-credits still: GPT Image (imagegen2) and Gemini (nanogen)</p>
<p>3D models, rigs and animations: Meshy (meshgen)</p>
<p class="small">The Mecha-Pigeon and the Empire State Building were built in code from those models</p>
<h2>Music, sound and voices</h2>
<p>ElevenLabs (audiogen)</p>
<h2>Made with</h2>
<p>three.js 0.186 (MIT licence, © three.js authors)</p>
<p>gh-feedback for bug reports (MIT licence, github.com/zeveck/gh-feedback)</p>
<p>Fonts: Fredoka (© The Fredoka Project Authors) and Nunito (© The Nunito Project Authors), SIL Open Font Licence 1.1</p>
<p class="small">The licence texts travel with the game: vendor/LICENSE, vendor/gh-feedback-SOURCE.txt, fonts/OFL-Fredoka.txt and fonts/OFL-Nunito.txt</p>
<p class="small">glTF-Transform for asset optimization · Playwright for the autopilot's test runs</p>
<h2>With thanks to</h2>
<p>Central Park, its rangers, and every pigeon who ever looked up</p>
<p class="small">Real places and kinds of park life; every character is original. No real people, brands or famous animals.</p>
${roll ? '<h2>&nbsp;</h2>\n<p class="big">Thanks for playing!</p>' : ''}
`;
}
