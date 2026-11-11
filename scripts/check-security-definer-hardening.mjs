#!/usr/bin/env node
/**
 * Bloqueia migrations que adicionam funções SECURITY DEFINER novas
 * sem hardening mínimo (search_path explícito + REVOKE de anon/authenticated
 * quando não-RLS helper).
 *
 * Heurística:
 *   - Detecta arquivos novos em supabase/migrations/ que contêm
 *     CREATE FUNCTION ... SECURITY DEFINER
 *   - Para cada uma, exige que o MESMO arquivo contenha:
 *       1) SET search_path TO ... (qualquer forma)
 *       2) REVOKE EXECUTE ... FROM anon (ou comentário explicitando
 *          que a função é helper de RLS legítimo)
 *
 * Allowlist: arquivos históricos do repo ficam livres para evitar quebra
 * de baseline; só novos arquivos (adicionados na PR) são validados.
 *
 * Uso CI: rodar com `node scripts/check-security-definer-hardening.mjs`.
 * Em PR: compara HEAD vs base.
 */
import { execSync, execFileSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';

const IN_CI = process.env.GITHUB_ACTIONS === 'true';
const BASE_REF = process.env.GITHUB_BASE_REF || 'main';
// GITHUB_BASE_REF vira argumento do git: execFileSync impede injeção de SHELL, mas um valor
// começando com "-" ainda seria lido como OPÇÃO do git (ex.: --upload-pack=...). Só nomes de branch.
if (!/^[A-Za-z0-9][A-Za-z0-9._/-]*$/.test(BASE_REF) || BASE_REF.includes('..')) {
  console.error(`❌ check-security-definer-hardening: GITHUB_BASE_REF inválido (${JSON.stringify(BASE_REF)}).`);
  process.exit(2);
}
// Pathspec literal: passado como argv (execFileSync), nunca por `sh -c`.
const MIGRATIONS_GLOB = 'supabase/migrations/*.sql';

function gitAddedSince(...revs) {
  return execFileSync('git', ['diff', '--name-only', '--diff-filter=A', ...revs, '--', MIGRATIONS_GLOB], {
    encoding: 'utf8',
    stdio: ['pipe', 'pipe', 'pipe'],
  })
    .split('\n')
    .filter(Boolean);
}

const ADDED_FILES = (() => {
  // Em CI: GITHUB_BASE_REF aponta para base da PR. Vem de env (nome de branch),
  // então nunca interpolar em shell string — execFileSync passa como argv literal.
  try {
    return gitAddedSince(`origin/${BASE_REF}...HEAD`);
  } catch {
    // actions/checkout raso (fetch-depth: 1) não tem origin/<base>: buscar a ponta da base.
    // GUARD: antes o `git diff` falhava, o fallback devolvia [] e o gate dizia
    // "nenhuma migration nova" sem validar nada em toda PR.
    try {
      execFileSync(
        'git',
        ['fetch', '--no-tags', '--depth=1', 'origin', `${BASE_REF}:refs/remotes/origin/${BASE_REF}`],
        { stdio: ['pipe', 'pipe', 'pipe'] },
      );
      return gitAddedSince(`origin/${BASE_REF}`, 'HEAD');
    } catch {
      if (IN_CI) {
        console.error(
          `❌ check-security-definer-hardening: base origin/${BASE_REF} indisponível no checkout — ` +
            'não é possível saber quais migrations são novas. Use fetch-depth: 0 ou garanta acesso ao remoto.',
        );
        process.exit(2);
      }
      // Fora de CI (rodando local sem origin/main): valida arquivos novos, não-rastreados ou modificados.
      try {
        const out = execSync('git status --porcelain -- "supabase/migrations/*.sql"', {
          encoding: 'utf8',
        });
        return out
          .split('\n')
          .filter((l) => /^(\?\?|[ AM][ AM])\s/.test(l))
          .map((l) => l.slice(3).trim())
          .filter(Boolean);
      } catch {
        return [];
      }
    }
  }
})();

if (ADDED_FILES.length === 0) {
  console.log('✅ check-security-definer-hardening: nenhuma migration nova para validar.');
  process.exit(0);
}

const offenders = [];

for (const path of ADDED_FILES) {
  if (!existsSync(path)) continue;
  const raw = readFileSync(path, 'utf8');
  const lower = raw.toLowerCase();
  // Comentários não contam como código (um "-- security definer" não torna a função definer).
  const content = raw.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/--[^\n]*/g, '');

  // GUARD: SECURITY DEFINER pode vir DEPOIS do corpo ($$ … $$ LANGUAGE plpgsql SECURITY DEFINER);
  // a janela de 500 caracteres deixava funções longas escaparem.
  const hasSdCreate =
    /create\s+(or\s+replace\s+)?function/i.test(content) && /security\s+definer/i.test(content);
  if (!hasSdCreate) continue;

  const hasSearchPath = /set\s+search_path\s+to/i.test(content) || /search_path\s*=/i.test(content);
  // Aceita revoke explícito OU comentário marcador para helper de RLS.
  const hasMarker = /--\s*rls-helper:/i.test(lower);
  // `[^;]*` (não cruza statements): `REVOKE … FROM PUBLIC; GRANT … TO anon` não é revoke de anon.
  // `ALL [PRIVILEGES]` inclui EXECUTE: vale tanto para o REVOKE quanto para o GRANT.
  // Só conta privilégio de FUNÇÃO: `REVOKE ALL ON TABLE … FROM anon` não protege a função, e
  // `GRANT ALL ON TABLE … TO anon` não a expõe. GRANT a PUBLIC também expõe (anon herda de PUBLIC).
  const ON_FN = String.raw`\s+on\s+(?:functions?|routines?|all\s+(?:functions|routines)\s+in\s+schema)\b`;
  const hasRevokeAnon =
    new RegExp(String.raw`revoke\s+(?:execute|all(?:\s+privileges)?)` + ON_FN + String.raw`[^;]*\bfrom\b[^;]*\banon\b`, 'i').test(content) || hasMarker;
  const grantsAnon =
    new RegExp(String.raw`grant\s+(?:execute|all(?:\s+privileges)?)` + ON_FN + String.raw`[^;]*\bto\b[^;]*\b(?:anon|public)\b`, 'i').test(content) && !hasMarker;

  if (!hasSearchPath || !hasRevokeAnon || grantsAnon) {
    offenders.push({
      path,
      missing_search_path: !hasSearchPath,
      missing_revoke_or_marker: !hasRevokeAnon,
      grants_anon: grantsAnon,
    });
  }
}

