// #24: fleeing (or wary) animals sometimes let slip who runs their crew, and where and when to find them, in their own
// voice. Hearing one marks a soft region on the map ("Night Crew: North Woods, after dark"): never a pin; finding the
// boss inside it stays the player's job. The region is the crew's haunt (crews.js `haunt` → layout.js PLACES).
// Pure data (no imports).

export const LEAD_HINTS = {
  squirrels: { when: 'by day', lines: ['Hazel runs the Syndicate. Sheep Meadow, by day. You didn\'t hear it from me.', 'Talk to Hazel, not me! Sheep Meadow! She keeps the books!'] },
  ducks: { when: 'by day', lines: ['Ask the Commodore. He keeps the Lake, by day. Quack. Respectfully.', 'Puddles runs this water, pal. The Lake. Daytime. Now scram.'] },
  crows: { when: 'by day', lines: ['Vesper does the deals. The Ramble, by day. Bring something shiny.', 'Not my department. Vesper. The Ramble. Business hours.'] },
  turtles: { when: '', lines: ['Slow down… go see… the Eldest… Turtle Pond…', 'The Eldest… on the big rock… Turtle Pond… any hour… we\'re not going anywhere…'] },
  biscuit: { when: 'by day', lines: ['BISCUIT\'S the boss! Cedar Hill! Daytime! He had a BALL!', 'Ask Biscuit! Cedar Hill! By day! Byeee!'] },
  strix: { when: 'at night', lines: ['Who? The Professor. The Ramble, at night. Who else.', 'Professor Strix holds class in the Ramble. Nights only. Do your reading.'] },
  raccoons: { when: 'after dark', lines: ['Rigby? Union boss. North Woods, after dark. Didn\'t hear it from me.', 'Night shift\'s Rigby\'s. North Woods. Come back when the lamps are on.'] },
  choir: { when: '', lines: ['The Maestro conducts at Bethesda Terrace! Any hour! Mi-mi-mi!', 'Vibrato. Bethesda Terrace. He\'ll want you to sing first.'] },
  racers: { when: '', lines: ['Coach Wingate. The Reservoir track. Any time, he never stops.', 'Ask Coach! Reservoir! Lap three, can\'t talk!'] },
  rats: { when: '', lines: ['Sue runs the tracks. The Columbus Circle grate. She never sleeps.', 'Subway Sue. Columbus Circle. Mind the gap.'] },
  rhoda: { when: 'by day', lines: ['Rhoda nests up on Walter\'s building, Fifth and 74th. By day. Mind the talons.', 'The hawk on Fifth and 74th runs the sky round here. Daytime. Say please.'] },
  meermob: { when: '', lines: ['Big Sal don\'t like visitors. Harlem Meer. Any hour. You didn\'t get it from me.', 'You want the Mob? Big Sal. Up at the Meer. Ask nice.'] },
  cats: { when: '', lines: ['Queenie holds court at the bodega, 110th and Lenox. Any hour. Bring tribute.', 'Ask Queenie. 110th and Lenox. She\'s on the counter. Always.'] },
  horses: { when: 'by day', lines: ['Clementine leads the line. The carriage line on Central Park South, by day.', 'Talk to Clementine, sugar. Central Park South, by day. Front of the line.'] },
  songbirds: { when: 'by day', lines: ['Mimi! The natural history museum, CPW and 79th! By day! *car alarm*', 'Talk to Mimi at the museum, by day. She does a great you.'] },
  geese: { when: 'by day', lines: ['HONK. Gertrude. The Great Lawn. Daytime. HONK.', 'Boss goose is Gertrude. Great Lawn, by day. Don\'t walk on the grass.'] },
};
