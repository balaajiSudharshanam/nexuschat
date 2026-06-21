# #2 — Username modal + join/leave flow

**Type:** AFK
**Label:** ready-for-agent

## What to build

Let a developer open the app, pick a display name, and appear as online for everyone in the room. When they close the tab they disappear.

On first visit the app shows a modal prompting for a display name. Submitting sends a `join` WebSocket message. The chosen name is persisted in `localStorage` so return visits skip the modal and rejoin immediately. All connected clients see a live online user list that updates when anyone joins or leaves.

## Acceptance criteria

- [ ] First-time visitors see a username modal before any chat UI is shown
- [ ] Submitting the modal sends a `{ type: "join", username }` WebSocket message and dismisses the modal
- [ ] The chosen username is written to `localStorage` and pre-fills on return visits
- [ ] All connected clients receive a `join` event and the new user appears in the sidebar user list
- [ ] Closing the tab triggers a `leave` event; the user is removed from all other clients' user lists
- [ ] The `(you)` label is shown next to the current user's name in the list

## Blocked by

- #1 — Server bootstrap
