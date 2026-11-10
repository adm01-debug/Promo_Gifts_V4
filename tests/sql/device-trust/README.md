# Device trust: isolated PostgreSQL 17 tests

Run from the repository root with the local Docker daemon and `postgres:17` image available:

```sh
python3 tests/sql/device-trust/run-tests.py --output-dir work/device-trust-sql
```

The runner validates the real migration
`supabase/migrations/20261110024530_restore_device_trust_contract.sql` and its rollback.
It creates a uniquely named container with an ownership label, `--network none` and no
published ports. SQL runs only through `docker exec` on the local Unix socket. It does
not consume `DATABASE_URL`, Supabase credentials or an external database hostname.
The final cleanup verifies ownership before removing only that container and its volumes.
The local image is required; the runner never downloads an image.

The fixture reproduces the six original columns, primary key, auth foreign key, user index
and own-user policy captured by read-only production metadata. Table/column grants and
comments are local fixture values used to verify that the migration preserves arbitrary
existing ACLs and comments. This fixture is neither a full production schema replay nor
evidence that the new field has been applied to production.

The suite executes 77 checks covering false defaults, original rows and metadata, real
non-superuser RLS behavior, ownership, anonymous denial, incompatible schemas, repeat
execution, transactional atomicity, dependency-safe rollback and independent concurrent
sessions. Rollback must refuse any trusted value, dependent index/constraint/view/policy
or generated column, and must preserve columns without its creation marker.

Results include `sql-test-results.json`, per-case SQL output in `sql-tests.log` and a
fixture log. Each result records the tested SQL hashes. A nonzero exit means a failed
assertion or unavailable local infrastructure; assertions are never skipped.

Review drafts may be tested before porting with `--preview-dir PATH`, which expects
`forward.review.sql` and `rollback.review.sql`. This option still executes only in the
same disposable local container. It does not authorize applying either file to production.
