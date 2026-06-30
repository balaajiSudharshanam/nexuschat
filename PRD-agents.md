# PRD: AI Agents — private, instruction-driven assistants with RAG and tool access

## Problem Statement

Participants in Nexus can only invoke the LLM via `@llm` in the Room, which is a shared, one-size-fits-all interaction. There is no way to create a focused, private AI assistant tuned to a specific role, set of documents, or set of capabilities. Every `@llm` query hits the same model with the same blank context, and every response is visible to the whole Room — making it unsuitable for individual, task-specific AI work.

## Solution

Allow Participants to create named Agents with custom instructions, Pinned Documents, and enabled Tools. Agents live in a dedicated panel separate from the Room. Each Participant opens a private, ephemeral Agent Session with any shared Agent and converses with it one-on-one. Agents can search their Pinned Documents via the RAG Pipeline and invoke Tools (web scraper, PDF maker, Excel manipulator) with Runtime Approval from the Participant before each execution.

## User Stories

### Browsing & Managing Agents

1. As a Participant, I want to open an Agents panel from the main UI, so that I can see all available Agents without leaving the app.
2. As a Participant, I want to see each Agent's name and description in the panel, so that I can understand what each Agent is for before opening it.
3. As a Participant, I want to create a new Agent by filling in a form (name, description, instructions, pinned documents, enabled tools), so that I can define a focused assistant for a specific task.
4. As a Participant, I want to edit an existing Agent's definition, so that I can refine its instructions or change its document scope after testing it.
5. As a Participant, I want to delete an Agent, so that stale or unused Agents do not clutter the panel.
6. As a Participant, I want Agent Definitions to persist across Host restarts, so that Agents I create are not lost when the server reboots.
7. As a Participant, I want all Agents to be visible to every Participant on the LAN, so that the team shares a single set of curated assistants.

### Agent Sessions

8. As a Participant, I want to open a private chat with any Agent by clicking it in the panel, so that I can converse with it without the conversation appearing in the Room.
9. As a Participant, I want my Agent Session to have its own message history, so that the Agent remembers what I said earlier in the same session.
10. As a Participant, I want the Agent to use its custom instructions as its persona and behavior, so that it behaves differently from the generic `@llm` assistant.
11. As a Participant, I want LLM responses to stream token-by-token in the Agent Session, so that I see the answer appearing live rather than waiting for the full response.
12. As a Participant, I want my Agent Session history to be wiped when I close or disconnect, so that conversations remain ephemeral and private.
13. As a Participant, I want to be able to run multiple Agents in separate sessions simultaneously, so that I can use a code-review Agent and a document-summary Agent at the same time.

### RAG Access

14. As a Participant, I want an Agent to search its Pinned Documents when answering my question, so that its answers are grounded in specific uploaded material.
15. As a Participant, I want an Agent with no Pinned Documents to search across all uploaded Documents, so that a general-purpose Agent still has access to the full knowledge base.
16. As an Agent creator, I want to pin specific Documents to an Agent at creation time, so that a focused Agent does not accidentally answer from unrelated Documents.
17. As a Participant, I want the Agent to cite which Document its answer came from, so that I can verify the source.

### Tools & Runtime Approval

18. As a Participant, I want an Agent to be able to scrape a web page when relevant to my query, so that it can answer questions about live web content.
19. As a Participant, I want an Agent to be able to generate a PDF from content it produces, so that I can download a formatted output directly from the chat.
20. As a Participant, I want an Agent to be able to create or manipulate an Excel file, so that I can get structured tabular output without leaving the app.
21. As a Participant, I want the Agent to pause and ask for my approval before executing any Tool, so that no Tool runs without my explicit consent.
22. As a Participant, I want the approval request to show me which Tool the Agent wants to run and what arguments it will use, so that I can make an informed decision.
23. As a Participant, I want to deny a Tool execution and have the Agent continue without it, so that I retain control over what actions the Agent takes.
24. As a Participant, I want the Agent Session to show me the Tool result after an approved execution, so that I can see what data was retrieved or created.
25. As an Agent creator, I want to select which Tools are enabled for a given Agent at creation time, so that a document-summary Agent cannot scrape the web unless I explicitly allow it.

