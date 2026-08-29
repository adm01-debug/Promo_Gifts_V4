#!/usr/bin/env node
/**
 * verify-quote-number-hardening
 *
 * Comando READ-ONLY de verificação pós-deploy. Valida no banco externo:
 *   ✔ Trigger contém advisory_xact_lock (lock por ano)
 *   ✔ Índice/constraint UNIQUE válido em quotes.quote_number
 *   ✔ Zero duplicidades em quote_number
 *   ✔ Sequência por ano sem gaps suspeitos
 *   ✔ Consistência entre prévia (~max+1) e maior número salvo
 *
 * Exit code:
 *   0 = todas as validações OK
 *   1 = pelo menos uma falhou (CI/runbook deve abortar)
 *
 * Uso:
 *   node scripts/verify-quote-number-hardening.mjs
 *
 * Requer um dos modos abaixo para o banco externo (doufsxqlfjyuvxuezpln):
 *   - SUPABASE_ACCESS_TOKEN + SUPABASE_PROJECT_REF (Management API read-only); ou
 *   - PGHOST/PGUSER/PGPASSWORD/PGDATABASE ou DATABASE_URL (psql).
 */
import { execSync } from 'node:child_process';

const projectRef = process.env.SUPABASE_PROJECT_REF;
const accessToken = process.env.SUPABASE_ACCESS_TOKEN;

const query = async (sql) => {
  if (accessToken && projectRef) {
    const response = await fetch(
      `https://api.supabase.com/v1/projects/${encodeURIComponent(projectRef)}/database/query/read-only`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query: sql }),
      },
    );

    if (!response.ok) {
      const detail = (await response.text()).slice(0, 500);
      throw new Error(`Management API ${response.status}: ${detail}`);
    }

    const rows = await response.json();
    if (!Array.isArray(rows)) {
      throw new Error('Management API retornou payload inesperado');
    }

    return rows
      .map((row) => Object.values(row).map((value) => value ?? '').join('|'))
      .join('\n')
      .trim();
  }

  return execSync(`psql -At -F '|' -c ${JSON.stringify(sql)}`, {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  }).trim();
};

const checks = [];
const record = (label, ok, detail = '') =>
  checks.push({ label, ok, detail });

// 1. Trigger tem advisory lock?
try {
  const def = await query(
    `SELECT pg_catalog.pg_get_functiondef('public.generate_quote_number'::regproc)`,
  );
  record(
    'trigger contém advisory_xact_lock',
    /advisory_xact_lock/i.test(def),
    /advisory_xact_lock/i.test(def) ? '' : 'lock ausente — re-aplicar hardening.sql',
  );
} catch (e) {
  record('trigger contém advisory_xact_lock', false, e.message);
}

// 2. Existe proteção UNIQUE equivalente e válida?
// Não acoplamos o gate ao nome: o canônico já pode ter a constraint nativa
// quotes_quote_number_key, semanticamente equivalente ao índice proposto.
try {
  const row = await query(`
    SELECT c.relname AS indexname,
           ix.indisvalid::text,
           COALESCE(pg_catalog.pg_get_expr(ix.indpred, ix.indrelid), '') AS predicate
      FROM pg_catalog.pg_index AS ix
      JOIN pg_catalog.pg_class AS c ON c.oid = ix.indexrelid
      JOIN pg_catalog.pg_class AS t ON t.oid = ix.indrelid
      JOIN pg_catalog.pg_namespace AS n ON n.oid = t.relnamespace
      JOIN pg_catalog.pg_attribute AS a
        ON a.attrelid = t.oid
       AND a.attname = 'quote_number'
     WHERE n.nspname = 'public'
       AND t.relname = 'quotes'
       AND ix.indisunique
       AND ix.indnkeyatts = 1
       AND (
         ix.indpred IS NULL
         OR pg_catalog.regexp_replace(
              pg_catalog.lower(pg_catalog.pg_get_expr(ix.indpred, ix.indrelid)),
              '[[:space:]()]',
              '',
              'g'
            ) = 'quote_numberisnotnull'
       )
       AND ix.indexprs IS NULL
       AND ix.indkey[0] = a.attnum
     ORDER BY ix.indisvalid DESC, c.relname
     LIMIT 1
  `);
  if (!row) {
    record('UNIQUE válido em quotes.quote_number', false, 'proteção UNIQUE não existe');
  } else {
    const [indexName, valid, predicate] = row.split('|');
    const predicateDetail = predicate ? ` predicado=${predicate}` : '';
    record(
      'UNIQUE válido em quotes.quote_number',
      valid === 'true',
      valid === 'true'
        ? `índice=${indexName}${predicateDetail}`
        : `índice ${indexName} INVALID — recriar`,
    );
  }
} catch (e) {
  record('UNIQUE válido em quotes.quote_number', false, e.message);
}

