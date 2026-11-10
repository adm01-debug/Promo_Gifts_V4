#!/usr/bin/env python3
"""Validate device-trust SQL in an owned, disposable, offline PostgreSQL 17.

No DATABASE_URL, Supabase credentials, external database host or published port
is used. The only transport is docker exec through the local Docker socket.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import os
from pathlib import Path
import select
import subprocess
import time
import uuid

HERE = Path(__file__).resolve().parent
REPO = HERE.parents[2]
MIGRATION = REPO / 'supabase/migrations/20261110024530_restore_device_trust_contract.sql'
ROLLBACK = REPO / 'supabase/rollbacks/20261110024530_rollback.sql'
DOCKER = ['docker', '--host=unix:///var/run/docker.sock']
SELECTORS = ('DOCKER_HOST', 'DOCKER_CONTEXT', 'DOCKER_TLS', 'DOCKER_TLS_VERIFY', 'DOCKER_CERT_PATH')
ENV = {key: value for key, value in os.environ.items() if key not in SELECTORS}
OWNER_LABEL = 'codex.device-trust-test'
A = '00000000-0000-0000-0000-000000000001'
B = '00000000-0000-0000-0000-000000000002'
DA = '10000000-0000-0000-0000-000000000001'
DB = '10000000-0000-0000-0000-000000000002'
NEW = '10000000-0000-0000-0000-000000000003'
TABLE = 'public.user_known_devices'
MARKER = 'proposal:user-known-devices-is-trusted:created'
HAS_COLUMN = "EXISTS(SELECT 1 FROM pg_attribute WHERE attrelid='public.user_known_devices'::regclass AND attname='is_trusted' AND attnum>0 AND NOT attisdropped)"
COLUMN_COMMENT = "col_description('public.user_known_devices'::regclass,(SELECT attnum FROM pg_attribute WHERE attrelid='public.user_known_devices'::regclass AND attname='is_trusted' AND NOT attisdropped))"
CONTRACT = "EXISTS(SELECT 1 FROM pg_attribute a JOIN pg_attrdef d ON d.adrelid=a.attrelid AND d.adnum=a.attnum WHERE a.attrelid='public.user_known_devices'::regclass AND a.attname='is_trusted' AND a.atttypid='boolean'::regtype AND a.attnotnull AND pg_get_expr(d.adbin,d.adrelid)='false')"


def docker(*args: str, **kwargs):
    return subprocess.run(DOCKER + list(args), env=ENV, text=True, capture_output=True, **kwargs)


def cleanup_owned_container(container_id: str, token: str) -> None:
    inspected = docker('inspect', '--format', '{{json .Config.Labels}}', container_id)
    if inspected.returncode or json.loads(inspected.stdout).get(OWNER_LABEL) != token:
        raise RuntimeError('Container ownership could not be verified; no container was removed.')
    removed = docker('rm', '--force', '--volumes', container_id)
    if removed.returncode:
        raise RuntimeError('Could not remove the owned disposable container: ' + removed.stderr)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output-dir', type=Path, default=Path('work/device-trust-sql'))
    parser.add_argument('--preview-dir', type=Path,
                        help='Review drafts only; default validates the real repository migration and rollback.')
    args = parser.parse_args()
    output = args.output_dir.resolve()
    output.mkdir(parents=True, exist_ok=True)
    forward = args.preview_dir / 'forward.review.sql' if args.preview_dir else MIGRATION
    rollback = args.preview_dir / 'rollback.review.sql' if args.preview_dir else ROLLBACK
    for path in (HERE / 'fixture.sql', forward, rollback):
        if not path.is_file() or not path.read_text().strip():
            raise RuntimeError(f'Required reviewed SQL is missing or empty: {path}')
    token = uuid.uuid4().hex
    started = docker('run', '--pull=never', '--name', 'device-trust-test-' + token[:12],
                     '--label', OWNER_LABEL + '=' + token, '--network', 'none',
                     '--env', 'POSTGRES_HOST_AUTH_METHOD=trust', '--detach', 'postgres:17')
    if started.returncode:
        raise RuntimeError('Local PostgreSQL 17 image/daemon unavailable: ' + started.stderr)
    container = started.stdout.strip()
    try:
        return run_cases(container, output, forward, rollback)
    finally:
        cleanup_owned_container(container, token)


def run_cases(container: str, output: Path, forward: Path, rollback: Path) -> int:
    fwd, back = forward.read_text(), rollback.read_text()
    results = []
    transcript = []
    psql = ['exec', '-i', container, 'psql', '-X', '-q', '-A', '-t', '-U', 'postgres',
            '-v', 'ON_ERROR_STOP=1']

    def sql(body, uid=None, role=None):
        prefix = '\\set VERBOSITY verbose\n'
        if role:
            prefix += f'SET ROLE {role};\n'
        if uid is not None:
            prefix += f"SELECT set_config('request.jwt.claim.sub','{uid}',false);\n"
        return docker(*psql, input=prefix + body)

    def record(name, passed, **details):
        results.append({'case': name, 'passed': bool(passed), **details})
        print(('PASS ' if passed else 'FAIL ') + name, flush=True)

    def case(name, body, expected='t', state=None, uid=None, role=None):
        response = sql(body, uid, role)
        lines = response.stdout.strip().splitlines()
        last = lines[-1] if lines else ''
        passed = ((response.returncode == 0 and (expected is None or last == str(expected)))
                  if state is None else response.returncode != 0 and f'{state}:' in response.stderr)
        record(name, passed, exitCode=response.returncode, expected=expected,
               expectedSQLSTATE=state, output=last, error=response.stderr.strip())
        transcript.append(name + '\n' + response.stdout + response.stderr)
        return response

    def transaction(body):
        return 'BEGIN;\n' + body + '\nROLLBACK;'

    def async_sql(body):
        process = subprocess.Popen(DOCKER + psql, env=ENV, text=True,
                                   stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        process.stdin.write(body)
        process.stdin.close()
        process.stdin = None
        deadline = time.monotonic() + 10
        while time.monotonic() < deadline:
            readable, _, _ = select.select([process.stdout], [], [], 0.1)
            if readable:
                line = process.stdout.readline()
                if line.strip() == 'synchronized':
                    return process
                if not line:
                    break
        process.kill()
        raise RuntimeError('Local concurrency session did not reach synchronization marker.')

    def finish(process, name):
        stdout, stderr = process.communicate(timeout=10)
        record(name, process.returncode == 0, exitCode=process.returncode, output=stdout, error=stderr)

    deadline = time.monotonic() + 30
    while time.monotonic() < deadline:
        if docker('exec', container, 'pg_isready', '-U', 'postgres').returncode == 0:
            break
        time.sleep(0.25)
    else:
        raise RuntimeError('Disposable PostgreSQL did not become ready in 30 seconds.')
    setup = sql((HERE / 'fixture.sql').read_text())
    (output / 'fixture.log').write_text(setup.stdout + setup.stderr)
    if setup.returncode:
        raise RuntimeError('Local fixture failed: ' + setup.stderr)

    case('PostgreSQL 17 is used', "SELECT current_setting('server_version_num')::int BETWEEN 170000 AND 179999;")
    case('Authenticated test role cannot bypass RLS', "SELECT NOT rolsuper AND NOT rolbypassrls FROM pg_roles WHERE rolname='authenticated';")
    case('Rollback before forward preserves minimal table', back + f'\nSELECT NOT {HAS_COLUMN} AND count(*)=2 FROM {TABLE};')
    case('Empty minimal table gains false default', transaction(f'TRUNCATE {TABLE};\n' + fwd + f'\nSELECT {CONTRACT} AND count(*)=0 FROM {TABLE};'))
    case('1001 existing rows retain IDs and receive false', transaction(
        f"INSERT INTO {TABLE}(id,user_id,fingerprint) SELECT md5(x::text)::uuid,'{A}','bulk-'||x FROM generate_series(1,1001)x;\n" + fwd +
        f"\nSELECT count(*)=1003 AND count(*) FILTER(WHERE is_trusted IS FALSE)=1003 AND count(DISTINCT id)=1003 FROM {TABLE};"))
    case('Forward is transactionally reversible', 'BEGIN;\n' + fwd + f'\nROLLBACK; SELECT NOT {HAS_COLUMN};')
    case('Forward adds boolean NOT NULL DEFAULT false', fwd + f'\nSELECT {CONTRACT};')
    case('Original rows preserve every original value', f"SELECT (SELECT jsonb_agg(to_jsonb(d)-'is_trusted' ORDER BY id) FROM {TABLE} d)=(SELECT data FROM public.test_device_rows_before);")
    case('Existing trust initializes false', f'SELECT count(*)=2 AND bool_and(is_trusted IS FALSE) FROM {TABLE};')
    case('Owned creation marker is recorded', f"SELECT {COLUMN_COMMENT}='{MARKER}';")
    case('Exactly one column appended to original schema', f"SELECT array_agg(attname ORDER BY attnum)=ARRAY['id','user_id','fingerprint','device_name','last_seen_at','created_at','is_trusted']::name[] FROM pg_attribute WHERE attrelid='{TABLE}'::regclass AND attnum>0 AND NOT attisdropped;")
    for field in ('columns', 'constraints', 'indexes', 'policies', 'table'):
        case('Preserves original metadata: ' + field,
             f"SELECT public.test_device_metadata()->'{field}'=(SELECT metadata->'{field}' FROM public.test_device_before);")
    case('RLS remains enabled and not forced', f"SELECT relrowsecurity AND NOT relforcerowsecurity FROM pg_class WHERE oid='{TABLE}'::regclass;")
    case('Anonymous has no SELECT or UPDATE grant', f"SELECT NOT has_table_privilege('anon','{TABLE}','SELECT') AND NOT has_table_privilege('anon','{TABLE}','UPDATE');")
    case('Owner can trust own device', f"WITH changed AS(UPDATE {TABLE} SET is_trusted=true WHERE id='{DA}' RETURNING is_trusted) SELECT count(*)=1 AND bool_and(is_trusted) FROM changed;", uid=A, role='authenticated')
    case('Other user update returns zero rows', f"WITH changed AS(UPDATE {TABLE} SET is_trusted=true WHERE id='{DA}' RETURNING id) SELECT count(*) FROM changed;", expected=0, uid=B, role='authenticated')
    case('Other user cannot read owners device', f"SELECT count(*) FROM {TABLE} WHERE id='{DA}';", expected=0, uid=B, role='authenticated')
    case('Missing auth uid update returns zero rows', f'WITH changed AS(UPDATE {TABLE} SET is_trusted=true RETURNING id) SELECT count(*) FROM changed;', expected=0, uid='', role='authenticated')
    case('Anonymous cannot select', f'SELECT * FROM {TABLE};', state='42501', uid='', role='anon')
    case('Anonymous cannot update', f'UPDATE {TABLE} SET is_trusted=true;', state='42501', uid='', role='anon')
    case('Forged owner INSERT is rejected', f"INSERT INTO {TABLE}(id,user_id,fingerprint) VALUES('{NEW}','{B}','forged');", state='42501', uid=A, role='authenticated')
    case('New own device defaults false', transaction(f"INSERT INTO {TABLE}(id,user_id,fingerprint) VALUES('{NEW}','{A}','new'); SELECT NOT is_trusted FROM {TABLE} WHERE id='{NEW}';"), uid=A, role='authenticated')
    case('Owner can revoke trust', f"UPDATE {TABLE} SET is_trusted=false WHERE id='{DA}'; SELECT NOT is_trusted FROM {TABLE} WHERE id='{DA}';", uid=A, role='authenticated')
    case('NULL trust is rejected', f"UPDATE {TABLE} SET is_trusted=NULL WHERE id='{DA}';", state='23502', uid=A, role='authenticated')
    case('Existing primary key still rejects duplicates', f"INSERT INTO {TABLE}(id,user_id,fingerprint) VALUES('{DA}','{A}','dup');", state='23505', uid=A, role='authenticated')
    case('Existing auth foreign key still rejects missing user', f"INSERT INTO {TABLE}(user_id,fingerprint) VALUES('00000000-0000-0000-0000-000000000099','missing');", state='23503')
    case('Forward rerun preserves owned true and false values', transaction(f"UPDATE {TABLE} SET is_trusted=true WHERE id='{DA}';\n" + fwd + f"\nSELECT count(*) FILTER(WHERE is_trusted)=1 AND count(*) FILTER(WHERE NOT is_trusted)=1 AND {COLUMN_COMMENT}='{MARKER}' FROM {TABLE};"))
    case('Compatible unowned column retains comment and values', transaction(f"COMMENT ON COLUMN {TABLE}.is_trusted IS 'pre-existing independent column'; UPDATE {TABLE} SET is_trusted=true WHERE id='{DA}';\n" + fwd + f"\nSELECT {COLUMN_COMMENT}='pre-existing independent column' AND is_trusted FROM {TABLE} WHERE id='{DA}';"))
    case('Rollback preserves compatible unowned column', transaction(f"COMMENT ON COLUMN {TABLE}.is_trusted IS 'unowned'; UPDATE {TABLE} SET is_trusted=true WHERE id='{DA}';\n" + back + f"\nSELECT {HAS_COLUMN} AND {COLUMN_COMMENT}='unowned' AND is_trusted FROM {TABLE} WHERE id='{DA}';"))
    case('Future extra columns and data survive forward', transaction(f"ALTER TABLE {TABLE} ADD COLUMN future_note text DEFAULT 'future-data';\n" + fwd + f"\nSELECT count(*)=2 AND bool_and(future_note='future-data') FROM {TABLE};"))
    case('Same table name in other schema remains unchanged', transaction("CREATE SCHEMA shadow; CREATE TABLE shadow.user_known_devices(value text); INSERT INTO shadow.user_known_devices VALUES('untouched');\n" + fwd + "\nSELECT value='untouched' FROM shadow.user_known_devices;"))
    case('Missing public table fails closed', transaction(f'ALTER TABLE {TABLE} RENAME TO moved_devices;\n' + fwd), state='P0001')
    for name, spec in (
        ('nullable boolean', 'boolean DEFAULT false'),
        ('integer', 'integer NOT NULL DEFAULT 0'),
        ('text', "text NOT NULL DEFAULT 'false'"),
        ('default true', 'boolean NOT NULL DEFAULT true'),
        ('missing default', 'boolean NOT NULL DEFAULT false'),
        ('nullable without default', 'boolean'),
    ):
        remove_default = f'ALTER TABLE {TABLE} ALTER COLUMN is_trusted DROP DEFAULT;\n' if name == 'missing default' else ''
        case('Incompatible ' + name + ' fails without conversion', transaction(f'ALTER TABLE {TABLE} DROP COLUMN is_trusted; ALTER TABLE {TABLE} ADD COLUMN is_trusted {spec};\n' + remove_default + fwd), state='P0001')
    case('Failed guard transactions preserve original contract/data', f"SELECT {CONTRACT} AND count(*)=2 AND bool_and(NOT is_trusted) AND public.test_device_metadata()=(SELECT metadata FROM public.test_device_before) FROM {TABLE};")
    case('Rollback removes only owned all-false column', transaction(back + f'\nSELECT NOT {HAS_COLUMN} AND public.test_device_metadata()=(SELECT metadata FROM public.test_device_before);'))
    case('Repeated rollback is a no-op', transaction(back + '\n' + back + f'\nSELECT NOT {HAS_COLUMN} AND count(*)=2 FROM {TABLE};'))
    case('Rollback preserves original row data', transaction(back + f'\nSELECT (SELECT jsonb_agg(to_jsonb(d) ORDER BY id) FROM {TABLE} d)=(SELECT data FROM public.test_device_rows_before);'))
    case('Rollback refuses trusted user decisions', transaction(f"UPDATE {TABLE} SET is_trusted=true WHERE id='{DB}';\n" + back), state='P0001')
    for name, ddl in (
        ('index', f'CREATE INDEX future_trust_idx ON {TABLE}(is_trusted);'),
        ('expression index', f'CREATE INDEX future_trust_idx ON {TABLE}((NOT is_trusted));'),
        ('partial index', f'CREATE INDEX future_trust_idx ON {TABLE}(id) WHERE is_trusted;'),
        ('check constraint', f'ALTER TABLE {TABLE} ADD CONSTRAINT future_check CHECK(is_trusted IS NOT NULL);'),
        ('unique constraint', f'ALTER TABLE {TABLE} ADD CONSTRAINT future_unique UNIQUE(user_id,is_trusted);'),
    ):
        case('Rollback preserves dependent ' + name, transaction(ddl + '\n' + back), state='P0001')
    case('Rollback RESTRICT preserves future view', transaction(f'CREATE VIEW public.future_trust_view AS SELECT id,is_trusted FROM {TABLE};\n' + back), state='2BP01')
    case('Rollback RESTRICT preserves future RLS policy', transaction(f'CREATE POLICY future_trust_policy ON {TABLE} FOR SELECT TO authenticated USING(is_trusted);\n' + back), state='2BP01')
    case('Rollback RESTRICT preserves generated column', transaction(f"ALTER TABLE {TABLE} ADD COLUMN future_label text GENERATED ALWAYS AS (CASE WHEN is_trusted THEN 'yes' ELSE 'no' END) STORED;\n" + back), state='2BP01')
    case('Rollback fails closed if migration owner is subject to forced RLS', transaction(
        f'CREATE ROLE limited_migrator NOLOGIN NOSUPERUSER NOBYPASSRLS; GRANT USAGE,CREATE ON SCHEMA public TO limited_migrator; ALTER TABLE {TABLE} OWNER TO limited_migrator; ALTER TABLE {TABLE} FORCE ROW LEVEL SECURITY; SET ROLE limited_migrator;\n' + back), state='42501')
    case('Forward preserves forced RLS setting', transaction(f'ALTER TABLE {TABLE} FORCE ROW LEVEL SECURITY;\n' + fwd + f"\nSELECT relforcerowsecurity FROM pg_class WHERE oid='{TABLE}'::regclass;"))
    case('Failed rollbacks retain column and original metadata', f'SELECT {CONTRACT} AND public.test_device_metadata()=(SELECT metadata FROM public.test_device_before);')

    # Real independent sessions exercise table locks; no mock or external database.
    held = async_sql(f"BEGIN; LOCK TABLE {TABLE} IN ACCESS EXCLUSIVE MODE; SELECT 'synchronized'; SELECT pg_sleep(0.8); COMMIT;")
    case('Forward respects concurrent access-exclusive lock', "SET lock_timeout='100ms';\n" + fwd, state='55P03')
    finish(held, 'Concurrent lock holder commits successfully')
    case('Forward succeeds after lock released', fwd + f'\nSELECT {CONTRACT};')

    held = async_sql('BEGIN;\n' + fwd + "\nSELECT 'synchronized'; SELECT pg_sleep(0.7); COMMIT;")
    case('Concurrent owner write waits and remains committed', f"SET lock_timeout='3s'; SET ROLE authenticated; SELECT set_config('request.jwt.claim.sub','{A}',false); UPDATE {TABLE} SET device_name='concurrent-device' WHERE id='{DA}'; SELECT device_name='concurrent-device' FROM {TABLE} WHERE id='{DA}';")
    finish(held, 'Concurrent forward transaction commits successfully')
    case('Restore original device name after concurrency test', f"UPDATE {TABLE} SET device_name='Original device A' WHERE id='{DA}'; SELECT device_name='Original device A' FROM {TABLE} WHERE id='{DA}';")

    held = async_sql(f"BEGIN; UPDATE {TABLE} SET is_trusted=true WHERE id='{DB}'; SELECT 'synchronized'; SELECT pg_sleep(0.7); COMMIT;")
    case('Rollback waits for concurrent trust then refuses data loss', "SET lock_timeout='3s';\n" + back, state='P0001')
    finish(held, 'Concurrent trust update commits successfully')
    case('Concurrent trusted decision survives rejected rollback', f"SELECT {HAS_COLUMN} AND is_trusted FROM {TABLE} WHERE id='{DB}';")
    case('Revoke concurrent fixture trust', f"UPDATE {TABLE} SET is_trusted=false WHERE id='{DB}'; SELECT NOT is_trusted FROM {TABLE} WHERE id='{DB}';")

    case('Prepare fresh concurrent forward test', f'ALTER TABLE {TABLE} DROP COLUMN is_trusted; SELECT NOT {HAS_COLUMN};')
    held = async_sql('BEGIN;\n' + fwd + "\nSELECT 'synchronized'; SELECT pg_sleep(0.7); COMMIT;")
    case('Two concurrent forwards converge without replacing marker', "SET lock_timeout='3s';\n" + fwd + f"\nSELECT {CONTRACT} AND {COLUMN_COMMENT}='{MARKER}';")
    finish(held, 'First concurrent forward commits successfully')

    case('Prepare independent concurrent column addition', f'ALTER TABLE {TABLE} DROP COLUMN is_trusted; SELECT NOT {HAS_COLUMN};')
    held = async_sql(f"BEGIN; ALTER TABLE {TABLE} ADD COLUMN is_trusted boolean NOT NULL DEFAULT false; COMMENT ON COLUMN {TABLE}.is_trusted IS 'independent-concurrent-owner'; SELECT 'synchronized'; SELECT pg_sleep(0.7); COMMIT;")
    case('Forward preserves independently added compatible column', "SET lock_timeout='3s';\n" + fwd + f"\nSELECT {CONTRACT} AND {COLUMN_COMMENT}='independent-concurrent-owner';")
    finish(held, 'Independent column addition commits successfully')
    case('Rollback preserves independently owned concurrent column', back + f'\nSELECT {HAS_COLUMN};')
    case('Restore test-owned marker for final rollback', f"COMMENT ON COLUMN {TABLE}.is_trusted IS '{MARKER}'; SELECT {COLUMN_COMMENT}='{MARKER}';")
    case('Final rollback restores original metadata and data', back + f"\nSELECT NOT {HAS_COLUMN} AND public.test_device_metadata()=(SELECT metadata FROM public.test_device_before) AND (SELECT jsonb_agg(to_jsonb(d) ORDER BY id) FROM {TABLE} d)=(SELECT data FROM public.test_device_rows_before);")

    summary = {
        'migration': str(forward), 'rollback': str(rollback),
        'migrationSha256': hashlib.sha256(forward.read_bytes()).hexdigest(),
        'rollbackSha256': hashlib.sha256(rollback.read_bytes()).hexdigest(),
        'postgres': '17', 'productionTouched': False,
        'transport': 'local docker exec; network none; no published ports',
        'tests': len(results), 'passed': sum(row['passed'] for row in results),
        'failed': sum(not row['passed'] for row in results), 'cases': results,
    }
    (output / 'sql-test-results.json').write_text(json.dumps(summary, ensure_ascii=False, indent=2) + '\n')
    (output / 'sql-tests.log').write_text('\n'.join(transcript))
    print(json.dumps({key: value for key, value in summary.items() if key != 'cases'}), flush=True)
    return 1 if summary['failed'] else 0


if __name__ == '__main__':
    raise SystemExit(main())
