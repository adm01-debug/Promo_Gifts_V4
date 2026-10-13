-- Agente 3 (Integridade de Dados/Storage) — incidente 2026-10-13
-- APLICADA EM PRODUÇÃO via MCP (doufsxqlfjyuvxuezpln) em 2026-10-13.
--
-- Reduz o scale_factor de autovacuum nas tabelas "quentes" (alta taxa de
-- UPDATE/INSERT via cron de estoque e sync de fornecedores) para que o
-- autovacuum dispare com uma fração menor de linhas mortas, evitando acúmulo
-- de bloat entre execuções. Valores dentro da faixa 0.02–0.05 solicitada.
ALTER TABLE public.variant_supplier_sources SET (autovacuum_vacuum_scale_factor = 0.03);
ALTER TABLE public.product_variants         SET (autovacuum_vacuum_scale_factor = 0.03);
ALTER TABLE public.stock_snapshots          SET (autovacuum_vacuum_scale_factor = 0.03);
ALTER TABLE public.request_rate_limits      SET (autovacuum_vacuum_scale_factor = 0.03);
