During a long gamegen build (3D, several builder/reviewer/fixer agents running for hours each), a fixer subagent finished a long replay batch in a background task and then never resumed: it had ended its turn "waiting on task X", and the completion notice never woke it. It sat idle for 7+ hours. The coordinator (the main session) didn't notice either. It only checks when a notification arrives, and a stalled agent sends none. Earlier in the same run, other agents were also left "waiting on background work" for long stretches, and the user had to ask "is it going well?" to surface it.

The skill's guidance on dispatching agents (Phases 5–8) says what to brief them with, but nothing about **supervising** them.

## Suggested guidance
1. **The coordinator owns liveness.** For every long-running subagent, watch for stalls instead of waiting passively for its report. For example, start a background watchdog that exits (and so notifies the coordinator) when the agent's transcript or output hasn't changed for N minutes (~30–40). When it fires, check the agent's last steps and its processes, then nudge it (SendMessage) or restart the step.
2. **Subagents shouldn't park on background tasks for long work.** Poll long jobs in the foreground in bounded chunks (≤10 min), or make sure a background wait is short. Never end a turn "waiting" with no guarantee of a wake-up.
3. **Progress files.** Briefs should ask each long-running agent to keep a progress file (done / doing / next) on disk, under the project and not /tmp, so the coordinator can check status cheaply and anything survives a crash or restart.
4. **Status updates report movement, not presence.** When the user asks how it's going, say what changed since the last check (e.g. "21 → 37 replays") and how long the agent has been quiet. "Still running" is not enough.
5. **Report time relative to now** ("7 hours ago"), since the container clock or timezone may not match the user's.

Seen with gamegen 2026.11.13.5 (`--continue --publish --no-confirm`, many parallel and sequential agents, multiple container restarts).
