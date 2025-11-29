Session & Context Design
========================

Background
----------

The gateway currently:

- Accepts chat requests on `POST /v1/chat/completions`.
- Optionally receives a `X-Session-Id` header.
- Persists conversation context into Redis when a non-empty session id is present:
  - key: `session:{session_id}:history`
  - value: list of stringified dicts: `{"request": <payload>, "response": <upstream_text>}`
  - only the last 50 entries are kept per session.

Recently we integrated Cherry Studio as a client. Cherry behaves differently from
our own clients with respect to context and sessions.


Observed Cherry Studio behaviour
--------------------------------

From log inspection:

- Requests carry a `User-Agent` that includes `CherryStudio/...`.
- There is **no** explicit session identifier:
  - no `X-Session-Id` header,
  - no `Cookie`,
  - no obvious `session_id` or `conversation_id` field in the JSON payload.
- Each request payload includes **full conversation history** in `messages`:
  - previous assistant and user turns are embedded in the `messages` array,
  - the last element(s) represent the latest user question.

As a result:

- The dependency `x_session_id: Optional[str] = Header(..., alias="X-Session-Id")`
  resolves to `None` for Cherry.
- `save_context()` has an early return when `session_id` is falsy, so Cherry
  calls do not write anything to Redis.
- Logs now capture:
  - all request headers (with `Authorization` redacted),
  - a concise summary of the request body (`incoming_raw_body summary=...`)
    before normalization.


Two context modes
-----------------

There are effectively two ways clients can handle conversation context:

1. Client-managed context (Cherry-style)
   - Client maintains its own history and sends a full snapshot of the
     conversation in each request.
   - Server is effectively stateless with respect to context; it simply forwards
     whatever the client provides.

2. Server-managed context (session_id-style)
   - Client provides a stable session identifier (e.g. `X-Session-Id`).
   - Server persists request/response pairs per session in Redis.
   - Server-side tooling can replay or inspect a session via `/context/{session_id}`.

Cherry Studio clearly falls into the first category today.


Design decision: do not auto-create sessions for Cherry
-------------------------------------------------------

We deliberately **do not** auto-create a new session in Redis for every request
coming from Cherry Studio.

Reasons:

- Cherry already sends a full conversation snapshot in each payload; storing
  the same history repeatedly would be:
  - redundant (the same data over and over),
  - expensive (large payloads per turn).
- We have no explicit, stable session identifier from Cherry, so any server-side
  "session" we invent would have weak or confusing semantics:
  - hard to distinguish "new chat" vs "continued chat",
  - multiple chats could accidentally merge.
- For Cherry, the gateway's primary role is an HTTP proxy and logger; Cherry
  itself is responsible for context assembly.

Therefore:

- Requests with `session_id == None` are treated as **stateless** for Redis.
- Cherry requests are expected to stay in this category unless the client is
  updated to provide an explicit session id.


Client classes
--------------

We distinguish two classes of clients:

1. Session-aware clients
   - Must provide a session identifier (recommended: `X-Session-Id` header).
   - The gateway persists their context into Redis under
     `session:{session_id}:history`.
   - `/context/{session_id}` is intended primarily for these clients and for
     internal debugging.

2. Session-unaware clients (current Cherry Studio)
   - Provide no session identifier.
   - The gateway does **not** persist Redis context for these calls.
   - Analysis/debugging relies on:
     - request header logs, and
     - concise `incoming_raw_body` summary logs.


Role of Redis
-------------

Redis is **not** a mandatory store for all clients. It is an optional feature
layer that:

- Stores conversation history for clients that opt in by sending a session id.
- Enables:
  - per-session replay/debugging,
  - potential multi-device continuity or other session-based features.

For Cherry Studio, which already carries full context in the payload, Redis
would at best duplicate what the client has. We avoid doing that by design.


Future options (not yet implemented)
------------------------------------

If we ever need richer server-side tracking for Cherry, several directions are
possible. These are design ideas only; they are **not** implemented:

1. Explicit Cherry session id
   - Ask Cherry users to configure a custom header (e.g. `X-Session-Id`) in
     their client, based on whatever Cherry uses as a "conversation id".
   - Once that header is present, the gateway can treat Cherry like any other
     session-aware client and store context in Redis.

2. Pseudo-session & simple deduplication
   - If Cherry cannot send a real session id but we still want to persist
     something, we could:
     - Identify Cherry by a header or `User-Agent`.
     - Define a "pseudo session id" per Cherry conversation (for example,
       derived from API key, the first user message, and/or a time window).
     - For each pseudo session, store only incremental context instead of the
       full `messages` array on every call:
       - track previous `len(messages)` or a simple request fingerprint,
       - only append when we see new messages.
   - This would reduce duplication but still has weaker semantics and should
     only be done if we clearly need it (e.g. analytics).

3. Per-key or per-client recent-history views
   - Another option is to store only the last N raw requests+responses for a
     given API key or client id, without calling it a "session". This can be
     useful for debugging while keeping design simpler.


Summary
-------

- Cherry Studio today is treated as a stateless, full-context client:
  - no `X-Session-Id`,
  - full history is already in `messages`,
  - no Redis session is created.
- Session-based Redis storage is reserved for clients that explicitly provide
  a session id.
- Logs (headers + `incoming_raw_body`) are the primary tool for understanding
  how session-unaware clients behave.
- If future requirements appear, we can extend the design with explicit Cherry
  session ids, pseudo-session grouping, and/or simple deduplication and
  incremental storage strategies.
