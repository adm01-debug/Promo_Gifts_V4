# Postmortem — DDL via MCP sem migration (2026-10-13)

**Status:** Encerrado  
**Severidade:** SEV-2 (divergência ledger × schema; sem downtime)  
**Detectado:** 2026-10-15 (drift-check em PR)  
**Resolvido:** migration espelho criada 2026-10-15 (E099)

---

## Resumo

Em 2026-10-13, uma sessão de agente Claude aplicou 8 chamadas `cron.alter_job` e criou a
view `variant_stocks_select_org` diretamente via MCP `execute_sql`, sem criar os arquivos
de migration correspondentes em `supabase/migrations/`. O ledger (`supabase_migrations.schema_migrations`)
ficou desincronizado com o schema real por ~48 horas, até ser detectado pelo drift-check num PR.

## Timeline

| Hora (UTC) | Evento |
|---|---|
| 2026-10-13 ~14h | Sessão Claude aplica 8 `cron.alter_job` + cria `variant_stocks_select_org` via `execute_sql` |
| 2026-10-13 ~14h | Nenhuma migration versionada criada — ledger não atualizado |
| 2026-10-15 | drift-check em PR detecta: 9 objetos no schema ao vivo ausentes do ledger |
| 2026-10-15 | Migrations espelho criadas; `migration repair --status applied <version>` executado |
| 2026-10-15 | PR aberto com migrations espelho + recibo em `supabase/MIGRATIONS_SYNC_LOG.md` |

## Causa raiz

Violação do corolário E056 (CLAUDE.md REGRA #8): agente Claude usou `execute_sql` para DDL
(`cron.alter_job`, `CREATE VIEW`) em vez de criar migrations SQL. O corolário E056 foi
formalizado em CLAUDE.md exatamente a partir deste incidente.

## Impacto

- Nenhum downtime ou erro de aplicação (DDL foi aplicada com sucesso)
- Ledger divergiu por ~48h — qualquer replay de migrations nesse período geraria schema errado
- 9 objetos (8 cron jobs + 1 view) sem rastreabilidade no git por 2 dias

## Ação corretiva

1. Criadas migrations espelho com timestamp da aplicação real (2026-10-13)
2. `supabase migration repair --status applied <version>` com versão explícita (nunca em lote)
3. PR aberto com ambos; recibo em `supabase/MIGRATIONS_SYNC_LOG.md`
4. `schema-snapshot-export.yml` acionado com `force_rotate: true`

## Prevenção (gates, regras)

- **CLAUDE.md REGRA #8 corolário E056** (publicado 2026-10-18): `execute_sql` proibido para DDL em sessão de agente
- **E12 detector semanal** (`ddl-out-of-band-detector.yml`): alerta quando ledger diverge do schema ao vivo
- **REGRA #8 corolário E15**: único caminho autorizado é `.github/workflows/db-apply-migration.yml`
- Toda mudança de `cron.job` deve nascer como migration SQL no mesmo PR da mudança de código
