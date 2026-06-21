# #3 — Plain text group chat (send + broadcast + render)

**Type:** AFK
**Label:** ready-for-agent

## What to build

End-to-end group chat: a developer types a message, presses Enter, and it appears in real time for every connected participant. Chat history is in-memory only and wiped on server restart by design.

Messages that do not start with `@llm` are treated as plain chat. The Message Router on the server broadcasts them to all connected WebSocket clients. The React client renders them in a scrollable message list with sender name and timestamp. The message input supports Shift+Enter for newlines and Enter to send.

## Acceptance criteria

- [ ] Typing a message and pressing Enter sends it to all connected clients instantly
- [ ] Each message displays the sender's username and a timestamp
- [ ] The message list auto-scrolls to the latest message
- [ ] Shift+Enter inserts a newline; Enter sends
- [ ] Messages beginning with `@llm` are not broadcast as plain chat (they are reserved for the LLM pipeline)
- [ ] Refreshing the server wipes all messages (no persistence)
- [ ] Two browser tabs on the same machine can simulate two users for manual testing

## Blocked by

- #2 — Username modal + join/leave flow
