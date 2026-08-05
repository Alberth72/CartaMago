# Architecture Decision Record (ADR) — Template

## Purpose

Any high-impact decision on the multi-brand platform (10+ branches, inventory, DIAN invoicing, POS) must be captured as an ADR BEFORE implementation. No improvisation.

The architect-level reasoning happens here: we think about the whole system, its failure modes, concurrency, tenancy, and migration impact before writing code.

## When an ADR is required

- Any schema, tenancy, or RLS change.
- Any concurrent operation (stock, invoicing, orders).
- Any external integration (DIAN operator, WhatsApp API, payments).
- Any decision that affects more than one branch or more than one module.
- Any migration that touches existing production data.

Small, isolated changes do not need an ADR. When in doubt, write the ADR.

## ADR Template

```markdown
# ADR-XXX: [Decision title]

Status: [Proposed | Accepted | Superseded by ADR-XXX]
Date: YYYY-MM-DD
Scope: [Module / Schema / Integration]

## Context

[The problem as it exists TODAY across all 10 branches.
 Include the real failure we are avoiding. No theory.]

## Decision

[The concrete choice. What changes and where.]

## Consequences

[What breaks, what must be migrated, what old behavior dies.]

## Concurrency & Failure Mode Analysis

[What happens when 10 branches operate at the same time?
 What happens when [the DIAN operator / the DB / the printer / the network] fails?
 How is data kept consistent?]
```

## The Architect Questions (answer before ANY code)

1. **Tenancy**: How does this preserve the rule that a cashier of branch 3 cannot see or write branch 8 data?
2. **Concurrency**: What happens if 10 branches execute this operation simultaneously? Is there a double-spend, a negative stock, a duplicated invoice number?
3. **Failure**: What happens if the external system (DIAN operator, WhatsApp API) fails mid-operation? Is the state recoverable?
4. **Migration**: What happens to the data that exists today? Is this additive or destructive? Is there a rollback path?
5. **Consistency**: Is the source of truth the database, the API, or a queue? Can two sources disagree?
6. **Money**: Where is money affected (prices, taxes, cash close, invoices)? What is the audit trail?
7. **Reuse**: Does this duplicate something another module already does? Does it break another agent's work?
8. **Scale**: Is this decision correct for 10 branches, or only for 1?
9. **Legal**: Does this touch DIAN/legal obligations (invoicing, IVA, inventory for responsible de IVA)?
10. **Rollback**: How do we undo this in production if it fails?

## Verification Gate

```text
[ ] ADR written BEFORE code
[ ] 10 architect questions answered explicitly
[ ] Migration plan (additive/destructive) documented
[ ] Rollback path documented
[ ] Concurrency scenario simulated or reasoned
[ ] Human orchestrator reviewed the ADR
```

## ADR Index

| ADR | Title | Status | Date |
| --- | --- | --- | --- |
| ADR-001 | Multi-tenant schema (brands/branches) | Proposed | |
| ADR-002 | Inventory as transactional module (NestJS) | Proposed | |
| ADR-003 | DIAN invoicing via authorized operator | Proposed | |
| ADR-004 | POS/per-branch cash close model | Proposed | |