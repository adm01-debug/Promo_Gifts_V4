# A5 — Relatório de Validação

> Gerado por sessão Claude (A5) em 2026-10-22
> Branch: `claude/happy-faraday-0vgza3`
> Arquivos validados: outputs dos agentes A1–A4

---

## Resumo: FALHOU

Dois problemas bloqueantes identificados:
1. **Gate 1.3.3 — Migrations Sync Log**: 6 migrations novas sem entrada placeholder em `supabase/MIGRATIONS_SYNC_LOG.md` → `check-migrations-sync-log-gate.mjs` retorna exit 1.
2. **SQL A3 — Outer transaction ausente**: Migrations 100020, 100021, 100022 usam `DO $$ BEGIN/END $$` (bloco PL/pgSQL) mas não têm `BEGIN;` / `COMMIT;` no nível SQL externo, violando a convenção do projeto.

---

## Gate 0 SSOT: PASSOU

```
# [LEGACY_INFORMATIVO] verificação de ausência do project-ref proibido (não use em código executável)
grep -r "pqpdolkaeqlyzpdpbizo" supabase/migrations/20261022100001...100022.sql
→ ZERO ocorrências
```

Nenhuma das 6 migrations novas (A1–A3) nem os 5 `*_repair_only_marker.sql` (A4) referenciam o project-ref proibido.

---

## Gate 0 validate-config: PASSOU

```
node scripts/validate-supabase-config.mjs
→ ✅ Supabase connection is correctly pointing to the current project.
→ ✅ E064: 2988 arquivo(s) de migration sem referência executável ao project-ref proibido.
→ Exit: 0
```

---

## Gate 1 Lint: NÃO VERIFICADO (problema pré-existente)

```
npm run lint
→ eslint.config.js NAO E JAVASCRIPT VALIDO.
   Cannot find package 'acorn' imported from scripts/check-eslint-config-parses.mjs
→ Exit: 0 (o script sinaliza aviso mas não falha)
```

O erro é pré-existente (falta do pacote `acorn`) e **não foi introduzido pelos agentes A1–A4**. Nenhum arquivo `.ts`/`.tsx` foi modificado pelos agentes. Gate retorna exit 0.

---

## Gate 1.3 Preflight: NÃO VERIFICADO

```
node scripts/preflight-migration-apply.mjs --dry-run
→ [preflight-migration-apply] erro: --version=<version> é obrigatório.
→ Exit: 0
```

O script requer `--version=<versão>` específica e não opera em modo `--dry-run` genérico. Não é possível executar sem a versão-alvo. Isso **não é defeito dos agentes** — o script funciona por design assim (execução via workflow `db-apply-migration.yml` com versão explícita).

---

## Gate 1.3.3 — Migrations Sync Log: FALHOU (BLOQUEANTE)

```
node scripts/check-migrations-sync-log-gate.mjs
→ [migrations-sync-log-gate] failed: 6/11 migration(ões) alterada(s) SEM recibo válido
→ Exit: 1
```

As 6 migrations criadas pelos agentes A1–A3 **não possuem entradas** em `supabase/MIGRATIONS_SYNC_LOG.md`:

| Versão | Arquivo | Agente |
|---|---|---|
| `20261022100001` | `security_fn_cron_guard_revoke_anon.sql` | A1 |
| `20261022100010` | `perf_rls_auth_uid_wrapper.sql` | A2 |
| `20261022100011` | `perf_drop_unused_indexes.sql` | A2 |
| `20261022100020` | `fix_cron_dispatcher_failure_alert.sql` | A3 |
| `20261022100021` | `fix_cron_hash_product_images.sql` | A3 |
| `20261022100022` | `fix_cron_sync_is_stockout_universal.sql` | A3 |

O gate `check-migrations-sync-log-gate.mjs` exige que todo PR que toca `supabase/migrations/**` adicione ao menos uma linha na tabela de recibos do sync log. **Este gate bloqueará o CI** se a PR for aberta sem correção.

Os 5 `*_repair_only_marker.sql` criados pelo agente A4 **já têm entradas** no sync log (linhas 1503–1507 de `MIGRATIONS_SYNC_LOG.md`). O problema está apenas nas migrations novas A1–A3.

---

## SQL bem-formado: FALHOU parcial

### Migrations A1 e A2 (100001, 100010, 100011): PASSOU

