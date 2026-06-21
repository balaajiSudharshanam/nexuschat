# #7 — RAG-backed `@llm` with `/doc:` scoping + autocomplete

**Type:** AFK
**Label:** ready-for-agent

## What to build

`@llm /doc:filename <question>` queries a specific uploaded PDF; `@llm <question>` falls back to searching all documents. The message input autocompletes document names after `/doc:`.

When the Message Router detects a `/doc:` flag it passes the document name to the RAG query pipeline, which embeds the question via Ollama, searches only that document's Vectra index, and injects the top-5 matching chunks as system context before calling Ollama's chat endpoint. Without a `/doc:` flag, all Vectra indexes are searched and results merged by score. The React input shows a dropdown of matching document names as the user types after `/doc:`.

## Acceptance criteria

- [ ] `@llm /doc:report.pdf what is X?` retrieves chunks only from `report.pdf`'s Vectra index
- [ ] `@llm what is X?` searches across all uploaded documents and merges results by relevance score
- [ ] Typing `/doc:` in the message input shows an autocomplete dropdown of available document names
- [ ] Selecting an autocomplete suggestion completes the `/doc:` token and moves the cursor ready for the question
- [ ] The LLM response is demonstrably grounded in the document content (manual verification)
- [ ] Querying a non-existent document name returns a clear error message in chat
- [ ] No regression on bare `@llm` queries with no documents uploaded

## Blocked by

- #5 — PDF upload + ingestion pipeline
- #6 — Bare `@llm` mention
