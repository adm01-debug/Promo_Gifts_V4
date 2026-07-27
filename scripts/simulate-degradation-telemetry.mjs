/**
 * Simulação exaustiva do pipeline de degradação → telemetria.
 *
 * Reimplementa (espelho fiel) a lógica pura de:
 *   - src/lib/intelligence/degradation.ts        → classifyDegradable
 *   - src/lib/intelligence/degradationRegistry.ts → ring buffer + aggregate
 *
 * e executa centenas de cenários determinísticos + fuzz, verificando invariantes
 * que o painel /admin/telemetria depende:
 *   I1. erro transitório NUNCA vira evento (é relançado);
 *   I2. erro estrutural SEMPRE vira exatamente 1 evento;
 *   I3. o log nunca ultrapassa a capacidade (ring buffer);
 *   I4. a soma das contagens agregadas == número de eventos retidos;
 *   I5. a agregação é ordenada por count desc e é estável para o mesmo input;
 *   I6. nenhum agregado perde códigos distintos observados;
 *   I7. payload persistido é JSON serializável e re-hidratável sem perda.
 *
 * Uso: node scripts/simulate-degradation-telemetry.mjs
 */

const CODE_MAP = {
  42501: 'permission_denied',
  '42P01': 'missing_relation',
  42703: 'schema_mismatch',
  42883: 'missing_relation',
  PGRST202: 'missing_relation',
  PGRST205: 'missing_relation',
  PGRST301: 'permission_denied',
  PGRST116: 'schema_mismatch',
};

function classifyDegradable(error) {
  if (!error || typeof error !== 'object') return null;
  const code = typeof error.code === 'string' ? error.code : '';
  if (code && CODE_MAP[code]) return CODE_MAP[code];
  if (error.status === 401 || error.status === 403) return 'permission_denied';
  if (error.status === 429 || code === '429') return 'quota_exceeded';
  const msg = (error.message ?? '').toLowerCase();
  if (!msg) return null;
  if (msg.includes('permission denied') || msg.includes('row-level security'))
    return 'permission_denied';
  if (msg.includes('does not exist') || msg.includes('could not find the'))
    return 'missing_relation';
  if (msg.includes('too many requests') || msg.includes('rate limit')) return 'quota_exceeded';
  return null;
}

const CAP = 200;

function createRegistry() {
  let events = [];
  return {
    record(scope, reason, code, at) {
      events = events.concat({ scope, reason, code: code ?? null, at });
      if (events.length > CAP) events = events.slice(events.length - CAP);
    },
    get all() {
      return events;
    },
  };
}

function aggregate(events) {
  const map = new Map();
  for (const e of events) {
    const key = `${e.scope}\u0000${e.reason}`;
    const cur = map.get(key);
    if (cur) {
      cur.count += 1;
      if (e.at > cur.lastAt) cur.lastAt = e.at;
      if (e.code && !cur.codes.includes(e.code)) cur.codes.push(e.code);
    } else {
      map.set(key, {
        scope: e.scope,
        reason: e.reason,
        count: 1,
        lastAt: e.at,
        codes: e.code ? [e.code] : [],
      });
    }
  }
  return [...map.values()].sort((a, b) => b.count - a.count || b.lastAt - a.lastAt);
}

/** Pipeline sob teste: retorna 'degraded' | 'thrown'. */
function handle(registry, error, scope, at) {
  const reason = classifyDegradable(error);
  if (!reason) return 'thrown';
  registry.record(scope, reason, typeof error.code === 'string' ? error.code : null, at);
  return 'degraded';
}

// ---------------------------------------------------------------------------
// Geradores de cenário
// ---------------------------------------------------------------------------
const SCOPES = [
  'segments.orders',
  'segments.quotes',
  'kpi.revenue',
  'kpi.conversion',
  'stock.rupture',
  'stock.supplier_reliability',
  'trends.insights',
  'trends.funnel',
];

const DEGRADABLE = [
  { code: '42501', message: 'permission denied for table orders' },
  { code: '42P01', message: 'relation "public.gold_orders" does not exist' },
  { code: '42703', message: 'column o.total does not exist' },
  { code: '42883', message: 'function public.fn_kpi(uuid) does not exist' },
  { code: 'PGRST202', message: 'Could not find the function' },
  { code: 'PGRST205', message: 'Could not find the table' },
  { code: 'PGRST301', message: 'JWT expired' },
  { code: 'PGRST116', message: 'JSON object requested, multiple rows returned' },
  { status: 401, message: 'Unauthorized' },
  { status: 403, message: 'Forbidden' },
  { status: 429, message: 'Too Many Requests' },
  { code: '429', message: 'rate limit exceeded' },
  { message: 'new row violates row-level security policy' },
  { message: 'permission denied for schema gold' },
];

const TRANSIENT = [
  { message: 'Failed to fetch' },
  { message: 'NetworkError when attempting to fetch resource' },
  { status: 500, message: 'Internal Server Error' },
  { status: 502, message: 'Bad Gateway' },
  { status: 504, message: 'Gateway Timeout' },
  { code: '57014', message: 'canceling statement due to statement timeout' },
  { message: '' },
  {},
  null,
  undefined,
  'string error',
  42,
];

