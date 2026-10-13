# Runbook — Cron job travado ou parado (`pg_cron`)

Projeto Gold SSOT: `doufsxqlfjyuvxuezpln`. Este projeto tem ~20+ jobs ativos em
`cron.job` (cleanup, drift detection, enriquecimento IA, etc.).

Criado no incidente 2026-10-13 (Fase 9, etapa 99).

## Sintomas

- Uma tabela que deveria ser limpa periodicamente está crescendo sem parar
  (ex.: `admin_audit_log` > 5.000 linhas, `frontend_telemetry` > retenção
  esperada).
- `schema_drift_log`/`schema_signature_drift_log` não tem uma linha nova nas
  últimas ~6h (job 245 deveria rodar 4x/dia).
- Fila (`ai_enrichment_queue`, `video_import_queue`) parada de drenar.

## Diagnóstico (somente leitura)

```sql
-- Jobs cadastrados e se estão ativos
SELECT jobid, jobname, schedule, active FROM cron.job ORDER BY jobname;

-- Últimas execuções de um job específico (sucesso/erro, tempo de execução)
SELECT jobid, runid, status, return_message, start_time, end_time
FROM cron.job_run_details
WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = '<nome_do_job>')
ORDER BY start_time DESC LIMIT 20;

-- Execuções com erro nas últimas 24h, em qualquer job
SELECT j.jobname, r.status, r.return_message, r.start_time
FROM cron.job_run_details r JOIN cron.job j ON j.jobid = r.jobid
WHERE r.status != 'succeeded' AND r.start_time > now() - interval '24 hours'
ORDER BY r.start_time DESC;
```

## Contenção

1. Se o job está `active=false` (foi desativado por alguém ou por um
   `ALTER TABLE`/`DROP` acidental que quebrou a função chamada):
   ```sql
   SELECT cron.alter_job(job_id := <jobid>, active := true);
   ```
   — confirmar antes que a causa da desativação foi corrigida, senão ele só
   vai voltar a falhar silenciosamente.
2. Se o job está ativo mas falhando (`return_message` com erro): rodar a
   função manualmente para ver o erro completo:
   ```sql
   SELECT <nome_da_funcao>();
   ```
3. Se a fila está travada por itens "stuck" (claim antigo sem conclusão —
   padrão `FOR UPDATE SKIP LOCKED` com `locked_at` muito antigo), usar a
   query de recovery já documentada no `COMMENT ON TABLE` da fila
   correspondente (ex.: `ai_enrichment_queue`, `video_import_queue` — ambas
   têm instruções de reset no próprio comentário da tabela,
   `SELECT obj, description FROM pg_description WHERE obj = '<tabela>'::regclass`
   ou direto via Studio).
4. Para o detector de drift especificamente (job 245,
   `fn_check_schema_signature_drift` + `fn_sync_local_drift_to_schema_drift_log`):
   confirmar que ambas as funções ainda existem e não foram quebradas por uma
   migration recente (`\df fn_check_schema_signature_drift` / `pg_get_functiondef`).

## Não faça

- Não recrie o job com `cron.schedule` sem antes confirmar que o `jobid`
  antigo foi removido (`cron.unschedule`) — duplicar jobs duplica a carga e
  pode duplicar efeitos (ex.: deletar 2x, enviar notificação 2x).
- Não mude o `schedule` (cron expression) sem ticket/aprovação — isso é uma
  alteração de comportamento de produção, mesma régua de uma migration
  (REGRA #8 do CLAUDE.md).
