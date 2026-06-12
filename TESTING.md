# Testing

Use these commands from the repository root.

## Recommended loop

```bash
pnpm run test:api
pnpm run test:web
pnpm --dir apps/web build
pnpm run test:e2e
```

`pnpm run verify` runs the same checks in sequence.

## Notes

- `test:api` uses `python -B` so backend tests do not write Python bytecode.
- `test:web` runs Vitest unit tests only. Playwright specs live under `apps/web/e2e`.
- `test:e2e` starts an isolated FastAPI server and the Next.js dev server through Playwright.
- Playwright E2E uses mock LLM/embedding providers, a temporary SQLite database, and a temporary upload directory under the OS temp folder so local project data is not polluted.
- The core E2E flow creates a project, uploads a Markdown brief, runs an Agent, and verifies persisted files, outputs, tool calls, and memory/context navigation.
- Local connection diagnostics are available at `/health` and `/api/v1/runtime/status`. They report API, DB, Redis, storage, provider real/mock mode, and CORS origins without exposing API Key values.
- After verification, `git status --short` should not show `.next`, `__pycache__`, `playwright-report`, `test-results`, or `blob-report`.