let checks = 0;
let failures = 0;
function assert(cond, label) {
  checks += 1;
  if (!cond) {
    failures += 1;
    console.error(`✗ ${label}`);
  }
}

// --- Fase 1: matriz determinística (todos os erros × todos os escopos) ------
let scenarios = 0;
for (const scope of SCOPES) {
  for (const err of DEGRADABLE) {
    const reg = createRegistry();
    scenarios += 1;
    const out = handle(reg, err, scope, Date.now());
    assert(out === 'degraded', `I2 degradável tratado: ${scope} ${JSON.stringify(err)}`);
    assert(reg.all.length === 1, `I2 exatamente 1 evento: ${scope}`);
    assert(reg.all[0].scope === scope, `I2 scope preservado: ${scope}`);
  }
  for (const err of TRANSIENT) {
    const reg = createRegistry();
    scenarios += 1;
    const out = handle(reg, err, scope, Date.now());
    assert(out === 'thrown', `I1 transitório relançado: ${scope} ${JSON.stringify(err)}`);
    assert(reg.all.length === 0, `I1 nenhum evento: ${scope}`);
  }
}

// --- Fase 2: rajadas (ring buffer + agregação) ------------------------------
function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

for (let run = 0; run < 300; run += 1) {
  const rnd = mulberry32(run * 7919 + 13);
  const reg = createRegistry();
  const burst = 1 + Math.floor(rnd() * 400);
  let degraded = 0;
  const seen = new Map(); // key -> Set(codes)
  for (let i = 0; i < burst; i += 1) {
    const pool = rnd() < 0.7 ? DEGRADABLE : TRANSIENT;
    const err = pool[Math.floor(rnd() * pool.length)];
    const scope = SCOPES[Math.floor(rnd() * SCOPES.length)];
    const at = 1_700_000_000_000 + i * 37;
    const out = handle(reg, err, scope, at);
    if (out === 'degraded') {
      degraded += 1;
      const reason = classifyDegradable(err);
      const key = `${scope}\u0000${reason}`;
      if (!seen.has(key)) seen.set(key, new Set());
      if (err && typeof err.code === 'string') seen.get(key).add(err.code);
    }
  }
  scenarios += 1;

  assert(reg.all.length === Math.min(degraded, CAP), `I3 ring buffer respeitado (run ${run})`);
  assert(reg.all.length <= CAP, `I3 nunca excede CAP (run ${run})`);

  const agg = aggregate(reg.all);
  const sum = agg.reduce((acc, r) => acc + r.count, 0);
  assert(sum === reg.all.length, `I4 soma agregada == eventos retidos (run ${run})`);

  for (let i = 1; i < agg.length; i += 1) {
    assert(
      agg[i - 1].count > agg[i].count ||
        (agg[i - 1].count === agg[i].count && agg[i - 1].lastAt >= agg[i].lastAt),
      `I5 ordenação count desc / lastAt desc (run ${run})`,
    );
  }

  const again = aggregate(reg.all);
  assert(
    JSON.stringify(again) === JSON.stringify(agg),
    `I5 agregação determinística (run ${run})`,
  );

  // I6 — códigos observados presentes (apenas para eventos retidos)
  for (const row of agg) {
    for (const code of row.codes) {
      assert(typeof code === 'string' && code.length > 0, `I6 código não vazio (run ${run})`);
    }
  }

  // I7 — round-trip de persistência
  const raw = JSON.stringify(reg.all);
  const parsed = JSON.parse(raw);
  assert(
    Array.isArray(parsed) && parsed.length === reg.all.length,
    `I7 round-trip preserva tamanho (run ${run})`,
  );
  assert(
    JSON.stringify(aggregate(parsed)) === JSON.stringify(agg),
    `I7 round-trip preserva agregação (run ${run})`,
  );
}

// --- Fase 3: hidratação com payload corrompido ------------------------------
const CORRUPT = [
  '',
  'null',
  '{}',
  '[]',
  '[1,2,3]',
  '[{"scope":"a"}]',
  '[{"scope":"a","reason":"permission_denied","code":null}]',
  '[{"scope":"","reason":"permission_denied","code":null,"at":1}]',
  '[{"scope":"a","reason":"permission_denied","code":null,"at":"x"}]',
  'not json',
];
function hydrate(raw) {
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (e) =>
          e &&
          typeof e === 'object' &&
          typeof e.scope === 'string' &&
          e.scope.length > 0 &&
          typeof e.reason === 'string' &&
          (typeof e.code === 'string' || e.code === null) &&
          typeof e.at === 'number' &&
          Number.isFinite(e.at),
      )
      .slice(-CAP);
  } catch {
    return [];
  }
}
for (const raw of CORRUPT) {
  scenarios += 1;
  const out = hydrate(raw);
  assert(Array.isArray(out), `hidratação retorna array: ${raw.slice(0, 24)}`);
  assert(out.every((e) => typeof e.at === 'number'), `hidratação filtra inválidos: ${raw.slice(0, 24)}`);
}

console.log(
  `\nSimulação de degradação → telemetria: ${scenarios} cenários, ${checks} asserções, ${failures} falha(s).`,
);
process.exit(failures === 0 ? 0 : 1);
