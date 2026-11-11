-- Rollback: supabase/rollbacks/20261108230000_rollback.sql
-- Remove cron inativa jobid=235 (image-dimensions-backfill) que aponta para
-- /functions/v1/run-script, edge que nunca foi deployada em produção.
-- A edge backfill-image-dimensions (v121) existe e está ativa mas não exige
-- cron recorrente — é backfill pontual já executado.
SELECT cron.unschedule('image-dimensions-backfill');
