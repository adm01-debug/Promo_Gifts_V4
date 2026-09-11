
-- MELHORIA 7: Desativar cron process-webhook-outbox (jobid 199)
-- Motivo: secret WEBHOOK_DISPATCHER_URL não configurado → 14 falhas/hora → alerta CRITICAL
-- A tabela webhook_outbox está vazia → nenhum dado perdido
-- Reativar após configurar o secret via: Supabase Dashboard → Edge Functions → Secrets

SELECT cron.unschedule('process-webhook-outbox');
;
