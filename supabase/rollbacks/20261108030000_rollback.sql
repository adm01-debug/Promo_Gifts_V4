-- Rollback de 20261108030000 (ESPELHO): os objetos já existiam em produção ANTES desta migration
-- (validado em 2026-11-11 contra o canônico). Ela deve ser registrada em modo repair-only;
-- portanto não há o que desfazer, e derrubar esses objetos seria uma regressão em produção.
-- Comandos destrutivos originais preservados abaixo, só para referência manual:
-- -- Rollback FT-005: remove cron jobs de relatórios agendados
-- SELECT cron.unschedule('process-scheduled-reports');
-- SELECT cron.unschedule('send-scheduled-reports');
SELECT 1;
