# #9 — Browser notifications — new message + `@llm` done

**Type:** AFK
**Label:** ready-for-agent

## What to build

Developers working in other tabs are notified when a new message arrives or when an `@llm` response finishes streaming.

On first join the app requests `Notification` permission via the browser API. When a plain chat message arrives and the tab is not visible, a desktop notification fires with the sender name and message preview. When an `@llm` stream completes (`llm_done` event) and the tab is not visible, a notification fires with "LLM response ready". Notifications are suppressed when the tab is the active foreground tab.

## Acceptance criteria

- [ ] The browser notification permission prompt fires once on first join
- [ ] A desktop notification appears for each new chat message when the tab is backgrounded
- [ ] A desktop notification appears when `@llm` streaming completes and the tab is backgrounded
- [ ] No notifications fire when the tab is in the foreground
- [ ] If permission is denied, the app works normally with no errors

## Blocked by

- #3 — Plain text group chat
- #6 — Bare `@llm` mention