if (offenders.length === 0) {
  console.log(
    `✅ check-security-definer-hardening: ${ADDED_FILES.length} migration(s) nova(s) validadas com hardening completo.`,
  );
  process.exit(0);
}

console.error('❌ check-security-definer-hardening: migrations novas sem hardening de SECURITY DEFINER:');
for (const o of offenders) {
  console.error(`   - ${o.path}`);
  if (o.missing_search_path) console.error('       ⤷ FALTA: SET search_path TO ...');
  if (o.grants_anon) {
    console.error('       ⤷ CONCEDE: GRANT EXECUTE … TO anon numa função SECURITY DEFINER (endpoint público).');
    console.error('         Se for intencional (ex.: RPC pública somente leitura), declare com "-- rls-helper: <motivo>".');
  }
  if (o.missing_revoke_or_marker)
    console.error(
      "       ⤷ FALTA: REVOKE EXECUTE ... FROM anon (ou comentário '-- rls-helper:' justificando)",
    );
}
console.error('');
console.error('Toda função SECURITY DEFINER nova deve incluir, no mesmo arquivo:');
console.error('  1) SET search_path TO pg_catalog, public (ou equivalente)');
console.error('  2) REVOKE EXECUTE ON FUNCTION ... FROM anon (e authenticated se admin-only)');
console.error('     OU comentário "-- rls-helper: <razão>" se a função é callable de policy RLS');
console.error('');
console.error('Detalhes: docs/redeploy/REDEPLOY-FASE3-PLAN.md');
process.exit(1);
