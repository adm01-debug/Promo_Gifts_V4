# Inventário de Branches — adm01-debug/Promo_Gifts_V4

**Data da execução:** 2026-10-24  
**main de referência:** `594fbd40cf83` — 2026-10-24 14:02:43 -0300  
**Total de branches:** 53  
**Branch desta sessão:** `claude_05/youthful-goodall-kihjbv`

---

## 1. Contagem por Categoria

| Categoria | Descrição | Total |
|-----------|-----------|-------|
| A | Já incorporadas no main (cherry-equiv) | 2 |
| B | Vazias ou triviais (0 commits úteis) | 3 |
| C | Candidatas promissoras — sem conflito | 7 |
| D | Candidatas com conflito | 0 |
| E | Duplicatas / sobreposição | 0 |
| F | Descartáveis (docs/análise/geradas, sem código novo) | 39 |
| G | Indeterminadas (sem merge-base com main) | 2 |
| **Total** | | **53** |

---

## 2. Contagem por Prefixo / Origem

| Prefixo | Total | Principal origem |
|---------|-------|-----------------|
| `adm01-patch` | 16 | Patches manuais via GitHub UI (CI/workflows) |
| `claude` | 15 | Claude Code (sessões anteriores) |
| `e15-receipt` | 12 | Auto-geradas pelo workflow `db-apply-migration.yml` (recibos) |
| `dependabot` | 3 | Dependabot (bump de dependências) |
| `claude_05` | 2 | Claude Code (sessões recentes) |
| `copilot` | 1 | GitHub Copilot |
| `devin` | 1 | Devin |
| `fix` | 1 | Manual |
| `gh-pages` | 1 | Site de documentação (orphan branch) |
| `jules` | 1 | Jules (agente externo) |

---

## 3. Clusters de Sobreposição

Branches que tocam os mesmos arquivos-chave, ordenadas por área:

| Cluster | Branches | Arquivo comum |
|---------|----------|--------------|
| ProductFormFullscreen | `fix-contract-mag-reader-261019-2110`, `fix-sync-log-ci-261019-1730`, `fix-rollback-261019-1637`, `fix-gitleaks-gate-261019-1800`, `chore-migrations-sync-log-261019-1600` | `src/components/admin/products/ProductFormFullscreen.tsx` |
| MIGRATIONS_SYNC_LOG | `chore-migrations-sync-log-261019-1600`, `security-brechas-e30-e40-e18-2026-10-22`, `fix-audit-acl-regrole-261024-1635` (indireto) | `supabase/MIGRATIONS_SYNC_LOG.md` |
| gitleaks/secrets | `fix-gitleaks-gate-261019-1800`, `chore-migrations-sync-log-261019-1600` | `.gitleaks.toml`, `scripts/check-secrets-inventory.mjs` |
| security-migrations | `security-brechas-e30-e40-e18-2026-10-22`, `fix-audit-acl-regrole-261024-1635` | `supabase/migrations/` |

**Observação:** A sobreposição no `ProductFormFullscreen.tsx` ocorre porque todas essas branches partiram de `main` em 19/10 e precisaram do mesmo cast `zodResolver` (TypeScript + @hookform/resolvers v5). Merge em sequência pode gerar conflito simples nesse arquivo.

---

## 4. TOP 9 Candidatas (categorias C/D/E/G)

> Menos de 30 candidatas existem. Lista completa.

