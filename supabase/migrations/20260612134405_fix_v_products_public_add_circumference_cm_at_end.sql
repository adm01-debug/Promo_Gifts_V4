
-- FIX: Adicionar circumference_cm ao FINAL da v_products_public
-- CREATE OR REPLACE VIEW só permite adicionar colunas no final (sem deslocar existentes)

DO $$
DECLARE
  v_def text;
  v_new text;
BEGIN
  SELECT pg_get_viewdef('public.v_products_public'::regclass, true) INTO v_def;
  
  -- Adicionar circumference_cm no final, antes do FROM products
  v_new := replace(v_def,
    chr(10) || '   FROM products',
    ',' || chr(10) || '    circumference_cm' || chr(10) || '   FROM products'
  );
  
  IF v_new = v_def THEN
    RAISE EXCEPTION 'Pattern FROM products não encontrado';
  END IF;
  
  EXECUTE 'CREATE OR REPLACE VIEW public.v_products_public AS ' || v_new;
  RAISE NOTICE 'circumference_cm adicionado ao final de v_products_public';
END $$;
;
