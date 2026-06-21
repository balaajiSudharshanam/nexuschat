# Nexus

A local-first, distributed LAN chat with shared AI. Developers on the same network chat with each other and invoke LLMs without any cloud or central server.

## Language

**Node**:
A developer's machine running the Nexus server process (Node.js + Ollama). Every participant runs a Node — there is no dedicated server.
_Avoid_: Server, host, peer, instance

**Participant**:
A person connected to the Nexus network through their Node's browser UI.
_Avoid_: User, client, member

**Mesh**:
The set of all Nodes currently connected to each other on the LAN. There is no central coordinator — every Node talks directly to every other Node.
_Avoid_: Network, cluster, group

**Mention**:
An `@llm` invocation typed by a Participant. Triggers an LLM query on the receiving Node.
_Avoid_: Command, prompt, query

**Doc**:
A PDF uploaded by a Participant. Stored and indexed locally on the Node that received it.
_Avoid_: File, attachment, document

**Thread**:
A reply chain attached to a specific message. Scoped to the message it replies to.
_Avoid_: Reply, sub-chat

**Session**:
The lifetime of a Mesh from first Node joining to last Node leaving. State is in-memory — a Session does not survive all Nodes restarting.
_Avoid_: Room, channel, conversation

## RAG

**Retrieval**:
The step that fetches candidate chunks from a Doc before the LLM generates a response. Always hybrid: vector similarity and BM25 run in parallel and are merged.
_Avoid_: Search, lookup, fetch

**BM25**:
A term-frequency retrieval strategy that ranks chunks by keyword relevance. Complements vector search by catching exact-match terms that semantic search misses.
_Avoid_: Keyword search, text search, full-text search

**Grader**:
An LLM call that scores each retrieved chunk as relevant or not before it reaches the main generation step. Filters noise from the context window.
_Avoid_: Reranker, filter, validator

**RRF** (Reciprocal Rank Fusion):
The merge strategy that combines the vector-ranked list and the BM25-ranked list into a single ranked list. Chunks that rank well in both retrievers are boosted.
_Avoid_: Score fusion, rank aggregation
