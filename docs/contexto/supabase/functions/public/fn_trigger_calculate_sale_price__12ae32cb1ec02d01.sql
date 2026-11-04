CREATE OR REPLACE FUNCTION public.fn_trigger_calculate_sale_price()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
    v_markup numeric := 115.0;
BEGIN
    IF NEW.cost_price IS NULL OR NEW.cost_price <= 0 THEN
        RETURN NEW;
    END IF;

    -- Só recalcula se cost_price mudou, ou sale_price está vazio
    IF TG_OP = 'UPDATE'
       AND OLD.cost_price IS NOT DISTINCT FROM NEW.cost_price
       AND NEW.sale_price IS NOT NULL
    THEN
        RETURN NEW;
    END IF;

    -- ── Hierarquia de markup ──────────────────────────────────────────────
    -- 1. Produto específico  (product_id = este produto)
    -- 2. Categoria           (category_id = categoria do produto)
    -- 3. Fornecedor          (supplier_id = fornecedor do produto)
    -- 4. Global              (todos os IDs NULL)
    -- Desempate por especificidade: produto(1000) > categoria(100) > fornecedor(10) > global(0)
    SELECT mc.markup_percent
    INTO   v_markup
    FROM   markup_configurations mc
    WHERE  mc.is_active = true
      AND (mc.product_id  IS NULL OR mc.product_id  = NEW.id)
      AND (mc.category_id IS NULL OR mc.category_id = NEW.category_id)
      AND (mc.supplier_id IS NULL OR mc.supplier_id = NEW.supplier_id)
    ORDER BY
        (CASE WHEN mc.product_id  IS NOT NULL THEN 1000 ELSE 0 END) +
        (CASE WHEN mc.category_id IS NOT NULL THEN 100  ELSE 0 END) +
        (CASE WHEN mc.supplier_id IS NOT NULL THEN 10   ELSE 0 END)
        DESC
    LIMIT 1;

    -- Fallback: default_markup_percent do fornecedor
    IF v_markup IS NULL AND NEW.supplier_id IS NOT NULL THEN
        SELECT COALESCE(s.default_markup_percent, 115.0)
        INTO   v_markup
        FROM   suppliers s
        WHERE  s.id = NEW.supplier_id AND s.active = true;
    END IF;

    -- Fallback final
    v_markup := COALESCE(v_markup, 115.0);

    NEW.sale_price := ROUND(NEW.cost_price * (1 + v_markup / 100), 2);

    RETURN NEW;
END;
$function$
