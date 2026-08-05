# CartaMago Multi-Agent Operating Model

## Purpose

This document defines how CartaMago works with multiple IA agents in parallel on the multi-brand SaaS platform (10+ branches, inventory, DIAN invoicing, POS).

It extends the existing `docs/agent-operating-model.md` with the rules that make parallel agents efficient and safe.

## Core Principle

```text
One human orchestrator owns the repo and merges.
Agents work in isolated worktrees by domain.
Efficiency comes from isolation + human gating + per-agent self-validation,
not from launching more agents.
```

## Agent Roles

| Agent | Domain | Produces | Does NOT touch |
| --- | --- | --- | --- |
| Architect | Multi-tenant schema, migrations, RLS | SQL migrations, models, data contracts | UI code, feature folders |
| Backend (NestJS) | Business modules: tenant, inventory, invoicing, POS | Endpoints, services, queues (BullMQ) | SQL migrations (only consumes them), UI |
| Frontend Admin | React multi-branch admin | Components, hooks, TanStack Query | Backend, migrations |
| Public Menu | Preserves current QR flow | Slug/subdomain adaptation | Admin, backend |
| External Integrations | DIAN operator, WhatsApp API, printers | Adapters, queues, webhooks | Internal business logic |
| QA/Testing | Playwright, e2e, k6 stress | Suites and reports | Production code (only runs tests) |
| Security | RLS, auth, secrets | Policies, audit, PR review | Feature code |
| Documentation | docs/, guides | Updates docs from real changes | Code |

## Architect-Level Reasoning (no improvisation)

Any high-impact decision on the multi-brand platform must be captured as an **Architecture Decision Record (ADR)** using `docs/adr-template.md` BEFORE implementation.

This applies to:

- Schema, tenancy, or RLS changes.
- Concurrent operations (stock, invoicing, orders).
- External integrations (DIAN operator, WhatsApp API, payments).
- Decisions affecting more than one branch or module.
- Migrations touching existing production data.

The agent must answer the **10 architect questions** in the ADR before writing code: tenancy isolation, 10-branch concurrency, external failure modes, migration/rollback, source of truth, money/audit trail, reuse, scale, legal obligations, and rollback.

Small isolated changes do not need an ADR.

## Non-Collision Rules (most critical)

1. **One feature per agent per branch**, using `git worktree` (each agent has its own physical folder, e.g. `../cartamago-agent-backend`, `../cartamago-agent-admin`).
2. **Shared files** (`package.json`, `package-lock.json`, `tsconfig.*`, `netlify.toml`, `vite.config.ts`, root of `supabase/migrations/`) are touched **only by the human orchestrator or the Architect agent**.
3. **SQL migrations are sequential**: one active agent at a time; the Architect assigns numbering (`20260801xxx_*`) and no one else creates files in that folder.
4. **PR per task**: each agent opens its own PR, **no agent merges**. Only the human orchestrator merges after: build OK + tests + lint + diff review.
5. **No shadow agents**: changes that fail validation are discarded and reassigned with context, never accumulated.

## Per-Agent Cycle

Adapted from `docs/agent-operating-model.md`:

```text
Enfocar -> Ejecutar -> Validar -> Entregar diff -> Esperar merge
```

Mandatory validation checklist before opening a PR:

```text
[ ] ADR written first if the change is high-impact (see adr-template.md)
[ ] Build passes (npm run build)
[ ] Lint passes (npm run lint)
[ ] Relevant tests pass (unit/e2e per domain)
[ ] No secrets in the diff (.env, keys reviewed)
[ ] SQL migrations numbered and conflict-free with the latest
[ ] Docs updated if architecture/behavior changed
[ ] Summary in format: [change] + [files] + [build: ok/error]
```

## Daily/Weekly Flow

| Moment | Action |
| --- | --- |
| Start of day | Orchestrator assigns tasks with context (Frentes, Impacto, Cambio minimo, Validacion) |
| All day | Agents in parallel on worktrees; each validates and opens a PR |
| End of day | Orchestrator reviews PRs (diff + tests), approves or reassigns with feedback |
| Every Friday | Weekly demo (build + tests + screenshot/flow) and update of `docs/progress-dashboard.md` |

## Project Phases with Assigned Agents

| Phase | Active agents | Deliverable |
| --- | --- | --- |
| 0. Multi-tenant architecture | Architect + Security | brands/branches migrations, per-branch RLS, data contracts |
| 1. SaaS foundation | Backend + Frontend Admin + Public Menu + Security | Auth RBAC, multi-branch admin, slug/subdomain |
| 2. Inventory | Backend + Architect (recipes/movements) + QA | Stock, butchery/recipes, movements, transfers, reports |
| 3. DIAN invoicing | Integrations + Backend + Security + QA | Operator adapter, queues, credit notes, thermal tickets |
| 4. POS | Frontend Admin + Integrations + QA | Touch POS, cash close, thermal printing |

Permanent parallel agents: **QA + Security + Documentation** (transversal, not phase-bound).

## Initial Setup (~1 week)

| Task | Owner | Time |
| --- | --- | --- |
| Define per-role prompts (based on current repo prompt) | Orchestrator | 1–2 days |
| Configure `git worktree` per agent + working branches | Orchestrator | 1 day |
| Create PR template with validation checklist | Orchestrator + QA | 1 day |
| Define migration numbering rules and shared folder policy | Architect | 1 day |
| Document the model in this file and reference from AGENTS.md | Documentation | 1 day |
| **Total** | | **1 week** |

## What NOT to do

1. Do not launch 8 agents on the same working tree without worktrees (conflicts destroy efficiency).
2. Do not let two agents touch `migrations/` in parallel (sequential rule).
3. Do not skip human merge gating (IA generates fast, but business decisions are human).
4. Do not mix code agents with the testing agent in the same folder (QA only reports, never fixes).
5. Do not ignore secret audit (an agent can copy a key into the wrong file; Security reviews the full diff before merge).

## Impact on Estimates

| Metric | Without multi-agent | With multi-agent model |
| --- | --- | --- |
| Multi-brand foundation | 3–5 weeks / $60M–$120M COP | 2–3 weeks / $45M–$80M COP |
| Inventory | 5–8 weeks | 4–6 weeks |
| DIAN invoicing (code) | 6–10 weeks | 5–8 weeks |
| POS v1 | 4–6 weeks | 3–5 weeks |
| Total projected cost with agents | $420M–$756M COP | $350M–$600M COP |
| Total time | 5–7 months | 4.5–6 months (external DIAN enablement remains the bottleneck) |