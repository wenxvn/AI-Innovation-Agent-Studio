# Skill Usage Guide

## Principle

Do not read all installed skills by default. This project needs a curated selection process:

1. Read this file.
2. Use project runtime skills from `skills` for product behavior.
3. Use Codex/session skills only when the current task calls for them.
4. Treat `skills-main` as reference material, not the active runtime registry.
5. Import or adapt external skills only after checking tool permissions, risk level, and product fit.

## Project Runtime Skills

The backend loads project skills from `skills/<name>/skill.yaml`.

| Skill | Category | Default use |
|---|---|---|
| `competition-analyzer` | analysis | Analyze competition briefs, scoring rules, constraints, and opportunities. |
| `idea-generator` | ideation | Generate project ideas from requirements, preferences, and trend signals. |
| `research-synthesizer` | research | Summarize research material and extract useful evidence. |
| `prd-writer` | product | Convert project goals and context into structured PRDs. |
| `architecture-designer` | architecture | Produce system architecture, module boundaries, database, and API design. |
| `api-designer` | architecture | Design API contracts and backend route structure. |
| `fastapi-generator` | coding | Generate FastAPI service/API code patterns. |
| `nextjs-generator` | coding | Generate Next.js UI/page/component code patterns. |
| `context-pack-builder` | infrastructure | Build context packs from documents, memory, and project state. |
| `qa-debugger` | quality | Generate QA checks, bug analysis, and testing plans. |
| `pitch-writer` | presentation | Create pitch decks, demo scripts, and competition presentation material. |

## Session Skill Selection

Use these Codex/session skills when the task matches:

| Task | Skill |
|---|---|
| Debugging, failed tests, regressions | `diagnose` |
| UI design or frontend experience | `design-an-interface` |
| Browser interaction, screenshots, local frontend verification | `browser:control-in-app-browser` through the Browser plugin |
| OpenAI API, ChatGPT Apps, Agents SDK, model docs | `openai-docs` |
| Deployment, CI, production release | `deploy-pipeline` and provider-specific deploy skills |
| Creating or revising a slide deck | Presentations plugin skills |
| Spreadsheet work | Spreadsheets plugin skills |
| Word/PDF/document artifacts | Documents plugin skills |

## Skill Import Criteria

Before adding a skill from the installed 972-skill pool into this project:

- It must support one of the core project workflows: ideation, research, PRD, architecture, implementation, QA, pitch, deployment, data import, or provider integration.
- It must have a clear trigger and expected output.
- Its required tools must exist in `apps/api/app/tools/registry.yaml` or be added with risk metadata.
- High-risk capabilities must require approval.
- It must not duplicate an existing project skill unless it replaces it with a better maintained implementation.

## Recommended Candidate Groups

For this project, useful external skill groups are likely:

- OpenAI and LLM provider integration.
- Browser/webapp testing.
- Figma or interface design.
- Deployment and Cloudflare/hosting workflows.
- Document, PDF, PowerPoint, and spreadsheet artifact generation.
- Changelog and release note generation.
- Data extraction or research automation when a user explicitly requests external data.

## Avoid By Default

Avoid importing skills that are unrelated to the product domain, require credentials the project does not manage, perform high-risk file/database operations without approval, or duplicate project-specific skills.

## Maintenance Rule

When a skill is added, changed, or removed:

1. Update `skills/<skill-name>/skill.yaml`.
2. Update this file if it changes the recommended selection policy.
3. Run `pnpm run test:api`.
4. Verify the Skills page or reload API can read the registry.
