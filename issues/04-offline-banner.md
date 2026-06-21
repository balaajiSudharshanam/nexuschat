# #4 — Host offline banner + exponential backoff + take-over button

**Type:** AFK
**Label:** ready-for-agent

## What to build

When the leader's server goes down, every connected client shows a clear "Host offline" banner and silently retries reconnection. A "Take over as leader" button tells a developer how to promote their machine.

The client detects the WebSocket `close` event and immediately shows the banner. It retries connection with exponential backoff (starting at 1 s, doubling each attempt, capped at 16 s). When the server comes back the client reconnects automatically, the banner disappears, and the user rejoins with their stored username. The "Take over as leader" button shows a prompt explaining how to run the server locally.

## Acceptance criteria

- [ ] Stopping the server causes all connected clients to show an "Host offline" banner within 1–2 s
- [ ] The client retries connection automatically with exponential backoff (1 s → 2 s → 4 s → … → 16 s max)
- [ ] When the server restarts, clients reconnect and the banner disappears without a page refresh
- [ ] After reconnect the user is automatically rejoined with their `localStorage` username
- [ ] The "Take over as leader" button displays clear instructions for starting the server locally
- [ ] The banner does not appear on initial page load before the first connection attempt completes

## Blocked by

- #1 — Server bootstrap
