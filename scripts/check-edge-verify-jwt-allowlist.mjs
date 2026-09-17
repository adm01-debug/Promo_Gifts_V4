#!/usr/bin/env node
/**
 * check-edge-verify-jwt-allowlist.mjs
 *
 * Etapa E42 (docs/plans/PLANO_DBA_CORRECOES_MELHORIAS_50_ETAPAS_2026-09-16.md).
 *
 * Gate: toda edge function ao vivo com `verify_jwt=false` (chamável sem JWT do
 * Supabase Auth) precisa estar documentada em
 * `.security/edge-functions-verify-jwt-false-allowlist.json` com um `reason`
 * não-vazio. Uma função pública por engano — deployada com verify_jwt=false
 * sem ninguém perceber — fica acessível anonimamente sem gate nenhum hoje.
 * `edge-functions-drift-check.yml` já compara slugs e conteúdo (hash) entre
 * repo × canônico, mas nunca olhou para `verify_jwt`.
 *
 * Também captura `ezbr_sha256` por função (quando disponível ao vivo) como
 * campo de observabilidade no relatório — NÃO como comparação de drift: o
 * algoritmo desse hash não é documentado publicamente pela Management API
 * (schema oficial só declara `ezbr_sha256` como "optional string", sem
 * detalhar como é calculado), então não é seguro reproduzi-lo localmente e
 * tratar uma divergência como drift real. O drift de conteúdo continua sendo
 * responsabilidade do passo `hash_diff` (download + sha256 local) do
 * workflow, que a Etapa E42 também estende para cobrir o diretório inteiro de
 * cada função, não só `index.ts`.
 *
 * Exclui explicitamente `_shared/` e `tests/` do escopo (não são functions
 * deployadas) — mesmo padrão de scripts/check-edge-live-coverage.mjs.
 *
 * Fontes de dados (na ordem):
 *   1. `--from-file=<path.json>` — array de functions no shape da Management
 *      API (`[{slug, verify_jwt, ezbr_sha256}, ...]` ou `{functions: [...]}`).
 *      Usado em testes/CI para não repetir a chamada de rede.
 *   2. `SUPABASE_ACCESS_TOKEN` + `SUPABASE_PROJECT_REF` — Management API
 *      `GET /v1/projects/{ref}/functions` (mesmo padrão de autenticação de
 *      scripts/supabase-read-only-query.mjs, mas em endpoint não-SQL — a
 *      lista de edge functions não é uma tabela consultável via pg-meta).
 *   3. Sem nenhum dos dois → `static-pass` no modo advisory (default) ou
 *      `inconclusive` com `--require-live`.
 *
 * Modo interativo do PO:
 *   `--update-allowlist` grava o snapshot atual em disco com um placeholder
 *   "motivo não confirmado — requer revisão humana" para funções novas
 *   (usar apenas após revisão humana antes de aprovar o PR).
 *
 * Uso:
 *   node scripts/check-edge-verify-jwt-allowlist.mjs
 *   node scripts/check-edge-verify-jwt-allowlist.mjs --from-file=/tmp/fns.json
 *   node scripts/check-edge-verify-jwt-allowlist.mjs --update-allowlist
 *   node scripts/check-edge-verify-jwt-allowlist.mjs --out=/tmp/verify-jwt-report.json
 *
 * Exit codes: 0 (passed/static-pass), 1 (failed — função sem allowlist ou
 *             entrada sem reason), 2 (inconclusive/erro de config).
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
import {
  CHECK_RESULT_STATUS,
  concludeCheck,
  maskUrl,
  shouldRequireLive,
} from './check-result-contract.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const ALLOWLIST_PATH = path.join(ROOT, '.security/edge-functions-verify-jwt-false-allowlist.json');
const EXCLUDE = new Set(['_shared', 'tests']);

const argv = process.argv.slice(2);
const fromFileArg = argv.find((a) => a.startsWith('--from-file='));
const outArg = argv.find((a) => a.startsWith('--out='));
const OUT_PATH = outArg ? outArg.slice('--out='.length) : null;
const UPDATE = argv.includes('--update-allowlist');
const REQUIRE_LIVE = shouldRequireLive(argv);

/**
 * Normaliza um payload cru (array direto, ou `{functions: [...]}`, no shape
 * de `GET /v1/projects/{ref}/functions`) para `[{slug, verify_jwt, ezbr_sha256}]`.
 */
