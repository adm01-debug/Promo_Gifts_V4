-- Rollback de E070: remove os cron jobs de purga dos ledgers.
SELECT cron.unschedule('purge-kit-save-requests');
SELECT cron.unschedule('purge-kit-quote-requests');
SELECT cron.unschedule('purge-magazine-duplicate-requests');
