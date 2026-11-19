// Autopilot extensions (debug only). Each handler is (pilot, goal, s, out, dt) →
// true (goal done) | false (keep going) | undefined (not my goal). Handlers
// only press inputs (out.held, out.stick), never move Gus. Registered by
// pilot-3a.js (talents, market, collectibles, race, stealth), pilot-drive.js
// (driving, the Zamboni) and pilot-fights.js (the four fights).
export const PILOT_EXT = [];
export const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));
