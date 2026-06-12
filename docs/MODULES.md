# Modules

## Repository Map

| Path | Purpose | Notes |
|---|---|---|
| `apps/web` | Next.js frontend | Pages, API client, UI components, E2E tests. |
| `apps/api` | FastAPI backend | API routes, services, schemas, models, migrations, tests. |
| `skills` | Active project skill registry | Runtime YAML skills loaded by backend. |
| `skills-main` | Reference/vendor skill package | Not the active runtime registry. Use only as reference. |
| `docs` | Project operating docs | Agent onboarding, architecture, workflows, roadmap, skills, decisions. |
| `开发文档` | Historical Chinese development docs | Keep latest/reference docs only. Older versioned reports can be pruned. |

## Backend Module Index

| Module | Key files | Responsibility |
|---|---|---|
| App startup | `apps/api/app/main.py` | FastAPI app, lifespan init, CORS, health. |
| Routing | `apps/api/app/api/v1/router.py` | Mount all `/api/v1` route modules. |
| Projects | `api/v1/projects.py`, `services/projects.py`, `models/project.py` | Project CRUD and lifecycle metadata. |
| Documents/RAG | `api/v1/documents.py`, `api/v1/rag.py`, `services/documents.py` | Upload, parse, chunk, index, retrieve project documents. |
| Memory | `api/v1/memory.py`, `services/memory.py`, `models/memory.py` | Project memory CRUD and search. |
| Agents | `api/v1/agents.py`, `services/agents.py`, `services/intent_classifier.py` | Agent run creation, skill selection, planning, output generation. |
| Providers | `services/llm.py`, `services/providers/*` | LLM and embedding abstraction. |
| Skills | `api/v1/skills.py`, `services/skills.py`, `models/skill.py` | Load YAML skills and expose registry. |
| Tools | `api/v1/tools.py`, `services/tools.py`, `models/tool_call.py`, `app/tools/registry.yaml` | Tool registry, tool calls, approval/rejection. |
| Evals | `api/v1/evals.py`, `services/evals.py`, `models/evaluation.py` | Score and feedback for agent outputs. |
| Outputs | `api/v1/outputs.py`, `services/outputs.py`, `models/output.py` | Generated artifact persistence. |
| Trace | `api/v1/trace.py`, `services/trace.py`, `models/trace_event.py` | Observability events and timelines. |
| Workflow | `api/v1/workflow.py`, `services/workflow_engine.py`, `schemas/workflow.py` | Project stage state and workflow visualization. |
| Prompts | `api/v1/prompts.py`, `services/prompts.py`, `prompts/agent_run.py` | Prompt templates and prompt metadata. |
| Storage | `services/storage.py` | Local/S3 storage abstraction. |
| Config | `core/config.py` | Environment-driven settings. |

## Frontend Module Index

| Module | Key files | Responsibility |
|---|---|---|
| Root app | `apps/web/app/layout.tsx`, `app/providers.tsx`, `app/globals.css` | App shell, providers, global styles. |
| Landing | `apps/web/app/page.tsx` | Product entry page. |
| Dashboard | `apps/web/app/dashboard/page.tsx` | Project list, stats, creation, service health. |
| Project layout | `apps/web/app/projects/[projectId]/layout.tsx` | Project workspace navigation. |
| Project overview | `apps/web/app/projects/[projectId]/page.tsx` | Project summary and recent activity. |
| Chat | `apps/web/app/projects/[projectId]/chat/page.tsx` | Agent run console and generated response view. |
| Files | `apps/web/app/projects/[projectId]/files/page.tsx` | Document upload, indexing, chunks. |
| Context | `apps/web/app/projects/[projectId]/context/page.tsx` | Context pack display. |
| Memory | `apps/web/app/projects/[projectId]/memory/page.tsx` | Project memory CRUD and search. |
| Workflow | `apps/web/app/projects/[projectId]/workflow/page.tsx` | Workflow visualization. |
| Skills | `apps/web/app/projects/[projectId]/skills/page.tsx` | Project skill registry. |
| Tools | `apps/web/app/projects/[projectId]/tools/page.tsx` | Tool list and approval flow. |
| Prompts | `apps/web/app/projects/[projectId]/prompts/page.tsx` | Prompt template display. |
| Evals | `apps/web/app/projects/[projectId]/evals/page.tsx` | Evaluation dashboard. |
| Outputs | `apps/web/app/projects/[projectId]/outputs/page.tsx` | Generated artifact preview. |
| Settings | `apps/web/app/projects/[projectId]/settings/page.tsx` | Project metadata and runtime status. |
| API client | `apps/web/lib/api-client.ts` | Central HTTP client and frontend types. |
| UI primitives | `apps/web/components/ui` | Reusable design system primitives. |
| Workflow components | `apps/web/components/workflow` | Canvas, nodes, inspector, data helpers. |
| Trace components | `apps/web/components/trace` | Timeline visualization. |

## Cross-Module Contracts

- API response wrappers must stay compatible with frontend expectations in `api-client.ts`.
- Skill YAML `required_tools` must match tool names in `registry.yaml`.
- Provider mode and mock fallback must be visible enough for user-facing trust.
- Agent runs should write trace/output/eval/tool state consistently so the UI can explain behavior.

## Do Not Confuse

- `skills`: active runtime registry.
- `skills-main`: reference package.
- `.env`: local secrets and runtime config, not documentation.
- `uploads`: local user data, not source.
- `test.db`: local artifact, not source.
