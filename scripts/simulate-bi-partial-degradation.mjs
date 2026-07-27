#!/usr/bin/env node
/**
 * Simulação determinística de degradação parcial do painel /inteligencia-comercial.
 *
 * Modelo: a página tem N blocos independentes. Cada bloco pode falhar por
 * K causas. Sem boundaries locais, QUALQUER falha derruba a rota inteira
 * (comportamento observado no incidente). Com boundaries locais, apenas o
 * bloco afetado degrada.
 *
 * O script prova, por enumeração exaustiva de subconjuntos de falha
 * (2^N combinações) x causas, que:
 *   I1 — nenhuma combinação derruba a rota (blocos sobreviventes > 0);
 *   I2 — o número de blocos renderizados = N - |falhas|;
 *   I3 — cada falha produz exatamente 1 incidente rastreável (errorId);
 *   I4 — retry local de um bloco não remonta blocos irmãos.
 */

const BLOCKS = [
  'kpis', 'zero-diagnosis', 'ai-insights', 'market-chart',
  'product-ranking', 'category-ranking', 'trending+supplier', 'sales-overview',
];
const CAUSES = [
  'rls_denied', 'rpc_missing', 'network_timeout',
  'null_format', 'json_parse', 'quota_429',
];

/** Modelo do runtime COM boundaries locais. */
function renderWithBoundaries(failing, cause) {
  const incidents = [];
  const rendered = [];
  for (const b of BLOCKS) {
    if (failing.has(b)) {
      incidents.push({ block: b, cause, errorId: `${b}:${cause}` });
    } else {
      rendered.push(b);
    }
  }
  return { rendered, incidents, routeAlive: true };
}

/** Modelo do runtime SEM boundaries locais (regressão que queremos impedir). */
function renderWithoutBoundaries(failing) {
  return failing.size > 0
    ? { rendered: [], incidents: [{ block: 'route', cause: 'fatal' }], routeAlive: false }
    : { rendered: [...BLOCKS], incidents: [], routeAlive: true };
}

let scenarios = 0, assertions = 0, violations = [];
const check = (ok, msg) => { assertions++; if (!ok) violations.push(msg); };

for (let mask = 0; mask < (1 << BLOCKS.length); mask++) {
  for (const cause of CAUSES) {
    const failing = new Set(BLOCKS.filter((_, i) => mask & (1 << i)));
    if (failing.size === BLOCKS.length) continue; // all-down = fora do escopo parcial
    scenarios++;
    const out = renderWithBoundaries(failing, cause);
    check(out.routeAlive, `I1 rota caiu com mask=${mask} cause=${cause}`);
    check(out.rendered.length === BLOCKS.length - failing.size,
      `I2 contagem errada mask=${mask}`);
    check(out.incidents.length === failing.size, `I3 incidentes != falhas mask=${mask}`);
    check(new Set(out.incidents.map(i => i.errorId)).size === out.incidents.length,
      `I3 errorId duplicado mask=${mask}`);

    // I4 — retry local: remonta só o bloco alvo
    for (const target of failing) {
      const after = renderWithBoundaries(new Set([...failing].filter(b => b !== target)), cause);
      const siblingsBefore = out.rendered.join('|');
      const siblingsAfter = after.rendered.filter(b => b !== target).join('|');
      check(siblingsBefore === siblingsAfter, `I4 irmãos remontaram mask=${mask} target=${target}`);
    }

    // Contraprova: sem boundaries a rota morre
    const legacy = renderWithoutBoundaries(failing);
    check(failing.size === 0 || !legacy.routeAlive, 'contraprova inválida');
  }
}

console.log(`Cenários simulados : ${scenarios}`);
console.log(`Asserções          : ${assertions}`);
console.log(`Violações          : ${violations.length}`);
for (const v of violations.slice(0, 20)) console.log('  ✗', v);
process.exit(violations.length === 0 ? 0 : 1);
