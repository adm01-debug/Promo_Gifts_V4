
-- ══════════════════════════════════════════════════════════════════
-- TRIGGER 1: updated_at automático em product_novelties (G-06)
-- ══════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.fn_pn_set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_pn_updated_at ON public.product_novelties;
CREATE TRIGGER trg_pn_updated_at
    BEFORE UPDATE ON public.product_novelties
    FOR EACH ROW
    EXECUTE FUNCTION public.fn_pn_set_updated_at();

-- ══════════════════════════════════════════════════════════════════
-- TRIGGER 2: sincroniza products.is_new / novelty_* (G-04)
-- Dispara em INSERT, UPDATE e DELETE na product_novelties.
-- Mantém products como reflexo fiel do estado de novelties.
-- ══════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.fn_pn_sync_products_is_new()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_product_id uuid;
    v_active     boolean;
    v_detected   timestamptz;
    v_expires    timestamptz;
BEGIN
    -- Determina o product_id afetado em qualquer operação
    v_product_id := CASE WHEN TG_OP = 'DELETE' THEN OLD.product_id ELSE NEW.product_id END;

    -- Busca o estado ATIVO mais recente para este produto
    -- (pode vir de qualquer fonte — respeita a hierarquia: is_active=true prevalece)
    SELECT
        pn.is_active,
        pn.detected_at,
        pn.expires_at
    INTO v_active, v_detected, v_expires
    FROM public.product_novelties pn
    WHERE pn.product_id = v_product_id
      AND pn.is_active  = true
    ORDER BY pn.detected_at DESC
    LIMIT 1;

    -- Se nenhum registro ativo encontrado → limpar flag no Gold
    IF NOT FOUND THEN
        UPDATE public.products
        SET
            is_new              = false,
            novelty_detected_at = NULL,
            novelty_expires_at  = NULL,
            updated_at          = now()
        WHERE id = v_product_id;
    ELSE
        -- Sincroniza Gold com o estado ativo da novelty
        UPDATE public.products
        SET
            is_new              = v_active,
            novelty_detected_at = v_detected,
            novelty_expires_at  = v_expires,
            updated_at          = now()
        WHERE id = v_product_id;
    END IF;

    -- Retorno padrão para triggers AFTER
    IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
    RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.fn_pn_sync_products_is_new() IS
    'Trigger: sincroniza products.is_new / novelty_detected_at / novelty_expires_at '
    'sempre que product_novelties muda (INSERT/UPDATE/DELETE). '
    'Garante que o Gold reflete o estado real do módulo de novidades.';

DROP TRIGGER IF EXISTS trg_pn_sync_products ON public.product_novelties;
CREATE TRIGGER trg_pn_sync_products
    AFTER INSERT OR UPDATE OR DELETE ON public.product_novelties
    FOR EACH ROW
    EXECUTE FUNCTION public.fn_pn_sync_products_is_new();
;