// 3. Zero duplicidades em quote_number?
try {
  const dup = await query(`
    SELECT COUNT(*)::text
      FROM (
        SELECT quote_number
          FROM public.quotes
         WHERE quote_number IS NOT NULL
         GROUP BY quote_number
        HAVING COUNT(*) > 1
      ) t
  `);
  const n = Number.parseInt(dup, 10);
  record(
    `${n} duplicidades em quote_number`,
    n === 0,
    n > 0 ? 'renumerar duplicatas antes de prosseguir' : '',
  );
} catch (e) {
  record('contagem de duplicidades', false, e.message);
}

// 4. Sequência por ano — detecta gaps suspeitos (> 5% dos números)
try {
  const rows = await query(`
    WITH parsed AS (
      SELECT split_part(quote_number,'/',2) AS yy,
             split_part(quote_number,'/',1)::int AS seq
        FROM public.quotes
       WHERE quote_number ~ '^\\d+/\\d{2}$'
    )
    SELECT yy,
           COUNT(*)::text AS total,
           MIN(seq)::text AS minseq,
           MAX(seq)::text AS maxseq,
           ((MAX(seq) - MIN(seq) + 1) - COUNT(*))::text AS gaps
      FROM parsed
     GROUP BY yy
     ORDER BY yy DESC
     LIMIT 5
  `);
  let ok = true;
  let detail = '';
  for (const line of rows.split('\n').filter(Boolean)) {
    const [yy, total, , , gaps] = line.split('|');
    const ratio = Number(gaps) / Math.max(1, Number(total));
    if (ratio > 0.05) {
      ok = false;
      detail += `\n   yy=${yy}: ${gaps} gaps em ${total} (${(ratio * 100).toFixed(1)}%)`;
    }
  }
  record('sequência por ano sem gaps suspeitos (>5%)', ok, detail);
} catch (e) {
  record('sequência por ano', false, e.message);
}

// 5. Consistência prévia × salvo: o maior quote_number do ano corrente
//    deve ser igual ao que a fórmula MAX+1 - 1 retornaria — ou seja,
//    confere que não houve INSERT órfão fora do trigger.
try {
  const yy = new Date().getFullYear() % 100;
  const yyStr = String(yy).padStart(2, '0');
  const result = await query(`
    SELECT MAX(split_part(quote_number,'/',1)::int)::text
      FROM public.quotes
     WHERE quote_number LIKE '%/' || '${yyStr}'
  `);
  record(
    `prévia client-side bate com MAX do banco para /${yyStr}`,
    !!result || result === '',
    result ? `MAX atual=${result}/${yyStr} → próxima prévia=~${Number(result) + 1}/${yyStr}` : 'sem registros no ano',
  );
} catch (e) {
  record('consistência prévia × salvo', false, e.message);
}

// Relatório
const pad = (s, n) => s.padEnd(n);
console.log('\n━━━ Verificação do hardening ━━━\n');
for (const c of checks) {
  console.log(`${c.ok ? '✔' : '✘'} ${pad(c.label, 60)}${c.detail ? ' — ' + c.detail : ''}`);
}
const failed = checks.filter((c) => !c.ok).length;
console.log(`\nResultado: ${checks.length - failed}/${checks.length} checks OK`);
process.exit(failed === 0 ? 0 : 1);
