-- Rollback: 20261031000000_create_stock_notes.sql
-- stock_notes guarda texto escrito por pessoas, não dado derivado: um DROP direto
-- perde observação de estoque sem cópia. CONTRIBUTING.md:159 exige backup
-- `_backup_<original>_YYYYMMDD` antes de DROP em tabela.
--
-- LOCK TABLE ... ACCESS EXCLUSIVE antes da primeira contagem: sem ele, um INSERT
-- confirmado entre a conferência e o DROP entraria na tabela e não na cópia, e
-- seria perdido (src/hooks/stock/useStockNotes.ts:61-73 insere a qualquer momento).
-- Leitura não bloqueia INSERT, nem dentro da mesma transação.
BEGIN;

DO $$
DECLARE
  v_backup text := format('_backup_stock_notes_%s', to_char(now(), 'YYYYMMDD'));
  v_origem bigint;
  v_copia  bigint;
BEGIN
  IF to_regclass('public.stock_notes') IS NULL THEN
    RAISE NOTICE 'stock_notes não existe; nada a desfazer';
    RETURN;
  END IF;

  LOCK TABLE public.stock_notes IN ACCESS EXCLUSIVE MODE;

  SELECT count(*) INTO v_origem FROM public.stock_notes;

  IF v_origem > 0 THEN
    IF to_regclass(format('public.%I', v_backup)) IS NOT NULL THEN
      RAISE EXCEPTION 'backup % já existe: confira o conteúdo antes de repetir o rollback', v_backup;
    END IF;

    EXECUTE format('CREATE TABLE public.%I AS SELECT * FROM public.stock_notes', v_backup);

    -- Tabela nova exige RLS (CONTRIBUTING.md). Sem policy nenhuma, RLS nega tudo
    -- para quem não é owner: a cópia fica legível só por quem administra o banco.
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', v_backup);
    EXECUTE format('ALTER TABLE public.%I FORCE ROW LEVEL SECURITY', v_backup);
    EXECUTE format('REVOKE ALL ON TABLE public.%I FROM PUBLIC, anon, authenticated', v_backup);

    EXECUTE format('SELECT count(*) FROM public.%I', v_backup) INTO v_copia;
    IF v_copia <> v_origem THEN
      RAISE EXCEPTION 'cópia de stock_notes incompleta (% de %): rollback abortado', v_copia, v_origem;
    END IF;

    RAISE NOTICE 'stock_notes copiada para public.% (% linhas)', v_backup, v_copia;
  END IF;
END
$$;

DROP TRIGGER IF EXISTS set_stock_notes_updated_at ON public.stock_notes;
DROP TABLE IF EXISTS public.stock_notes;

COMMIT;
