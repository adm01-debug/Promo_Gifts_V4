-- Rollback: 20261126130000_create_saved_stock_views.sql
-- Remove a tabela criada por esta migration. Nao ha origem anterior do dado: a tabela nao existia
-- em producao antes (o dump vivo de 2026-11-26, supabase/migrations-snapshot/SCHEMA_LIVE.sql, nao
-- tem nenhuma ocorrencia de "saved_stock_views"), entao o rollback descarta apenas o que a UI
-- gravou depois do apply.

DROP TABLE IF EXISTS public.saved_stock_views;
