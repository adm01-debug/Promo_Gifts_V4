-- =============================================================================
-- ROTEIRO — Análise de Falhas de Cron (30d)
-- cron.job_run_details — NÃO CONECTAR A PRODUÇÃO diretamente
-- Data: 2026-10-22
-- Status: NÃO VERIFICADO em produção (timeout 60s no MCP na sessão de auditoria)
--
-- Para executar: conectar via psql ao banco doufsxqlfjyuvxuezpln com
-- credenciais de serviço (service_role), ou via Supabase Dashboard > SQL Editor
-- =============================================================================

-- 1. Total de execuções e falhas por job (últimos 30 dias)
SELECT
  j.jobname,
  j.schedule,
  count(*) FILTER (WHERE r.status = 'succeeded') AS sucesso,
  count(*) FILTER (WHERE r.status = 'failed')    AS falhas,
  count(*) FILTER (WHERE r.status = 'failed') * 100.0 / NULLIF(count(*), 0) AS pct_falha,
  max(r.start_time) AS ultima_execucao,
  min(r.return_message) FILTER (WHERE r.status = 'failed') AS exemplo_erro
FROM cron.job j
LEFT JOIN cron.job_run_details r
  ON r.jobid = j.jobid
  AND r.start_time >= now() - INTERVAL '30 days'
GROUP BY j.jobname, j.schedule
ORDER BY falhas DESC NULLS LAST
LIMIT 30;

-- 2. Top erros únicos (últimos 7 dias)
SELECT
  j.jobname,
  r.return_message,
  count(*) AS ocorrencias
FROM cron.job_run_details r
JOIN cron.job j ON j.jobid = r.jobid
WHERE r.status = 'failed'
  AND r.start_time >= now() - INTERVAL '7 days'
GROUP BY j.jobname, r.return_message
ORDER BY ocorrencias DESC
LIMIT 20;

-- 3. Jobs com falhas consecutivas (sem sucesso nos últimos 7 dias)
SELECT
  j.jobname,
  j.schedule,
  j.active,
  count(*) AS tentativas_7d,
  max(r.start_time) AS ultima_tentativa
FROM cron.job j
JOIN cron.job_run_details r
  ON r.jobid = j.jobid
  AND r.start_time >= now() - INTERVAL '7 days'
  AND r.status = 'failed'
WHERE NOT EXISTS (
  SELECT 1 FROM cron.job_run_details r2
  WHERE r2.jobid = j.jobid
    AND r2.status = 'succeeded'
    AND r2.start_time >= now() - INTERVAL '7 days'
)
GROUP BY j.jobname, j.schedule, j.active
ORDER BY tentativas_7d DESC;

-- 4. Distribuição de duração dos jobs (para detectar timeouts)
SELECT
  j.jobname,
  count(*) AS execucoes,
  round(avg(EXTRACT(EPOCH FROM (r.end_time - r.start_time))), 2) AS avg_duration_s,
  round(max(EXTRACT(EPOCH FROM (r.end_time - r.start_time))), 2) AS max_duration_s,
  round(min(EXTRACT(EPOCH FROM (r.end_time - r.start_time))), 2) AS min_duration_s
FROM cron.job j
JOIN cron.job_run_details r ON r.jobid = j.jobid
WHERE r.start_time >= now() - INTERVAL '7 days'
  AND r.end_time IS NOT NULL
GROUP BY j.jobname
ORDER BY max_duration_s DESC NULLS LAST
LIMIT 20;
