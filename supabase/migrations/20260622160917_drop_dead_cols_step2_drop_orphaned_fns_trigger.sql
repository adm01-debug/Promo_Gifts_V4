
-- MELHORIA 1 · PASSO 2/5
-- Remove funções órfãs (usariam is_on_sale que vai ser dropado)
-- e trigger set_audit_fields_products (usaria created_by/updated_by)

-- Funções de is_on_sale — nunca usadas (0 produtos em promoção), tornam-se inválidas após drop
DROP FUNCTION IF EXISTS public.fn_set_product_on_sale(uuid, timestamp with time zone, numeric);
DROP FUNCTION IF EXISTS public.fn_remove_product_on_sale(uuid);

-- Trigger que escreve created_by/updated_by — colunas 100% null que serão dropadas
-- A função set_audit_user_fields pode continuar existindo para outras tabelas
DROP TRIGGER IF EXISTS set_audit_fields_products ON public.products;
;
