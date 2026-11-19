// DATA: the five threads (parallel campaigns). Each lane on the Scheme Board
// has a one-line goal, an icon, a meter computed from game state, an
// antagonist (shown in the lane's 5 s intro) and a reward when the meter is full.

export const THREADS = [
  {
    id: 'sign', name: 'The Sign War', goal: 'Make the park feed the birds, for good.', icon: 'sign',
    meter: { label: 'Bread Power', max: 30, of: 'breadPower', extra: { label: 'carts', max: 3, of: 'carts' } },
    antagonist: { name: 'the rangers', portrait: 'ranger', line: 'The rangers fix every sign you flip. Unless their carts stop running.' },
    reward: 'A "FEED THE BIRDS" sash for Gus; the finale\'s bread rain doubles',
  },
  {
    id: 'slice', name: 'The Slice Run', goal: 'Get pizza flowing into the park.', icon: 'slice',
    meter: { label: 'Slice Lines', max: 3, of: 'lines' },
    antagonist: { name: 'Vinnie the hot dog man', portrait: 'vinnie', line: 'Vinnie sells hot dogs on the Mall. He does NOT like pizza.' },
    reward: 'Every Slice Line gives two slices a phase; a pizza-box backpack for Gus',
  },
  {
    id: 'spikes', name: 'Spikes', goal: 'Run the Spike Man out of the park.', icon: 'spike',
    meter: { label: 'Spikes cleared', max: 10, of: 'spikesCleared' },
    antagonist: { name: 'Del Prickett of Prickett Pest-Pro', portrait: 'prickett', line: 'Del Prickett bolts spikes onto every perch pigeons love. Nothing personal. Contract.' },
    reward: 'His cap as a trophy; all 12 Summit Perches pay 5 crumbs a visit',
  },
  {
    id: 'feuds', name: 'Feuds & Truces', goal: 'Make peace, then make plans.', icon: 'truce',
    meter: { label: 'Truces', max: 4, of: 'truces' },
    antagonist: { name: 'the feuds', portrait: null, line: 'Four feuds keep the park divided. Settle them on the Elders\' rock.' },
    reward: 'A peace medal; truce combos everywhere',
  },
  {
    id: 'lost', name: 'The Lost & Found', goal: "Work the crows' market for gear you can't get alone.", icon: 'crowkey',
    meter: { label: 'Deals', max: 6, of: 'deals' },
    antagonist: { name: 'time and place', portrait: null, line: 'Humans lose things everywhere. The crows trade them back, for a fee.' },
    reward: 'A crow-feather bow tie; Vesper gives 3 golden pretzels',
  },
];
export const THREAD = Object.fromEntries(THREADS.map((t) => [t.id, t]));
