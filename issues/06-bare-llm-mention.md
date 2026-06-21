# #6 — Bare `@llm` mention — stream tokens to all clients

**Type:** AFK
**Label:** ready-for-agent

## What to build

A developer types `@llm <question>` (no document reference) in the chat. The server calls Ollama and streams the response token-by-token via WebSocket so all connected clients watch it appear in real time.

The Message Router detects the `@llm` prefix and routes to the LLM pipeline instead of broadcasting as a plain message. With no uploaded documents the RAG step returns empty context. The server opens a streaming request to Ollama's `/api/chat` endpoint, broadcasts `llm_token` events for each chunk, and a final `llm_done` event. The React client renders an LLM message bubble that grows token-by-token. A browser notification fires when `llm_done` is received and the tab is in the background.

## Acceptance criteria

- [ ] `@llm <question>` triggers an LLM response; no plain chat message appears in the room
- [ ] The response streams token-by-token and is visible live to all connected clients
- [ ] The LLM bubble is visually distinct from human messages (different style + `@llm` label)
- [ ] Streaming continues correctly even when multiple clients are connected simultaneously
- [ ] A browser desktop notification fires when streaming completes and the tab is backgrounded
- [ ] The configured `MODEL` env var determines which Ollama model is used
- [ ] If Ollama is unreachable, an error message appears in the chat instead of hanging

## Blocked by

- #3 — Plain text group chat
