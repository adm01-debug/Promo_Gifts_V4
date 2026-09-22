#!/usr/bin/env node
/** Isolated diagnostic, never applies SQL to Supabase. No published port or host data volume.
 * Reads the eight functions in the signup/profile/role/discount-limit trigger chain.
 * The reduced fixture proves this trigger/FK path, NOT every production Auth integration.
 * Exit 1 means the candidate still grants a privileged role from user metadata.
 */
import { readFileSync } from 'node:fs';
import { execFileSync, spawnSync } from 'node:child_process';
import { randomUUID, createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { querySupabaseReadOnly } from './supabase-read-only-query.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const hardened = process.argv.includes('--hardened-proposal');
const version = hardened ? '20260922170000' : '20260920120000';
const migration = readFileSync(
  hardened
    ? `${root}supabase/migrations/20260922170000_signup_identity_safe_default.sql`
    : `${root}supabase/migrations/${version}_fix_handle_new_user_missing_profiles_user_id.sql`,
  'utf8',
);
const names = [
  'handle_new_user',
  'fn_grant_default_role_on_profile',
  'fn_ensure_seller_discount_limit',
  'fn_map_role_enum_to_profile',
  'fn_sync_profile_role_from_user_roles',
  'trg_user_roles_sync_profile_role',
  'set_updated_at',
  'fn_set_updated_at',
];
let definitions;
if (process.argv.includes('--live-readonly')) {
  if (process.env.SUPABASE_PROJECT_REF !== 'doufsxqlfjyuvxuezpln')
    throw new Error('Canonical project ref required');
  const result =
    await querySupabaseReadOnly(`SELECT p.proname, pg_get_functiondef(p.oid) AS definition
    FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
    WHERE n.nspname='public' AND p.proname IN ('${names.join("','")}')`);
  if (result.kind !== 'live' || result.rows.length !== names.length)
    throw new Error('Live trigger inventory unavailable');
  definitions = names.map((name) => result.rows.find((row) => row.proname === name)?.definition);
} else {
  const snapshot = readFileSync(
    `${root}supabase/migrations-snapshot/SCHEMA_LIVE.sql`,
    'utf8',
  ).replaceAll('\r\n', '\n');
  definitions = names.map((name) => {
    const start = snapshot.indexOf(`CREATE OR REPLACE FUNCTION "public"."${name}"(`);
    const end = snapshot.indexOf('$$;', start);
    if (start < 0 || end < 0) throw new Error(`Snapshot function unavailable: ${name}`);
    return snapshot.slice(start, end + 3);
  });
}
if (definitions.some((sql) => !sql)) throw new Error('Missing trigger definition');
console.log(
  JSON.stringify({
    source: process.argv.includes('--live-readonly') ? 'canonical-read-only' : 'snapshot',
    migration: version,
    sha256: createHash('sha256').update(migration).digest('hex'),
    definitions: names.map((name, i) => ({
      name,
      sha256: createHash('sha256').update(definitions[i]).digest('hex'),
    })),
  }),
);

const container = `promo-signup-simulation-${randomUUID()}`;
let created = false;
function docker(args, input) {
  return execFileSync('docker', args, {
    encoding: 'utf8',
    input,
    timeout: 60000,
    maxBuffer: 2 * 1024 * 1024,
  });
}
function sql(input) {
  return docker(
    [
      'exec',
      '-i',
      container,
      'psql',
      '-X',
      '-U',
      'postgres',
      '-d',
      'signup_simulation',
      '-v',
      'ON_ERROR_STOP=1',
      '-Atq',
    ],
    input,
  );
}
function attemptMigration() {
  return spawnSync(
    'docker',
    [
      'exec',
      '-i',
      container,
      'psql',
      '-X',
      '-U',
      'postgres',
      '-d',
      'signup_simulation',
      '-v',
      'ON_ERROR_STOP=1',
      '-Atq',
    ],
    { input: `BEGIN;\n${migration}\nCOMMIT;`, encoding: 'utf8', timeout: 30000 },
  );
}
try {
  docker([
    'run',
    '-d',
    '--rm',
    '--name',
    container,
    '--network',
    'none',
    '--tmpfs',
    '/var/lib/postgresql/data',
    '-e',
    'POSTGRES_HOST_AUTH_METHOD=trust',
    '-e',
    'POSTGRES_DB=signup_simulation',
    'postgres:17',
  ]);
  created = true;
  let ready = false;
  for (let attempt = 0; attempt < 60; attempt++) {
    const probe = spawnSync(
      'docker',
      [
        'exec',
        container,
        'psql',
        '-X',
        '-U',
        'postgres',
        '-d',
        'signup_simulation',
        '-Atqc',
        'SELECT 1',
      ],
      { encoding: 'utf8', timeout: 3000 },
    );
    if (probe.status === 0 && probe.stdout.trim() === '1') {
      ready = true;
      break;
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  if (!ready) throw new Error('Isolated PostgreSQL unavailable');
  sql(
    readFileSync(`${root}tests/sql/signup-migration-fixture.sql`, 'utf8') +
      '\n' +
      definitions.join(';\n') +
      `;
    CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
    CREATE TRIGGER trg_grant_default_role AFTER INSERT ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.fn_grant_default_role_on_profile();
    CREATE TRIGGER set_updated_at_trigger BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
    CREATE TRIGGER trg_ensure_seller_discount_limit AFTER INSERT OR UPDATE OF role ON public.user_roles FOR EACH ROW EXECUTE FUNCTION public.fn_ensure_seller_discount_limit();
    CREATE TRIGGER user_roles_sync_profile_role AFTER INSERT OR DELETE OR UPDATE ON public.user_roles FOR EACH ROW EXECUTE FUNCTION public.trg_user_roles_sync_profile_role();
    CREATE TRIGGER trg_sdl_updated_at BEFORE UPDATE ON public.seller_discount_limits FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();`,
  );
  console.log(sql(readFileSync(`${root}tests/sql/signup-migration-before.sql`, 'utf8')).trim());
  if (hardened) {
    const original = sql(
      `SELECT md5(prosrc) FROM pg_proc WHERE oid='public.handle_new_user()'::regprocedure;`,
    ).trim();
    sql('ALTER TABLE auth.users DISABLE TRIGGER on_auth_user_created;');
    const failed = attemptMigration();
    if (failed.status !== 3 || !failed.stderr.includes('Trigger de cadastro ausente'))
      throw new Error('Disabled trigger was not rejected');
    const afterFailure = sql(
      `SELECT md5(prosrc) FROM pg_proc WHERE oid='public.handle_new_user()'::regprocedure;`,
    ).trim();
    if (afterFailure !== original)
      throw new Error('Postcondition failure did not roll back function replacement');
    sql('ALTER TABLE auth.users ENABLE TRIGGER on_auth_user_created;');
    console.log(
      'PASS: disabled trigger blocks deployment; postcondition failure rolls back function replacement',
    );
    sql(
      `CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RETURN NEW; END $$;`,
    );
    const concurrentChange = attemptMigration();
    if (concurrentChange.status !== 3 || !concurrentChange.stderr.includes('handle_new_user mudou'))
      throw new Error('Unexpected function drift was not rejected');
    sql(`${definitions[0]};`);
    console.log('PASS: concurrent function change rejected before replacement');
  }
  // Same single transaction used by E15; both candidate and assertions run locally.
  sql(`BEGIN;\n${migration}\nCOMMIT;`);
  console.log(sql(readFileSync(`${root}tests/sql/signup-migration-after.sql`, 'utf8')).trim());
  const repeated = attemptMigration();
  const repeatMessage = hardened ? 'handle_new_user mudou' : 'já referencia user_id';
  if (repeated.status !== 3 || !repeated.stderr.includes(repeatMessage))
    throw new Error('Duplicate application did not fail as expected');
  console.log('PASS: duplicate application rejected (candidate is guarded, NOT reentrant)');
  const privileged = Number(
    sql(`SELECT count(*) FROM public.user_roles WHERE role IN ('admin','coordenador');`).trim(),
  );
  if (privileged !== 0) {
    console.error(
      `BLOCKED: ${privileged} privileged grants from raw_user_meta_data in isolated simulation. Do not release this candidate alone.`,
    );
    process.exitCode = 1;
  } else {
    const safe = Number(
      sql(`SELECT count(*) FROM public.user_roles WHERE role='vendedor';`).trim(),
    );
    if (safe !== 5)
      throw new Error('Expected five default role grants, including two malicious metadata cases');
    console.log(
      'PASS: both privileged metadata requests yield vendedor; reduced trigger/FK simulation only',
    );
    sql(
      `UPDATE public.user_roles SET role='admin' WHERE user_id='10000000-0000-4000-8000-000000000002';`,
    );
    if (Number(sql(`SELECT count(*) FROM user_roles WHERE role='admin';`).trim()) !== 1)
      throw new Error('Explicit administrative promotion was blocked');
    if (Number(sql(`SELECT count(*) FROM profiles WHERE role='admin';`).trim()) !== 1)
      throw new Error('Role-to-profile synchronization failed');
    if (
      Number(
        sql(`SELECT count(*) FROM seller_discount_limits WHERE max_discount_percent=0;`).trim(),
      ) !== 5
    )
      throw new Error('Zero-discount default limits were not preserved');
    console.log(
      'PASS: explicit promotion synchronizes profile; default discount limits remain zero (not Edge E2E)',
    );
  }
} finally {
  // Removes only the container created by this invocation and its tmpfs fixture.
  if (created) docker(['rm', '-f', container]);
}
