#!/usr/bin/env node
/** Offline PostgreSQL 17 fixture. NEVER connects to or applies SQL to Supabase.
 * Container has no network, published ports or host data mounts. Only its tmpfs is removed.
 * PASS means tested behavior, NOT release readiness or full production RLS/discount parity.
 */
import { readFileSync } from 'node:fs';
import { execFileSync, spawn, spawnSync } from 'node:child_process';
import { randomUUID, createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';

if (process.argv.length > 2)
  throw new Error('Offline only: no CLI target or deployment options accepted');
const root = fileURLToPath(new URL('../', import.meta.url));
const read = (path) => readFileSync(`${root}${path}`, 'utf8');
const captured = JSON.parse(read('tests/fixtures/quote-rpc-live-20260922.json'));
const manifest = JSON.parse(read('tests/fixtures/quote-rpc-proposal-manifest.json'));
const paths = [
  'docs/db/proposals/20260922210000_create_quote_lineage.sql',
  'docs/db/proposals/20260922210500_increment_quote_version_explicit_bump.sql',
  'docs/db/proposals/20260922211000_update_quote_lineage_lock.sql',
];
const proposals = paths.map(read);
const container = `promo-quote-simulation-${randomUUID()}`;
const database = 'quote_simulation';
const actor = '10000000-0000-4000-8000-000000000001';
const outsider = '10000000-0000-4000-8000-000000000002';
const org = '20000000-0000-4000-8000-000000000001';
const product = '30000000-0000-4000-8000-000000000001';
const variant = '40000000-0000-4000-8000-000000000001';
const otherVariant = '40000000-0000-4000-8000-000000000002';
const inactiveVariant = '40000000-0000-4000-8000-000000000003';
const kit = '50000000-0000-4000-8000-000000000001';
const item = {
  product_id: product,
  product_variant_id: variant,
  product_name: 'Fixture',
  product_description: 'Snapshot comercial',
  product_sku: 'FIX-P',
  color_name: 'Preto',
  size_code: 'P',
  kit_group_id: kit,
  kit_name: 'Kit',
  quantity: 2,
  unit_price: 10,
  subtotal: 25,
  personalization_cost: 5,
  personalization_config: { source: 'fixture' },
  has_personalization: true,
  mockup_urls: ['https://example.invalid/mockup.png'],
  artwork_urls: ['https://example.invalid/art.svg'],
  selected_packaging_id: '30000000-0000-4000-8000-000000000002',
  selected_packaging_name: 'Caixa fixture',
  selected_packaging_unit_cost: 3.5,
  personalizations: [{ technique_name: 'Laser', total_cost: 5 }],
};
const json = (value) => `'${JSON.stringify(value).replaceAll("'", "''")}'::jsonb`;
const session = (uid = actor) =>
  `SET statement_timeout='15s'; SET ROLE authenticated; SET request.jwt.claim.sub='${uid}';`;
let count = 0;
const pass = (label) => {
  count++;
  console.log(`PASS ${count}: ${label}`);
};
const args = [
  'exec',
  '-i',
  container,
  'psql',
  '-X',
  '-U',
  'postgres',
  '-d',
  database,
  '-v',
  'ON_ERROR_STOP=1',
  '-v',
  'VERBOSITY=verbose',
  '-Atq',
];
const docker = (argv, input) =>
  execFileSync('docker', argv, {
    input,
    encoding: 'utf8',
    timeout: 60000,
    maxBuffer: 4 * 1024 * 1024,
  });
const sql = (input) => docker(args, input).trim();
const attempt = (input) => spawnSync('docker', args, { input, encoding: 'utf8', timeout: 30000 });
function rejects(input, marker) {
  const result = attempt(input);
  assert.equal(result.status, 3, result.stderr);
  assert.ok(result.stderr.includes(marker), result.stderr);
}
const state = (id) =>
  JSON.parse(
    sql(`SELECT jsonb_build_object('quote',(SELECT to_jsonb(q) FROM quotes q WHERE id='${id}'),
  'items',(SELECT jsonb_agg(to_jsonb(i) ORDER BY id) FROM quote_items i WHERE quote_id='${id}'),
  'personalizations',(SELECT jsonb_agg(to_jsonb(p) ORDER BY id) FROM quote_item_personalizations p WHERE quote_item_id IN (SELECT id FROM quote_items WHERE quote_id='${id}')),
  'history',(SELECT jsonb_agg(to_jsonb(h) ORDER BY id) FROM quote_history h WHERE quote_id='${id}'));`),
  );
function create(items = [item], patch = {}) {
  return JSON.parse(
    sql(
      `${session()} SELECT to_jsonb(public.create_quote_transactional(${json({
        organization_id: org,
        client_name: 'Fixture',
        ...patch,
      })}, ${json(items)}));`,
    ),
  );
}
const update = (q, items, patch = {}, version = q.version) =>
  `SELECT to_jsonb(public.update_quote_transactional('${q.id}',${json(patch)},${json(items)},${version === null ? 'NULL' : version}));`;
const bodyHash = (signature) =>
  sql(`SELECT md5(prosrc) FROM pg_proc WHERE oid='public.${signature}'::regprocedure;`);

async function until(fn, label) {
  const end = Date.now() + 10000;
  while (Date.now() < end) {
    if (fn()) return;
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  throw new Error(`Timed out: ${label}`);
}
function connection() {
  const child = spawn('docker', args, { stdio: ['pipe', 'pipe', 'pipe'] });
  const result = { child, out: '', err: '', exit: null };
  child.stdout.on('data', (data) => {
    result.out += data;
  });
  child.stderr.on('data', (data) => {
    result.err += data;
  });
  result.done = new Promise((resolve, reject) => {
    child.on('error', reject);
    child.on('close', (code) => {
      result.exit = code;
      resolve(code);
    });
  });
  return result;
}
async function concurrency(expectConflict) {
  const q = create([{ ...item, product_variant_id: null, artwork_urls: [] }]);
  const items = [{ ...item, product_variant_id: null, artwork_urls: [] }];
  const a = connection();
  let b;
  try {
    a.child.stdin.write(
      `BEGIN; ${session()} SET application_name='quote-sim-A'; ${update(q, items, { notes: 'writer A' })} SELECT 'A_READY';\n`,
    );
    await until(() => a.out.includes('A_READY') || a.exit !== null, 'writer A ready');
    assert.ok(a.out.includes('A_READY'), a.err);
    b = connection();
    b.child.stdin.end(
      `BEGIN; ${session()} SET application_name='quote-sim-B'; ${update(q, items, { notes: 'writer B' })} COMMIT;`,
    );
    await until(
      () =>
        sql(
          "SELECT count(*) FROM pg_stat_activity WHERE application_name='quote-sim-B' AND wait_event_type='Lock';",
        ) === '1',
      'writer B blocked on real row lock',
    );
    a.child.stdin.end('COMMIT;\n');
    await Promise.all([a.done, b.done]);
    assert.equal(a.exit, 0, a.err);
    assert.equal(b.exit, expectConflict ? 3 : 0, b.err);
    if (expectConflict) assert.ok(b.err.includes('40001'), b.err);
    assert.equal(state(q.id).quote.notes, expectConflict ? 'writer A' : 'writer B');
    pass(
      expectConflict
        ? 'two real sessions: one winner, second rolls back with 40001'
        : 'BEFORE: both stale writers succeed (lost update reproduced)',
    );
  } finally {
    // Terminate only clients created here; container removal also tears down their backends.
    a.child.stdin.destroy();
    if (b) b.child.stdin.destroy();
    if (a.exit === null) a.child.kill('SIGTERM');
    if (b && b.exit === null) b.child.kill('SIGTERM');
  }
}

let created = false;
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
    `POSTGRES_DB=${database}`,
    manifest.postgres_image,
  ]);
  created = true;
  await until(
    () =>
      spawnSync('docker', args, { input: 'SELECT 1;', encoding: 'utf8', timeout: 2000 }).status ===
      0,
    'isolated PG17 startup',
  );
  sql(read('tests/sql/quote-rpc-fixture.sql'));
  sql(
    captured.rows.map((r) => `${r.definition};`).join('\n') +
      `
    REVOKE ALL ON FUNCTION create_quote_transactional(jsonb,jsonb) FROM PUBLIC;
    GRANT EXECUTE ON FUNCTION create_quote_transactional(jsonb,jsonb) TO postgres,anon,authenticated,service_role;
    GRANT EXECUTE ON FUNCTION update_quote_transactional(uuid,jsonb,jsonb,integer) TO postgres,anon,authenticated,service_role;`,
  );
  captured.rows.forEach((r) => {
    const signature =
      r.proname === 'create_quote_transactional'
        ? 'create_quote_transactional(jsonb,jsonb)'
        : 'update_quote_transactional(uuid,jsonb,jsonb,integer)';
    assert.equal(bodyHash(signature), r.body_md5);
  });
  sql(`INSERT INTO user_organizations VALUES ('${actor}','${org}',now()),('${outsider}','20000000-0000-4000-8000-000000000002',now());
    INSERT INTO products(id) VALUES ('${product}'),('30000000-0000-4000-8000-000000000002');
    INSERT INTO product_variants(id,product_id,is_active) VALUES
      ('${variant}','${product}',true),
      ('${otherVariant}','30000000-0000-4000-8000-000000000002',true),
      ('${inactiveVariant}','${product}',false);`);
  console.log(
    JSON.stringify({
      target: 'isolated-container-only',
      postgres: sql('SHOW server_version;'),
      proposals: paths.map((path, i) => ({
        path,
        sha256: createHash('sha256').update(proposals[i]).digest('hex'),
      })),
    }),
  );
  const before = create();
  assert.equal(state(before.id).items[0].product_variant_id, null);
  assert.deepEqual(state(before.id).items[0].artwork_urls, []);
  pass('BEFORE: create silently loses variant and artwork');
  const originalVersion = before.version;
  sql(`${session()} ${update(before, [{ ...item, quantity: 3 }])}`);
  assert.equal(state(before.id).quote.version, originalVersion);
  pass('BEFORE: item-only edit does not advance version with live trigger');
  await concurrency(false);

  rejects(
    `BEGIN;${proposals[1]}DO $$ BEGIN RAISE EXCEPTION 'synthetic postcondition failure'; END $$;COMMIT;`,
    'synthetic postcondition failure',
  );
  assert.equal(bodyHash('increment_quote_version()'), '8dc69376bb204fa774c7b193a7bbce4f');
  pass('version helper rolls back on late deployment failure');
  sql(`BEGIN;${proposals[1]}COMMIT;`);
  rejects(`BEGIN;${proposals[1]}COMMIT;`, 'definition or metadata drift');
  pass('version helper applies once and rejects repeat');

  // RPC proposals must abort if catalog metadata drifts, without replacing functions.
  for (const { proposalIndex, capturedIndex, signature } of [
    { proposalIndex: 0, capturedIndex: 0, signature: 'create_quote_transactional(jsonb,jsonb)' },
    {
      proposalIndex: 2,
      capturedIndex: 1,
      signature: 'update_quote_transactional(uuid,jsonb,jsonb,integer)',
    },
  ]) {
    sql(`REVOKE EXECUTE ON FUNCTION ${signature} FROM anon;`);
    rejects(`BEGIN;${proposals[proposalIndex]}COMMIT;`, 'definition or privileges drift');
    assert.equal(bodyHash(signature), captured.rows[capturedIndex].body_md5);
    sql(`GRANT EXECUTE ON FUNCTION ${signature} TO anon;`);
    // Restore original ACL order in catalog by resetting the ACL to the captured grants.
    sql(
      `REVOKE ALL ON FUNCTION ${signature} FROM anon,authenticated,service_role; GRANT EXECUTE ON FUNCTION ${signature} TO anon,authenticated,service_role;`,
    );
    pass(`${signature}: privilege drift rejected without function change`);
    sql('ALTER TABLE quote_items DROP CONSTRAINT quote_items_product_variant_id_fkey;');
    rejects(`BEGIN;${proposals[proposalIndex]}COMMIT;`, 'Variant foreign key drift');
    assert.equal(bodyHash(signature), captured.rows[capturedIndex].body_md5);
    sql(
      'ALTER TABLE quote_items ADD CONSTRAINT quote_items_product_variant_id_fkey FOREIGN KEY(product_variant_id) REFERENCES product_variants(id) ON DELETE SET NULL;',
    );
    pass(`${signature}: missing FK blocks proposal before replacement`);
    rejects(
      `BEGIN;${proposals[proposalIndex]}DO $$ BEGIN RAISE EXCEPTION 'synthetic postcondition failure'; END $$;COMMIT;`,
      'synthetic postcondition failure',
    );
    assert.equal(bodyHash(signature), captured.rows[capturedIndex].body_md5);
    pass(`${signature}: late deployment failure rolls back CREATE OR REPLACE`);
    if (proposalIndex === 0) {
      sql(`BEGIN;${proposals[proposalIndex]}COMMIT;`);
      rejects(`BEGIN;${proposals[proposalIndex]}COMMIT;`, 'definition or privileges drift');
      pass(`${signature}: applies locally once and rejects repeat`);
    }
  }

  sql(`BEGIN;${proposals[2]}COMMIT;`);
  rejects(`BEGIN;${proposals[2]}COMMIT;`, 'definition or privileges drift');
  pass('update RPC applies after version dependency and rejects repeat');

  assert.equal(
    sql(
      `${session()} SELECT count(*) FROM product_variants v JOIN products p ON p.id=v.product_id WHERE v.id='${variant}' AND v.product_id='${product}' AND v.is_active AND p.is_active AND NOT coalesce(p.is_deleted,false) AND p.deleted_at IS NULL;`,
    ),
    '1',
  );

  const q = create();
  const current = state(q.id);
  assert.equal(current.items[0].product_variant_id, variant);
  assert.deepEqual(current.items[0].artwork_urls, item.artwork_urls);
  assert.equal(current.items[0].kit_group_id, kit);
  assert.equal(current.items[0].size_code, 'P');
  assert.equal(current.items[0].product_description, item.product_description);
  assert.deepEqual(current.items[0].personalization_config, item.personalization_config);
  assert.deepEqual(current.items[0].mockup_urls, item.mockup_urls);
  assert.equal(current.items[0].selected_packaging_id, item.selected_packaging_id);
  assert.equal(current.items[0].selected_packaging_name, item.selected_packaging_name);
  assert.equal(Number(current.items[0].selected_packaging_unit_cost), 3.5);
  assert.equal(current.quote.total, 25);
  assert.equal(current.personalizations[0].technique_name, 'Laser');
  assert.equal(current.history.length, 1);
  pass('create preserves variant, artwork, kit, size, cost, personalization and audit');

  const withoutLineage = { ...item };
  delete withoutLineage.product_variant_id;
  delete withoutLineage.artwork_urls;
  const legacy = create([withoutLineage]);
  assert.equal(state(legacy.id).items[0].product_variant_id, null);
  assert.deepEqual(state(legacy.id).items[0].artwork_urls, []);
  pass('legacy create without new fields remains supported');
  for (const malformed of [null, {}, [null], [3]]) {
    rejects(
      `${session()} SELECT create_quote_transactional(${json({ organization_id: org })},${json(malformed)});`,
      '22023',
    );
  }
  pass('JSON null/object/scalar item payloads rejected');
  const beforeAuth = sql('SELECT count(*) FROM quotes;');
  rejects(
    `SET ROLE anon; SELECT create_quote_transactional(${json({ organization_id: org, seller_id: actor })},${json([item])});`,
    '42501',
  );
  rejects(
    `${session(outsider)} SELECT create_quote_transactional(${json({ organization_id: org, seller_id: actor })},${json([item])});`,
    '42501',
  );
  assert.equal(sql('SELECT count(*) FROM quotes;'), beforeAuth);
  pass('SECURITY INVOKER plus fixture RLS denies anon and cross-seller create');
  for (const [label, changed, marker] of [
    ['wrong product variant', { ...item, product_variant_id: otherVariant }, '23503'],
    ['nonexistent variant', { ...item, product_variant_id: randomUUID() }, '23503'],
    ['inactive variant', { ...item, product_variant_id: inactiveVariant }, '23503'],
    ['malformed UUID', { ...item, product_variant_id: 'invalid' }, '22P02'],
    ['artwork null', { ...item, artwork_urls: null }, '22023'],
    ['artwork object', { ...item, artwork_urls: {} }, '22023'],
    ['zero quantity', { ...item, quantity: 0 }, '23514'],
    ['negative personalization', { ...item, personalizations: [{ total_cost: -1 }] }, '23514'],
  ]) {
    const counts = sql(
      'SELECT (SELECT count(*) FROM quotes),(SELECT count(*) FROM quote_items),(SELECT count(*) FROM quote_history);',
    );
    rejects(
      `${session()} SELECT create_quote_transactional(${json({ organization_id: org })},${json([item, changed])});`,
      marker,
    );
    assert.equal(
      sql(
        'SELECT (SELECT count(*) FROM quotes),(SELECT count(*) FROM quote_items),(SELECT count(*) FROM quote_history);',
      ),
      counts,
    );
    pass(`${label}: entire create rolls back including preceding valid item`);
  }

  // Omitted fields preserve every commercial snapshot through unique legacy match.
  const omittedOptional = {
    product_id: item.product_id,
    product_name: item.product_name,
    product_sku: item.product_sku,
    color_name: item.color_name,
    size_code: item.size_code,
    kit_group_id: item.kit_group_id,
    quantity: 3,
    unit_price: item.unit_price,
  };
  const updated = JSON.parse(
    sql(`${session()} ${update(q, [omittedOptional], { notes: 'edited' })}`),
  );
  let after = state(q.id);
  assert.equal(after.items[0].product_variant_id, variant);
  assert.deepEqual(after.items[0].artwork_urls, item.artwork_urls);
  assert.equal(after.items[0].id, current.items[0].id);
  assert.equal(after.items[0].product_description, item.product_description);
  assert.deepEqual(after.items[0].personalization_config, item.personalization_config);
  assert.deepEqual(after.items[0].mockup_urls, item.mockup_urls);
  assert.equal(after.items[0].selected_packaging_id, item.selected_packaging_id);
  assert.equal(after.personalizations[0].technique_name, 'Laser');
  assert.equal(updated.version, after.quote.version);
  assert.equal(updated.total, after.quote.total);
  assert.equal(after.quote.total, 35);
  pass('update preserves omitted lineage, returns final trigger totals/version');

  const stableId = after.items[0].id;
  const itemOnly = JSON.parse(
    sql(`${session()} ${update(updated, [{ ...item, id: stableId, quantity: 4 }])}`),
  );
  after = state(q.id);
  assert.equal(after.items[0].id, stableId);
  assert.equal(itemOnly.version, updated.version + 1);
  assert.equal(after.quote.version, itemOnly.version);
  pass('item-only update preserves identity and advances version exactly once');
  const snapshot = state(q.id);

  for (const [label, items, patch, version, uid, marker] of [
    ['stale version', [item], { notes: 'x' }, 1, actor, '40001'],
    ['other organization', [item], { notes: 'x' }, itemOnly.version, outsider, 'P0002'],
    [
      'wrong product variant',
      [{ ...item, product_variant_id: otherVariant }],
      { notes: 'x' },
      itemOnly.version,
      actor,
      '23503',
    ],
    [
      'foreign row id',
      [{ ...item, id: randomUUID() }],
      { notes: 'x' },
      itemOnly.version,
      actor,
      '22023',
    ],
    ['implicit removal', [], { notes: 'x' }, itemOnly.version, actor, '22023'],
    [
      'invalid personalizations',
      [{ ...item, personalizations: [{ total_cost: -3 }] }],
      { notes: 'x' },
      itemOnly.version,
      actor,
      '23514',
    ],
  ]) {
    rejects(`${session(uid)} ${update(itemOnly, items, patch, version)}`, marker);
    assert.deepEqual(state(q.id), snapshot);
    pass(`${label}: update leaves quote/items/artwork/audit unchanged`);
  }
  rejects(
    `${session()} SET fixture.fail_history='on'; ${update(itemOnly, [{ ...item, id: stableId }], { notes: 'late history failure' })}`,
    'fixture late failure',
  );
  assert.deepEqual(state(q.id), snapshot);
  pass('late audit failure rolls back quote, children, version and recalculated totals');

  const oldId = after.items[0].id;
  const clear = JSON.parse(
    sql(
      `${session()} ${update(itemOnly, [{ ...item, id: oldId, product_variant_id: null, artwork_urls: [] }], { notes: 'clear explicit' })}`,
    ),
  );
  after = state(q.id);
  assert.equal(after.items[0].product_variant_id, null);
  assert.deepEqual(after.items[0].artwork_urls, []);
  pass('explicit null variant and [] artwork with matching row id clears lineage');
  assert.equal(clear.total, 25);

  const dup = create([item, item]);
  const dupBefore = state(dup.id);
  rejects(
    `${session()} ${update(dup, [withoutLineage, withoutLineage], { notes: 'ambiguous' })}`,
    'Ambiguous legacy item',
  );
  assert.deepEqual(state(dup.id), dupBefore);
  pass('ambiguous legacy rows fail without attaching art to an arbitrary line');
  const ids = dupBefore.items.map((i) => i.id);
  rejects(
    `${session()} ${update(
      dup,
      [
        { ...item, id: ids[0] },
        { ...item, id: ids[0] },
      ],
      { notes: 'duplicate' },
    )}`,
    'Duplicate quote item identity',
  );
  pass('duplicate row identity rejected');
  const identified = JSON.parse(
    sql(
      `${session()} ${update(
        dup,
        [
          { ...item, id: ids[0] },
          { ...item, id: ids[1] },
        ],
        { notes: 'identified' },
      )}`,
    ),
  );
  assert.equal(state(identified.id).items.length, 2);
  pass('same-product duplicate rows work when each old row id is explicit');
  const removed = JSON.parse(
    sql(
      `${session()} ${update(identified, [{ ...item, id: ids[0] }], {
        notes: 'one removed explicitly',
        _removed_item_ids: [ids[1]],
      })}`,
    ),
  );
  const removedState = state(dup.id);
  assert.equal(removedState.items.length, 1);
  assert.equal(removedState.items[0].id, ids[0]);
  assert.equal(removed.version, identified.version + 1);
  pass('explicit removal deletes only the declared item and preserves retained identity');
  const historical = create([item]);
  const historicalId = state(historical.id).items[0].id;
  sql(`UPDATE product_variants SET is_active=false WHERE id='${variant}';`);
  const historicalUpdated = JSON.parse(
    sql(
      `${session()} ${update(historical, [{ ...item, id: historicalId, quantity: 3 }], { notes: 'historical inactive preserved' })}`,
    ),
  );
  assert.equal(state(historical.id).items[0].product_variant_id, variant);
  assert.equal(historicalUpdated.version, historical.version + 1);
  pass('unchanged historical variant remains editable after catalog deactivation');
  sql(`UPDATE product_variants SET is_active=true WHERE id='${variant}';`);
  const unversioned = create([{ ...item, product_variant_id: null, artwork_urls: [] }]);
  rejects(
    `${session()} ${update(unversioned, [{ ...item, product_variant_id: null, artwork_urls: [], quantity: 4 }], {}, null)}`,
    '_expected_version is required',
  );
  assert.equal(state(unversioned.id).quote.version, unversioned.version);
  pass('authenticated expected_version=NULL is rejected without writes');
  await concurrency(true);
  const roleMetadata = JSON.parse(
    sql(
      "SELECT jsonb_agg(jsonb_build_object('name',proname,'secdef',prosecdef,'acl',proacl::text,'config',proconfig)) FROM pg_proc WHERE proname IN ('create_quote_transactional','update_quote_transactional');",
    ),
  );
  for (const metadata of roleMetadata) {
    const expected = captured.rows.find((r) => r.proname === metadata.name);
    assert.equal(metadata.secdef, false);
    assert.equal(metadata.acl, expected.acl);
    assert.deepEqual(metadata.config, expected.proconfig);
  }
  pass('SECURITY INVOKER, ACL and search_path unchanged');
  console.log(
    JSON.stringify({
      checks: count,
      result: 'SIMULATION_PASS_LOCAL_ONLY',
      blockers: ['canonical application requires separate nominal approval'],
      limits: [
        'reduced fixture, not full canonical clone',
        'synthetic membership helpers; no Auth/Edge/UI E2E',
        'discount/notification/deferred-integrity chain not fully simulated',
        'no production writes',
      ],
    }),
  );
} finally {
  if (created) docker(['rm', '-f', container]);
}
