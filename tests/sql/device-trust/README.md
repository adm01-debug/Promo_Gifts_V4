# Device trust: isolated PostgreSQL 17 tests

Run from the repository root with the local Docker daemon available (image `postgres:17.6`,
the same one used by Gate 2.5):

```sh
npm run test:device-trust:postgres
```

The runner validates the real migration
`supabase/migrations/20261114031000_fix_user_known_devices_is_trusted.sql` and its rollback
`supabase/rollbacks/20261114031000_rollback.sql`.
It creates a uniquely named container with an ownership label, `--network none` and no
published ports. SQL runs only through `docker exec` on the local Unix socket. It does
not consume `DATABASE_URL`, Supabase credentials or an external database hostname.
The final cleanup verifies ownership before removing only that container and its volumes.
Without a Docker daemon it follows `scripts/lib/missing-prerequisite.sh`: strict failure in CI
(`CI`/`GITHUB_ACTIONS` true, or `REQUIRE_LIVE=1`) and an explicit `static-pass` locally.

The fixture reproduces the six original columns, primary key, auth foreign key, user index
and own-user policy captured by read-only production metadata. Table/column grants and
comments are local fixture values used to verify that the migration preserves arbitrary
existing ACLs and comments. This fixture is neither a full production schema replay nor
evidence that the new field has been applied to production.

The suite executes 55 checks covering false defaults, original rows and metadata, real
non-superuser RLS behavior, ownership, anonymous denial, repeat execution, transactional
atomicity, dependency-safe rollback and independent concurrent sessions. The rollback backs
the trusted rows up before dropping the column, and its `RESTRICT` must refuse to drop while
a dependent view, RLS policy or generated column exists.

Results include `sql-test-results.json`, per-case SQL output in `sql-tests.log` and a
fixture log. Each result records the tested SQL hashes. A nonzero exit means a failed
assertion; assertions are never skipped once the daemon is available.

Review drafts may be tested before porting with `--preview-dir PATH`, which expects
`forward.review.sql` and `rollback.review.sql`. This option still executes only in the
same disposable local container. It does not authorize applying either file to production.
