-- Rollback: 20261031000000_create_stock_notes.sql
-- stock_notes guarda texto escrito por pessoas, não dado derivado: um DROP direto
-- perde observação de estoque sem cópia. CONTRIBUTING.md:159 exige backup
-- `_backup_<original>_YYYYMMDD` antes de DROP em tabela.
DO $$
DECLARE
  v_backup text := format('_backup_stock_notes_%s', to_char(now(), 'YYYYMMDD'));
  v_linhas bigint := 0;
BEGIN
  IF to_regclass('public.stock_notes') IS NULL THEN
    RAISE NOTICE 'stock_notes não existe; nada a desfazer';
    RETURN;
  END IF;

  EXECUTE format('SELECT count(*) FROM public.stock_notes') INTO v_linhas;

  IF v_linhas > 0 THEN
    IF to_regclass(format('public.%I', v_backup)) IS NOT NULL THEN
      RAISE EXCEPTION 'backup % já existe: confira o conteúdo antes de repetir o rollback', v_backup;
    END IF;
    EXECUTE format('CREATE TABLE public.%I AS SELECT * FROM public.stock_notes', v_backup);
    EXECUTE format('REVOKE ALL ON TABLE public.%I FROM PUBLIC, anon, authenticated', v_backup);
    EXECUTE format('SELECT count(*) FROM public.%I', v_backup) INTO v_linhas;
    IF v_linhas <> (SELECT count(*) FROM public.stock_notes) THEN
      RAISE EXCEPTION 'cópia de stock_notes incompleta: rollback abortado';
    END IF;
    RAISE NOTICE 'stock_notes copiada para public.% (% linhas)', v_backup, v_linhas;
  END IF;
END
$$;

DROP TRIGGER IF EXISTS set_stock_notes_updated_at ON public.stock_notes;
DROP TABLE IF EXISTS public.stock_notes;