export function normalizeFunctions(raw) {
  const arr = Array.isArray(raw) ? raw : raw?.functions;
  if (!Array.isArray(arr)) return [];
  return arr
    .filter((f) => f && typeof f.slug === 'string' && !EXCLUDE.has(f.slug))
    .map((f) => ({
      slug: f.slug,
      verify_jwt: f.verify_jwt === true,
      ezbr_sha256: typeof f.ezbr_sha256 === 'string' ? f.ezbr_sha256 : null,
    }));
}

async function fetchLive() {
  const accessToken = process.env.SUPABASE_ACCESS_TOKEN;
  const projectRef = process.env.SUPABASE_PROJECT_REF;

  if (!accessToken || !projectRef) {
    return { kind: 'missing-config' };
  }

  const endpoint = `https://api.supabase.com/v1/projects/${encodeURIComponent(projectRef)}/functions`;
  let response;
  try {
    response = await fetch(endpoint, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
  } catch {
    return { kind: 'network-error', target: endpoint };
  }

  if (!response.ok) {
    return {
      kind: 'http-error',
      target: endpoint,
      httpStatus: response.status,
      bodyLength: (await response.text()).length,
    };
  }

  let raw;
  try {
    raw = await response.json();
  } catch {
    return { kind: 'invalid-json', target: endpoint };
  }

  const functions = normalizeFunctions(raw);
  if (functions.length === 0) {
    return { kind: 'invalid-response', target: endpoint, responseType: typeof raw };
  }

  return { kind: 'live', source: 'management-api', target: `project:${projectRef}`, functions };
}

export function loadAllowlist(allowlistPath = ALLOWLIST_PATH) {
  if (!existsSync(allowlistPath)) {
    process.stderr.write(`[edge-verify-jwt] allowlist ausente: ${allowlistPath}\n`);
    process.exit(2);
  }
  const doc = JSON.parse(readFileSync(allowlistPath, 'utf8'));
  if (!Array.isArray(doc.functions)) {
    process.stderr.write('[edge-verify-jwt] allowlist.functions inválida\n');
    process.exit(2);
  }
  return { doc, byslug: new Map(doc.functions.map((e) => [e.slug, e])) };
}

/**
 * Compara a lista ao vivo (ou --from-file) com a allowlist.
 * Retorna { newFindings, missingReasons, staleAllowlist }.
 */
export function diff(liveFunctions, doc) {
  const falseJwt = liveFunctions.filter((f) => f.verify_jwt === false).map((f) => f.slug);
  const falseJwtSet = new Set(falseJwt);
  const byslug = new Map(doc.functions.map((e) => [e.slug, e]));

  const newFindings = falseJwt.filter((slug) => !byslug.has(slug));
  const missingReasons = doc.functions
    .filter((e) => !e.reason || !String(e.reason).trim())
    .map((e) => e.slug);
  const staleAllowlist = doc.functions.map((e) => e.slug).filter((slug) => !falseJwtSet.has(slug));

  return { falseJwt, newFindings, missingReasons, staleAllowlist };
}

async function main() {
  let liveFunctions;
  let liveMeta = null;

  if (fromFileArg) {
    const p = fromFileArg.slice('--from-file='.length);
    const raw = JSON.parse(readFileSync(p, 'utf8'));
    liveFunctions = normalizeFunctions(raw);
  } else {
    const live = await fetchLive();
    if (live.kind !== 'live') {
      if (live.kind === 'missing-config') {
        return concludeCheck({
          check: 'edge-verify-jwt-allowlist',
          status: REQUIRE_LIVE ? CHECK_RESULT_STATUS.INCONCLUSIVE : CHECK_RESULT_STATUS.STATIC_PASS,
          summary: REQUIRE_LIVE
            ? 'sem SUPABASE_ACCESS_TOKEN/SUPABASE_PROJECT_REF; evidência live obrigatória não disponível'
            : 'sem SUPABASE_ACCESS_TOKEN/SUPABASE_PROJECT_REF; verificação ficou em modo estático',
          details: { reason: live.kind, requireLive: REQUIRE_LIVE },
        });
      }
      return concludeCheck({
        check: 'edge-verify-jwt-allowlist',
        status: CHECK_RESULT_STATUS.INCONCLUSIVE,
        summary: `Management API indisponível para consulta live (${live.kind})`,
        details: {
          reason: live.kind,
          maskedUrl: maskUrl(live.target?.startsWith?.('http') ? live.target : null),
          httpStatus: live.httpStatus,
          responseType: live.responseType,
          bodyLength: live.bodyLength,
        },
      });
    }
    liveFunctions = live.functions;
    liveMeta = live;
  }

  if (OUT_PATH) {
    writeFileSync(
      OUT_PATH,
      JSON.stringify(
        {
          generated_at: new Date().toISOString(),
          total: liveFunctions.length,
          verify_jwt_false_count: liveFunctions.filter((f) => f.verify_jwt === false).length,
          functions: liveFunctions,
        },
        null,
        2,
      ) + '\n',
    );
  }

  const { doc } = loadAllowlist();

  if (UPDATE) {
    const { newFindings, staleAllowlist } = diff(liveFunctions, doc);
    const merged = new Map(doc.functions.map((e) => [e.slug, e]));
    for (const slug of newFindings) {
      merged.set(slug, {
        slug,
        category: 'unknown',
        reason: 'motivo não confirmado — requer revisão humana',
      });
    }
    for (const slug of staleAllowlist) merged.delete(slug);
    const next = {
      ...doc,
      snapshot_date: new Date().toISOString().slice(0, 10),
      functions: Array.from(merged.values()).sort((a, b) => a.slug.localeCompare(b.slug)),
    };
    writeFileSync(ALLOWLIST_PATH, JSON.stringify(next, null, 2) + '\n');
    process.stderr.write(
      `[edge-verify-jwt] allowlist atualizada: +${newFindings.length} / -${staleAllowlist.length}\n`,
    );
    process.exit(0);
  }

  const { falseJwt, newFindings, missingReasons, staleAllowlist } = diff(liveFunctions, doc);

  const problems = [];
  if (newFindings.length) {
    problems.push(
      `🚨 ${newFindings.length} edge function(s) com verify_jwt=false SEM entrada na allowlist:\n` +
        newFindings.map((s) => `   - ${s}`).join('\n'),
    );
  }
  if (missingReasons.length) {
    problems.push(
      `❌ ${missingReasons.length} entrada(s) na allowlist sem \`reason\`:\n` +
        missingReasons.map((s) => `   - ${s}`).join('\n'),
    );
  }

  if (staleAllowlist.length) {
    process.stderr.write(
      `⚠️  ${staleAllowlist.length} entrada(s) da allowlist não estão mais com verify_jwt=false ao vivo:\n` +
        staleAllowlist.map((s) => `   - ${s}`).join('\n') +
        '\n   Rode: node scripts/check-edge-verify-jwt-allowlist.mjs --update-allowlist\n',
    );
  }

  if (problems.length) {
    process.stderr.write('\n' + problems.join('\n\n') + '\n\n');
    process.stderr.write(
      'Correção padrão (recomendada): se a função NÃO deveria ser pública, remover\n' +
        '  `verify_jwt = false` de supabase/config.toml e redeployar.\n\n' +
        'Se a função DEVE mesmo ser chamável sem JWT (webhook, cron, endpoint público),\n' +
        'adicione em .security/edge-functions-verify-jwt-false-allowlist.json com um\n' +
        '`reason` real, OU rode `node scripts/check-edge-verify-jwt-allowlist.mjs --update-allowlist`\n' +
        'e edite o motivo antes de aprovar o PR.\n',
    );
    return concludeCheck({
      check: 'edge-verify-jwt-allowlist',
      status: CHECK_RESULT_STATUS.FAILED,
      summary: `${newFindings.length} função(ões) sem allowlist, ${missingReasons.length} sem reason`,
      details: {
        verifyJwtFalseCount: falseJwt.length,
        newFindings,
        missingReasons,
        staleAllowlist,
        source: liveMeta ? liveMeta.source : 'from-file',
      },
    });
  }

  return concludeCheck({
    check: 'edge-verify-jwt-allowlist',
    status: CHECK_RESULT_STATUS.PASSED,
    summary: `${falseJwt.length} função(ões) com verify_jwt=false — todas documentadas na allowlist (${liveFunctions.length} function(s) no total)`,
    details: { verifyJwtFalseCount: falseJwt.length, totalFunctions: liveFunctions.length, staleAllowlist },
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  main().catch((e) => {
    process.stderr.write(`[edge-verify-jwt] erro: ${e.stack || e.message}\n`);
    process.exit(2);
  });
}
