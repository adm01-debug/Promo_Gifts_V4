# Índice de Documentação — Promo Gifts V4

> Índice canônico, criado na auditoria 20-dimensões (2026-10-02).
> O `docs/README.md` é um índice histórico (27/12/2025) — desatualizado.
> Não lista os ~200 docs: aponta as **fontes de verdade ativas** por tema.
> Docs com banner "DESATUALIZADO" valem só como referência histórica.

## Regras e contexto de desenvolvimento

| Doc | Para quê |
|---|---|
| `../CLAUDE.md` / `../AGENTS.md` | REGRAS #1–#9 — SSOT Supabase, merges, Lovable, migrations, deploys |
| `POLITICA_IDIOMA_PT_BR.md` | Sistema exclusivamente pt-BR |
| `../supabase/functions/_shared/edge-authz-manifest.ts` | SSOT de autorização por edge function |
| `RBAC_MATRIX.md` | Matriz de autorização das 108 edge functions (gerada do manifest) |
| `RBAC_HELPERS.md` | Helpers SQL semânticos para policies (is_dev, is_supervisor_or_above…) |

## Banco de dados (canônico: `doufsxqlfjyuvxuezpln`)

| Doc | Para quê |
|---|---|
| `SCHEMA_REFERENCE.md` | **SSOT de schema** — 383 tabelas public, RLS, GRANTs, catálogo de queries |
| `db/POLITICA_DDL.md` | As 3 condições para DDL fora de migration |
| `db/BACKUP_STATUS.md` | PITR/backups (⚠️ pendente de confirmação do PO) + dumps schema-only |
| `db/MIGRATIONS_SYNC_LOG.md` (`supabase/MIGRATIONS_SYNC_LOG.md`) | Ledger de aplicação de migrations |
| `TYPES_INVENTORY_REMOVAL_ALLOWLIST.json` | Remoções de types.ts aprovadas |
| `DATA_DICTIONARY.md` | ⚠️ histórico (63 tabelas, 2026-04-17) |

## Operações e confiabilidade

| Doc | Para quê |
|---|---|
| `DISASTER_RECOVERY.md` | **Runbook de DR** — cenários, restore, contatos, RPO/RTO |
| `SUPABASE_PANEL_CONFIG.md` | **IaC-lite** — inventário declarativo das configs de painel do canônico |
| `openapi/edges-publicas.yaml` | **OpenAPI 3.0** das edge functions públicas/webhooks |
| `ci/METRICAS_SEMANAIS.md` | Métricas de CI geradas semanalmente |
| `PERF_OPTIMIZATIONS.md` | Otimizações de performance aplicadas |

## Segurança

| Doc | Para quê |
|---|---|
| `SECURITY_RUNBOOK.md` | Procedimentos de segurança (incl. rotação de segredos) |
| `RBAC_MATRIX.md` | Quem pode chamar qual edge function |
| `RBAC_HELPERS.md` | Helpers de papel em policies |

## Auditorias

| Doc | Para quê |
|---|---|
| `audits/AUDITORIA_20DIM_2026-10-02.md` | **Auditoria técnica 20-dimensões — mais recente** |
| `audits/` | Relatórios históricos movidos da raiz |

## Estado e execução

| Doc | Para quê |
|---|---|
| `plans/PLANO_MELHORIAS_CORRECOES_200_ETAPAS_2026-10-18.md` | Plano transversal operacional; confira a revalidação da Onda 0 antes de tratar checkmarks como evidência |
| `audits/P200_WAVE0_REVALIDACAO_2026-10-30.md` | Revalidação documental de E001–E010, com SHA, evidências e bloqueios |
| `estado/backlog/funcionalidades.md` | Backlog de produto/funcionalidades; parcialmente atualizado, não é prova de revalidação dos 416 itens |
| `RELATORIO_CI.md` / `PENDENCIAS.md` | Evidências e bloqueios de CI; confirme sempre o SHA e a última execução remota |

## Planos ativos

| Doc | Para quê |
|---|---|
| `plans/PLANO_MELHORIAS_CORRECOES_200_ETAPAS_2026-10-18.md` | Plano transversal mais recente. A Onda 0 permanece aberta; ver revalidação vinculada acima |
| `plans/PLANO_DBA_CORRECOES_MELHORIAS_50_ETAPAS_2026-09-16.md` | Plano DBA relacionado; estados de execução e aplicação dependem de recibos e evidência do banco |
| `plans/` | Planos de domínio e históricos; verifique sucessão, data-base e estado antes de executar |

## Como manter este índice

- Ao criar doc novo: adicione à categoria certa ou ele fica invisível.
- Ao deprecar um doc: marque-o com banner de desatualização em vez de apagar
  (histórico importa; ver padrão em `EDGE_FUNCTIONS.md`/`DATA_DICTIONARY.md`).
