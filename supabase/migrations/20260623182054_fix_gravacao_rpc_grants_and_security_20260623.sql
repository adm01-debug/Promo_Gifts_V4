
-- FIX-01: fn_get_product_customization_options — SECURITY DEFINER + GRANT
ALTER FUNCTION public.fn_get_product_customization_options(uuid)
  SECURITY DEFINER;
ALTER FUNCTION public.fn_get_product_customization_options(uuid)
  SET search_path = public;
GRANT EXECUTE ON FUNCTION public.fn_get_product_customization_options(uuid)
  TO authenticated, anon;

-- FIX-02: fn_get_customization_price — SECURITY DEFINER + GRANT
ALTER FUNCTION public.fn_get_customization_price(
  uuid, integer, integer, numeric, numeric, integer
)
  SECURITY DEFINER;
ALTER FUNCTION public.fn_get_customization_price(
  uuid, integer, integer, numeric, numeric, integer
)
  SET search_path = public;
GRANT EXECUTE ON FUNCTION public.fn_get_customization_price(
  uuid, integer, integer, numeric, numeric, integer
)
  TO authenticated;

-- FIX-03: RLS policies profiláticas
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='tabela_preco_gravacao_oficial'
      AND policyname='tpgo_authenticated_read'
  ) THEN
    EXECUTE 'CREATE POLICY tpgo_authenticated_read
      ON public.tabela_preco_gravacao_oficial FOR SELECT
      TO authenticated, anon USING (ativo = true)';
    RAISE NOTICE 'FIX-03a: policy tpgo_authenticated_read criada';
  ELSE
    RAISE NOTICE 'FIX-03a: policy já existe';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='tabela_preco_gravacao_oficial_faixa'
      AND policyname='tpgof_authenticated_read'
  ) THEN
    EXECUTE 'CREATE POLICY tpgof_authenticated_read
      ON public.tabela_preco_gravacao_oficial_faixa FOR SELECT
      TO authenticated, anon USING (true)';
    RAISE NOTICE 'FIX-03b: policy tpgof_authenticated_read criada';
  ELSE
    RAISE NOTICE 'FIX-03b: policy já existe';
  END IF;
END $$;
;
