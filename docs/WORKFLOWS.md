# Workflows

## Local Development

From the repository root:

```bash
pnpm install
pnpm run dev
```

The root `dev` script starts the web app only. For full local backend usage, start the API separately:

```bash
cd apps/api
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Optional infrastructure:

```bash
docker compose up -d
```

The Windows convenience scripts are:

- `start.bat`: one-click local startup.
- `stop.bat`: stop local services.

## Feature Workflow

1. Read `AGENTS.md`, `docs/ARCHITECTURE.md`, and `docs/MODULES.md`.
2. Identify the owning module and API contract.
3. Check whether a matching service test already exists.
4. Make the smallest module-scoped change.
5. Update `apps/web/lib/api-client.ts` if response contracts change.
6. Add or update tests.
7. Run the relevant verification commands.
8. Update `docs/ROADMAP.md` if the feature changes current priorities.

## Backend API Workflow

For a new backend capability:

1. Add or update SQLAlchemy models if persistence is needed.
2. Add Alembic migration when table/column shape changes.
3. Add or update Pydantic schemas.
4. Implement service behavior in `apps/api/app/services`.
5. Add API route in `apps/api/app/api/v1`.
6. Mount the router in `apps/api/app/api/v1/router.py` if it is a new route module.
7. Add backend tests under `apps/api/tests`.
8. Run `pnpm run test:api`.

## Frontend Workflow

For a user-facing page or component:

1. Update the page under `apps/web/app`.
2. Keep API calls in `apps/web/lib/api-client.ts`.
3. Reuse primitives from `apps/web/components/ui`.
4. Use existing visual language: restrained workbench UI, compact controls, clear data states.
5. Add loading, empty, and error states for API-backed views.
6. Run `pnpm run test:web` and `pnpm --dir apps/web build`.
7. For navigation or core workflow changes, run `pnpm run test:e2e`.

## Agent Runtime Workflow

For agent behavior changes:

1. Inspect `apps/api/app/services/agents.py`.
2. Check `intent_classifier.py`, `prompts.py`, `memory.py`, `documents.py`, and `workflow_engine.py` for adjacent effects.
3. Keep provider-specific logic inside `services/providers`.
4. Persist meaningful run state in agent runs, outputs, tool calls, evaluations, and trace events.
5. Add tests for selected skill, intent classification, output creation, and trace behavior.

## Skill Registry Workflow

Project skills are YAML-first:

1. Add or update `skills/<skill-name>/skill.yaml`.
2. Add `SKILL.md` only when the skill needs longer operating instructions.
3. Keep required tools aligned with `apps/api/app/tools/registry.yaml`.
4. Run backend tests for skill loading.
5. Use the Skills page or API reload endpoint to sync from disk during local manual testing.

## Tool Workflow

Tools are registry-first:

1. Add tool metadata to `apps/api/app/tools/registry.yaml`.
2. Mark high-risk tools with `requires_approval: true`.
3. Implement real execution only behind explicit permission and trace logging.
4. Add tests for listing, approval, rejection, and execution status.

## Bugfix Workflow

Use the `diagnose` skill discipline:

1. Build a fast reproducible loop.
2. Capture the exact failure.
3. Form falsifiable hypotheses.
4. Instrument only where needed.
5. Fix and add a regression test at the right seam.
6. Remove temporary instrumentation.
7. Re-run the original loop and the relevant suite.

## Verification Matrix

Use this matrix to choose checks:

| Change type | Required checks |
|---|---|
| Docs only | Manual review, optionally no tests |
| Backend service/API | `pnpm run test:api` |
| Frontend unit/API client | `pnpm run test:web`, `pnpm --dir apps/web build` |
| User-facing page flow | `pnpm run test:web`, `pnpm --dir apps/web build`, `pnpm run test:e2e` |
| Cross-stack feature | `pnpm run verify` |
| Dependency or config | `pnpm run verify` and manual startup when practical |

## Release Readiness

Before calling a change ready:

- `git status --short` contains only intended changes.
- No generated artifacts are added: `.next`, `__pycache__`, `playwright-report`, `test-results`, `blob-report`, local `.db` files.
- Tests relevant to the changed surface pass.
- User-facing changes have been checked in a browser when possible.
