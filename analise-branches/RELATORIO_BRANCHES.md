# Relatório de Análise de Branches

**Data:** 2026-10-24  
**SHA main baseline:** `652a7f14`  
**Projeto canônico:** `doufsxqlfjyuvxuezpln`  
**Sessão:** `claude_05/youthful-goodall-kihjbv`

---

## 1. Resumo Executivo

53 branches analisadas. 9 branches TOP (categorias C e G) com dossiê completo. 44 branches A+B+F confirmadas como descartáveis com prova em 1 linha cada. Nenhum merge autônomo realizado: todas as branches com valor tocam banco de produção, edge functions ou workflows de CI — critérios que exigem aprovação humana. Produção não foi alterada.

| Categoria | Count | Ação |
|---|---|---|
| AGUARDANDO APROVAÇÃO | 7 | Requer aprovação humana antes do merge |
| FECHAR | 1 | gifted-dijkstra: trabalho já em main |
| RESGATAR PARCIAL | 1 | devin/probe-e184: salvar só o SQL probe |
| Descartáveis (A+B+F) | 44 | Nenhum trabalho a preservar |

---

## 2. Branches AGUARDANDO APROVAÇÃO (7)

Ordenadas por prioridade de negócio:

### 2.1 security-brechas-e30-e40-e18-2026-10-22 — PRIORIDADE ALTA
**Brechas de segurança ativas em produção**
- 3 migrations de REVOKE não aplicadas (E30: external_connections anon, E40: mockup_approval_links anon, E18: mcp_kv_get authenticated)
- **Ação:** aplicar via `db-apply-migration.yml` (workflow_dispatch com versão 20261022194000, 194100, 194200)
- **Anomalia:** timestamps são anteriores a 20261022203935 mas não estão no ledger — investigar antes de aplicar
- Dossiê: `dossies/security-brechas-e30-e40-e18-2026-10-22.md`

### 2.2 fix-audit-acl-regrole-261024-1635
**Migration nova: cast seguro em audit_security_definer_acl**
- 1 migration nova (`20261024163500`) que corrige HTTP 500 ao usar roles removidas
- Também toca `db-schema-drift-check.yml` (revert ECR → ghcr.io)
- **Ação:** aplicar via `db-apply-migration.yml` após review da migration SQL
- Dossiê: `dossies/fix-audit-acl-regrole-261024-1635.md`

### 2.3 fix-contract-mag-reader-261019-2110
**Edge function shared + 3 workflows de cron**
- `supabase/functions/_shared/cors.ts`: mudança de `'*'` para constante computada (comportamento idêntico)
- 3 workflows de cron ajustados (Gate E89)
- Contrato `magazine-reader-state-read` registrado
- **Ação:** revisar allowlist CORS + deployar via `deploy-edge-functions.yml` após merge
- Dossiê: `dossies/fix-contract-mag-reader-261019-2110.md`

### 2.4 fix-gitleaks-gate-261019-1800
**Workflow principal de CI (deploy-gates.yml)**
- Substitui `npx gitleaks` por binary download no Gate E23
- Allowlist de 44 falsos positivos em `.gitleaks.toml`
- **Ação:** revisar conteúdo da allowlist linha a linha antes de aprovar
- Dossiê: `dossies/fix-gitleaks-gate-261019-1800.md`

### 2.5 fix-sync-log-ci-261019-1730
**Decisão de política: gate de segurança passa em timeout**
- `scripts/check-security-definer-acl.mjs`: 3 retries + `process.exit(0)` se todos 504
- **Decisão humana:** gate de segurança deve passar ou falhar em falha de infra?
- Dossiê: `dossies/fix-sync-log-ci-261019-1730.md`

### 2.6 fix-rollback-261019-1637
**Rollback retroativo de migration já aplicada**
- Arquivo `supabase/rollbacks/20261019000000_rollback.sql` adicionado
- Migration já está em produção — rollback é documentação retroativa
- Dossiê: `dossies/fix-rollback-261019-1637.md`

