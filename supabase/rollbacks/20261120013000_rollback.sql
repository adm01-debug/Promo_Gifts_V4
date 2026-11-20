-- Rollback: 20261120013000_add_products_ships_separately
--
-- Remove a coluna products.ships_separately ("não mistura" no frete).
--
-- Antes do DROP, grava em _backup_products_ships_separately_YYYYMMDD (UTC) os
-- produtos que estavam marcados (id, sku, ships_separately), com RLS ligada e
-- sem acesso de PUBLIC/anon/authenticated (CONTRIBUTING.md). Só os marcados
-- precisam de cópia: o resto volta a false, que é o DEFAULT da coluna.
-- Se o backup do dia já existe, usa o primeiro nome livre (_2, _3, ...): uma
-- segunda execução no mesmo dia nunca sobrescreve nem pula o backup.
-- O DROP só acontece depois de conferir que o backup tem todas as marcações.
--
-- Restaurar: reaplicar a migration e
--   UPDATE public.products p
--      SET ships_separately = true
--     FROM public._backup_products_ships_separately_YYYYMMDD b
--    WHERE b.id = p.id;
--
-- Antes de reverter, o código que lê a coluna (formulário de produto, importação
-- em massa e relatório de frete) precisa estar fora de produção: sem a coluna,
-- o select/insert que a cita devolve erro 400.

DO $$
DECLARE
  base text := '_backup_products_ships_separately_' || to_char(now() AT TIME ZONE 'UTC', 'YYYYMMDD');
  alvo text := base;
  n integer := 1;
  marcados bigint;
  copiados bigint;
BEGIN
  IF NOT EXISTS (
    SELECT 1
      FROM information_schema.columns
     WHERE table_schema = 'public'
       AND table_name = 'products'
       AND column_name = 'ships_separately'
  ) THEN
    RAISE NOTICE 'products.ships_separately não existe: nada a desfazer.';
    RETURN;
  END IF;

  WHILE to_regclass('public.' || quote_ident(alvo)) IS NOT NULL LOOP
    n := n + 1;
    alvo := base || '_' || n;
  END LOOP;

  EXECUTE format(
    'CREATE TABLE public.%I AS SELECT id, sku, ships_separately FROM public.products WHERE ships_separately',
    alvo
  );
  EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', alvo);
  EXECUTE format('REVOKE ALL ON public.%I FROM PUBLIC, anon, authenticated', alvo);

  EXECUTE 'SELECT count(*) FROM public.products WHERE ships_separately' INTO marcados;
  EXECUTE format('SELECT count(*) FROM public.%I', alvo) INTO copiados;
  IF marcados <> copiados THEN
    RAISE EXCEPTION 'Rollback recusado: backup % tem % linha(s) e há % produto(s) marcado(s).',
      alvo, copiados, marcados;
  END IF;

  ALTER TABLE public.products DROP COLUMN ships_separately;
  RAISE NOTICE 'Coluna removida. Backup de % marcação(ões) em public.%.', copiados, alvo;
END $$;
