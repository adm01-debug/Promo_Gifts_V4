-- Auditoria 20-dim (Onda 4) — optimistic locking em discount_approval_requests.
-- orders/quotes/seller_carts já têm version + trigger auto-incremento;
-- discount_approval_requests era a única tabela de escrita concorrente sem.
-- Padrão idêntico a increment_seller_cart_version (20260905033652): só
-- incrementa em UPDATE com mudança real (ignora toques em updated_at/version).
-- Não quebra clientes: coluna com DEFAULT, trigger BEFORE UPDATE.
-- Rollback: DROP TRIGGER trg_discount_approval_version ON
-- discount_approval_requests; DROP FUNCTION
-- increment_discount_approval_version(); ALTER TABLE
-- discount_approval_requests DROP COLUMN version.

ALTER TABLE public.discount_approval_requests
  ADD COLUMN IF NOT EXISTS version integer NOT NULL DEFAULT 1;

CREATE OR REPLACE FUNCTION public.increment_discount_approval_version()
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

REVOKE EXECUTE ON FUNCTION public.increment_discount_approval_version() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_discount_approval_version ON public.discount_approval_requests;
CREATE TRIGGER trg_discount_approval_version
  BEFORE UPDATE ON public.discount_approval_requests
  FOR EACH ROW EXECUTE FUNCTION public.increment_discount_approval_version();

COMMENT ON COLUMN public.discount_approval_requests.version IS
  'Optimistic locking: incrementado por trg_discount_approval_version a cada UPDATE com mudança real. Cliente concorrente deve enviar WHERE version = <esperado> e tratar 0 linhas afetadas como conflito.';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'trg_discount_approval_version'
      AND tgrelid = 'public.discount_approval_requests'::regclass
  ) THEN
    RAISE EXCEPTION 'trg_discount_approval_version não criado';
  END IF;
END $$;
