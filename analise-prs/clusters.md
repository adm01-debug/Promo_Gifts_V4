# Clusters de PRs — Promo Gifts V4
# Gerado: 2026-10-26 | Sessão session_011d8gKLZg8BWivR8aQBwxGF
# main HEAD: 145da71bb8c451eebadc75c4bb059397f8d468f7

## Resumo

| Cluster | PRs | Notas |
|---|---|---|
| Dependabot (npm) | #2585, #2586, #2587, #2588, #2589, #2596 | 3 mergeadas autônomas; 2 DECISAO_HUMANA (major); 1 CVE mergeada |
| Dependabot (GH Actions) | #2590, #2591, #2592, #2593, #2594 | Todas BLOQUEADAS (.github/workflows proibido) |
| Release-please | #2520, #2579 | Ambas DECISAO_HUMANA — downgrade semântico |
| Claude agent (claude_04) | #2582, #2597, #2599, #2600 | 1 mergeada; 2 DECISAO_HUMANA; 1 BLOQUEADA (DRAFT) |
| Claude agent (claude_05) | #2572, #2580 | Mesma branch; ambas BLOQUEADAS |
| Lovable/bot | — | Nenhuma PR aberta de Lovable neste ciclo |
| Duplicatas/subconjunto | #2597 ↔ #2599 | #2599 é subconjunto estrito de #2597 |
| Cadeia mesma branch | #2572 + #2580 | Mesma branch `claude_05/youthful-ride-vcdchy` |

---

## Cluster 1 — Dependabot npm (atualização de dependências)

| PR | Título | Veredito | SHA merge |
|---|---|---|---|
| #2585 | bump prod deps minor/patch | MERGEADO_AUTONOMO | `145da71b` |
| #2586 | bump dev deps minor/patch | MERGEADO_AUTONOMO | `fb045926` |
| #2589 | bump globals 15→17 | MERGEADO_AUTONOMO | `9e2746a3` |
| #2596 | bump postcss-selector-parser (CVE-2026-104844) | MERGEADO_AUTONOMO | `54e89045` |
| #2587 | bump zustand 4→5 (major) | DECISAO_HUMANA | — |
| #2588 | bump react-day-picker 8→10 (major) | DECISAO_HUMANA | — |

**Motivo das pendentes:** zustand 4→5 quebra 11 stores (`useKitStore`, `useProductStore`, etc.); react-day-picker 8→10 quebra `calendar.tsx` (usa API v8).

---

## Cluster 2 — Dependabot GitHub Actions (bump de actions em workflows)

| PR | Action | Workflow afetado | Veredito |
|---|---|---|---|
| #2590 | `github/codeql-action/upload-sarif` 2→3 | `gitleaks-history-audit.yml` | BLOQUEADA |
| #2591 | `github/codeql-action/analyze` 2→3 | `codeql.yml` | BLOQUEADA |
| #2592 | `actions/stale` 9→11 | `stale.yml` | BLOQUEADA |
| #2593 | `github/codeql-action/init` 2→3 | `codeql.yml` | BLOQUEADA |
| #2594 | `actions/setup-node` 4→7 | `e2e-update-editor-sheet-snapshots.yml` | BLOQUEADA |

**Motivo:** Todas tocam `.github/workflows/` — REGRA#8 exige aprovação PO.  
**Risco real:** Baixo — são bumps de SHAs de actions conhecidas (codeql, stale, setup-node). A única com ressalva extra é #2594 (`setup-node` sem SHA pin no novo YAML). PO pode aprovar em bloco se quiser.

---

## Cluster 3 — Release-please (versionamento semântico)

| PR | Título | Branch | Veredito |
|---|---|---|---|
| #2520 | chore(main): release 1.0.0 | `release-please--branches--main--components--gifts-store` | DECISAO_HUMANA |
| #2579 | chore(main): release 1.0.0 | `release-please--branches--main` | DECISAO_HUMANA |

**Motivo:** Ambas representam downgrade de `release-please` 1.2.1 → 1.0.0 — regressão semântica (1.0.0 < 1.2.1 em semver). São duas PRs da mesma tool para branches diferentes da mesma release. O histórico de versões indica que a release deveria ser ≥ 1.2.1.

---

## Cluster 4 — Claude agent claude_04 (esta sessão e sessões irmãs)

| PR | Branch | Título | Veredito | SHA merge |
|---|---|---|---|---|
| #2582 | `claude_04/optimistic-bohr-qplx94` | métricas semanais W44 | MERGEADO_AUTONOMO | `045d835f` |
| #2597 | `claude_04/beautiful-gates-bvocz5` | fix 4 workflows CI | DECISAO_HUMANA | — |
| #2599 | `claude_04/laughing-gates-l4pt67` | fix privacy + ratchet SIGPIPE | DECISAO_HUMANA | — |
| #2600 | `claude_04/optimistic-bohr-qplx94` | docs: entregáveis sessão | BLOQUEADA (DRAFT) | — |

---

## Cluster 5 — Claude agent claude_05 (sessão irmã, mesma branch)

| PR | Branch | Título | Veredito |
|---|---|---|---|
| #2572 | `claude_05/youthful-ride-vcdchy` | contrato E189 + personalização + supabase + CI | BLOQUEADA |
| #2580 | `claude_05/youthful-ride-vcdchy` | fix: cabeçalho rollback e23 | DECISAO_HUMANA |

**Atenção:** Ambas na mesma branch `claude_05/youthful-ride-vcdchy`. #2572 toca `.github/workflows/contract-tests.yml` + `supabase/migrations/`. #2580 é DRAFT + toca `supabase/migrations/`. Gate Final para `claude_05` não confirmou (infra GitHub Actions queued).

---

## Cluster 6 — Duplicatas / Subconjunto estrito

| PRs | Relação | Recomendação |
|---|---|---|
| #2597 ↔ #2599 | #2599 é subconjunto de #2597 (mesmos 2 arquivos, mesmos patches) | Fechar #2599, aprovar #2597 |

**Detalhes:**  
- #2597 (`claude_04/beautiful-gates-bvocz5`) contém: `ratchet-weekly.yml` (SIGPIPE) + `.gitleaks.toml` (22 leaks históricos) + `PENDENCIAS.md` (P78–P84) + `RELATORIO_CI.md` + `AnonymizeAccountDialog.tsx` (invokeEdge) + `useReplenishments.integration.test.ts` (timeout)  
- #2599 (`claude_04/laughing-gates-l4pt67`) contém: `ratchet-weekly.yml` (mesmo patch) + `AnonymizeAccountDialog.tsx` (mesmo patch)  
- Não há commits únicos em #2599 que não estejam em #2597.

---

## PRs abertas por categoria (estado em 2026-10-26)

**DECISAO_HUMANA (6):** #2579, #2580, #2587, #2588, #2597, #2599  
**BLOQUEADA (7):** #2572, #2590, #2591, #2592, #2593, #2594, #2600  
**FECHAR (1, ainda aberta):** #2420 (NO_MERGE_BASE — branch órfã)
