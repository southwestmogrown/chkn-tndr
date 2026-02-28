# Contributing to Chikn Tndr

Thank you for your interest in contributing! This guide covers how to report bugs, propose features, and submit pull requests.

---

## Code of Conduct

Be respectful and constructive. This is a portfolio project open to collaboration — keep feedback focused on the code, not the person.

---

## Getting Started

1. **Fork** the repository on GitHub
2. **Clone** your fork locally
3. Follow the [Development Guide](docs/wiki/Development-Guide.md) to get the stack running
4. Create a branch for your change:
   ```bash
   git checkout -b feat/my-new-feature
   # or
   git checkout -b fix/the-thing-that-was-broken
   ```

---

## Branch Naming

| Prefix | Use for |
|---|---|
| `feat/` | New features |
| `fix/` | Bug fixes |
| `docs/` | Documentation only |
| `refactor/` | Code changes with no behaviour change |
| `chore/` | Build scripts, dependencies, config |

---

## Commit Messages

Follow the [Conventional Commits](https://www.conventionalcommits.org/) format:

```
<type>(<scope>): <short summary>

[optional body]
```

**Examples:**
```
feat(session): add 60-second auto-start timer in lobby
fix(socket): clear ready-set on session:leave
docs(wiki): add real-time events reference page
```

---

## Pull Request Checklist

Before opening a PR, verify:

- [ ] The code builds without errors (`npm run build`)
- [ ] TypeScript compiles cleanly (`tsc --noEmit` in both `server/` and `client/`)
- [ ] New behaviour is covered by tests (if the test suite exists)
- [ ] The PR description explains **what** changed and **why**
- [ ] Breaking changes to the API or Socket.io events are documented

---

## Reporting Bugs

Open a [GitHub Issue](../../issues) with:

1. A clear title (e.g. "Session never transitions to SWIPING when only one member")
2. Steps to reproduce
3. Expected behaviour
4. Actual behaviour
5. Environment (OS, Node.js version, browser)

---

## Proposing Features

Open a GitHub Issue with the `enhancement` label. Describe:

1. The problem it solves
2. The proposed solution
3. Any alternatives you considered

For significant features, open an issue and discuss before submitting a large PR — it avoids wasted effort if the direction doesn't fit the project.

---

## Development Notes

- The server runs on port `4000` and the client on `5173` in development
- Socket.io events are typed end-to-end via the generic parameters on the `Server<>` / `io()` instances — update `server/src/types/index.ts` and `client/src/types/index.ts` in sync when adding new events
- Prisma schema changes require a migration: `npm run db:migrate`
- The in-memory `readySets` map in `session.socket.ts` is intentionally simple; see [Architecture](docs/wiki/Architecture.md#known-architectural-trade-offs) for the Redis upgrade path

---

## License

By contributing you agree that your contributions will be licensed under the project's [MIT License](LICENSE).
