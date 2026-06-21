# #11 — Document deletion from sidebar

**Type:** AFK
**Label:** ready-for-agent

## What to build

A developer can remove an uploaded document from the sidebar. The document's Vectra index is evicted from memory so it no longer appears in `@llm` queries.

The sidebar document list shows a delete button (✕) next to each document. Clicking it calls `DELETE /api/docs/:docName`. The server removes the Vectra index from its in-memory map so subsequent queries skip it. The document disappears from all clients' sidebar lists via a broadcast `doc_removed` WebSocket event. The Vectra files remain on disk in this version (physical deletion is a future enhancement).

## Acceptance criteria

- [ ] Clicking ✕ next to a document removes it from the sidebar for all connected clients
- [ ] `@llm <question>` no longer retrieves chunks from a deleted document
- [ ] `@llm /doc:deleted-name <question>` returns an error message in chat
- [ ] `GET /api/docs` no longer includes the deleted document name
- [ ] The Vectra index files remain on disk (in-memory eviction only)
- [ ] Deleting a document that does not exist returns a graceful error, not a 500

## Blocked by

- #5 — PDF upload + ingestion pipeline
