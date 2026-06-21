# PRD: Nexus — Local LLM Chat for Developer Teams

## Problem Statement

Developer teams working in the same physical space or LAN have no lightweight, private way to communicate and collaborate with AI together. Corporate tools like Microsoft Teams and Slack are monitored, cloud-dependent, and don't support local LLMs. Developers want a fast, ephemeral, anonymous group chat that integrates a local LLM and lets them discuss shared documents — without leaving their network.

## Solution

Nexus is a self-hosted LAN chat application built for developers. Any machine on the network opens a browser, picks a username, and joins a shared chat room. The group can invoke a locally-running Ollama model with `@llm`, discuss uploaded PDFs by referencing them directly in mentions, and branch conversations into Slack-style threads. One machine acts as the leader (host); if it goes offline, any participant can manually take over leadership. Every participant has Node.js installed; only the leader needs Ollama.

## User Stories

### Joining & Identity
1. As a developer, I want to open the app URL in my browser and be prompted for a display name, so that I can join the chat without creating an account.
2. As a developer, I want my chosen display name to be remembered in my browser across sessions, so that I don't have to type it every time.
3. As a developer, I want to see a list of who is currently in the room, so that I know who is online.
4. As a developer, I want to see a join/leave notification when someone enters or exits, so that I'm aware of who is present.

### LAN Discovery & Host Setup
5. As a leader, I want the server to print a QR code and plain URL in the terminal on startup, so that others can join without asking for my IP.
6. As a leader, I want the host to be reachable at a human-readable mDNS hostname (e.g. `nexus.local`), so that participants can bookmark it.
7. As a developer, I want the server port and mDNS name to be configurable via environment variables, so that the leader can adapt to their network setup.

### Group Chat
8. As a developer, I want to send messages to the shared chat room and see them appear in real time for everyone, so that we can communicate without a third-party tool.
9. As a developer, I want messages to show the sender's display name and timestamp, so that I can follow the conversation.
10. As a developer, I want to receive a browser desktop notification when a new message arrives while the tab is in the background, so that I don't miss messages.
11. As a developer, I want the chat history to be ephemeral — wiped when the server restarts — so that conversations don't accumulate and privacy is maintained.

### LLM Mentions
12. As a developer, I want to type `@llm <question>` in the chat and have the response stream live for everyone to read, so that the whole team benefits from the answer simultaneously.
13. As a developer, I want to receive a browser notification when an `@llm` response finishes streaming, so that I know when to read the result.
14. As a developer, I want the active Ollama model to be fixed by the leader via a `MODEL` environment variable, so that everyone uses the same model without in-app configuration.
15. As a developer, I want the LLM response to appear inline in the chat attributed to a bot/LLM label, so that AI responses are visually distinct from human messages.

### PDF Upload & RAG
16. As a developer, I want to drag and drop a PDF into the chat window to upload it, so that the team can start discussing it immediately.
17. As a developer, I want a document sidebar that lists all uploaded PDFs, so that I can see what documents are available and manage them.
18. As a developer, I want to upload a PDF via a button in the sidebar in addition to drag-and-drop, so that I have a clear fallback upload path.
19. As a developer, I want to type `@llm /doc:filename <question>` to query a specific uploaded PDF, so that the LLM answers from that document's context rather than mixing all documents together.
20. As a developer, I want the UI to autocomplete available document names after I type `/doc:`, so that I don't have to remember exact filenames.
21. As a developer, I want `@llm <question>` (without a `/doc:` flag) to search across all uploaded documents, so that I can query the full knowledge base when I don't care about a specific file.
22. As a developer, I want PDF embeddings to survive server restarts, so that I don't have to re-upload documents every time the leader reboots the server.
23. As a developer, I want to remove a document from the sidebar, so that stale or irrelevant PDFs don't pollute future `@llm` queries.
24. As a developer, I want to see in the chat when someone uploads a new PDF (e.g. "Alice uploaded report.pdf"), so that everyone knows what documents are available.

### Threads
25. As a developer, I want to start a thread on any message by clicking a reply icon, so that I can have a focused sub-conversation without polluting the main chat.
26. As a developer, I want threads to open in a side panel, so that I can read the thread and the main chat simultaneously.
27. As a developer, I want the parent message to show a reply count and the avatars of participants, so that I can see at a glance which messages have active threads.
28. As a developer, I want to use `@llm` inside a thread, so that I can have a focused AI conversation branching off a specific point in the main discussion.
29. As a developer, I want the thread's message history to be passed as context when I use `@llm` inside it, so that the LLM understands what the thread is about.
30. As a developer, I want thread replies to not appear in the main chat scroll, so that the main room stays readable.

### Leader Election & Resilience
31. As a developer, I want every team member to be able to run the app on their own machine, so that anyone can become the leader if needed.
32. As a developer, I want to see a clear "Host offline" banner when the leader's server goes down, so that I know the disconnection is not my network.
33. As a developer, I want the client to automatically retry connecting to the leader with exponential backoff, so that I reconnect without manually refreshing.
34. As a developer, I want a "Take over as leader" button to appear when the host goes offline, so that I can promote my machine to leader without any CLI steps.
35. As a developer, I want PDF embeddings to be preserved when I take over as leader (since they are file-based), so that the document knowledge base is not lost on failover.
36. As a leader, I want the server to start up with a single `npm start` command, so that taking over leadership is fast and frictionless.

