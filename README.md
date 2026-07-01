# Nexus

A local-first AI chat application that lets you upload PDF documents and query them using natural language via a WebSocket-powered chat interface. All inference runs locally through [Ollama](https://ollama.com) — no data leaves your machine.

---

## Features

- Real-time chat over WebSocket with threaded replies
- Custom AI Agents with per-agent instructions, pinned document scoping, and enabled tools
- Human-in-the-loop Runtime Approval before any agent tool executes
- Agent management UI — create, edit, and delete Agents from the sidebar
- PDF ingestion with automatic chunking and vector embedding
- Hybrid retrieval: vector search (Vectra) + BM25 keyword search merged with Reciprocal Rank Fusion (RRF)
- LLM-based relevance grading before results reach the model
- Conversational fallback — simple messages skip RAG entirely
- Document-grounded answers with source attribution
- Drag-and-drop PDF upload
- Local network discovery via Bonjour/mDNS
- QR code for mobile access

---

## Architecture

```
client (React + Vite)
  └── WebSocket ──► server (Express + ws)
                        ├── router.js        — message routing, @llm / agent detection
                        ├── llm/ollama.js    — RAG orchestration, streaming
                        ├── agents/
                        │   ├── engine.js    — agent turn runner, tool-call tag parsing
                        │   ├── store.js     — agent definition persistence (JSON)
                        │   └── tools/       — scraper, pdfMaker, excel
                        └── rag/
                            ├── ingest.js    — PDF parsing, chunking, embedding
                            ├── store.js     — Vectra vector index + BM25 text store
                            ├── retrieval.js — hybrid search (vector + BM25 + RRF)
                            ├── query.js     — per-document search and grading loop
                            ├── grader.js    — LLM confidence scoring (1–5 scale)
                            └── validateResults.js — post-grade validation (disabled)
```

---

## Prerequisites

- [Node.js](https://nodejs.org) v18+
- [Ollama](https://ollama.com) running locally

Pull the required models:

```bash
ollama pull gemma3:1b
ollama pull nomic-embed-text
```

---

## Setup

```bash
# Install server dependencies
cd server && npm install

# Install client dependencies
cd ../client && npm install
```

Create `server/.env`:

```env
MODEL=gemma3:1b
EMBED_MODEL=nomic-embed-text
SERVER_PORT=3000
BONJOUR_NAME=nexus
DATA_DIR=./data
OLLAMA_BASE_URL=http://localhost:11434
```

---

## Running

```bash
# Terminal 1 — server
cd server && npm start

# Terminal 2 — client (dev)
cd client && npm run dev
```

Open `http://localhost:5173` in your browser.

---

## Usage

### Chat
Type any message in the input box to chat with other users on the local network.

### Query the LLM
Prefix your message with `@llm`:

```
@llm what is the notice period in the tenancy agreement?
```

### Query a specific document
```
@llm /doc:resume.pdf what is the candidate's experience?
```

### Upload a PDF
Drag and drop a PDF onto the chat window, or use the upload button in the sidebar. Documents are automatically chunked, embedded, and indexed.

### Agents

Custom AI Agents appear in the sidebar under **Agents**. Click an agent name to open a private Agent Session in the main panel.

**Create an Agent** — click `+ New Agent` in the sidebar and fill in:
- **Name** (required) — display name shown in the sidebar
- **Description** (optional) — short tagline shown on hover
- **Instructions** (required) — system prompt that defines the agent's behaviour
- **Pinned Documents** — restrict retrieval to specific uploaded documents; leave blank to search all
- **Enabled Tools** — tools the agent may invoke: web scraper, PDF maker, Excel manipulator

**Tool approval** — when the agent decides to call a tool, the session pauses and asks you to approve or deny before the tool executes.

---

## Retrieval Pipeline

Each `@llm` query (that isn't conversational) goes through:

1. **Hybrid search** per document
   - Vector search via Vectra (cosine similarity, threshold 0.6)
   - BM25 keyword search (threshold 2.0)
   - RRF merge of both ranked lists

2. **LLM grading** — each retrieved chunk is scored 1–5 by the model:
   - `1` = completely irrelevant / unrelated to the question
   - `2` = tangentially related but not useful
   - `3` = somewhat related but missing key details
   - `4` = directly answers the question
   - `5` = perfectly directly answers the question
   - Chunks scoring below `CONFIDENCE_THRESHOLD` (default: `2`) are rejected

3. **Context assembly** — surviving chunks are labelled with their source document and injected into the system prompt

4. **Streaming response** — the model streams tokens back to all connected clients with source attribution shown below the answer

If no chunks pass grading and no `/doc:` was specified, the model answers conversationally from its own knowledge.

---

## API

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/upload` | Upload a PDF (`multipart/form-data`, field: `file`) |
| `GET` | `/api/docs` | List all ingested documents |
| `DELETE` | `/api/docs/:docName` | Delete a single document |
| `DELETE` | `/api/docs` | Delete all documents and clear chat history |
| `GET` | `/api/agents` | List all Agent Definitions |
| `POST` | `/api/agents` | Create an Agent Definition (body: `name`, `description`, `instructions`, `pinnedDocs[]`, `enabledTools[]`) |
| `PUT` | `/api/agents/:id` | Update an Agent Definition |
| `DELETE` | `/api/agents/:id` | Delete an Agent Definition |
| `GET` | `/api/agents/tools` | List available Tools |

---

## Configuration

| Variable | Default | Description |
|---|---|---|
| `MODEL` | `gemma3:1b` | Ollama chat model |
| `EMBED_MODEL` | `nomic-embed-text` | Ollama embedding model |
| `SERVER_PORT` | `3000` | HTTP/WebSocket port |
| `DATA_DIR` | `./data` | Vector index and text chunk storage |
| `OLLAMA_BASE_URL` | `http://localhost:11434` | Ollama API base URL |
| `BONJOUR_NAME` | `nexus` | mDNS service name for local discovery |

---

## Project Structure

```
nexus/
├── server/
│   ├── src/
│   │   ├── index.js              — entry point, startup, loadDocs()
│   │   ├── app.js                — Express app and route mounting
│   │   ├── config.js             — environment config
│   │   ├── llm/
│   │   │   └── ollama.js         — LLM handler, embed(), isConversational()
│   │   ├── rag/
│   │   │   ├── ingest.js         — PDF → chunks → embeddings
│   │   │   ├── store.js          — Vectra index + text persistence (texts.json)
│   │   │   ├── retrieval.js      — hybrid search, RRF merge
│   │   │   ├── query.js          — queryRag() per-document orchestrator
│   │   │   ├── grader.js         — LLM confidence scoring with retry
│   │   │   ├── bm25.js           — BM25 implementation
│   │   │   └── validateResults.js — off-topic and cross-doc validation
│   │   ├── agents/
│   │   │   ├── engine.js         — agent turn runner, tool-call tag parsing, streaming
│   │   │   ├── store.js          — agent definition persistence (agents.json)
│   │   │   └── tools/
│   │   │       ├── index.js      — tool registry (executeTool, listTools)
│   │   │       ├── scraper.js    — web page scraper
│   │   │       ├── pdfMaker.js   — PDF generation
│   │   │       └── excel.js      — Excel file manipulation
│   │   ├── routes/
│   │   │   ├── upload.js         — PDF upload endpoint
│   │   │   ├── docs.js           — document management endpoints
│   │   │   └── agents.js         — agent CRUD + tools list endpoints
│   │   ├── ws/
│   │   │   ├── server.js         — WebSocket server and broadcast
│   │   │   ├── router.js         — message routing, @llm parsing
│   │   │   └── history.js        — conversation memory (last 30 turns)
│   │   └── discovery/
│   │       └── announce.js       — Bonjour/mDNS local discovery
│   └── data/                     — one subdirectory per document
│       └── <docName>/
│           ├── index.json        — Vectra vector index
│           └── texts.json        — plain text chunks for BM25
└── client/
    └── src/
        ├── components/
        │   ├── Chat/             — ChatRoom, MessageList, MessageInput, Message
        │   ├── Thread/           — ThreadPanel (threaded replies)
        │   ├── Agents/           — AgentList, AgentPanel, AgentForm, AgentMessage
        │   └── Sidebar/          — UserList, DocList, AgentList
        ├── hooks/
        │   ├── useWebSocket.js   — WS connection, message dispatch
        │   └── useNotifications.js
        └── store/
            └── chatStore.jsx     — React context: messages, threads, users, docs
```

---

## Development

```bash
# Server tests (Jest)
cd server && npm test

# Client tests (Vitest)
cd client && npm test
```

Logs are prefixed by pipeline stage for easy filtering:

```bash
npm start 2>&1 | grep "\[RETRIEVAL\]"   # retrieval decisions
npm start 2>&1 | grep "\[GRADER\]"      # per-chunk scores
npm start 2>&1 | grep "\[INGEST\]"      # ingestion progress
npm start 2>&1 | grep "\[STORE\]"       # index reads/writes
```

---

## Changelog

### [feat] Agent system — 2026-07-01

**What:** Adds named AI Agents with configurable instructions, document scoping, tool access, and a human-in-the-loop approval flow.
**Why:** Participants needed private, purpose-built assistants alongside the shared Room without adding noise to the group chat.
**How:** Added an `agents/` server module (engine, store, tools) and a `/api/agents` REST API. The client gained an `Agents/` component tree and new state in `chatStore`. Agent sessions run over the existing WebSocket using five new message types (`agent_token`, `agent_approval_request`, `agent_tool_result`, `agent_done`, `agent_error`). The `handleDisconnect` function was made parameter-injectable to keep the WebSocket server unit-testable.
