# Architecture

## System Shape

AI Innovation Agent Studio uses a frontend/backend monorepo:

- `apps/web`: Next.js 15, React 19, TypeScript, Tailwind, React Query, shadcn/Radix UI.
- `apps/api`: FastAPI, SQLAlchemy, Alembic, Pydantic schemas, provider abstractions.
- `skills`: project-level YAML skills loaded into the backend skill registry.
- `apps/api/app/tools/registry.yaml`: tool registry used by the tool gateway.
- `docker-compose.yml`: local PostgreSQL, Redis, and MinIO infrastructure.

The app is designed as an agent workbench for innovation projects. A project is the central aggregate. Most resources belong to a project: documents, memories, agent runs, trace events, evaluations, and outputs.

## Backend Layers

`apps/api/app/main.py`

- Creates the FastAPI app.
- Initializes the database during lifespan startup.
- Adds CORS for `http://localhost:3000`.
- Exposes `/health` with database, Redis, storage, and version status.

`apps/api/app/api/v1`

- Owns HTTP routing.
- Uses response wrappers from `schemas/common.py`.
- Delegates business behavior to services.

`apps/api/app/services`

- Owns domain behavior and integrations.
- Important services:
  - `projects.py`: project CRUD.
  - `documents.py`: upload, parsing, chunking, indexing.
  - `memory.py`: project memory and semantic/keyword search.
  - `agents.py`: agent run orchestration and output generation.
  - `intent_classifier.py`: task classification.
  - `llm.py` and `providers/*`: LLM and embedding provider abstraction.
  - `skills.py`: YAML skill reload and database sync.
  - `tools.py`: tool registry, tool calls, approval/rejection.
  - `trace.py`: run and project observability events.
  - `workflow_engine.py`: project stage state.
  - `storage.py`: local/S3 storage abstraction.

`apps/api/app/models`

- SQLAlchemy persistence models.
- Tables cover projects, documents, chunks, memories, skills, agent runs, tool calls, evaluations, outputs, and trace events.

`apps/api/app/schemas`

- Pydantic API contracts.
- Keep schema changes backward compatible with `apps/web/lib/api-client.ts`.

## Frontend Layers

`apps/web/app`

- Next.js App Router pages.
- Main page groups:
  - `/`: landing page.
  - `/dashboard`: project dashboard and project creation.
  - `/projects/[projectId]`: project workspace.
  - `/projects/[projectId]/chat`: agent run console.
  - `/projects/[projectId]/files`: document upload and indexing.
  - `/projects/[projectId]/workflow`: workflow canvas.
  - `/projects/[projectId]/context`: context pack view.
  - `/projects/[projectId]/memory`: project memory.
  - `/projects/[projectId]/skills`: skill registry.
  - `/projects/[projectId]/tools`: tool registry and approvals.
  - `/projects/[projectId]/prompts`: prompt templates.
  - `/projects/[projectId]/evals`: evaluation results.
  - `/projects/[projectId]/outputs`: generated artifacts.
  - `/projects/[projectId]/settings`: project settings.

`apps/web/lib/api-client.ts`

- Central frontend API boundary.
- Keep all HTTP paths and response shapes here instead of scattering fetch calls.

`apps/web/components`

- `ui`: shared UI primitives.
- `workflow`: workflow canvas components.
- `trace`: trace timeline components.
- root components include theme provider and theme toggle.

## Data Flow

1. User creates or opens a project in the dashboard.
2. User uploads documents or adds memory.
3. Backend parses documents into chunks and stores memory/document context.
4. User starts an agent run from the chat page.
5. `agents.py` builds a context pack from project data, RAG, memory, skills, and tools.
6. LLM provider returns generated content, or mock provider is used when no real provider is configured.
7. Outputs, evaluations, tool calls, workflow state, and trace events are persisted.
8. Frontend pages read the persisted state through the API client.

## Provider Strategy

The backend supports provider abstraction for LLM and embeddings. Settings live in `apps/api/app/core/config.py` and are read from `.env`.

Important settings:

- `LLM_PROVIDER`
- `LLM_MODEL`
- `LLM_BASE_URL`
- `LLM_TIMEOUT_SECONDS`
- `LLM_MAX_RETRIES`
- `EMBEDDING_PROVIDER`
- `EMBEDDING_MODEL`
- `EMBEDDING_BASE_URL`
- `EMBEDDING_DIMENSION`

When real keys are absent, the app should remain demoable through mock providers.

## Storage

`STORAGE_BACKEND=local` is the default. The S3/MinIO settings exist and Docker Compose provides local MinIO, but local storage is the safer default for development.

Do not assume MinIO is required for ordinary local verification.

## Testing Architecture

- Backend tests: `apps/api/tests`.
- Frontend unit tests: `apps/web/tests`.
- E2E tests: `apps/web/e2e`.
- Playwright starts the Next.js dev server from `apps/web/playwright.config.ts`.

Backend tests use SQLite by default through `apps/api/tests/conftest.py`, which keeps unit/integration tests fast and independent of local PostgreSQL.