### Agent Definition Form

26. As a Participant, I want a text area for writing the Agent's system instructions, so that I can give the Agent a detailed persona and task description.
27. As a Participant, I want a multi-select of uploaded Documents to pin to the Agent, so that I can scope the Agent's RAG access precisely.
28. As a Participant, I want a checklist of available Tools to enable for the Agent, so that I can grant only the capabilities the Agent needs.

## Implementation Decisions

### Server Architecture

- Agent code lives in `server/src/agents/` — a self-contained module folder consistent with `rag/`, `llm/`, and `ws/`.
- Agent Definitions are persisted as a JSON file (`agents.json`) alongside the Vectra indexes in `dataDir`. Survives Host restarts.
- Agent Sessions are held in-memory per WebSocket connection on the Host. Ephemeral — wiped on disconnect, consistent with Room history.
- Agent Session history is capped at a rolling window (same pattern as the Room's 30-message cap in `ws/history.js`) to prevent context blowup.

### Client Architecture

The client uses a single React context (`chatStore.jsx`) for all app state and a single WebSocket connection managed by `useWebSocket.js`. Agent Session state is added to `chatStore`: `activeAgent` (the open Agent Definition or null), `agentMessages` (message list for the active session), and `agentApprovalRequest` (pending approval payload or null).

`App.jsx` currently renders `Sidebar | ChatRoom | ThreadPanel`. When a Participant opens an Agent Session, `ChatRoom` and `ThreadPanel` are replaced by an `AgentPanel` component — same layout slot, no routing change needed.

The existing `Sidebar` component contains `UserList` and `DocList`. An `AgentList` section is added below `DocList`, listing all shared Agents. Clicking an Agent opens the Agent Session (sets `activeAgent` in the store).

The HTTP API layer (`client/src/api/http.js`) is extended with agent CRUD functions (`fetchAgents`, `createAgent`, `updateAgent`, `deleteAgent`) following the same pattern as the existing `fetchDocs` and `deleteDoc` functions.

### Agent Definition Schema

Each Agent Definition stores: `id` (UUID), `name`, `description`, `instructions`, `pinnedDocs` (array of document names), `enabledTools` (array of tool IDs), `createdAt`.

### Tool Invocation — Prompt-Engineered Tags

Native Ollama tool calling is not used because it is model-dependent and fails silently on models that do not support it. Instead, the Agent's system prompt instructs the LLM to output a structured Tool Call Tag as its **entire response** when it decides to invoke a Tool:

```
<nexus_tool>{"tool":"scraper","args":{"url":"https://example.com"}}</nexus_tool>
```

The server parses this tag after buffering the complete LLM response. This approach degrades gracefully on any model.

### Response Buffering

The full Ollama response is buffered server-side before anything is sent to the client. Tool Call Tag detection is done on the complete text — no split-chunk edge cases. Once a clean response is confirmed, tokens are forwarded to the client.

### Runtime Approval Flow

1. LLM response buffered; Tool Call Tag detected.
2. Server sends `agent_approval_request` (tool name + args) to the Participant's WebSocket connection.
3. Server holds a pending Promise waiting for `agent_approval_response`.
4. If approved: Tool executes server-side; result injected as a `[Tool Result: ...]` user turn; LLM re-invoked for final response.
5. If denied: `[Tool denied by user]` injected; LLM re-invoked to respond without the Tool.
6. Final response buffered again (handles chained tool calls), then streamed to client.

### WebSocket Message Types

New per-connection message types handled in `useWebSocket.js` (not broadcast — sent only to the originating connection):
- Client → Server: `agent_start`, `agent_message`, `agent_approval_response`, `agent_end`
- Server → Client: `agent_token`, `agent_approval_request`, `agent_tool_result`, `agent_done`

### RAG Integration

The existing `queryRag(query, docName)` function is reused directly. For an Agent with Pinned Documents, each pinned doc name is passed in sequence. For an Agent with no Pinned Documents, `queryRag(query, null)` searches all Documents.

The existing `isConversational` check (which bypasses RAG for short greetings) is inherited by Agent Sessions — conversational queries go straight to the LLM without triggering retrieval.

### Tool Implementations

- **Scraper**: `cheerio` + Node built-in `fetch` — lightweight, no binary dependencies. HTML-only pages.
- **PDF Maker**: `pdfkit` — Node-native, no binary dependencies.
- **Excel**: `exceljs` — supports read and write of `.xlsx` files.

### HTTP API

- `GET /api/agents` — list all Agent Definitions
- `POST /api/agents` — create an Agent Definition
- `PUT /api/agents/:id` — update an Agent Definition
- `DELETE /api/agents/:id` — delete an Agent Definition

## Testing Decisions

### What makes a good test

Tests assert external behavior — what comes out of a module given a specific input. Mock only at system boundaries (Ollama HTTP calls, filesystem for tool outputs). Do not test internal implementation details.

### Modules to test

**`agents/store.js`**
Given create/update/delete calls, assert the correct Agent Definitions are returned by subsequent reads. Use a temp file path to avoid touching real `dataDir`. No mocks needed.

**`agents/engine.js`**
The highest useful seam. Given a query, an Agent Definition, and a mock Ollama returning deterministic buffered responses, assert:
- Clean response (no tag) → `agent_token` events emitted correctly, history updated
- Tool Call Tag detected → `agent_approval_request` emitted with correct tool and args
- Approval granted → tool mock called, result injected, LLM re-invoked
- Approval denied → LLM re-invoked without tool result

**`agents/tools/`**
Each tool in isolation. Scraper: mock `fetch`, assert correct text extracted from HTML fixture. pdfMaker: assert returned value is a non-empty Buffer. Excel: assert workbook contains expected sheet and row data.

**`GET|POST|PUT|DELETE /api/agents`**
Supertest integration tests. Same pattern as `server/src/routes/__tests__/docs.test.js`.

**Client-side: `AgentPanel` and `AgentList`**
Vitest + React Testing Library, same pattern as `client/src/components/Chat/__tests__/ChatRoom.test.jsx`. Given a mock WebSocket and store state, assert: AgentList renders Agent names and descriptions; clicking an Agent sets `activeAgent`; AgentPanel renders agent messages and the approval prompt when `agentApprovalRequest` is set.

### Prior art

Server: `server/src/rag/__tests__/` and `server/src/routes/__tests__/docs.test.js`.
Client: `client/src/components/Chat/__tests__/` and `client/src/store/__tests__/chatStore.test.jsx`.

## Out of Scope

- Agent-to-agent communication or chaining
- Persistent Agent Session history across disconnects
- Per-Agent model selection (all Agents use the global `MODEL` env var)
- Tool output file management (generated files returned in-session only, not stored)
- JavaScript-rendered web page scraping
- Agent access controls or per-Participant visibility restrictions
- MCP protocol wrapping of Tools
- Streaming token output during Tool execution (response is buffered)

## Further Notes

- The `<nexus_tool>` tag format must be documented in the Agent creation UI so Participants understand how to write instructions that trigger Tools.
- Agents panel and Room coexist in the same browser tab — view toggle, no separate route. `App.jsx` swaps `ChatRoom + ThreadPanel` for `AgentPanel` based on `activeAgent` in the store.
- Tool Call Tags are stripped from the response shown to the Participant — only the final natural-language response is displayed.
- An Agent with `enabledTools: []` behaves identically to a scoped `@llm` mention and never triggers Runtime Approval.
- A `validateResults` function exists in the RAG pipeline but is currently disabled. Agent Sessions do not enable it — keeping the pipeline consistent with the existing `@llm` behavior.
- The Room's LLM conversation history (global 30-message rolling window in `ws/history.js`) is **not** shared with Agent Sessions. Each Agent Session maintains its own isolated history on the server, scoped to the WebSocket connection.
