// DATA (3b, Spikes + Feuds & Truces): more lines for those threads' bosses and
// regulars, added to dialogue.js TALK at install (so the shared file stays
// untouched). Regulars: extra conversations (each an array of lines, cycled
// when Gus talks to them). Bosses: extra `before` / `after` conversations.
// Favour lines are what the regular would ask for; the favours themselves are
// optional and not built yet.

export const TALK_SF = {
  regulars: {
    jay: [['I heckle the crows. They heckle me back. It\'s a whole thing.', 'Want to hear my car chirp? Mimi says it\'s "derivative".']],
    ruby: [['"Now is the winter of our discontent." …It\'s Morning, actually. Still.', 'Mimi steals all the good sounds. I steal all the good LINES.']],
    chip: [['Mimi taught me the phone ring. Works on everybody. Watch a man pat every pocket he owns.', 'Someday I want the cab horn. Mimi says I\'m not ready. I\'m READY.']],
    sprint: [['I\'d race you, but it wouldn\'t be fair. On you.', 'Draft, Gus. Fly with your flock and you go TWICE as long. Coach\'s secret. Don\'t tell Coach I told you.']],
    lapcount: [['I time everything. Your landing just now? Two point one seconds. Sloppy.', 'The wheeled division\'s posted time is soft, between you and me. Coach is generous with wheels.']],
    wheezy: [['Pace… me… round… the Reservoir… someday?', 'Coach says… I have… potential. Slowly.']],
    duke: [['A van on a trough is a violation. Section four. I looked it up.', 'The officer\'s on his break. Fourteen years, one break. By the book.']],
    dapple: [['The Ramble. Real trees. Real woods. Mud! I\'ve only ever seen it from the carriage.', 'Clementine says I\'m too young for the bridle path. I\'m FOUR.']],
    bigben: [['Hup.', '…Hup.'], ['Hup!']],
    moss: [['Zzz… mm? The cart? …Zzz.', 'Wake me… for the truces. Zzz.']],
    shelly: [['The hawk\'s ledge got spiked, did you hear? And the starlings\'. That van man is BUSY.', 'Gertrude and the Commodore haven\'t spoken since 1998. Over a bread roll, dear.']],
    slowpoke: [['I… was… nearly… on time… once.', 'Wait… for… me… at the… truces.']],
    gander: [['The wedge, pigeon. Lowered neck, wings out, honk on three. Nobody holds the line against the wedge.', 'Gertrude gives the order. I give the HISS.']],
    stilts: [['The Pool is quiet. Except for the joggers. One day the geese will deal with them.', 'Stand on one leg, little pigeon. It helps. With everything.']],
    nightcap: [['Dusk is when the Lake\'s edge belongs to me. Nobody looks at the edge of the Lake.', 'The rowboat under Bow Bridge glows at Dusk, did you know? Something electric down there.']],
    rex: [['Did you see that turn? Rhoda didn\'t. Tell her about the turn.', 'Fifth Avenue. Best ledge in the city. When it isn\'t spiked.']],
    pip: [['Rhoda says dive with your eyes OPEN. I keep closing them.', 'One day I\'ll lift something huge. A pretzel. A big one.']],
    knuckles: [['The Meer is Mob turf. You\'re welcome on it now. Mostly.', 'Sal don\'t shake on an empty stomach. Remember that.']],
    tiny: [['I\'m Tiny.', '…Still Tiny.']],
    feathers: [['I count everything. Heads, crumbs, debts. You owe me nothing. Yet.', 'Your swirl\'s getting big, kid. I counted twice.']],
    dove: [['Forty weddings, darling. Not ONE person checked.', 'A dove is just a pigeon with a better agent.'], ['I\'ve been dying to learn a proper dove\'s coo. Coo-OOH-oo. Like a SAD pigeon, darling.', 'Mimi could teach me. If someone asked her nicely.']],
  },
  bosses: {
    mimi: { before: [['I do car chirps, ranger whistles, phones. What I don\'t have is something NEW.']], after: [['Need a human to wander off, sweetie? Point. I\'ll do the rest.', 'Ice cream works on everybody under ten. And most people over ten.']] },
    wingate: { before: [['Always something on our roost. Spikes. Cats. You can\'t train like this.']], after: [['Ten rings any day, rookie. Keep your times honest.', 'Boost with the team behind you. Draft!']] },
    clementine: { before: [['Every Morning that van. Every Morning. A horse has PATIENCE, kid, but not that much.']], after: [['Driver\'s lunch slice is at the Pond carriage stop, kid. I keep it warm-ish.', 'Need a gate kicked? We kick.']] },
    eldest: { before: [['Bubbles… by our rock. Something… sank there. Tuesday.']], after: [['Every truce… on this rock. Bring them… slowly.']] },
    gertrude: { before: [['The Great Lawn has PICNICKERS. Picnickers have BREAD. If only the signs…']], after: [['A human in your way? HONK. A human in the way of a human in your way? HONK HONK.']] },
    rhoda: { before: [['Screee. My ledge. Spiked. And the Meer\'s ducks are SLOW.']], after: [['Lift? Up, across, out of the water. Point, pigeon.']] },
    bigsal: { before: [['The Mob don\'t talk to nobody while that hawk raids us.']], after: [['Too heavy? Say the word, kid. The Mob lifts it.', 'Fourteen of us in your swirl. Act like it.']] },
  },
};

/** Merge the extra lines into the game's TALK table (idempotent). */
let merged = false;
export function mergeTalk(TALK) {
  if (merged) return;
  merged = true;
  for (const [id, convs] of Object.entries(TALK_SF.regulars)) {
    if (!Array.isArray(TALK[id])) TALK[id] = [];
    TALK[id].push(...convs);
  }
  for (const [id, o] of Object.entries(TALK_SF.bosses)) {
    const T = TALK[id]; if (!T || Array.isArray(T)) continue;
    if (o.before) T.before.push(...o.before);
    if (o.after) T.after.push(...o.after);
  }
}
