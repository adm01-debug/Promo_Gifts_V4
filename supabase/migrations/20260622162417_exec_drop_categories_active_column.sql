
-- Executar o DROP que estava apenas no repo mas não no BD
-- Pre-condição verificada: active == is_active em 100% das linhas (0 divergências)
ALTER TABLE public.categories DROP COLUMN IF EXISTS active;

-- Verificação imediata
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='categories' AND column_name='active')
  THEN
    RAISE EXCEPTION 'FAIL: categories.active ainda existe!';
  ELSE
    RAISE NOTICE 'PASS: categories.active dropada com sucesso';
  END IF;
END;
$$;
;
