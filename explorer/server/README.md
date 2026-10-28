# Account-state server

`state.mjs` is the shared account-sync handler. It uses a D1-compatible prepared
statement interface and the schema in `schema.sql`. Run the schema as a migration
before enabling the route. The private hosted explorer already connects this
handler to its authenticated server and database.

Integrate `GET /api/state` and `PUT /api/state` into your own server adapter:

```js
const session = await yourServerSession(request);
return handleState(request, env.DB, session?.userId);
```

The last argument must come from a verified server-side session. Never obtain it
from a request body, query parameter, or an untrusted client-supplied header.
Missing identity returns 401. Every query is scoped by that identity. Cross-origin
writes are rejected, responses are not cacheable, and API payloads never contain
device location or weather preferences.

The client uses revision-checked writes, idempotent operation identifiers and
explicit conflict resolution. A stale device cannot silently replace a newer
account copy. Replacing a device copy creates a local recovery backup.

The static preview and existing GitHub Pages app remain device-local until a
trusted server adapter and database are configured; they do not supply sessions
or an API by themselves. No production identifiers, credentials or personal
collection records are included here.

Run the Node tests from the repository root with Node 22.13+:

```sh
node --test explorer/tests/*.test.mjs
```

The server tests use in-memory SQLite and synthetic identities. The client tests
exercise initial upload, loading on another device, conflicting edits, offline
retention and changes made while an upload is in progress.
