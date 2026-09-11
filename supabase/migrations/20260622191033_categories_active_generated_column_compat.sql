
-- ============================================================
-- categories.active — coluna gerada para compatibilidade retroativa
-- 
-- CONTEXTO: categories.active foi dropada (DROP COLUMN executado
-- em 2026-06-22). A build em produção (c894b26e0) ainda filtra por
-- active=eq.true. Esta migration recria 'active' como GENERATED ALWAYS
-- AS (is_active) STORED — leitura idêntica, sem necessidade de atualizar
-- a build bloqueada. Quando a nova build (PR #1338) fizer deploy, a coluna
-- se tornará redundante mas inofensiva.
-- ============================================================
ALTER TABLE public.categories
  ADD COLUMN IF NOT EXISTS active boolean
    GENERATED ALWAYS AS (is_active) STORED;

-- Sanity-check inline (não afeta a transação, apenas valida)
DO $$
DECLARE
  v_divergencia integer;
BEGIN
  SELECT COUNT(*) INTO v_divergencia
  FROM categories
  WHERE active IS DISTINCT FROM is_active;
  
  IF v_divergencia > 0 THEN
    RAISE EXCEPTION 'BUG: categories.active diverge de is_active em % linhas', v_divergencia;
  END IF;
END $$;
;