| # | Nome | Cat | Score | Commits | Arquivos | Área | Conflito | PR |
|---|------|-----|-------|---------|---------|------|----------|----|
| 1 | `claude/fix-contract-mag-reader-261019-2110` | C | 9 | 6 | 13 | hooks RLS annotations + CI workflows | Não | — |
| 2 | `claude/fix-sync-log-ci-261019-1730` | C | 8 | 13 | 5 | CI baselines + ProductFormFullscreen TS | Não | — |
| 3 | `claude/fix-rollback-261019-1637` | C | 6 | 2 | 3 | migration rollback 20261019 + ProductFormFullscreen | Não | — |
| 4 | `claude/fix-gitleaks-gate-261019-1800` | C | 5 | 5 | 4 | gitleaks allowlist + deploy-gates.yml + secrets | Não | — |
| 5 | `claude/chore-migrations-sync-log-261019-1600` | C | 4 | 4 | 4 | SEGREDOS.md + sync log + ProductFormFullscreen | Não | — |
| 6 | `claude/fix-audit-acl-regrole-261024-1635` | C | 3 | 2 | 2 | migration cast seguro `audit_security_definer_acl` | Não | [#2404](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2404) |
| 7 | `claude/security-brechas-e30-e40-e18-2026-10-22` | C | 3 | 4 | 8 | 3 migrations de segurança REVOKE (E30/E40/E18) | Não | — |
| 8 | `claude/gifted-dijkstra-uojt52` | G | 0 | 17 | — | Indeterminado (sem merge-base) | ? | — |
| 9 | `devin/probe-e184-legacy-refs` | G | 0 | 10 | — | Indeterminado (sem merge-base) | ? | — |

**Resumo de cada candidata C:**

1. **fix-contract-mag-reader-261019-2110** — Adiciona anotações `rls-allow` em hooks BI/CRM/Intelligence + registra contrato `magazine-reader-state-read` (Gate 1.12) + fix CORS wildcard no Gate 1. 13 arquivos, todos em `src/hooks/` e `supabase/functions/`.

2. **fix-sync-log-ci-261019-1730** — Atualiza baselines `as-unknown` e `as-assertions` após cast `zodResolver` + registra contrato webhook. 5 arquivos, inclui `ProductFormFullscreen.tsx`.

3. **fix-rollback-261019-1637** — Adiciona migration rollback `20261019000000` + resolve `@hookform/resolvers v5`. 3 arquivos, inclui `ProductFormFullscreen.tsx`.

4. **fix-gitleaks-gate-261019-1800** — Allowlist completa no `.gitleaks.toml` (44 falsos positivos) + `EXAMPLE_API_KEY` em check-secrets-inventory + fix TS `ProductFormFullscreen`.

5. **chore-migrations-sync-log-261019-1600** — Documenta `PGPORT` em `SEGREDOS.md` + atualiza `MIGRATIONS_SYNC_LOG.md` + resolve `ProductFormFullscreen`.

6. **fix-audit-acl-regrole-261024-1635** — Cast seguro em `audit_security_definer_acl` para roles removidas. 2 arquivos: migration SQL + allowlist do ledger.

7. **security-brechas-e30-e40-e18-2026-10-22** — 3 migrations REVOKE de segurança (conexões externas anon, mockup-approval-links anon, mcp-kv-get authenticated). Com rollbacks. Base `.migration-refs-baseline.json` atualizada.

---

## 5. Branches Categoria A (já incorporadas — candidatas a cleanup)

| Branch | Commits únicos | Observação |
|--------|---------------|-----------|
| `e15-receipt-20261022194200-39922326892` | 1 | Recibo auto-gerado do workflow E15; conteúdo já em main |
| `jules-11745886140891876680-0b67004e` | 2 | Commits cherry-equiv com main; sem diff funcional |

---

## 6. Branches Categoria B (vazias / triviais — candidatas a cleanup)

| Branch | ahead | Observação |
|--------|-------|-----------|
| `claude/fix-husky-dialog-snapshots-261023` | 0 | 0 commits à frente de main |
| `fix/npm-peer-deps` | 0 | 0 commits à frente de main |
| `gh-pages` | 3073 | Orphan branch de documentação estática; história independente de main; não misturar |

---

## 7. Branches Categoria F (39 branches descartáveis)

As 39 branches categoria F incluem:

- **16 × `adm01-patch-*`** — patches de CI/workflow via GitHub UI, todos já substituídos por versões melhores ou mesclados
- **12 × `e15-receipt-*`** — recibos de migration auto-gerados pelo workflow E15; registros de execução, não código funcional
- **3 × `dependabot/*`** — bumps de dependência (possivelmente desatualizados)
- **1 × `copilot/*`** — gerada por GitHub Copilot
- **2 × `claude_05/*`** — inclui a branch desta sessão de inventário
- **5 × `claude/*` com docs/análise** — branches de auditoria, documentação ou análise de PRs sem código de produção novo

Arquivo completo: `inventario/branches.csv` (coluna `categoria=F`).

---

## 8. NÃO VERIFICADO / Limitações

| Item | Motivo |
|------|--------|
| **Branches G sem merge-base** | `claude/gifted-dijkstra-uojt52` e `devin/probe-e184-legacy-refs` retornam `fatal: no merge base` ao tentar `git diff main...branch`. Provavelmente divergiram de um commit antes de um force-push em main. Não foi possível computar ahead/behind real nem simular conflito de merge. Conteúdo dos arquivos: não listado. |
| **PR status de CI** | CI status via GitHub API (check_runs) não foi consultado individualmente para cada branch — apenas o PR #2404 tem PR linkado. Status de CI das outras 6 branches C são desconhecidos. |
| **Dependabot branches** | 3 branches `dependabot/*` existem mas não foram avaliadas em detalhe (estão em F por padrão — possivelmente desatualizadas). |
| **Sobreposição exata** | O cluster de sobreposição foi identificado por arquivos comuns via `git diff --name-only`; conflito de merge simulado via `git merge-tree` não foi executado explicitamente para as branches C (conflito_n=0 mas pode haver conflito real no `ProductFormFullscreen.tsx` ao mergear múltiplas em sequência). |
| **Score de e15-receipt e adm01-patch** | Foram classificadas como F sem pontuação por não tocarem código de produto. Pode haver um recibo importante ignorado. |
| **Branches deletadas** | Branches que já foram deletadas do remote não aparecem aqui. O inventário é ponto-no-tempo (2026-10-24). |

---

## 9. Arquivos de Dados

| Arquivo | Conteúdo |
|---------|---------|
| `inventario/branches.csv` | 53 linhas (+ cabeçalho), 24 colunas por branch |
| `inventario/branches.json` | Array JSON com todas as branches, metadados completos |
| `inventario/top30.txt` | 9 nomes de branches candidatas (C + G), uma por linha |
| `inventario/progresso.json` | Checkpoint de execução |

---

*Inventário gerado em sessão read-only. Zero writes remotos realizados.*  
*Método: git local (fetch --all --prune) + GitHub MCP API (list_branches, list_pull_requests).*
