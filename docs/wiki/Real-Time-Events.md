# Real-Time Events

Chikn Tndr uses **Socket.io** for all real-time communication. Every active session has its own Socket.io room named `session:{sessionId}`.

Connect to the Socket.io server at the server root (e.g. `ws://localhost:4000`) using the Socket.io client library.

---

## Connection & Authentication

Authentication happens as the first event after connecting — not at the transport level.

```ts
import { io } from 'socket.io-client';

const socket = io('http://localhost:4000');

socket.on('connect', () => {
  socket.emit('session:join', {
    sessionId: '<sessionId>',
    token: '<jwt>',
  });
});
```

If `session:join` fails, the server emits `session:error` and the socket is not added to the session room.

---

## Client → Server Events

### `session:join`

Join a session room. Must be emitted immediately after connecting. Verifies the JWT and confirms group membership before admitting the socket.

**Payload**

| Field | Type | Description |
|---|---|---|
| `sessionId` | `string` | Session ID |
| `token` | `string` | Valid JWT from `/api/auth/login` |

**Example**
```ts
socket.emit('session:join', { sessionId: 'clses789', token: 'eyJ...' });
```

---

### `session:ready`

Signal that the current user is ready to start swiping. Once every group member has emitted this event the server automatically starts the session and broadcasts `session:started`.

**Payload**

| Field | Type | Description |
|---|---|---|
| `sessionId` | `string` | Session ID |

**Example**
```ts
socket.emit('session:ready', { sessionId: 'clses789' });
```

---

### `session:vote`

Broadcast a swipe vote to the server in real time. Should be emitted in parallel with the `POST /api/sessions/:id/vote` REST call.

**Payload**

| Field | Type | Description |
|---|---|---|
| `sessionId` | `string` | Session ID |
| `restaurantId` | `string` | Internal restaurant ID (not Google `placeId`) |
| `direction` | `"LEFT" \| "RIGHT"` | `RIGHT` = Yum ❤️, `LEFT` = Nope ✗ |

**Example**
```ts
socket.emit('session:vote', {
  sessionId: 'clses789',
  restaurantId: 'clres001',
  direction: 'RIGHT',
});
```

---

### `session:leave`

Explicitly leave the session room (e.g. when navigating away). A `session:memberLeft` is broadcast to remaining members.

**Payload**

| Field | Type | Description |
|---|---|---|
| `sessionId` | `string` | Session ID |

**Example**
```ts
socket.emit('session:leave', { sessionId: 'clses789' });
```

---

## Server → Client Events

### `session:memberJoined`

Emitted to all other members in the room when a new member successfully joins via `session:join`.

**Payload**

| Field | Type | Description |
|---|---|---|
| `userId` | `string` | The joining user's ID |
| `displayName` | `string` | The joining user's display name |

**Example handler**
```ts
socket.on('session:memberJoined', ({ userId, displayName }) => {
  console.log(`${displayName} joined the lobby`);
});
```

---

### `session:memberLeft`

Emitted to all other members when a socket disconnects or emits `session:leave`.

**Payload**

| Field | Type | Description |
|---|---|---|
| `userId` | `string` | The departing user's ID |

---

### `session:memberReady`

Emitted to **all** members (including the one who just readied up) when any member emits `session:ready`. Use the `readyCount` / `totalCount` to drive a lobby countdown UI.

**Payload**

| Field | Type | Description |
|---|---|---|
| `userId` | `string` | ID of the member who readied |
| `readyCount` | `number` | How many members are now ready |
| `totalCount` | `number` | Total members in the group |

**Example handler**
```ts
socket.on('session:memberReady', ({ readyCount, totalCount }) => {
  setReadyDisplay(`${readyCount} / ${totalCount} ready`);
});
```

---

### `session:started`

Emitted to **all** members when `readyCount >= totalCount`. Clients should transition from the lobby view to the card-swipe view.

**Payload**

| Field | Type | Description |
|---|---|---|
| `sessionId` | `string` | The session that has started |

**Example handler**
```ts
socket.on('session:started', ({ sessionId }) => {
  sessionStore.markStarted();
});
```

---

### `session:voteReceived`

Emitted to **all** members in the room whenever any member swipes RIGHT (❤️ Yum). Use it to show a live "X people like this" counter.

> Only RIGHT votes trigger this event; LEFT votes are silent.

**Payload**

| Field | Type | Description |
|---|---|---|
| `restaurantId` | `string` | Restaurant that received the vote |
| `yesCount` | `number` | Running total of RIGHT votes for this restaurant in this session |

**Example handler**
```ts
socket.on('session:voteReceived', ({ restaurantId, yesCount }) => {
  sessionStore.updateYesCount(restaurantId, yesCount);
});
```

---

### `session:complete`

Emitted to **all** members once every member has voted on every restaurant. Clients should navigate to the results screen.

**Payload**

| Field | Type | Description |
|---|---|---|
| `winner` | `VoteTally` | The winning restaurant |
| `tally` | `VoteTally[]` | Full ranked results, sorted by `yesVotes` desc |

**`VoteTally` shape**

| Field | Type | Description |
|---|---|---|
| `restaurantId` | `string` | Internal restaurant ID |
| `name` | `string` | Restaurant name |
| `photoUrl` | `string \| null` | Google Places photo URL |
| `placeId` | `string` | Google `place_id` |
| `yesVotes` | `number` | Total RIGHT votes |
| `totalVoters` | `number` | Total members who voted |
| `percentage` | `number` | `yesVotes / totalVoters * 100`, rounded |

**Example handler**
```ts
socket.on('session:complete', ({ winner, tally }) => {
  sessionStore.markComplete(winner, tally);
});
```

---

### `session:error`

Emitted **only to the requesting socket** when a handler throws. Check `message` for a human-readable reason.

**Payload**

| Field | Type | Description |
|---|---|---|
| `message` | `string` | Error description |

**Example handler**
```ts
socket.on('session:error', ({ message }) => {
  toast.error(message);
});
```

---

## Event Flow Summary

```
Client A                   Server                    Client B
────────                   ──────                    ────────
connect ─────────────────►
session:join ────────────► verify JWT + membership
                           join room session:{id}
                           ◄──────────────────────── session:memberJoined

session:ready ───────────► add to readySet
                           broadcast readyCount/totalCount
◄─ session:memberReady ─────────────────────────────► session:memberReady

                           [all ready]
                           startSession()
◄─ session:started ─────────────────────────────────► session:started

session:vote (RIGHT) ────► castVote()
                           getYesCount()
◄─ session:voteReceived ────────────────────────────► session:voteReceived

                           [all voted on all cards]
                           completeSession()
◄─ session:complete ────────────────────────────────► session:complete
```
