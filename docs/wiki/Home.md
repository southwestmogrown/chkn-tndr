# 🍗 Chikn Tndr — Wiki Home

> _Swipe right on dinner. Left on regret._

Welcome to the Chikn Tndr project wiki. Use the links below to navigate the documentation.

---

## What Is Chikn Tndr?

Chikn Tndr solves the universal "where should we eat?" problem with a real-time multiplayer voting game.

1. A user creates a **group** and shares an 8-character invite code.
2. Everyone joins, then someone creates a **session** tied to a location.
3. The app fetches up to 20 nearby restaurants from the **Google Places API**.
4. All group members simultaneously swipe through restaurant cards — right (❤️ Yum) or left (✗ Nope).
5. When every member has voted on every card, the winner is announced: the restaurant with the most ❤️ votes (ties broken by approval percentage).

The entire experience — lobby countdown, live vote tallies, and the final reveal — happens in real time via **Socket.io**.

---

## Wiki Contents

| Page | What you'll find |
|---|---|
| [Architecture](Architecture.md) | System design, data-flow diagrams, component map |
| [API Reference](API-Reference.md) | Complete REST endpoints + Socket.io event catalogue |
| [Development Guide](Development-Guide.md) | Prerequisites, local setup, environment variables |
| [Deployment](Deployment.md) | Docker Compose, production configuration |
| [Tech Stack](Tech-Stack.md) | Technology choices and rationale |
| [Real-Time Events](Real-Time-Events.md) | Socket.io event reference with payload schemas |

---

## Key Technical Highlights

| Concern | Approach |
|---|---|
| **Real-time sync** | Socket.io rooms scoped per session (`session:{id}`) — no polling |
| **Vote integrity** | Unique DB constraint on `(sessionId, restaurantId, userId)` prevents duplicates at the data layer |
| **Optimistic UX** | Vote fires over the socket *and* via REST simultaneously; the card advances instantly |
| **API cost control** | Google Places results are cached via `upsert` so nearby restaurants are reused across sessions |
| **Type safety** | Socket.io is typed end-to-end with four generic parameters; Prisma generates the DB type layer |
| **Session lifecycle** | Strict `LOBBY → SWIPING → TALLYING → COMPLETE` state machine in a single service class |