### 2.7 chore-migrations-sync-log-261019-1600
**Redundante mas com valor documental**
- MIGRATIONS_SYNC_LOG.md receipt + PGPORT em SEGREDOS.md
- Conteúdo parcialmente duplicado por outras branches
- **Ação:** avaliar se os 2 itens únicos valem PR separado ou devem ser folded em outra branch
- Dossiê: `dossies/chore-migrations-sync-log-261019-1600.md`

---

## 3. Branches FECHAR (1)

### claude/gifted-dijkstra-uojt52
- G-category: sem merge-base com main (branch órfã)
- 270 arquivos de diferença de árvore — maioria por defasagem, não conteúdo novo
- Todo trabalho valioso mergeado via PRs #2264, #2283, #2284, #2288, #2296, #2297, #2298, #2300
- Dossiê: `dossies/gifted-dijkstra-uojt52.md`

---

## 4. Branches RESGATAR PARCIAL (1)

### devin/probe-e184-legacy-refs
- Salvar apenas: `qa/migrations-draft/probe_e184_legacy_refs.sql` (commit `1cc6041e`)
- Script `DO $$ BEGIN...ROLLBACK $$` que varre pg_proc + cron.job + GUCs por refs a `pqpdolkae`
- Ferramenta de QA valiosa, não está em nenhuma outra branch
- **Ação:** `cherry-pick` do arquivo para nova branch `claude/fix-probe-e184-<timestamp>`
- Dossiê: `dossies/devin-probe-e184-legacy-refs.md`

---

## 5. Branches Descartáveis A+B+F (44)

Prova em 1 linha cada em: `confirmacao_ABF.md`

**Resumo:**
- 16x `adm01-debug-patch-*`: Lovable patch branches cosméticas, sem PR
- 11x `e15-receipt-*`: receipt-only criadas pelo workflow e15, sem código
- 3x dependabot: bumps de dep já aplicados via outros PRs
- 3x B (fix-husky, fix/npm-peer-deps, gh-pages): mergeados ou descartáveis
- 2x A (jules, e15-receipt-20261022194200): cherry=0 únicos
- Demais F: trabalho antigo superado por main

---

## 6. Produção Não Alterada

| Verificação | Antes | Depois |
|---|---|---|
| Última migration no ledger | `20261022203935` | `20261022203935` |
| Edge functions | 151 | 151 |
| DDL via execute_sql | — | 0 (proibido) |
| Deploy edge functions | — | 0 (proibido via MCP) |

Snapshots em: `baseline/migrations_prod_antes.json`, `baseline/edge_functions_prod_antes.json`

---

## 7. Merges Autônomos Realizados

**ZERO merges realizados.**

Critério de merge autônomo: válido + não conflita com main + zero novos erros TS + não toca banco nem edge function.

Nenhuma branch passou em todos os critérios:
- 7 branches tocam banco/edge/workflows → AGUARDANDO APROVAÇÃO
- 1 branch é órfã sem valor → FECHAR
- 1 branch tem conteúdo parcial → RESGATAR PARCIAL

---

## Arquivos Produzidos

```
analise-branches/
├── baseline/
│   ├── migrations_prod_antes.json       ← snapshot ledger pré-análise
│   ├── edge_functions_prod_antes.json   ← snapshot edge functions pré-análise
│   ├── typecheck.txt                    ← baseline TS: 0 erros em main@652a7f14
│   └── lint.txt                        ← baseline lint: não executável, Gate 1 é autoridade
├── dossies/
│   ├── fix-contract-mag-reader-261019-2110.md
│   ├── fix-sync-log-ci-261019-1730.md
│   ├── fix-rollback-261019-1637.md
│   ├── fix-gitleaks-gate-261019-1800.md
│   ├── chore-migrations-sync-log-261019-1600.md
│   ├── fix-audit-acl-regrole-261024-1635.md
│   ├── security-brechas-e30-e40-e18-2026-10-22.md
│   ├── gifted-dijkstra-uojt52.md
│   └── devin-probe-e184-legacy-refs.md
├── confirmacao_ABF.md                   ← 44 branches descartáveis, 1 linha de prova cada
├── cruzamento-supabase.md               ← matriz branches × migrações × edge functions
├── progresso.json
└── RELATORIO_BRANCHES.md               ← este arquivo
```
