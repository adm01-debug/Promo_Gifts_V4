-- ============================================================================
-- FIX: 22P02 "invalid input syntax for type boolean: ''" em UPDATE/INSERT products
-- ----------------------------------------------------------------------------
-- CAUSA-RAIZ: `current_setting('app.bulk_import_mode', true)::boolean`
--   O 2o arg (missing_ok=true) protege contra GUC AUSENTE (retorna NULL),
--   mas NAO contra GUC setado para STRING VAZIA ''. Nesse caso ''::boolean
--   dispara 22P02 ANTES do COALESCE(...,false) avaliar. Como esse cast esta
--   na clausula WHEN de 4 triggers de `products`, QUALQUER UPDATE/INSERT em
--   products quebra se app.bulk_import_mode ficar '' (ex.: set_config com valor
--   derivado de variavel vazia, ou RESET mal-feito no pipeline de importacao).
--
-- CORRECAO: NULLIF(current_setting('app.bulk_import_mode', true), '')::boolean
--   '' -> NULL -> COALESCE -> false (comportamento desejado: bulk mode OFF).
--   Preserva 'true'->true, 'false'->false, ausente->false.
--   MANTEM 'xyz'->22P02 de proposito (valor REALMENTE invalido deve falhar,
--   nao ser mascarado).
--
-- fix_version: bulk_import_mode_nullif_empty_v1
-- !!! ANTI-REGRESSAO (bot Lovable) !!!
--   NAO remover o NULLIF(...,''). Trocar de volta para
--   current_setting('app.bulk_import_mode', true)::boolean REINTRODUZ o 22P02
--   que bloqueia 100% das escritas em products quando o GUC fica vazio.
-- ============================================================================

-- (1) Trigger de automacao geral
CREATE OR REPLACE TRIGGER trg_product_automation
  AFTER INSERT OR UPDATE ON public.products
  FOR EACH ROW
  WHEN ((NOT COALESCE((NULLIF(current_setting('app.bulk_import_mode'::text, true), ''))::boolean, false)))
  EXECUTE FUNCTION fn_trigger_product_automation();

-- (2) Auto-classificacao por mudanca de nome/categoria
CREATE OR REPLACE TRIGGER trg_auto_classify_product
  BEFORE UPDATE ON public.products
  FOR EACH ROW
  WHEN (((NOT COALESCE((NULLIF(current_setting('app.bulk_import_mode'::text, true), ''))::boolean, false))
        AND ((old.name IS DISTINCT FROM new.name) OR (old.main_category_id IS DISTINCT FROM new.main_category_id))))
  EXECUTE FUNCTION fn_trigger_auto_classify_product();

-- (3) Extracao de materiais a partir do nome
CREATE OR REPLACE TRIGGER trg_extract_materials_from_name
  AFTER INSERT OR UPDATE ON public.products
  FOR EACH ROW
  WHEN (((NOT COALESCE((NULLIF(current_setting('app.bulk_import_mode'::text, true), ''))::boolean, false))
        AND ((new.materials IS NULL) OR (new.materials = '[]'::jsonb)) AND (new.name IS NOT NULL)))
  EXECUTE FUNCTION fn_trigger_extract_materials_from_name();

-- (4) Processamento automatico de materiais
CREATE OR REPLACE TRIGGER trg_products_auto_materials
  AFTER UPDATE ON public.products
  FOR EACH ROW
  WHEN (((NOT COALESCE((NULLIF(current_setting('app.bulk_import_mode'::text, true), ''))::boolean, false))
        AND (old.materials IS DISTINCT FROM new.materials) AND (new.materials IS NOT NULL) AND (new.materials <> '[]'::jsonb)))
  EXECUTE FUNCTION trg_auto_process_product_materials();

-- (5) Funcao helper (mesmo anti-padrao; corrigir por higiene defensiva)
CREATE OR REPLACE FUNCTION public.fn_is_bulk_import_mode()
  RETURNS boolean
  LANGUAGE sql
  STABLE SECURITY DEFINER
  SET search_path TO 'public'
AS $function$
  -- fix_version: bulk_import_mode_nullif_empty_v1
  -- ANTI-REGRESSAO: manter NULLIF(...,'') -- ver migration homonima
  SELECT COALESCE(NULLIF(current_setting('app.bulk_import_mode', true), '')::boolean, false);
$function$;

COMMENT ON FUNCTION public.fn_is_bulk_import_mode() IS
  'Retorna estado do bulk import mode. NULLIF(...,'''') trata GUC vazio como false (evita 22P02). fix_version: bulk_import_mode_nullif_empty_v1';

NOTIFY pgrst, 'reload schema';;
