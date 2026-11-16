# PR #3160 — Evidências de diff 100% lido

**Branch:** codex/fix-db-e15-261101-... (DB E15 — DRAFT)  
**Título:** fix(db): corrige fn_get_rupture_alerts e adiciona rollback (E15 — DRAFT)

## Arquivos alterados (4 total)

### GOVERNANCE (REGRA#8) — 1 migration + 1 rollback
| Arquivo | Mudança |
|---|---|
| `supabase/migrations/20261101150000_fix_sb0003_fn_get_rupture_alerts.sql` | Corrige `fn_get_rupture_alerts`: `SET search_path = public, pg_catalog, pg_temp` (hardening) |
| `supabase/rollbacks/20261101150000_rollback.sql` | Rollback da migration (restaura search_path anterior) |

### NÃO-GOVERNANCE (2 arquivos)
| Arquivo | Mudança |
|---|---|
| `PENDENCIAS.md` | CONFLITO — adiciona itens #XX sobre E15 |
| `RELATORIO_CI.md` | CONFLITO — adiciona seção sobre a correção |

## Regressão potencial (não-governance)

- `PENDENCIAS.md` e `RELATORIO_CI.md`: arquivos de tracking, conflito com sessões posteriores. **Sem impacto funcional**.
- `supabase/migrations/20261101150000_fix_sb0003_fn_get_rupture_alerts.sql`: Mesma migration presente em PR#3179 (que tem merge local limpo). **Conflito semântico** — PR#3160 é a versão draft com apenas esta migration; PR#3179 (com merge limpo) tem conteúdo idêntico (`SET search_path = public, pg_catalog, pg_temp`). Uma das duas é superseded pela outra.

## Regra de negócio
Correção legítima de segurança: `fn_get_rupture_alerts` com `search_path` hardened previne ataques de search_path injection. Idêntica à migration em PR#3179.

## Conflitos
**CONFLITO** em `PENDENCIAS.md` e `RELATORIO_CI.md`.

## Veredito: DECISAO_HUMANA
**Motivo:** REGRA#8 — `supabase/migrations/` + `supabase/rollbacks/` + **isDraft=true** + conflito semântico com PR#3179 (versão não-draft da mesma migration). PO precisa decidir qual PR usar.
