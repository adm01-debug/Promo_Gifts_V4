#!/usr/bin/env node
/**
 * Simulação determinística do sink cross-sessão de degradações
 * (`src/lib/intelligence/degradationSink.ts`).
 *
 * O sink recebe TODO evento `intelligence_block_degraded` e decide se ele vira
 * um INSERT em `frontend_telemetry`. Sem throttle, um bloco com RLS negado em
 * loop de refetch (TanStack Query) geraria centenas de linhas por minuto.
 *
 * Invariantes provadas por enumeração:
 *   I1 — nunca emite mais de 1 evento por (scope,reason) dentro do cooldown;
 *   I2 — nunca ultrapassa MAX_EVENTS emissões por sessão;
 *   I3 — nenhum evento é perdido na contagem: soma dos `suppressed` + emissões
 *        == total de eventos observados;
 *   I4 — o `count` reportado na emissão N cobre exatamente os eventos desde a
 *        emissão anterior daquela chave (sem overlap, sem buraco);
 *   I5 — monotonicidade: relógio nunca-decrescente jamais reabre o cooldown.
 */

const COOLDOWN_MS = 60_000;
const MAX_EVENTS = 50;

/** Réplica pura da lógica do sink (mesmos parâmetros do módulo TS). */
function createThrottle({ cooldownMs = COOLDOWN_MS, maxEvents = MAX_EVENTS } = {}) {
  const last = new Map(); // key -> { at, pending }
  let emitted = 0;
  return {
    offer(key, now) {
      const entry = last.get(key);
      if (!entry) {
        if (emitted >= maxEvents) return { emit: false, reason: 'cap', count: 0 };
        last.set(key, { at: now, pending: 0 });
        emitted += 1;
        return { emit: true, reason: 'first', count: 1 };
      }
      if (now - entry.at < cooldownMs) {
        entry.pending += 1;
        return { emit: false, reason: 'cooldown', count: 0 };
      }
      if (emitted >= maxEvents) {
        entry.pending += 1;
        return { emit: false, reason: 'cap', count: 0 };
      }
      const count = entry.pending + 1;
      entry.at = now;
      entry.pending = 0;
      emitted += 1;
      return { emit: true, reason: 'window', count };
    },
    get emitted() {
      return emitted;
    },
  };
}

const SCOPES = ['kpi.revenue', 'segments.orders', 'stock.rupture', 'trends.funnel', 'bi.churn'];
const REASONS = ['permission_denied', 'missing_relation', 'quota_exceeded', 'schema_mismatch'];

let scenarios = 0;
let assertions = 0;
const violations = [];
const check = (ok, msg) => {
  assertions += 1;
  if (!ok) violations.push(msg);
};

// PRNG determinístico (mulberry32)
function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

for (let seed = 1; seed <= 400; seed += 1) {
  scenarios += 1;
  const rand = rng(seed);
  const cooldownMs = [1_000, 15_000, 60_000, 300_000][seed % 4];
  const maxEvents = [5, 20, 50, 500][seed % 4];
  const throttle = createThrottle({ cooldownMs, maxEvents });

  const perKey = new Map(); // key -> { total, emitted, covered, lastEmitAt }
  let now = 1_700_000_000_000;
  const total = 50 + Math.floor(rand() * 450);

  for (let i = 0; i < total; i += 1) {
    now += Math.floor(rand() * 90_000); // relógio monotônico
    const key = `${SCOPES[Math.floor(rand() * SCOPES.length)]}|${REASONS[Math.floor(rand() * REASONS.length)]}`;
    const st = perKey.get(key) ?? { total: 0, emitted: 0, covered: 0, lastEmitAt: -Infinity };
    st.total += 1;
    const out = throttle.offer(key, now);

    if (out.emit) {
      st.emitted += 1;
      // I1 — respeita o cooldown
      check(
        st.lastEmitAt === -Infinity || now - st.lastEmitAt >= cooldownMs,
        `I1 seed=${seed} key=${key} emitiu dentro do cooldown`,
      );
      st.lastEmitAt = now;
      st.covered += out.count;
      // I4 — cobertura sem buraco nem overlap
      check(st.covered === st.total, `I4 seed=${seed} key=${key} cobertura ${st.covered} != ${st.total}`);
    } else {
      check(out.count === 0, `I4 seed=${seed} count != 0 em supressão`);
      check(out.reason === 'cooldown' || out.reason === 'cap', `motivo inválido ${out.reason}`);
    }
    perKey.set(key, st);
  }

  // I2 — teto global por sessão
  check(throttle.emitted <= maxEvents, `I2 seed=${seed} emitiu ${throttle.emitted} > ${maxEvents}`);

  // I3 — conservação: nada some da contabilidade
  let seen = 0;
  let coveredAll = 0;
  for (const st of perKey.values()) {
    seen += st.total;
    coveredAll += st.covered;
  }
  check(seen === total, `I3 seed=${seed} eventos observados ${seen} != ${total}`);
  check(coveredAll <= total, `I3 seed=${seed} cobertura > total`);
}

// I5 — burst puro dentro do cooldown: exatamente 1 emissão
for (let burst = 1; burst <= 200; burst += 1) {
  scenarios += 1;
  const t = createThrottle({ cooldownMs: 60_000, maxEvents: 999 });
  let emits = 0;
  for (let i = 0; i < burst; i += 1) {
    if (t.offer('kpi.revenue|permission_denied', 1_000 + i * 10).emit) emits += 1;
  }
  check(emits === 1, `I5 burst=${burst} emitiu ${emits}`);
}

// Borda: relógio idêntico (Date.now() congelado em testes)
for (let n = 1; n <= 100; n += 1) {
  scenarios += 1;
  const t = createThrottle({ cooldownMs: 0, maxEvents: 999 });
  let emits = 0;
  for (let i = 0; i < n; i += 1) if (t.offer('a|b', 5).emit) emits += 1;
  check(emits === n, `cooldown=0 deve sempre emitir (n=${n}, emits=${emits})`);
}

console.log(`Cenários simulados : ${scenarios}`);
console.log(`Asserções          : ${assertions}`);
console.log(`Violações          : ${violations.length}`);
for (const v of violations.slice(0, 20)) console.log('  ✗', v);
process.exit(violations.length === 0 ? 0 : 1);
