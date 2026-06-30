# Nexus

A self-hosted LAN chat application for developer teams. One machine runs the server; everyone else joins by opening a URL in their browser — no installation required. No accounts, no cloud dependency.

## Language

### People & Roles

**Host**:
The single machine running the Node.js server. All WebSocket connections, LLM calls, and file storage happen on the Host. Everyone else is a browser-only Participant.
_Avoid_: Leader, server, master, node, peer

**Participant**:
A developer who joins via a browser tab — no app installation required. Identified only by a self-chosen display name; no persistent account exists.
_Avoid_: User, client, member, node

### Communication

**Room**:
The single shared group chat that all Participants see. Ephemeral — history is wiped when the Host restarts.
_Avoid_: Channel, chat room, workspace

**Thread**:
A focused sub-conversation branching from a single Room message, displayed in a side panel. Thread messages do not appear in the Room scroll.
_Avoid_: Reply chain, sub-chat

**LLM Mention**:
A Room or Thread message prefixed with `@llm`. Triggers the RAG pipeline and streams an LLM response visible to all Participants.
_Avoid_: Bot mention, AI query, command

### Documents

**Document**:
A PDF uploaded to the Host. Indexed for retrieval and listed in the document sidebar. Survives Host restarts.
_Avoid_: File, attachment, PDF, doc

**Pinned Documents**:
The subset of Documents an Agent is scoped to for retrieval. If empty, the Agent searches all Documents.
_Avoid_: Attached docs, linked files, document scope

### Agents

**Agent**:
A named, user-created AI assistant with custom instructions, separate from the Room. Shared across all Participants; conversations with an Agent are private per Participant and ephemeral.
_Avoid_: Bot, assistant, custom GPT

**Agent Definition**:
The persisted configuration of an Agent: name, description, instructions, Pinned Documents, and enabled Tools.
_Avoid_: Agent config, agent schema, agent spec

**Agent Session**:
A private, ephemeral 1-on-1 conversation between a Participant and an Agent. Lost when the Participant disconnects.
_Avoid_: Agent chat, agent conversation, agent thread

**Tool**:
A server-side function an Agent can invoke during an Agent Session (web scraper, PDF maker, Excel manipulator). Execution requires Runtime Approval.
_Avoid_: Plugin, function, capability, MCP tool

**Tool Call Tag**:
A structured string the LLM emits in its buffered response (e.g. `<tool>scrape</tool>`) to signal intent to invoke a Tool. Parsed server-side before the response is shown to the Participant.
_Avoid_: Function call, tool invocation, action tag

**Runtime Approval**:
The moment during an Agent Session when the server detects a Tool Call Tag, pauses, and asks the Participant to approve or deny the Tool execution before proceeding.
_Avoid_: User confirmation, tool permission, approval gate

### Retrieval

**Ingestion**:
The one-time pipeline that runs when a Document is uploaded: text is extracted with coordinate-aware layout reconstruction (preserving column and line order), split into overlapping Chunks, each Chunk is embedded via Ollama, and the results are stored in the vector index and text store. If embedding fails, text-only Chunks are stored so BM25 still works.
_Avoid_: Indexing, processing, parsing, upload pipeline

**Chunk**:
The unit of text the RAG Pipeline stores and retrieves. A Document is split into overlapping fixed-size Chunks at Ingestion time. Each Chunk carries a vector embedding (for similarity search) and its raw text (for BM25).
_Avoid_: Passage, segment, fragment, piece

**RAG Pipeline**:
The retrieval flow triggered by an LLM Mention or Agent query: Hybrid Search → RRF merge → Grader → context injection into the LLM prompt. Conversational queries (short greetings, small talk) bypass the pipeline and go straight to the LLM without retrieval.
_Avoid_: Search pipeline, retrieval system, knowledge base lookup

**Hybrid Search**:
Vector similarity search (Vectra) and BM25 keyword search run in parallel per Document. Results from both are merged via RRF within each Document, then grouped across all targeted Documents.
_Avoid_: Semantic search, full-text search (when used alone)

**BM25**:
A term-frequency ranking strategy that scores Chunks by keyword match against the query. Complements vector search by catching exact-match terms that embedding similarity misses. Implemented in-house — no external BM25 library.
_Avoid_: Keyword search, text search, full-text search

**Grader**:
An LLM call (using the same chat model) that scores each retrieved Chunk on a 1–5 relevance scale. Chunks scoring below the threshold are dropped before context injection. Runs in parallel across all Chunks for a given query.
_Avoid_: Reranker, filter, validator

**RRF** (Reciprocal Rank Fusion):
The merge strategy that combines the vector-ranked and BM25-ranked Chunk lists into one. Chunks that rank well in both lists are boosted.
_Avoid_: Score fusion, rank aggregation
