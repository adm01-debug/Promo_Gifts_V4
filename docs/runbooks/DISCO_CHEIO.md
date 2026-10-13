# Runbook — Disco/tamanho de banco crescendo ou perto do limite

Projeto Gold SSOT: `doufsxqlfjyuvxuezpln`.

Criado no incidente 2026-10-13 (Fase 9, etapa 99). Ver
`docs/INCIDENTE_2026-10-13_BASELINE.md` para o tamanho de banco de referência
medido neste incidente.

## Sintomas

- Alertas do Supabase (dashboard) sobre uso de disco.
- Queries lentas em tabelas que historicamente eram rápidas (sintoma indireto
  de bloat/falta de `VACUUM`).
- `pg_total_relation_size` de uma tabela específica muito maior que o
  esperado documentado no `COMMENT ON TABLE` dela.

## Diagnóstico (somente leitura)

```sql
-- Tamanho total do banco
SELECT pg_size_pretty(pg_database_size(current_database()));

-- Top 20 tabelas por tamanho (dados + índices)
SELECT schemaname, relname,
       pg_size_pretty(pg_total_relation_size(relid)) AS total_size,
       pg_size_pretty(pg_relation_size(relid)) AS table_size,
       n_live_tup, n_dead_tup
FROM pg_stat_user_tables
ORDER BY pg_total_relation_size(relid) DESC
LIMIT 20;

-- Tabelas com bloat alto (muitas linhas mortas vs vivas — candidatas a VACUUM)
SELECT schemaname, relname, n_live_tup, n_dead_tup,
       round(100.0 * n_dead_tup / greatest(n_live_tup + n_dead_tup, 1), 1) AS dead_pct,
       last_autovacuum, last_vacuum
FROM pg_stat_user_tables
WHERE n_dead_tup > 1000
ORDER BY dead_pct DESC
LIMIT 20;
```

## Contenção

1. Identificar se o crescimento é **esperado** (ex.: `stock_snapshots` com
   3,6M+ linhas é um histórico que cresce por natureza — ver
   `docs/SCHEMA_REFERENCE.md` §7) ou **anômalo** (uma tabela de log/auditoria
   crescendo porque o cleanup parou — ver `CRON_TRAVADO.md`).
2. Se for uma tabela de log/telemetria sem cleanup rodando: aplicar o runbook
   `CRON_TRAVADO.md` primeiro (reativar o job de limpeza) antes de qualquer
   `DELETE` manual.
3. Se for bloat (muitas `n_dead_tup`) e o autovacuum não está acompanhando:
   ```sql
   VACUUM (ANALYZE) public.<tabela>;
   -- Só use VACUUM FULL se precisar liberar espaço no disco de fato
   -- (requer lock exclusivo breve — avaliar tamanho da tabela antes):
   VACUUM FULL public.<tabela>;
   ```
4. Se o crescimento é de dados legítimos e vai continuar, isso é uma decisão
   de retenção/particionamento de negócio — **não implementar política de
   retenção nova sem aprovação do PO** (mesma régua da etapa 62 deste
   incidente: a retenção de 90 dias de `admin_audit_log` já existe e está
   documentada; qualquer retenção *nova* para outra tabela é decisão do PO).

## Não faça

- Não rode `VACUUM FULL` em uma tabela grande (>1GB) em horário de pico sem
  avisar — o lock exclusivo, mesmo breve, pode enfileirar todo o tráfego
  daquela tabela.
- Não delete linhas de uma tabela de auditoria para "liberar espaço" sem
  confirmar a política de retenção documentada (ver `COMMENT ON TABLE`).
