-- Auditoria r3 (2026-09-05) — Data Integrity: optimistic locking em seller_carts
-- (quotes já tem version + trg_quotes_version). Aplicada em produção via MCP em 2026-09-05.
-- Não quebra clientes existentes: coluna com DEFAULT, trigger só incrementa em UPDATE com mudança real.
-- Rollback: DROP TRIGGER trg_seller_carts_version ON public.seller_carts;
--           DROP FUNCTION public.increment_seller_cart_version();
--           ALTER TABLE public.seller_carts DROP COLUMN version;
ALTER TABLE public.seller_carts ADD COLUMN IF NOT EXISTS version integer NOT NULL DEFAULT 1;

CREATE OR REPLACE FUNCTION public.increment_seller_cart_version()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
  _old jsonb := to_jsonb(OLD) - 'updated_at' - 'version';
  _new jsonb := to_jsonb(NEW) - 'updated_at' - 'version';
BEGIN
  IF _old IS DISTINCT FROM _new THEN
    NEW.version := COALESCE(OLD.version, 0) + 1;
  ELSE
    NEW.version := COALESCE(OLD.version, 1);
  END IF;
  RETURN NEW;
END
$$;

REVOKE EXECUTE ON FUNCTION public.increment_seller_cart_version() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_seller_carts_version ON public.seller_carts;
CREATE TRIGGER trg_seller_carts_version
  BEFORE UPDATE ON public.seller_carts
  FOR EACH ROW EXECUTE FUNCTION public.increment_seller_cart_version();

COMMENT ON COLUMN public.seller_carts.version IS
  'Optimistic locking: incrementado por trg_seller_carts_version a cada UPDATE com mudança real. Cliente concorrente deve enviar WHERE version = <esperado> e tratar 0 linhas afetadas como conflito.';

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_seller_carts_version' AND tgrelid = 'public.seller_carts'::regclass) THEN
    RAISE EXCEPTION 'trg_seller_carts_version não criado';
  END IF;
END $$;
