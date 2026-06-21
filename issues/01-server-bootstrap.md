# #1 — Server bootstrap: Express + WebSocket + mDNS + QR

**Type:** AFK
**Label:** ready-for-agent

## What to build

Wire up the Node.js host server end-to-end so the first developer can start it and have others join from a browser on the same LAN.

On `npm start` the server must:
- Serve the built React client as static files from Express
- Start a WebSocket server on the same HTTP server
- Register the host as `nexus.local` (configurable) via Bonjour/mDNS
- Print the raw LAN IP URL and a QR code encoding that URL to the terminal
- Read all configuration (`MODEL`, `SERVER_PORT`, `BONJOUR_NAME`, `DATA_DIR`, `OLLAMA_BASE_URL`) from environment variables with documented defaults

No chat logic is in scope — a connected WebSocket client receives no messages yet. This slice is purely infrastructure.

## Acceptance criteria

- [ ] `npm start` in `server/` starts without errors when a `.env` file is present
- [ ] The terminal prints a LAN URL (e.g. `http://192.168.x.x:3000`) and a readable QR code
- [ ] The service is discoverable as `nexus.local` on the same LAN (macOS/Linux; Bonjour required on Windows)
- [ ] Opening the URL in a browser on another LAN machine loads the React app
- [ ] All config values fall back to documented defaults when env vars are absent
- [ ] `npm run dev` hot-reloads the server on file changes via nodemon

## Blocked by

None — can start immediately.
