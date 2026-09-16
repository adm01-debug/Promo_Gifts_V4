# E03 — Backup/PITR e snapshot lógico pré-plano (2026-09-16)

Etapa `[DB-RO]` de `docs/plans/PLANO_DBA_CORRECOES_MELHORIAS_50_ETAPAS_2026-09-16.md`. Projeto canônico: `doufsxqlfjyuvxuezpln`.

## 1. PITR / backup automático — ⏳ PENDENTE (ação humana, painel Supabase)

Nenhuma ferramenta MCP carregada nesta sessão expõe status de PITR/backup do projeto `doufsxqlfjyuvxuezpln` (só há equivalentes de *outros* projetos Supabase da conta). Isto é ato humano intransferível.

**Ação pendente do PO:** abrir o painel Supabase → Project `doufsxqlfjyuvxuezpln` → Database → Backups, e confirmar/registrar aqui (sem colar nenhuma credencial):
- [ ] PITR habilitado? (sim/não)
- [ ] Janela de retenção (dias)
- [ ] Data/hora do último backup automático bem-sucedido
- [ ] RPO efetivo (o quanto se perderia num pior caso, dado o intervalo de backup)

Até isso ser preenchido, qualquer etapa `[REQUER-PO]` que altere schema ao vivo (E17–E29, E32, E37, E45, etc.) deve ser tratada como "sem rede de segurança conhecida" — o que já é o comportamento atual (nenhuma dessas etapas foi aplicada).

## 2. Dump schema-only — ✅ concluído

`supabase db dump --linked -s analytics,api,auth,cf_recon,classification_audit,cron,extensions,graphql,graphql_public,internal,net,prod_audit,public,realtime,storage,supabase_functions,supabase_migrations,supplier_stricker,vault -f docs/db/BACKUP_SCHEMA_ONLY_2026-09-16.sql`

Cobre as 19 schemas não-`pg_%`/`information_schema` do projeto (lista obtida de `information_schema.schemata`).

| Arquivo | Tamanho | Linhas | SHA-256 |
|---|---|---|---|
| `docs/db/BACKUP_SCHEMA_ONLY_2026-09-16.sql` | 5,0 MB | 124.910 | ver `docs/db/CHECKSUMS_2026-09-16.sha256` |

5,0 MB < 20 MB (limite do plano para versionar em Git) e não contém dados — só DDL. Commitado junto com este documento.

## 3. Ledger exportado com hash — ✅ concluído

`supabase db dump --linked --data-only -s supabase_migrations -f docs/db/LEDGER_DATA_2026-09-16.sql`

| Métrica | Valor |
|---|---|
| Linhas (`schema_migrations`) | 2.504 |
| Tamanho do arquivo | 7,6 MB |
| SHA-256 do arquivo | ver `docs/db/CHECKSUMS_2026-09-16.sha256` |
| Hash do conjunto de versões (`md5(string_agg(version))`) | `a0f5d1138d770c7a1ea578700969d347` |

Detalhe adicional (hash do conjunto de versões, complementar ao SHA-256 do arquivo) registrado também em `docs/plans/BASELINE_E01_2026-09-16.md`.

## 4. `cron.job` exportado — ✅ concluído

O `pg_dump --data-only` da schema `cron` não retornou linhas (tabelas de configuração de extensão não são incluídas por padrão pelo dump da CLI Supabase mesmo com `--data-only`). Contornado com export direto via `execute_sql` (`SELECT jsonb_agg(row_to_json(j) ORDER BY j.jobid) FROM cron.job j`), sem tocar `cron.job_run_details` (tabela de histórico de execuções, grande, fora de escopo aqui).

| Arquivo | Linhas | SHA-256 |
|---|---|---|
| `docs/db/CRON_JOB_DATA_2026-09-16.json` | 138 | ver `docs/db/CHECKSUMS_2026-09-16.sha256` |

138 linhas bate exatamente com a contagem medida no plano (136 ativos + 2 inativos).

## Checklist de conclusão (E03)

- [ ] PITR/backup confirmado e documentado com data — **pendente do PO**
- [x] Dump schema-only + hash guardado
- [x] Ledger exportado + hash guardado
- [x] `cron.job` exportado

**E03: 3/4 concluído em 2026-09-16.** Item 1 depende exclusivamente de ação do PO no painel Supabase.
