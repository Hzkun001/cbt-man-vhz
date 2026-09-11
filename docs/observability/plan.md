# Plan — Backend Request Observability

Status: Implementation present; local gates passed. Remaining verification and
upstream submission prerequisites are tracked in `tasks.md`.

## Architecture

Reuse the existing `AppConfig` persistence row for non-secret controls without
adding observability to the shared snapshot/config DTO. Add one server-only
observability module and compose it at the existing `src/server.ts` fetch
boundary. Keep recent logs in a bounded in-memory ring buffer to avoid one
SQLite write per HTTP request.

## Files

- Add `src/lib/server/observability.ts`.
- Extend `src/server.ts` with request ID/telemetry composition.
- Extend `src/lib/cbt/types.ts` with the server-only config schema and DTO types.
- Add Super Admin config/log actions to `src/lib/server/observability.ts`.
- Extend `src/routes/_authenticated/admin.pengaturan.tsx` with controls/viewer.
- Add one additive Prisma field/migration for the JSON config.
- Add focused unit tests and update `CHANGELOG.md`.

## Reuse analysis

| Capability               | Decision                             | Reason                                                                                        |
| ------------------------ | ------------------------------------ | --------------------------------------------------------------------------------------------- |
| Settings persistence     | EXTEND `AppConfig`                   | Existing single-row config flow; only safe flags are stored, outside shared snapshots.        |
| Settings validation      | REUSE Zod conventions                | Already used at server and client boundaries.                                                 |
| Admin authorization      | REUSE `requireAdminResult`           | Existing helper is Super Admin-only.                                                          |
| Settings layout/controls | COMPOSE existing admin/UI primitives | Avoid a new route or component system.                                                        |
| Operational log storage  | CREATE bounded process-local buffer  | Avoid SQLite contention and semantic pollution of AuditLog; logs are intentionally ephemeral. |
| Exporter/tracing         | DEFER                                | No provider or requirement; no dependency yet.                                                |

## Ordered stages

1. Complete spec/decisions/tasks and Council challenge.
2. Add schema/type/config server support.
3. Add bounded recorder and request boundary integration.
4. Add settings UI and recent log viewer.
5. Add tests, changelog, and run validation gates.
6. Run final diff/security/reuse review and repair only justified findings.

## Risks and mitigations

- Process-local logs disappear on restart: document this ceiling; add durable
  storage/export only when operational requirements justify it.
- Path identifiers can leak metadata: sanitize dynamic segments and omit query.
- Malformed config can disable diagnostics: parse defensively and fail closed.
- High exam polling volume can increase CPU/memory: cap buffer and sample.
- Restore/seed paths use the migration default `{}` because observability is
  operational state, not part of the shared application snapshot.
