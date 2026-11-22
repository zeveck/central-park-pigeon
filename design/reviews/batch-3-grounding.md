# Batch 3: grounding audit (#1, #7, #17), before and after

Scripted, not visual: `game/src/debug/ground-audit.js` (`runGroundAudit`), run as an `eval` job in one game load
(`game/tools/sf-run.mjs serve --jobs <dir>`, preset Low, fixture `den-ducks`). It samples every walker's feet once a
game second for 64 s: 16 s in each of Morning, Afternoon, Dusk and Night, with Gus moved round 16 spots (the Pond, Gapstow,
the Lake, Turtle Pond, the Conservatory, the Ramble, the Great Lawn, the Reservoir, the Pool, the Loch, the Meer, the Mall
and the three dog walkers' routes) so that the camera draws different people. Each sample checks:

- **water**: standing on (or under) water that isn't theirs (no bridge deck over it). Swimmers are exempt; a character
  placed on the water (`on: 'water:…'`) is checked the other way round (**offWater**).
- **under** / **float**: feet more than 0.1 m below / 0.12 m above the walkable surface (`collision.groundFor`; 0.08 m for
  leash dogs, 0.15 m for named characters). Humans only when drawn (the undrawn have no height).
- **solid**: feet (+0.15–0.5 m) inside a box, cylinder or rock.

A row counts each walker flagged at least once (the per-walker sample counts are in the offender lists). Same audit code
for both runs (the before run was the unchanged game; the after run is the build being committed). The audit skips
perched animals with a height offset (the owl up its tree): that is the one "float" left in the before table's owls.

## Summary

| who | seen | water before → after | offWater before → after | under before → after | float before → after | solid before → after |
|---|---|---|---|---|---|---|
| named characters | 67 | 4 → 0 | 0 → 0 | 4 → 0 | 0 → 0 | 1 → 0 |
| humans | 197 | 8 → 0 | 0 → 0 | 1 → 0 | 0 → 0 | 9 → 2 |
| leash dogs | 4 | 0 → 0 | 0 → 0 | 0 → 0 | 0 → 0 | 0 → 0 |
| crowd animals | 653 | 37 → 0 | 0 → 0 | 249 → 4 | 161 → 7 | 89 → 4 |

### Before: every offender except crowd animals

| who | at | flags (samples, worst) |
|---|---|---|
| slowpoke | 14, 428 | water ×64 (worst -1.8 m at 14, 428); under ×64 (worst -1.8 m at 14, 428) |
| tiny | -83, 1026 | solid ×64 (worst 0 m at -83, 1026) |
| stilts | -66, 866 | water ×48 (worst -1.6 m at -66, 866); under ×48 (worst -1.6 m at -66, 866) |
| h:parkgoer#h0 | 75.18, 23.6 | water ×47 (worst 0 m at 61.49, 13.56) |
| h:parkgoer#h1 | 72.09, 20.98 | water ×44 (worst 0 m at 55.29, 23.47) |
| h:gapstow-selfie#h79 | 61, 43.2 | water ×48 (worst -2.07 m at 61, 43.2); under ×6 (worst -2.07 m at 61, 43.2); solid ×42 (worst 0 m at 61, 43.2) |
| a:amb-commuter#a51 | 71.93, -2.4 | solid ×2 (worst 0 m at 16.93, -2.4) |
| h:birder#h63 | -29.5, 354.53 | solid ×1 (worst 0 m at -29.5, 354.53) |
| h:tourist#h17 | 14.07, 6.81 | solid ×2 (worst 0 m at 18.88, 10.89) |
| a:amb-commuter#a50 | -60.02, -2.4 | solid ×1 (worst 0 m at -60.02, -2.4) |
| h:tourist#h7 | 2.11, 67.43 | solid ×1 (worst 0 m at 2.11, 67.43) |
| h:picnicker#h3 | 51.96, 18.48 | water ×16 (worst 0 m at 51.96, 18.48) |
| h:picnicker#h4 | 54.97, 21.38 | water ×16 (worst 0 m at 54.97, 21.38) |
| h:parkgoer#h2 | 45.07, 10.35 | water ×30 (worst 0 m at 48.25, 21.01) |
| h:tourist#h30 | 18.57, 220.57 | solid ×2 (worst 0 m at 13.26, 220.74) |
| h:kid#h83 | 75.55, 322.9 | water ×3 (worst 0 m at 75.55, 322.9); solid ×3 (worst 0 m at 76.57, 327.3) |
| a:amb-commuter#a57 | -103.81, 6.18 | solid ×6 (worst 0 m at -103.81, 6.18) |
| mamamask | -31, 925 | water ×32 (worst -0.8 m at -31, 925); under ×32 (worst -0.8 m at -31, 925) |
| nightcap | -60, 330 | water ×16 (worst -2.8 m at -60, 330); under ×16 (worst -2.8 m at -60, 330) |
| h:parkgoer#h87 | 59.87, 973.59 | water ×2 (worst 2.23 m at 59.87, 973.59) |

### Crowd animals by group (animals flagged at least once)

| group | before | after |
|---|---|---|
| cats | solid 15, under 16, float 6 | float 3 |
| choir | solid 9, under 6, float 4 | 0 |
| crows | under 32, float 19, solid 3 | float 1, under 2, solid 2 |
| dogs | water 1, under 13, float 4 | under 1, solid 1 |
| geese | float 3 | 0 |
| herons | water 7, under 6, float 2 | 0 |
| meermob | under 18, float 9, solid 5 | 0 |
| owls | float 1 | 0 |
| raccoons | float 19, solid 1, water 2, under 12 | under 1, solid 1 |
| racers | water 15, float 8, under 18, solid 1 | 0 |
| rats | solid 30, under 19, float 19 | float 3 |
| songbirds | solid 18, under 53, water 8, float 31 | 0 |
| squirrels | under 56, float 36, water 4, solid 6 | 0 |
| swells | solid 1 | 0 |

### After: every offender left

| who | at | flags (samples, worst) |
|---|---|---|
| crowd:crows#186 | -32.42, 323.49 | float ×4 (worst 0.12 m at -32.42, 323.49); under ×1 (worst -0.28 m at -29.83, 328.53); solid ×1 (worst 0 m at -29.83, 328.53) |
| a:amb-commuter#a51 | 71.93, -2.4 | solid ×2 (worst 0 m at 16.93, -2.4) |
| a:amb-commuter#a50 | -60.02, -2.4 | solid ×1 (worst 0 m at -60.02, -2.4) |
| crowd:rats#289 | 43.86, 1066.57 | float ×2 (worst 0.15 m at 46.7, 1066.52) |
| crowd:rats#290 | 46.54, 1066.54 | float ×1 (worst 0.15 m at 46.54, 1066.54) |
| crowd:rats#292 | 42.64, 1068.81 | float ×1 (worst 0.15 m at 42.64, 1068.81) |
| crowd:crows#183 | -46, 358.98 | under ×29 (worst -0.19 m at -46, 358.98); solid ×29 (worst 0 m at -46, 358.98) |
| crowd:dogs#398 | 51.01, 372.39 | under ×28 (worst -0.5 m at 51.01, 372.49); solid ×28 (worst 0 m at 51.01, 372.49) |
| crowd:cats#418 | 62.48, 1066.56 | float ×1 (worst 0.15 m at 62.48, 1066.56) |
| crowd:cats#416 | 58.09, 1066.55 | float ×1 (worst 0.15 m at 58.09, 1066.55) |
| crowd:raccoons#246 | -32.92, 931.5 | under ×2 (worst -0.25 m at -32.92, 931.5); solid ×2 (worst 0 m at -32.92, 931.5) |
| crowd:cats#419 | 63.21, 1066.52 | float ×1 (worst 0.15 m at 63.21, 1066.52) |

### Bridge deck ends (deck height minus the terrain 0.4 m past the end; walkers step up to 0.3 m)

| bridge | end | deck y | before: terrain, gap | after: terrain, gap |
|---|---|---|---|---|
| gapstow-bridge | A | 0.52 | 0.05, **0.47** | 0.44, **0.08** |
| gapstow-bridge | B | 0.52 | 0.27, **0.25** | 0.49, **0.03** |
| bow-bridge | A | -0.45 | -0.66, **0.21** | -0.66, **0.21** |
| bow-bridge | B | -0.15 | -0.32, **0.17** | -0.32, **0.17** |
| huddlestone | A | 0.16 | -0.16, **0.32** | 0.03, **0.13** |
| huddlestone | B | 0.16 | -0.25, **0.4** | 0.01, **0.15** |
| t65@x-81 drive | S | 0.92 | 0.52, **0.41** | 0.74, **0.18** |
| t65@x-81 drive | N | 0.92 | 1.57, **-0.64** | 0.95, **-0.03** |
| t65@x25 drive | S | 0.75 | 0.61, **0.14** | 0.67, **0.08** |
| t65@x25 drive | N | 0.75 | 0.23, **0.52** | 0.72, **0.03** |
| t65@x-13 | S | 0.95 | 0.8, **0.15** | 0.84, **0.11** |
| t65@x-13 | N | 0.95 | 0.84, **0.11** | 0.94, **0.01** |
| t65@x8 | S | 0.95 | 0.8, **0.15** | 0.84, **0.11** |
| t65@x8 | N | 0.95 | 0.58, **0.37** | 0.93, **0.02** |
| t65@x-97 | S | 0.94 | 0.78, **0.16** | 0.83, **0.11** |
| t65@x-97 | N | 0.94 | 0.91, **0.03** | 0.94, **0** |
| t65@x95 | S | 0.55 | 0.4, **0.15** | 0.44, **0.11** |
| t65@x95 | N | 0.55 | 0.88, **-0.33** | 0.57, **-0.02** |
| t79@x-75 drive | S | 0.48 | 0.59, **-0.11** | 0.53, **-0.05** |
| t79@x-75 drive | N | 0.48 | 0.53, **-0.05** | 0.53, **-0.05** |
| t79@x63 drive | S | 2.2 | 2.79, **-0.59** | 2.22, **-0.02** |
| t79@x63 drive | N | 2.2 | 2.19, **0.01** | 2.24, **-0.04** |
| t79@x30 | S | 2.89 | 3.58, **-0.69** | 2.9, **-0.01** |
| t79@x30 | N | 2.89 | 1.13, **1.77** | 2.78, **0.11** |
| t79@x-11 | S | 7.53 | 1.75, **5.78** | 7.5, **0.03** |
| t79@x-11 | N | 7.53 | 7.78, **-0.24** | 7.61, **-0.08** |
| t79@x99 | S | 1.55 | 1.22, **0.33** | 1.52, **0.03** |
| t79@x99 | N | 1.55 | 1.51, **0.04** | 1.55, **0** |
| t79@x-99 | S | 0.48 | 0.29, **0.19** | 0.47, **0.01** |
| t79@x-99 | N | 0.48 | 0.42, **0.06** | 0.46, **0.03** |
| t86@x-97 drive | S | 1.85 | 1.86, **-0.01** | 1.9, **-0.04** |
| t86@x-97 drive | N | 1.85 | 1.99, **-0.13** | 1.9, **-0.05** |
| t86@x75 drive | S | 1.16 | 1.24, **-0.07** | 1.23, **-0.06** |
| t86@x75 drive | N | 1.16 | 1.36, **-0.19** | 1.21, **-0.05** |
| t86@x3 | S | 0.61 | 0.68, **-0.07** | 0.67, **-0.06** |
| t86@x3 | N | 0.61 | -0.85, **1.46** | 0.54, **0.07** |
| t86@x-105 | none (cut 0.74 m deep) | – | a cut wall across the path: yes | a cut wall across the path: no |
| t86@x-29 | S | 0.88 | 0.96, **-0.08** | 0.95, **-0.07** |
| t86@x-29 | N | 0.88 | 0.29, **0.59** | 0.83, **0.06** |
| t86@x29 | S | 1.22 | 1.28, **-0.06** | 1.27, **-0.05** |
| t86@x29 | N | 1.22 | 0.3, **0.92** | 1.13, **0.09** |
| t97@x-87 drive | S | 0.38 | 0.61, **-0.23** | 0.43, **-0.05** |
| t97@x-87 drive | N | 0.38 | 0.49, **-0.11** | 0.46, **-0.08** |
| t97@x81 drive | S | 0.99 | 1.32, **-0.33** | 1.03, **-0.04** |
| t97@x81 drive | N | 0.99 | 0.49, **0.5** | 0.93, **0.06** |
