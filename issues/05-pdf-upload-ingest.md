# #5 — PDF upload + ingestion pipeline (parse → chunk → embed → Vectra)

**Type:** AFK
**Label:** ready-for-agent

## What to build

A developer uploads a PDF via the sidebar button. The server extracts text, chunks it, generates embeddings via Ollama, and stores them in a per-document Vectra index on disk. The document appears in the sidebar for all connected clients.

`POST /api/upload` accepts a multipart PDF. The filename is sanitised and used as the document name. Text is extracted with `pdf-parse`, split into ~500-word chunks with 50-word overlap, and each chunk is embedded via Ollama's `/api/embed` endpoint using the `EMBED_MODEL` (default: `nomic-embed-text`). Embeddings are persisted in a Vectra index under `DATA_DIR/<docName>/`. `GET /api/docs` returns the list of loaded document names.

After upload, a system message is broadcast to all chat clients: "Alice uploaded report.pdf".

## Acceptance criteria

- [ ] Clicking "Upload PDF" in the sidebar opens a file picker; selecting a PDF uploads it
- [ ] The server responds with `{ docName, chunkCount }` on success
- [ ] A system message "Alice uploaded report.pdf" appears in the group chat for all clients
- [ ] The uploaded document appears in every client's sidebar document list
- [ ] Vectra index files are written to disk under `DATA_DIR/` and survive a server restart
- [ ] `GET /api/docs` returns all documents whose indexes exist on disk (not just in-memory)
- [ ] Uploading a non-PDF returns a 400 error

## Blocked by

- #1 — Server bootstrap
