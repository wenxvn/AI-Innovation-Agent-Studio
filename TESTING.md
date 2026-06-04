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
- `test:e2e` starts the Next.js dev server through Playwright when one is not already running.
- After verification, `git status --short` should not show `.next`, `__pycache__`, `playwright-report`, `test-results`, or `blob-report`.
