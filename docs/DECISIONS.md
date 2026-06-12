# Decisions

This file records durable project decisions. Add new entries when a decision changes architecture, workflow, or long-term maintenance.

## 001. Use A Monorepo

Decision: keep frontend, backend, project skills, scripts, and docs in one repository.

Reason:

- The product is a tightly coupled agent studio.
- API contracts and frontend pages evolve together.
- Local verification is simpler with root scripts.

Consequence:

- Keep root scripts stable.
- Avoid hidden cross-package dependencies.

## 002. Keep Runtime Skills YAML-First

Decision: project runtime skills live in `skills/<name>/skill.yaml`.

Reason:

- Skills are product data, not hardcoded source.
- The backend can reload skills from disk and sync to the database.
- The UI can expose skill metadata directly.

Consequence:

- Do not scan every installed skill by default.
- Treat external skill packages as candidates, not runtime state.

## 003. Keep Tool Metadata In YAML

Decision: tool metadata lives in `apps/api/app/tools/registry.yaml`.

Reason:

- Tool risk and approval behavior should be reviewable.
- The agent runtime needs a registry before tool execution is fully implemented.

Consequence:

- High-risk tools must require approval.
- Real execution must be added behind traceable service boundaries.

## 004. Support Mock Provider Fallback

Decision: the app remains demoable when no real LLM or embedding provider is configured.

Reason:

- Local setup should not require paid API keys.
- Competition/demo flows need predictable fallback behavior.

Consequence:

- UI should clearly show when mock mode is active.
- Tests should not require real provider credentials.

## 005. Prefer Service-Layer Logic

Decision: API routes stay thin and delegate behavior to `apps/api/app/services`.

Reason:

- Services are easier to test.
- Business behavior can be reused across API routes, background jobs, and future workers.

Consequence:

- New API behavior should include a service function.
- Tests should target services or route behavior depending on risk.

## 006. Keep Local Storage As Default

Decision: `STORAGE_BACKEND=local` is the default development mode.

Reason:

- It reduces setup friction.
- MinIO/S3 is useful but not required for core MVP verification.

Consequence:

- Upload behavior must work locally without Docker.
- S3 settings should stay optional and documented.

## 007. Use SQLite For Backend Tests By Default

Decision: backend tests use SQLite unless `TEST_DATABASE_URL` is explicitly set.

Reason:

- Tests remain fast and deterministic.
- CI and local test runs do not require PostgreSQL.

Consequence:

- Database-specific behavior needs separate coverage when introduced.

## 008. Keep Documentation As Agent Onboarding

Decision: `AGENTS.md` and `docs/*` are treated as operating context for future agents.

Reason:

- The project has many files and many available skills.
- A stable read order prevents repeated full-folder scans.

Consequence:

- Architecture, workflow, roadmap, and skill policy changes should update docs in the same change.