| Arquivo | BEGIN | COMMIT | Forbidden ID | DDL não autorizado |
|---|---|---|---|---|
| `20261022100001` | ✓ | ✓ | ✗ | ✗ |
| `20261022100010` | ✓ | ✓ | ✗ | ✗ |
| `20261022100011` | ✓ | ✓ | ✗ | ✗ |

Nota `20261022100011`: DROP INDEX usa `IF EXISTS` (idempotente); comentários explicitam por que não usa `CONCURRENTLY` (incompatível com `psql -1`). Colunas `UNIQUE_CONSTRAINT_CANDIDATE` estão corretamente comentadas aguardando aprovação do PO.

### Migrations A3 (100020, 100021, 100022): ATENÇÃO — outer BEGIN/COMMIT ausente

| Arquivo | Outer BEGIN | Outer COMMIT | Forbidden ID |
|---|---|---|---|
| `20261022100020` | ✗ | ✗ | ✗ |
| `20261022100021` | ✗ | ✗ | ✗ |
| `20261022100022` | ✗ | ✗ | ✗ |

As três migrations de redistribuição de cron (A3) usam `DO $$ BEGIN/END; $$;` (bloco PL/pgSQL anônimo para pré-condição) seguido de `cron.unschedule` + `cron.schedule` em autocommit. **Não há `BEGIN;` / `COMMIT;` no nível SQL externo.**

Risco: se `cron.unschedule` executar e `cron.schedule` falhar (ex.: erro de sintaxe na expressão de schedule), o job fica permanentemente desagendado.

Mitigante parcial: o workflow `db-apply-migration.yml` usa `psql -1` (`--single-transaction`), que envolve o arquivo inteiro numa transação. Mas isso é dependência de infra, não garantia estrutural no arquivo SQL.

**Recomendação**: adicionar `BEGIN;` no topo e `COMMIT;` no final de cada arquivo, ou adicionar comentário explícito documentando a dependência de `psql -1`.

### Repair-only markers A4 (5 arquivos): PASSOU

Arquivos são somente comentários (sem SQL executável) — correto para modo `repair-only`. Todos referenciados no `MIGRATIONS_SYNC_LOG.md`.

---

## Timestamps sem conflito: PASSOU

```
ls supabase/migrations/20261022100* | sort
→ 20261022100001, 20261022100010, 20261022100011,
  20261022100020, 20261022100021, 20261022100022
```

Nenhum timestamp duplicado. Sequência respeita a ordem A1 < A2 < A3. Não há conflito com migrations anteriores (a migration mais recente antes das novas é `20261019000000`).

---

## Workflows intocados: PASSOU

```
git diff HEAD~5..HEAD -- .github/
→ (sem output — nenhuma mudança)
```

Nenhum arquivo em `.github/` foi tocado pelos agentes A1–A4.

---

## Itens que precisam de atenção antes do PR

### 1. BLOQUEANTE — Adicionar entradas de placeholder em MIGRATIONS_SYNC_LOG.md

O gate `check-migrations-sync-log-gate.mjs` retorna exit 1 e bloqueará o CI.

Ação necessária: adicionar 6 linhas na tabela de recibos de `supabase/MIGRATIONS_SYNC_LOG.md` com status `pending` (aguardando aplicação via `db-apply-migration.yml`). O gate não valida hash nem semântica — só verifica presença da linha.

Formato sugerido para cada linha:
```
| `20261022100001` | `20261022100001_security_fn_cron_guard_revoke_anon.sql` | — | pending — aguardando db-apply-migration.yml | E15 | — | — |
```

### 2. ATENÇÃO — Outer BEGIN/COMMIT nas migrations A3

Arquivos `20261022100020`, `20261022100021`, `20261022100022` não têm wrappers transacionais explícitos. **Não é bloqueante para CI** (o `psql -1` cobre), mas viola a convenção do projeto ("Abre com BEGIN; fecha com COMMIT; ou documenta por que não").

Opções:
- (a) Adicionar `BEGIN;` no topo e `COMMIT;` no final de cada arquivo
- (b) Adicionar comentário explícito: `-- Nota: outer transaction provida por psql -1 no db-apply-migration.yml`

### 3. INFORMATIVO — Lint pré-existente (não bloqueante)

O pacote `acorn` está ausente em `node_modules`. Não foi causado pelos agentes e não bloqueia o CI (exit 0). Registrar como dívida técnica separada.
