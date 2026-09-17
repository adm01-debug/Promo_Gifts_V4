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

## Limitação conhecida (desde 2026-09-16)

`SCHEMA_DRIFT.sql` **não é calculável hoje**. `supabase db diff` reconstrói o
schema do zero em shadow database reaplicando todas as migrations — e esse
replay trava porque parte real do schema vivo foi criada fora do fluxo de
migrations ao longo de meses (dashboard/MCP). Já foram corrigidos 3 gaps
desse tipo (uma migration com sintaxe impossível, uma com sintaxe inválida
de `CREATE POLICY`, e 5 schemas de aplicação inteiros sem migration de
criação) e um quarto foi encontrado (`categories.bitrix_id`) sem sinal de
que seja o último. Detalhe completo no cabeçalho de `SCHEMA_DRIFT.sql`.

**Enquanto isso não for resolvido, use `SCHEMA_LIVE.sql` como fonte de
verdade do schema atual** — ele não depende do replay, é um dump direto do
banco vivo. Para comparar "o que mudou desde a última vez", diffe dois
`SCHEMA_LIVE.sql` de datas diferentes em vez de esperar `SCHEMA_DRIFT.sql`.

## Como regenerar

```bash
# Apenas ALL_IN_ONE.sql (não requer credenciais):
npm run schema:snapshot

# Também SCHEMA_LIVE.sql + SCHEMA_DRIFT.sql (requer CLI supabase + secrets):
SUPABASE_ACCESS_TOKEN=... SUPABASE_DB_PASSWORD=... npm run schema:snapshot
```

O script é safe-by-default: sem CLI/secrets ele apenas emite `ALL_IN_ONE.sql` e
avisa que os arquivos live/drift foram pulados.
