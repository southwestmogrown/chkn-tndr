# API Reference

Complete reference for all REST endpoints and Socket.io events.

**Base URL:** `http://localhost:4000` (development) · set `CLIENT_ORIGIN` for production  
**Auth:** All protected endpoints require `Authorization: Bearer <token>` header.

---

## REST API

### Authentication

#### Register

```http
POST /api/auth/register
Content-Type: application/json

{
  "email": "alice@example.com",
  "password": "superSecret42",
  "displayName": "Alice"
}
```

**Response 201**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "clxyz123",
    "email": "alice@example.com",
    "displayName": "Alice"
  }
}
```

**Errors:** `400` email already taken · `422` validation error

---

#### Login

```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "alice@example.com",
  "password": "superSecret42"
}
```

**Response 200**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "clxyz123",
    "email": "alice@example.com",
    "displayName": "Alice"
  }
}
```

**Errors:** `401` invalid credentials

---

#### Get Current User

```http
GET /api/auth/me
Authorization: Bearer <token>
```

**Response 200**
```json
{
  "id": "clxyz123",
  "email": "alice@example.com",
  "displayName": "Alice",
  "createdAt": "2024-11-01T10:00:00.000Z"
}
```

---

### Groups

#### List My Groups

```http
GET /api/groups
Authorization: Bearer <token>
```

**Response 200**
```json
[
  {
    "id": "clgrp456",
    "name": "Friday Crew",
    "inviteCode": "XK9P2MQA",
    "ownerId": "clxyz123",
    "memberCount": 4,
    "createdAt": "2024-11-15T18:00:00.000Z"
  }
]
```

---

#### Create Group

```http
POST /api/groups
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Friday Crew"
}
```

**Response 201**
```json
{
  "id": "clgrp456",
  "name": "Friday Crew",
  "inviteCode": "XK9P2MQA",
  "ownerId": "clxyz123",
  "createdAt": "2024-11-15T18:00:00.000Z"
}
```

---

#### Join Group by Invite Code

```http
POST /api/groups/join
Authorization: Bearer <token>
Content-Type: application/json

{
  "inviteCode": "XK9P2MQA"
}
```

**Response 200**
```json
{
  "id": "clgrp456",
  "name": "Friday Crew",
  "inviteCode": "XK9P2MQA"
}
```

**Errors:** `404` invite code not found · `409` already a member

---

#### Get Group Detail

```http
GET /api/groups/:id
Authorization: Bearer <token>
```

**Response 200**
```json
{
  "id": "clgrp456",
  "name": "Friday Crew",
  "inviteCode": "XK9P2MQA",
  "owner": { "id": "clxyz123", "displayName": "Alice" },
  "members": [
    { "userId": "clxyz123", "displayName": "Alice", "joinedAt": "..." },
    { "userId": "clbob789", "displayName": "Bob",   "joinedAt": "..." }
  ]
}
```

**Errors:** `403` not a member · `404` not found

---

#### Leave Group

```http
DELETE /api/groups/:id/leave
Authorization: Bearer <token>
```

**Response 204** (no body)

**Errors:** `403` not a member

---

### Sessions

#### Create Session

Triggers a Google Places Nearby Search, caches up to 20 restaurants, and transitions the session to `LOBBY`.

```http
POST /api/sessions
Authorization: Bearer <token>
Content-Type: application/json

{
  "groupId": "clgrp456",
  "latitude": 37.7749,
  "longitude": -122.4194,
  "radiusMeters": 1500
}
```

`radiusMeters` is optional (default: `2000`).

**Response 201**
```json
{
  "id": "clses789",
  "groupId": "clgrp456",
  "latitude": 37.7749,
  "longitude": -122.4194,
  "radiusMeters": 1500,
  "status": "LOBBY",
  "restaurants": [
    {
      "ordinal": 0,
      "restaurant": {
        "id": "clres001",
        "placeId": "ChIJN1t_tDeuEmsRUsoyG83frY4",
        "name": "The Slanted Door",
        "address": "1 Ferry Building, San Francisco",
        "rating": 4.4,
        "userRatingsTotal": 3200,
        "priceLevel": 3,
        "photoUrl": "https://maps.googleapis.com/maps/api/place/photo?...",
        "types": ["restaurant", "food"],
        "openNow": true,
        "distance": 342
      }
    }
  ],
  "createdAt": "2024-11-20T19:30:00.000Z"
}
```

**Errors:** `403` not a group member · `400` Google Places error

---

#### Get Session

```http
GET /api/sessions/:id
Authorization: Bearer <token>
```

Returns the full session with all restaurants in `ordinal` order.

**Response 200** — same shape as Create Session response above.

---

#### Cast Vote

```http
POST /api/sessions/:id/vote
Authorization: Bearer <token>
Content-Type: application/json

{
  "restaurantId": "clres001",
  "direction": "RIGHT"
}
```

`direction` is `"LEFT"` (nope) or `"RIGHT"` (yum).  
Vote is also sent as `session:vote` over the WebSocket simultaneously.

**Response 201** (no body)

**Errors:** `409` already voted · `403` session not in SWIPING state

---

#### Get Tally

```http
GET /api/sessions/:id/tally
Authorization: Bearer <token>
```

**Response 200**
```json
[
  {
    "restaurantId": "clres001",
    "name": "The Slanted Door",
    "photoUrl": "https://...",
    "placeId": "ChIJ...",
    "yesVotes": 3,
    "totalVoters": 4,
    "percentage": 75
  }
]
```

Results are sorted descending by `yesVotes`, then by `percentage`.

---

### Health Check

```http
GET /api/health
```

**Response 200**
```json
{ "status": "ok", "ts": "2024-11-20T19:30:00.000Z" }
```

---

## Error Response Format

All error responses use a consistent shape:

```json
{
  "error": "Human-readable error message"
}
```

Common HTTP status codes:

| Code | Meaning |
|---|---|
| `400` | Bad request / validation failure |
| `401` | Missing or invalid JWT |
| `403` | Authenticated but not authorised |
| `404` | Resource not found |
| `409` | Conflict (duplicate vote, already a member, etc.) |
| `429` | Rate limit exceeded |
| `500` | Unexpected server error |

---

## Socket.io Events

The WebSocket connection is established at the server root (`ws://localhost:4000`).  
Authenticate by emitting `session:join` immediately after connecting.

For the full event reference see [Real-Time Events](Real-Time-Events.md).
