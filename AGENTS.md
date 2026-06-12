# Agent Entry Guide

This file is the first stop for any AI agent working in this repository. Read it before scanning the tree.

## Project Snapshot

AI Innovation Agent Studio is a monorepo for a multi-agent project incubator. It helps users turn an idea, competition brief, research note, or prototype request into structured outputs such as PRDs, architecture plans, code artifacts, evaluations, traces, and pitch material.

The current product shape is a usable MVP:

- Frontend: Next.js App Router in `apps/web`
- Backend: FastAPI in `apps/api`
- Data: SQLAlchemy models and Alembic migrations
- Agent runtime: custom service layer with LLM provider fallback
- Project skills: YAML registry in `skills`
- Tool registry: YAML registry in `apps/api/app/tools/registry.yaml`

## Read Order

Read these files in order before making architectural or workflow decisions:

1. `docs/ARCHITECTURE.md`
2. `docs/MODULES.md`
3. `docs/WORKFLOWS.md`
4. `docs/SKILLS.md`
5. `docs/ROADMAP.md`
6. `docs/DECISIONS.md`
7. `TESTING.md`

Only inspect source files after the relevant module is identified.

## Runtime Map

- `apps/api/app/main.py` creates the FastAPI app, lifespan, CORS, logging, root route, and health route.
- `apps/api/app/api/v1/router.py` mounts all API routers under `/api/v1`.
- `apps/api/app/services` contains business logic for projects, documents, memory, agents, tools, evals, trace, workflow, storage, and providers.
- `apps/api/app/models` and `apps/api/app/schemas` define persistence and API contracts.
- `apps/web/app` contains pages and route segments.
- `apps/web/lib/api-client.ts` is the frontend API boundary.
- `apps/web/components` contains reusable UI, workflow, and trace components.

## Workflows

Use the existing scripts from the repository root:

```bash
pnpm run test:api
pnpm run test:web
pnpm --dir apps/web build
pnpm run test:e2e
```

`pnpm run verify` runs the full verification sequence.

For backend-only changes, run `pnpm run test:api`. For frontend API client or page changes, run `pnpm run test:web` and `pnpm --dir apps/web build`. For user-facing navigation changes, also run `pnpm run test:e2e`.

## Skill Policy

Do not scan all installed skills by default. Start with `docs/SKILLS.md`.

Project runtime skills live in `skills`. The large `skills-main` directory is a reference/vendor skill package and is not the active runtime registry. Use it only when a task explicitly needs those reference implementations.

For Codex/session skills, select by task type:

- Debugging and test failures: `diagnose`
- Frontend interface work: `design-an-interface` and Browser plugin verification
- OpenAI API or ChatGPT Apps work: `openai-docs`
- Deployment work: `deploy-pipeline` or provider-specific deployment skills
- Slide/document/spreadsheet artifacts: the matching plugin skill

## Guardrails

- Do not overwrite user changes. Check `git status --short` before broad edits.
- Do not edit `.env` unless the user explicitly asks.
- Do not delete user data in `uploads`, local databases, or IDE settings unless the user explicitly confirms the target.
- Keep registry paths stable: `skills` and `apps/api/app/tools/registry.yaml`.
- Add tests when changing shared service logic, API contracts, or frontend workflows.
- Prefer small, module-scoped changes over broad refactors.

## Current Next Work

Use `docs/ROADMAP.md` for priorities. The highest-value work is:

- Improve real LLM and embedding provider setup and status feedback.
- Implement real tool execution behind the existing approval model.
- Strengthen E2E coverage for project creation, agent run, document upload, memory, tools, and outputs.
- Replace static prompt display with backend-managed prompt templates.
