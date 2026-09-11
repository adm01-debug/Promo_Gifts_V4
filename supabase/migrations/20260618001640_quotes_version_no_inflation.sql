-- Melhoria #2: elimina a inflação de `version` em quotes.
-- Problema: increment_row_version (compartilhada com `orders`) incrementa version a CADA
-- UPDATE. Na criação, a cascata de recálculo dispara vários UPDATEs (um por item/personalização),
-- inflando version para ~3-4 num orçamento recém-criado.
-- Correção: função ESPECÍFICA de quotes que só incrementa quando muda alguma coluna NÃO-derivada.
-- Comparo OLD vs NEW via jsonb removendo as colunas automáticas/derivadas (escritas pelos
-- triggers de recálculo e de updated_at). Assim a cascata de recálculo (que só mexe em
-- subtotal/total/discount_amount/real_subtotal/real_discount_percent/updated_at) NÃO infla a versão,
-- mas qualquer edição real de campo do orçamento incrementa +1.
-- `orders` e increment_row_version permanecem INTOCADOS.
CREATE OR REPLACE FUNCTION public.increment_quote_version()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE
  _old jsonb := to_jsonb(OLD)
                 - 'subtotal' - 'total' - 'discount_amount'
                 - 'real_subtotal' - 'real_discount_percent'
                 - 'updated_at' - 'version';
  _new jsonb := to_jsonb(NEW)
                 - 'subtotal' - 'total' - 'discount_amount'
                 - 'real_subtotal' - 'real_discount_percent'
                 - 'updated_at' - 'version';
BEGIN
  IF _old IS DISTINCT FROM _new THEN
    NEW.version := COALESCE(OLD.version, 0) + 1;
  ELSE
    -- Update derivado-apenas (cascata de recálculo): preserva a versão atual.
    NEW.version := COALESCE(OLD.version, 1);
  END IF;
  RETURN NEW;
END
$function$;

DROP TRIGGER IF EXISTS trg_quotes_version ON public.quotes;
CREATE TRIGGER trg_quotes_version
  BEFORE UPDATE ON public.quotes
  FOR EACH ROW
  EXECUTE FUNCTION public.increment_quote_version();;
