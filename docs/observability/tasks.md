# Tasks — Backend Request Observability

- [x] UNDERSTAND — read project rules, current architecture, settings/config,
      audit/health flow, and current Git state.
- [x] DISCOVER — verify no current observability implementation; inspect PR #162
      and upstream history.
- [x] CHALLENGE — run Council implementation, correctness, and risk reviews.
- [x] DEFINE — converge on bounded request telemetry MVP.
- [x] SPEC — write `spec.md` and acceptance criteria.
- [x] PLAN — write `plan.md` and reuse analysis.
- [x] REUSE ANALYSIS — record reuse/create decisions in `plan.md`.
- [x] TASKS — track this file.
- [x] IMPLEMENT — schema/types/server recorder/settings UI/tests/changelog.
- [x] Local gates — npm ci; lint (0 errors, 7 existing warnings); typecheck;
      156 unit tests; build; Prisma validate, migrate deploy and schema parity;
      diff and hygiene checks.
- [x] Browser smoke — settings render, save and reload; default disabled restored.
- [ ] Complete end-to-end telemetry verification — browser log viewer remained
      empty when enabled in development. Production bundle returned a UUID
      X-Request-ID on health, but request-to-viewer correlation is not yet proven.
- [ ] Complete keyboard/error-state UI checks and final independent code review.
- [ ] Open replacement PR after upstream issue #150 completes or maintainer
      explicitly authorizes parallel work, as requested in PR #162.
- [ ] Run CodeRabbit and CI on the published final head; address review findings.
