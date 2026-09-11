# Decisions — Backend Request Observability

## 2026-09-11

- Use SDD, because the repository already defines an SDD workflow.
- Treat PR #162 as prior art only. It was closed stale, not rejected; create a
  replacement branch and credit it rather than reviving the old branch.
- Implement request telemetry MVP, not full observability platform.
- Store only non-secret controls in `AppConfig`; keep provider credentials out
  of the database and all snapshots.
- Use a bounded in-memory ring buffer instead of writing each request to the
  SQLite-backed business audit table. This is the deliberate ceiling: logs are
  per-process and ephemeral; durable/shared telemetry is deferred until needed.
- Generate request IDs server-side rather than trusting a client header.
- Keep request telemetry separate from business AuditLog semantics.
- Submit one replacement PR after issue #150 is completed, following the
  [maintainer's sequencing instruction](https://github.com/mannnrachman/cbt-man/pull/162#issuecomment-5629341132).
  On 2026-09-11, #150 was still open and upstream had no open PRs. Prepare the
  branch first; recheck main and prerequisites before opening the PR.

## Rejected alternatives

- Full OpenTelemetry stack: no provider, exporter, or acceptance requirement.
- New database `RequestLog` model: unnecessary for the bounded MVP and adds
  migration/retention complexity.
- Reusing `AuditLog` for every request: risks lock contention, noisy audit
  history, and incorrect durability semantics.
