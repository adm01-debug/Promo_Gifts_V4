
-- Drop calculate_personalization_price: dead function referencing non-existent table
-- product_personalization_options (never created). Zero callers confirmed 2026-06-23.
-- Replacement: fn_simular_combo_gravacao_v12 + tabela_preco_gravacao_oficial_faixa pipeline.
DROP FUNCTION IF EXISTS public.calculate_personalization_price CASCADE;
;
