/**
 * Tests for scripts/map-drafts-to-migrations.mjs
 *
 * O script relaciona cada arquivo em `qa/migrations-draft/` a migration(s)
 * correspondente(s) em `supabase/migrations/` (por slug, exato ou fuzzy por
 * tokens) e, quando `PGHOST` está acessível, ao status de aplicação real no
 * banco. Em modo `--check`, além de comparar o markdown gerado com o
 * existente, atua como gate: todo draft 🟡 "não promovido" precisa estar
 * revisado em `REVIEWS.json` (`acknowledged_not_promoted`).
 *
 * O script executa lógica de topo de módulo (sem export), então é testado
 * como subprocesso via spawnSync contra diretórios reais em /tmp, seguindo
 * o mesmo padrão de tests/scripts/classify-unledgered-migrations.test.mjs.
 *
 * BUG real encontrado e corrigido nesta sessão: `findCandidates()` comparava
 * o slug do draft com `nameLc.includes(slug.toLowerCase())` para decidir o
 * match "🎯 slug exato". Quando o slug é vazio — caso real e plausível de um
 * draft nomeado só com o timestamp e um `_` final, ex. "20260627_.sql" (a
 * própria função `slugOf()` do script extrai `slug = ''` nesse caso) —
 * `"".includes('')` é sempre `true` em JS, então TODO arquivo em
 * `supabase/migrations/` era listado como "🎯 slug exato" para esse draft,
 * com "bateu: _(nenhum)_" (nenhum token) ao lado — uma contradição visível na
 * própria tabela. Isso é um falso-positivo do gate: o draft deixava de cair
 * em 🟡 "não promovido" e portanto escapava da exigência de revisão em
 * `REVIEWS.json` no `--check`, deixando um rascunho órfão passar
 * silenciosamente pelo gate de CI. Corrigido com um guard `if (!slug) return
 * [];` em `findCandidates()`.
 *
 * Segundo BUG corrigido: `MIG_DIR` (supabase/migrations) era lido com
 * `readdirSync` sem o mesmo guard de `existsSync` que já protegia
 * `DRAFT_DIR`, causando uma exceção não tratada (stack trace Node cru) em
 * vez de uma mensagem de erro útil quando o diretório de migrations não
 * existe.
 */

import assert from 'node:assert/strict';
import {
  mkdtempSync, mkdirSync, writeFileSync, rmSync, readFileSync,
} from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';
import { test, describe } from 'vitest';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const SCRIPT = join(ROOT, 'scripts/map-drafts-to-migrations.mjs');

function run(cwd, args = [], env = process.env) {
  return spawnSync(process.execPath, [SCRIPT, ...args], {
    cwd, encoding: 'utf8', env, timeout: 15000,
  });
}

function makeSandbox() {
  const sandbox = mkdtempSync(join(tmpdir(), 'map-drafts-'));
  mkdirSync(join(sandbox, 'qa', 'migrations-draft'), { recursive: true });
  mkdirSync(join(sandbox, 'supabase', 'migrations'), { recursive: true });
  return sandbox;
}

function statusMd(sandbox) {
  return readFileSync(join(sandbox, 'qa', 'migrations-draft', 'DRAFTS_STATUS.md'), 'utf8');
}

