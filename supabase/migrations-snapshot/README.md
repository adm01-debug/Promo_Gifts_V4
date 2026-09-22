# supabase/migrations-snapshot

Snapshots consolidados **read-only** para auditoria do schema.
**Não aplicar direto no banco.** A SSOT continua sendo `supabase/migrations/`.

## Arquivos

| Arquivo | Origem | Descrição |
|---|---|---|
| `ALL_IN_ONE.sql` | `supabase/migrations/**` | Concatenação alfabética de todas as migrations versionadas. |
| `SCHEMA_LIVE.sql` | `supabase db dump --linked --schema public` | Dump do schema `public` vivo do projeto canônico (`doufsxqlfjyuvxuezpln`). |
| `SCHEMA_DRIFT.sql` | `supabase db diff --linked --schema public` | DDL restante entre as migrations e o schema vivo (ideal: vazio). |
| `SNAPSHOT_META.json` | script | Metadados: timestamp, project ref, contagens. |

## Limitação conhecida (atualizada em 2026-09-22)

`SCHEMA_DRIFT.sql` **não é calculável hoje**. `supabase db diff` reconstrói o
schema em um shadow database; para interpretar o resultado, os arquivos locais
precisam corresponder ao ledger remoto. A captura de 22/09 encontrou 2.499
versões coincidentes, 474 somente locais e duas aparentemente somente remotas.
Isso não quer dizer que todas as 474 estão pendentes. O exportador registra
`computed: false` e a contagem em `SNAPSHOT_META.json`, sem executar o replay.

O histórico de cinco execuções CI em 16/09 (runs `35090629440` a
`35093709593`) mostrou que o replay já falhava **antes** da comparação: SQL
`uuid ~ unknown` em `20260601140841_*` (aposentado), `CREATE POLICY IF NOT
EXISTS` inválido em `20260601180000_*` (corrigido), ausência dos schemas
`analytics`, `supplier_stricker`, `cf_recon`, `prod_audit` e
`classification_audit` (bootstrap adicionado) e, por fim, ausência de
`public.categories.bitrix_id` — DDL feito fora de migration. Um espelho
forward-only para esta coluna existe no repositório, mas ainda precisa ser
reconciliado individualmente com o catálogo e o ledger. Ver E07/E08 no
[plano DBA de 16/09](../../docs/plans/PLANO_DBA_CORRECOES_MELHORIAS_50_ETAPAS_2026-09-16.md)
e o histórico Git de `SCHEMA_DRIFT.sql` para a investigação original. Nenhuma
dessas correções históricas, isoladamente, prova que o replay hoje funcionaria.

**Enquanto isso não for resolvido, use `SCHEMA_LIVE.sql` como fonte de
verdade do schema atual** — ele não depende do replay, é um dump direto do
banco vivo. Para comparar "o que mudou desde a última vez", diffe dois
`SCHEMA_LIVE.sql` de datas diferentes em vez de esperar `SCHEMA_DRIFT.sql`.

## Como regenerar

```bash
# Sem link ou credenciais: gera ALL_IN_ONE.sql e registra a limitação no metadata:
npm run schema:snapshot

# Com projeto canônico já linkado localmente: exporta também SCHEMA_LIVE.sql.
# Com credenciais de CI, o script cria o link antes da exportação:
SUPABASE_ACCESS_TOKEN=... SUPABASE_DB_PASSWORD=... npm run schema:snapshot
```

O script não relata “sem drift” enquanto o ledger continuar divergente.
