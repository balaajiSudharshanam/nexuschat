# #8 — Slack-style threads — side panel + reply count

**Type:** AFK
**Label:** ready-for-agent

## What to build

Any message in the main chat can be replied to. Clicking "Reply" opens a side panel showing the thread. Replies stay out of the main chat scroll. `@llm` works inside threads and receives the thread's message history as additional context.

Every message renders a reply button. Clicking it sets the active thread and opens the `ThreadPanel` alongside the main chat. Thread messages are stored separately (keyed by parent message ID) and broadcast with a `threadId` field so all clients see the same thread state. When `@llm` is used inside a thread, the preceding thread messages are prepended to the system prompt as context. The parent message in the main chat shows a reply count that increments live.

## Acceptance criteria

- [ ] Every message has a "Reply" button; clicking it opens the thread side panel
- [ ] Thread replies appear only in the thread panel, not in the main chat scroll
- [ ] All clients see the same thread content in real time
- [ ] The parent message shows an incrementing reply count visible to all clients
- [ ] Closing the thread panel (✕) returns to full-width chat without data loss
- [ ] `@llm <question>` inside a thread includes the thread's message history as LLM context
- [ ] Multiple threads can exist simultaneously; opening a different thread switches the panel

## Blocked by

- #3 — Plain text group chat