## Implementation Decisions

### Architecture
- **Single active leader at any time.** One Node.js process acts as the WebSocket server and Ollama proxy. All other participants are browser clients. Any machine can become the leader; only the leader needs Ollama running.
- **No persistent chat state.** Chat messages live in-memory on the leader. Server restart wipes history by design.
- **PDF embeddings are file-based.** Vectra stores embedding files on disk. These persist across server restarts and survive leader handoff if the new leader runs from the same machine (or the files are copied).

### Real-time Transport
- **WebSocket (`ws` package)** for all real-time communication: chat messages, join/leave events, `@llm` token streaming, thread replies, and system events (host offline, new document uploaded).
- LLM token streaming: Ollama streams chunks to the leader's Node.js process → leader broadcasts each chunk via WebSocket to all connected clients → React appends tokens to the message in real-time.

### LLM Mention Parsing
- The Message Router is the central dispatch point. It inspects each incoming WebSocket message for an `@llm` prefix.
- If `@llm` is detected: extract optional `/doc:filename`, build RAG context, call Ollama, stream response back.
- If no `@llm`: broadcast message to all connected clients as-is.
- Thread context (preceding thread messages) is prepended to the LLM prompt when `@llm` is used inside a thread.

### RAG Pipeline
- **Embedding model**: `nomic-embed-text` via Ollama's `/api/embed` endpoint.
- **Vector store**: Vectra (file-based, Node.js-native). One Vectra index per uploaded document.
- **Chunking**: Fixed-size chunks (~500 tokens) with overlap.
- **Query flow**: Embed the user's question → cosine-similarity search in Vectra → inject top-k chunks as system context → call Ollama chat model.
- **Document scoping**: `/doc:filename` limits the search to that document's Vectra index. No flag searches all indexes.

### PDF Ingestion
- Upload accepted via multipart form POST (drag-and-drop and sidebar button both POST to the same endpoint).
- `pdf-parse` extracts raw text from the PDF buffer.
- Text is chunked, embedded via Ollama, and stored in Vectra. A metadata entry records the document name and upload timestamp.

### Leader Discovery & mDNS
- `bonjour` npm package registers the leader as `nexus.local` (or configurable name) on startup.
- On startup, the terminal also prints the raw LAN IP and a QR code (`qrcode-terminal`) encoding `http://<ip>:<port>`.
- Clients attempt mDNS resolution first; raw IP is the fallback.

### Leader Failover
- Clients detect leader loss via WebSocket `close` event.
- Client shows "Host offline" banner and begins exponential backoff reconnection attempts.
- A "Take over as leader" button appears. Clicking it runs the leader startup script on the local machine (requires the user to have the app installed).

### Notifications
- Browser Notification API (no service worker required for LAN HTTP).
- Triggers: new message received while tab is backgrounded, `@llm` response stream complete.
- Permission is requested on first join.

### Configuration (environment variables)
```
MODEL=llama3.2
SERVER_PORT=3000
BONJOUR_NAME=nexus
```

## Testing Decisions

### What makes a good test
Tests should assert external behavior — what comes out of a module given a specific input — not implementation details like which internal functions were called or how Vectra stores data internally. Mock only at system boundaries (Ollama HTTP calls, disk I/O).

### Modules to test

**Message Router**
The highest testable seam. Given a raw incoming WebSocket message payload, assert the correct output: broadcast payload for plain messages, structured RAG + LLM dispatch for `@llm` messages, correct `/doc:` extraction, thread context inclusion. No live WebSocket needed — test the pure routing function.

**RAG Query Pipeline**
Given a query string and optional document name, assert that the correct chunks are returned. Test document scoping (results only from the named document) and fallback-to-all behavior. Mock the Ollama embedding call to return deterministic vectors; use a real in-memory Vectra index.

**PDF Ingestion Pipeline**
Given a PDF buffer, assert that the correct number of chunks are stored in Vectra with the right metadata. Mock Ollama's `/api/embed`. Verify that chunk sizes and overlap behave as configured.

**Leader Election State**
Given a sequence of WebSocket connect/disconnect events, assert the correct client-side state transitions: connected → host-offline banner visible → reconnecting → reconnected or "take over" button visible.

### Prior art
No existing tests in the codebase. These will be the first tests written. Jest + supertest for HTTP/WebSocket integration; Vitest for React component behavior.

## Out of Scope

- Multiple chat rooms (deferred to v2)
- Per-user Ollama model selection
- HTTPS / TLS
- Authentication or access control beyond trusting the LAN
- Automatic leader election (replaced by manual promotion)
- Message persistence or chat history export
- Mobile-optimised UI
- Support for document formats other than PDF

## Further Notes

- The `nomic-embed-text` model must be pulled separately from the chat model: `ollama pull nomic-embed-text`. This should be surfaced prominently in the setup README.
- The app is explicitly targeting developers — it is acceptable to require Node.js on every participant's machine and to expose setup steps via CLI.
- Vectra embedding files are not automatically synced when a new leader takes over on a different machine. For now this is acceptable; a future improvement could be to serve the Vectra index files over HTTP so the new leader can pull them.
- The anonymous, ephemeral nature of the chat is a feature, not a gap — it is the primary differentiator from Teams/Slack.
