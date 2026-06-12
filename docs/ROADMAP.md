# Roadmap

## Current State

The project is a usable MVP. The core structure is present:

- Next.js frontend with dashboard and project workspace pages.
- FastAPI backend with project, document, memory, agent, skill, tool, eval, output, trace, workflow, prompt, and dashboard APIs.
- SQLAlchemy models and Alembic migrations.
- YAML-based project skill registry.
- YAML-based tool registry with approval metadata.
- Mock fallback for LLM and embedding providers.
- Backend tests, frontend unit tests, and starter Playwright E2E tests.

The main product gap is depth, not skeleton. Most screens exist, but several workflows need stronger real execution, provider setup, and E2E coverage.

## P0 Priorities

1. Real provider readiness
   - Show clear runtime status for LLM and embedding providers.
   - Make missing API keys obvious in the UI.
   - Keep mock fallback available for demos.
   - Acceptance: a user can tell whether an agent run used real or mock providers.

2. End-to-end workflow coverage
   - Add E2E coverage for create project, upload document, run agent, inspect outputs, inspect memory, and tool approval.
   - Acceptance: `pnpm run test:e2e` exercises the real MVP path, not only page loading.

3. Tool execution foundation
   - Keep the registry and approval model.
   - Add an execution abstraction for safe low-risk tools first.
   - Acceptance: at least one low-risk tool runs and persists a traceable result.

## P1 Priorities

1. Prompt management persistence
   - Replace static prompt display with backend-managed prompt templates.
   - Acceptance: prompts can be listed from the API and edited or versioned later.

2. Chat inspector
   - Add a right-side inspector for context, memory, selected skill, trace, tool calls, and eval result.
   - Acceptance: a user can understand why an agent answered the way it did.

3. Output authoring experience
   - Improve generated artifact preview and code/markdown display.
   - Consider Monaco only if the code preview experience needs editing or syntax-heavy review.

4. Storage hardening
   - Clarify local vs MinIO behavior.
   - Add tests around upload limits and allowed file extensions.

## P2 Priorities

1. Queue-backed async runs
   - Use Redis or another worker model for long-running agent tasks.
   - Acceptance: long runs do not block request/response handling.

2. CI pipeline
   - Run backend tests, frontend tests, build, and E2E checks in CI.
   - Ensure generated artifacts are not committed.

3. Skill marketplace/import workflow
   - Treat installed external skills as candidates.
   - Import only selected skills into the project registry after review.

4. Mobile polish
   - Improve project navigation and dense dashboard views on small screens.

## Known Constraints

- Without real LLM/embedding API keys, agent and semantic behavior may use mock fallback.
- `skills-main` is not the runtime registry.
- Tool registry metadata exists, but real tool execution is intentionally limited until permission and audit behavior are stronger.

## Done Definition

A roadmap item is done when:

- The owning source files are updated.
- User-facing state is visible in the UI or API.
- Tests cover the critical path.
- Documentation is updated when workflows, architecture, or operating assumptions change.
