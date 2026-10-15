# supabase/migrations-snapshot

Snapshots consolidados **read-only** para auditoria do schema.
**Não aplicar direto no banco.** A SSOT continua sendo `supabase/migrations/`.

## Arquivos

| Arquivo | Origem | Descrição |
|---|---|---|
| `ALL_IN_ONE.sql` | `supabase/migrations/**` | Concatenação alfabética de todas as migrations versionadas. |
| `SCHEMA_LIVE.sql` | `supabase db dump --linked` | Dump do schema vivo do projeto canônico (`doufsxqlfjyuvxuezpln`), todos os schemas da aplicação. |
| `SNAPSHOT_META.json` | script | Metadados: timestamp, project ref, contagens, versão do baseline. |

O mesmo dump gera `supabase/baseline/<B>_baseline_schema.sql` +
`<B>_ledger_versions.json` (B = maior versão no ledger no momento do dump),
ponto de partida do `db-schema-drift-check`. Ver `scripts/drift-baseline.mjs`.

## Drift (atualizado em 2026-10-15)

O antigo `SCHEMA_DRIFT.sql` foi removido: o replay de todo o histórico de
`supabase/migrations/` não reconstrói o banco (tabelas de `public` criadas
fora de migration desde 2026-05; ver E07/E08 no
[plano DBA de 16/09](../../docs/plans/PLANO_DBA_CORRECOES_MELHORIAS_50_ETAPAS_2026-09-16.md)).
O `db-schema-drift-check` replaya o baseline + as migrations aplicadas depois
dele e compara com produção; o resultado fica no job summary e no artifact
`schema-reconciliation-evidence`.

Para comparar "o que mudou desde a última vez", diffe dois `SCHEMA_LIVE.sql`
de datas diferentes.

## Como regenerar

```bash
# Sem link ou credenciais: gera só ALL_IN_ONE.sql:
npm run schema:snapshot
```

O dump ao vivo (SCHEMA_LIVE.sql + baseline) roda só em
`schema-snapshot-export.yml` (schedule semanal ou workflow_dispatch): o
`pg_dump` segura AccessShareLock em todas as tabelas de produção enquanto
roda. Dispare fora dos minutos de cron pesado (evite :09, :29, :38–:40, :49).
