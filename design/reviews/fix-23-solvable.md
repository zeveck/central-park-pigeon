# Fix #23: puzzles must stay solvable (2026-11-22)

The owner: "You shouldn't be able to fail a mission in a way that makes it so you can never do it. Ideally the mission
would just prompt and set up again."

Method: every scheme in src/data/schemes.js plus the finale was read against its script (src/schemes/*.js), the clue,
trade and market data (world/layout.js) and the rules that lose items (systems/items.js: nap, Ruffled, drop; takers.js:
the new Give). For each step: what it needs, where that comes from, and whether it can come back. A read-only helper did
the first pass; every dead end below was then checked in the code and, where changed, played in the game.

## What was wrong (the common cause)

Ten schemes need a **one-time item** in a later step: a clue that fires once, a trade, a dive, a market sale. Nothing put
such an item back if it was lost, and the easiest way to lose one was **water**: an item dropped over the Lake, the
Reservoir, the Meer or Conservatory Water lies on the water, where Gus can't stand, and pecking from the air only reaches
characters (interact.js pick({ air })). Ruffled dropped a heavy item where Gus was (the Rhoda fight is over the Meer).
The anchovy slice could be lost for good after a reload (den-cats' refill timers lived only in memory). A rigged vehicle
left wedged had nothing to bring it home. repairSpent (on Continue) only re-armed the current step's own trigger, so an
old save already in one of these holes stayed in it.

## What resets it now

- **Water.** systems/items.js drop(): over water a slice sinks ("There are always more"; den-cats puts the next anchovy
  out) and anything else floats back to its source (below), or where it was found if that's dry, or the nearest dry
  ground (G.dryNear in main.js). onRuffled(): never onto water (same rule). items.give() records where Gus got the item
  (dry), so a traded or bought item has a home too.
- **The item keeper** (systems/schemes.js #keep, data in src/data/item-sources.js ITEM_SOURCES): for each one-time
  item, the scheme and step(s) that need it (and the flag that says it has been had). Twice a second: if the item is
  nowhere (not carried, not lying about) it's put back at its source after 1.5 s, with a toast naming the place ("The
  peas are back at the Boathouse picnic table."). If it lies in water, or Gus has been more than 40 m from it for 90 s,
  it floats back to its source ("The wrench floated back to the Delacorte stage door."). Toasts only.
- **repairSpent** (Continue) runs the keeper too and lists what it put back (den-ducks step 3 with no peas → peas back at
  the table; the same for every rule).
- **den-cats**: the anchovy refill is now state-driven (any loss: given away, nap, Ruffled, sunk, a wrong taker, left
  90 s) → the sill refills 4 s later, or in the morning at Night, with a toast and a compass mark (fix #19). This also
  fixes the reload hole.
- **Vehicles** (entities/vehicles.js onNap): a nap tows Vinnie's rigged cart (part-body) or the pedicab (den-racers) home
  if it was left more than 3 m from it while its scheme is still open.
- **check-schemes** rule 5c: every step that needs a one-time item has an ITEM_SOURCES rule (renewing items: slices,
  boxes, shinies, gear; huge items can't be carried off). Removing a rule fails the check (tried with the wrench).

## The table

PROOF column: **played** = shown happening in the real game (shots in design/screenshots/fix-16-19-23/23-*, results
below); **replayed** = the recorded solution still finishes; **read** = checked in the code only (the same generic rule as
a played case).

### Cross-scheme rules

| Rule | How it could fail | What resets it now | Proof |
|---|---|---|---|
| Drop over water | A one-time item dropped over the Lake / Reservoir / Meer / Conservatory Water lay on the water, out of reach for good | items.js drop(): a slice sinks; anything else floats back to its keeper source / where found / dry ground, with a toast | **played**: peas dropped over the Lake at (0, 300) → "The peas floated back to the Boathouse picnic table." (23-peas-water-floatback-1280/844.png); anchovy dropped there → "The anchovy slice sank…", sill refilled (toast) |
| Ruffled | A heavy item was dropped where Gus was (water in the Rhoda fight); a light item with no origin landed at Gus | onRuffled: never onto water (homeFor); items.give records a dry origin | **played**: den-biscuit step 3, carrying the ball over the Lake, 3 hits → Ruffled → the ball lies on dry shore at (31.7, 314) (23-ball-ruffled-water-1280.png) |
| Nap | Slices and boxes on the ground go ("A rat got it") | Every slice and box source renews each phase (Lines, bins, relay, tourists, counters, the shelf); the anchovy refills (den-cats). New: a rigged cart / pedicab left away from home is towed back | **played**: part-body step 3, cart left at (30, 250), nap → back at (8.7, 206), "Vinnie's cart was towed back to the Mall." (23-cart-towed-nap-1280.png) |
| Give (new in #19) | A slice given away; the anchovy given away | Slices renew; den-cats refills the sill 4 s later (Night: in the morning) | **played** in #19: Crumbsy eats the anchovy → sill refilled with a toast (19-give-*.png, 19-refill-toast-*.png); Night → "Out again in the morning", refilled at Morning |
| Wrong taker | The anchovy handed to a world-effect taker that also takes plain slices (the guard, Walter, Big Sal, Vinnie, Rigby's union slice) | den-cats sees the anchovy gone and refills the sill (the hand-off itself is a legitimate use) | read (same path as Give) |
| Old saves | A save already in one of these holes | repairSpent (Continue) runs the keeper and lists what it put back | **played**: den-ducks step 3 state with the peas removed → repairSpent → ["den-ducks: peas put back at the Boathouse picnic table"] |
| Left behind | A needed item left lying far away | Keeper: Gus > 40 m away for 90 s → floats back to its source | **played**: den-raccoons step 3, wrench dropped 10 m from the stage door, Gus 70 m off: still there at 80 s, at 92 s "The wrench floated back to the Delacorte stage door." (23-wrench-floatback-1280.png) |

### Per scheme

| Scheme | How it can fail | What resets it | Proof |
|---|---|---|---|
| prologue | Nothing to lose (signs, crumbs) | – | read |
| den-ducks | s3: peas lost (dropped in the Lake, which is where Puddles is; or nowhere after a reload) | Keeper rule peas → the Boathouse picnic table; water drop floats back; repairSpent | **played** (water, missing, repairSpent) + replayed den-ducks (196.38) |
| den-cats | s3: anchovy lost any way; after a reload the sill never refilled (timers were in memory only) | den-cats: state-driven refill 4 s after any loss (Night: morning), toast + compass; lying 90 s far away → back; Pickles quick on a retry | **played** (#19 + sinking) + replayed den-cats (622.88), replayed den-cats.alt (684.78) |
| den-rats | Slice lost or cold | Slices renew (tourist refills, Lines, bins) | replayed in #19 (429.3) |
| den-raccoons | s3: wrench (one-time glint or trade) lost | Keeper rule wrench → the Delacorte stage door | **played** (left behind) + replayed den-raccoons (1693.82), replayed den-raccoons.alt (1698.65) |
| sab-middle | s1: the gate key (knocked off once) dropped in the Lake | Keeper rule gate-key (after lot.keyDown) → the Boathouse lot booth | read (same keeper path) + replayed sab-middle (1791.23) |
| sab-north | None found (the flock rope and the rig clue repeat) | – | read |
| part-eyes | Auto step | – | read |
| den-choir | None (signs, the pen, crumbs) | – | read |
| part-body | s1 slice: renews. s3: the rigged cart left wedged | Nap tows it home | **played** (nap tow) + replayed part-body (1991.2) |
| truce-cats-rats | Box lost: the shelf renews per phase, the cyclist | – | replayed in #19 (2735.85, alt 2696.82) |
| den-songbirds, den-horses, den-geese, den-squirrels | None found (flags, signs, repeatable blockers, caches) | – | read |
| den-racers | The rigged pedicab left away from its stand | Nap tows it home | replayed den-racers (2322), replayed den-racers.alt (4147.45) |
| part-talons | Slice renews; union.paid stays set; ramps clear on a nap | – | replayed in #19 (5466.73) |
| den-turtles, part-legs | Huge items can't be carried off; a parked cart / spent haul count is fixed by repairSpent already | – | read |
| truce-dogs-squirrels | s3: the tennis-ball sack (dug up once) dropped in the Lake | Keeper rule tennis-sack → the pecan cache | read (same keeper path) + replayed truce-dogs-squirrels (3637) |
| part-power | Flags set with the scene's done() | – | read |
| den-rhoda | Slice renews; walter.doorOpen clears every nap (by design) | Ruffled over the Meer no longer drops anything on water | replayed in #19 (3726.97) |
| den-meermob | Slices renew; Big Sal takes off-step slices (wasteful only) | – | replayed in #19 (6187.97) |
| den-crows | Shinies: the Afternoon stall sells them every phase | – | read |
| den-biscuit | s3: the ball (one dive) dropped in the Lake | Keeper rule ball → dry Lake shore; Ruffled never onto water | **played** (Ruffled) + replayed den-biscuit (1393.98) |
| den-strix | s2: the spectacles (sold once) lost | Keeper rule spectacles → Ledger's stall | **played** (missing → "The spectacles are back at Ledger's stall at the Exchange.", 23-specs-keeper-1280.png) + replayed den-strix (1504.4) |
| gear-sunglasses | The shiny: the stall | – | read |
| gear-pen | s2: the cufflink (revealed once) lost | Keeper rule cufflink → the Tavern patio | read + replayed gear-pen (955.88), replayed gear-pen.alt (936.88) |
| gear-headlamp | s2: the key (from the grate, once) dropped in the Reservoir | Keeper rule key → the 86th Street W grate | read + replayed gear-headlamp (1055.43) |
| part-wings | s1 / s3: either sail (dive once / tug once) dropped in Conservatory Water | Keeper rules sail (after wings.sail1 / wings.sail2) → the shore | read + replayed part-wings (1292.98), replayed part-wings.alt (1270.98) |
| part-beak | s2: the sticker (from the grate, once) lost | Keeper rule sticker → the 77th Street E grate | read + replayed part-beak (2517.27), replayed part-beak.alt (2337.23) |
| finale | Needs 17 crews and 8 parts; "nothing here can fail" (finale.js) | Inherits the fixes above | read |

check-schemes: rule 5c passes ("every one of the 11 steps that needs a one-time item has a source that puts it back"); with
the wrench rule removed it fails den-raccoons step 3, so the rule bites.

## Not changed, and why

- Items a ducks' dive brings up appear beside the duck (clues.js). In the recorded den-biscuit the ball came up on the bank
  (31.5, 314.3, dry); not changed, and if one ever surfaced on the water the keeper floats it back once the step needs it.
- Giving the anchovy to a world-effect taker (the stage guard etc.) is allowed: it's a real use of a hot slice, and den-cats
  refills the sill.
- The Plaza halal cart (#19) wasn't moved: it stands on Grand Army Plaza's paving, not in the road.


## Replays with the #23 code (node game/tools/sf-run.mjs serve, port 8153)

All complete, 0 console errors. Each end time equals the earlier baseline (design/reviews/fun-replays.txt; den-cats.alt
re-recorded in #19): den-ducks 196.38, den-strix 1504.4, gear-pen 955.88, gear-pen.alt 936.88, gear-headlamp 1055.43,
part-beak 2517.27, part-beak.alt 2337.23, sab-middle 1791.23, part-wings 1292.98, part-wings.alt 1270.98, den-biscuit
1393.98, den-raccoons 1693.82, den-raccoons.alt 1698.65, den-racers 2322, den-racers.alt 4147.45, part-body 1991.2,
truce-dogs-squirrels 3637, den-cats 622.88, den-cats.alt 684.78. No solution was re-recorded for #23: the intended play
didn't change. The rest weren't replayed: no other scheme's needed item, vehicle or step goes through the new code, and
outside water / loss / the keeper's own items, drop(), give() and Ruffled behave exactly as before.

## Review follow-up (same day)

- Water is tested by the surface an item lands or lies on (G.wetAt: collision.surface(...).kind === 'water'), not the 2D
  water outline: on Bow Bridge's deck (waterAt true) the peas stay put when dropped, and stay put with Gus 80 m away for 95 s.
- No 90 s float-back while the item lies where its step uses it (the step's place, or within 8 m of the give target): the
  tennis-ball sack left on Cedar Hill with Gus 120 m off for 95 s stays.
- Give (#19) never takes the anchovy while den-cats is open, and never offers to a character a step wants to talk to or who
  gives a step's nudge (Biscuit on den-biscuit step 1: no Give; Express with the anchovy: no Give).
- The cold-slice goal hint only shows for the slice the step wants (a cold plain slice on den-cats step 3: none).
