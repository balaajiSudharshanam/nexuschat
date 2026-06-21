# #10 — Drag-and-drop PDF upload + system message broadcast

**Type:** AFK
**Label:** ready-for-agent

## What to build

A developer can drag a PDF file anywhere onto the chat window to upload it, as an alternative to the sidebar button. A system message is broadcast to the room confirming the upload.

The chat area listens for `dragover` and `drop` events. Dropping a PDF triggers the same `POST /api/upload` flow as the sidebar button. While uploading a visual overlay ("Drop PDF to upload") is shown. On success a system message — styled differently from chat messages — appears in the room: "Alice uploaded report.pdf". The document appears in all clients' sidebar lists. Dropping a non-PDF file shows an inline error and does nothing.

## Acceptance criteria

- [ ] Dragging a PDF over the chat area shows a "Drop to upload" overlay
- [ ] Dropping the PDF uploads it and triggers the same ingestion pipeline as the sidebar button
- [ ] A system message "Alice uploaded report.pdf" appears in the main chat for all clients
- [ ] The document immediately appears in all clients' sidebar document lists
- [ ] Dropping a non-PDF file shows an error and does not trigger an upload
- [ ] The sidebar "Upload PDF" button continues to work alongside drag-and-drop

## Blocked by

- #5 — PDF upload + ingestion pipeline
