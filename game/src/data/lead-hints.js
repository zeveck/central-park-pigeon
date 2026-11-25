// #24: fleeing (or wary) animals sometimes let slip who runs their crew, and where and when to find them, in their own
// voice. Hearing one marks a soft region on the map ("Night Crew: North Woods, after dark"): never a pin; finding the
// boss inside it stays the player's job. The region is `place` if given, else the crew's haunt (crews.js `haunt` →
// layout.js PLACES); `place` where the boss isn't at the haunt (Gertrude, Rhoda, Big Sal).
// Pure data (no imports).

export const LEAD_HINTS = {
  squirrels: { when: 'by day', lines: ['Hazel runs the Syndicate. Sheep Meadow, by day. You didn\'t hear it from me.', 'Talk to Hazel, not me! Sheep Meadow! She\'s the boss! Ask her where she put it!'] },
  ducks: { when: 'by day', lines: ['Ask the Commodore. He keeps the Lake, by day. Quack. Respectfully.', 'Puddles runs the Lake, pal. By Bow Bridge. Daytime. Now scram.'] },
  crows: { when: 'by day', lines: ['Vesper does the deals. The Ramble, by day. Bring something shiny.', 'Not my department. Vesper. The Ramble. Business hours.'] },
  turtles: { when: 'by day', lines: ['Slow down… go see… the Eldest… Turtle Pond…', 'The Eldest… on the big rock… Turtle Pond… we\'re not going anywhere…'] },
  biscuit: { when: 'by day', lines: ['BISCUIT\'S the boss! Cedar Hill! Daytime! He lost his BALL!', 'Ask Biscuit! Cedar Hill! By day! Byeee!'] },
  strix: { when: 'at night', lines: ['Who? The Professor. The Ramble, at night. Who else.', 'Professor Strix holds class in the Ramble. Nights only. Do your reading.'] },
  raccoons: { when: 'from dusk', lines: ['Rigby? Union boss. North Woods, after dark. Didn\'t hear it from me.', 'Night shift\'s Rigby\'s. North Woods. Come back when the lamps are on.'] },
  choir: { when: 'by day', lines: ['The Maestro conducts at Bethesda Terrace! Mi-mi-mi!', 'Vibrato. Bethesda Terrace. He wants an audience that STAYS, darling.'] },
  racers: { when: 'by day', lines: ['Coach Wingate. The Reservoir, by the south gatehouse. By day. Somebody messed with their roost.', 'Ask Coach! South gatehouse! Lap three, can\'t talk!'] },
  rats: { when: '', lines: ['Sue runs the tracks. The Columbus Circle grate. She never sleeps.', 'Subway Sue. Columbus Circle grate. Stand clear of the closing doors.'] },
  rhoda: { place: 'meer', when: 'by day', lines: ['Rhoda? Her ledge on Fifth got spiked. She hunts over Harlem Meer now. Mind the talons.', 'The boss hawk raids the Meer by day. Screee. Not my business.'] },
  meermob: { place: 'blockhouse', when: '', lines: ['Big Sal. The old Blockhouse, west of the Meer. You didn\'t get it from me.', 'You want the Mob? Big Sal. Up at the Blockhouse. Ask nice.'] },
  cats: { when: '', lines: ['Queenie holds court at the bodega, 110th and Lenox. Any hour. Bring tribute.', 'Ask Queenie. 110th and Lenox. She\'s on the step out front. Always.'] },
  horses: { when: 'by day', lines: ['Clementine leads the line. The carriage line on Central Park South, by day.', 'Talk to Clementine, sugar. Central Park South. Front of the line, by day.'] },
  songbirds: { when: 'by day', lines: ['Mimi! The natural history museum, CPW and 79th! By day! *bwip-bwip*', 'Talk to Mimi at the museum, by day. She does a great you.'] },
  geese: { place: 'bow-bridge', when: 'by day', lines: ['HONK. Gertrude. The Lake, by Bow Bridge. Daytime. HONK.', 'Boss goose is Gertrude. Bow Bridge, by day. GOOSE TERRITORY.'] },
};