describe('map-drafts-to-migrations.mjs — slug vazio (bug real)', () => {
  test('draft com slug vazio NÃO deve casar com todas as migrations ("slug exato" falso-positivo)', () => {
    const sandbox = makeSandbox();
    try {
      // Nome plausível: timestamp seguido de "_" sem descrição -> slugOf()
      // extrai slug = '' (tudo após o primeiro "_").
      writeFileSync(join(sandbox, 'qa', 'migrations-draft', '20260627_.sql'), '-- draft\n');
      writeFileSync(
        join(sandbox, 'supabase', 'migrations', '20260101000000_algo_sem_relacao.sql'),
        'select 1;\n',
      );
      writeFileSync(
        join(sandbox, 'supabase', 'migrations', '20260102000000_outra_coisa_aqui.sql'),
        'select 1;\n',
      );

      const result = run(sandbox, []);
      assert.equal(result.status, 0, result.stderr);

      const body = statusMd(sandbox);
      const row = body.split('\n').find((l) => l.includes('20260627_.sql'));
      // Antes do fix: a linha da tabela mostrava "🎯 slug exato" para as duas
      // migrations e o draft NÃO caía em "não promovido". ("slug exato"
      // também aparece na legenda estática do documento, por isso a
      // asserção é restrita à linha da tabela deste draft.)
      assert.ok(row, 'linha do draft não encontrada na tabela');
      assert.match(row, /_\(nenhum match\)_/);
      assert.match(row, /🟡 não promovido/);
      assert.doesNotMatch(row, /slug exato/);
    } finally {
      rmSync(sandbox, { recursive: true, force: true });
    }
  });

  test('--check deve FALHAR (gate) para draft de slug vazio sem revisão em REVIEWS.json', () => {
    const sandbox = makeSandbox();
    try {
      writeFileSync(join(sandbox, 'qa', 'migrations-draft', '20260627_.sql'), '-- draft\n');
      writeFileSync(
        join(sandbox, 'supabase', 'migrations', '20260101000000_algo_sem_relacao.sql'),
        'select 1;\n',
      );

      // gera o DRAFTS_STATUS.md primeiro (--check compara contra o existente)
      const gen = run(sandbox, []);
      assert.equal(gen.status, 0, gen.stderr);

      const check = run(sandbox, ['--check']);
      // Antes do fix: o draft "casava" (falso-positivo) e não entrava na
      // lista de 🟡 não revisados, então --check passava (status 0) mesmo
      // com um draft órfão sem revisão registrada.
      assert.equal(check.status, 1);
      assert.match(check.stderr, /sem revisão registrada/);
      assert.match(check.stderr, /20260627_\.sql/);
    } finally {
      rmSync(sandbox, { recursive: true, force: true });
    }
  });
});

describe('map-drafts-to-migrations.mjs — supabase/migrations/ ausente (bug real)', () => {
  test('diretório de migrations ausente dá erro claro, não stack trace cru', () => {
    const sandbox = mkdtempSync(join(tmpdir(), 'map-drafts-nomig-'));
    try {
      // só cria qa/migrations-draft; supabase/migrations/ não existe
      mkdirSync(join(sandbox, 'qa', 'migrations-draft'), { recursive: true });
      writeFileSync(join(sandbox, 'qa', 'migrations-draft', '2026-01-01_foo_bar.sql'), 'x\n');

      const result = run(sandbox, []);
      assert.equal(result.status, 1);
      assert.match(result.stderr, /\[drafts-map\] diretório inexistente/);
      assert.doesNotMatch(result.stderr, /at readdirSync/);
    } finally {
      rmSync(sandbox, { recursive: true, force: true });
    }
  });
});

describe('map-drafts-to-migrations.mjs — comportamento básico (regressão)', () => {
  test('slug exato real continua casando normalmente', () => {
    const sandbox = makeSandbox();
    try {
      writeFileSync(
        join(sandbox, 'qa', 'migrations-draft', '2026-06-27_quotes_status_allow_cancelled.sql'),
        '-- draft\n',
      );
      writeFileSync(
        join(sandbox, 'supabase', 'migrations', '20260627123045_quotes_status_allow_cancelled.sql'),
        'select 1;\n',
      );

      const result = run(sandbox, []);
      assert.equal(result.status, 0, result.stderr);
      const body = statusMd(sandbox);
      assert.match(body, /slug exato/);
      assert.match(body, /20260627123045_quotes_status_allow_cancelled\.sql/);
    } finally {
      rmSync(sandbox, { recursive: true, force: true });
    }
  });

  test('diretório de drafts ausente dá erro claro (guard já existia)', () => {
    const sandbox = mkdtempSync(join(tmpdir(), 'map-drafts-nodraft-'));
    try {
      mkdirSync(join(sandbox, 'supabase', 'migrations'), { recursive: true });
      const result = run(sandbox, []);
      assert.equal(result.status, 1);
      assert.match(result.stderr, /\[drafts-map\] diretório inexistente/);
    } finally {
      rmSync(sandbox, { recursive: true, force: true });
    }
  });

  test('REVIEWS.json malformado aborta com mensagem útil (exit 2), não stack trace', () => {
    const sandbox = makeSandbox();
    try {
      writeFileSync(join(sandbox, 'qa', 'migrations-draft', '2026-01-01_sem_match.sql'), 'x\n');
      const gen = run(sandbox, []);
      assert.equal(gen.status, 0, gen.stderr);

      writeFileSync(join(sandbox, 'qa', 'migrations-draft', 'REVIEWS.json'), '{ not valid json');
      const check = run(sandbox, ['--check']);
      assert.equal(check.status, 2);
      assert.match(check.stderr, /REVIEWS\.json inválido/);
    } finally {
      rmSync(sandbox, { recursive: true, force: true });
    }
  });
});
