-- ============================================================
-- CORREÇÃO CRÍTICA: trg_update_price_last_verified
-- Bug: coluna filter "OF (last_sync_at, price_updated_at)" impede
--   o CASO C de disparar em updates que não incluem essas colunas
--   no SET (ex: pipeline atualiza cost_price → trg_track seta
--   price_updated_at em NEW, mas o column filter do nosso trigger
--   checa a CLÁUSULA SET original, não o NEW modificado → trigger
--   não dispara → price_last_verified_at fica defasada).
--
-- Root cause: PostgreSQL evalua o column filter baseado no
--   SET clause original do UPDATE, não no NEW modificado por outros
--   BEFORE triggers. Então fn_trigger_track_price_updated_products
--   pode setar NEW.price_updated_at, mas trg_update_price_last_verified
--   não dispara se price_updated_at não estava no SET original.
--
-- Fix: remover o column filter → trigger dispara em qualquer UPDATE.
--   Os IF/ELSIF internos (CASO A/B/C) já garantem que só modifica
--   price_last_verified_at quando realmente necessário (early return
--   implícito via RETURN NEW sem modificação).
--
-- Impacto de performance: mínimo — 7,183 produtos, função retorna
--   imediatamente se nenhum dos 3 casos se aplica.
--
-- fix_version: trigger_price_verified_no_column_filter_20260627
-- ANTI-REGRESSÃO: NÃO adicionar OF(...) novamente neste trigger.
-- ============================================================

DROP TRIGGER IF EXISTS trg_update_price_last_verified ON public.products;

CREATE TRIGGER trg_update_price_last_verified
BEFORE UPDATE ON public.products  -- SEM column filter
FOR EACH ROW
EXECUTE FUNCTION fn_trigger_update_price_last_verified();

COMMENT ON TRIGGER trg_update_price_last_verified ON public.products IS
'BEFORE UPDATE (sem column filter) — garante price_last_verified_at >= MAX(price_updated_at, last_sync_at).
fix_version: trigger_price_verified_no_column_filter_20260627
ANTI-REGRESSÃO: NÃO adicionar OF(last_sync_at, price_updated_at) — o column filter impede o CASO C.';;
