# Test Report

Date: 2026-06-12

## Baseline

Before documentation cleanup, these checks passed:

```bash
pnpm run test:api
pnpm run test:web
```

Results:

- Backend: 59 passed.
- Frontend Vitest: 4 passed.

## Required Final Verification

Final verification after documentation and cleanup:

```bash
pnpm run test:api
pnpm run test:web
pnpm --dir apps/web build
pnpm run test:e2e
```

Results:

- Backend tests: 59 passed.
- Frontend Vitest: 4 passed.
- Production build: passed. Next.js compiled all app routes successfully.
- Playwright E2E: 4 passed.
- Controlled backend smoke: 26 checks passed through FastAPI TestClient.
- Controlled frontend route smoke: 14 routes loaded on an isolated Next dev port with no page-level errors.

Backend smoke covered:

- health
- project create/list/get/update/delete
- memory create/list/search
- document upload/list/chunks
- RAG search
- skill reload/list
- tools list
- prompts list
- dashboard stats
- agent run/list/get
- trace retrieval
- workflow retrieval
- outputs list
- eval run/list

Notes:

- Playwright reported that port 3000 was already occupied during the standard E2E run. The tests still passed. A separate route smoke was run on an isolated frontend port afterward to verify the current frontend code path.
- No temporary smoke database, upload directory, or log files are required after the run.
