-- ════════════════════════════════════════════════════════════════════
-- MELHORIA 6: fundacao de banco do ciclo de venda de embalagens.
-- Espelha o padrao personalization_* em quote_items para a embalagem
-- opcional escolhida. UI de consumo sera entregue via PR (Claude nao faz merge).
-- fix_version=2026-06-26_quote_packaging_v1
-- ════════════════════════════════════════════════════════════════════
ALTER TABLE quote_items
  ADD COLUMN IF NOT EXISTS selected_packaging_id uuid REFERENCES products(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS selected_packaging_name text,
  ADD COLUMN IF NOT EXISTS selected_packaging_unit_cost numeric(12,2);

CREATE INDEX IF NOT EXISTS idx_quote_items_selected_packaging
  ON quote_items(selected_packaging_id) WHERE selected_packaging_id IS NOT NULL;

COMMENT ON COLUMN quote_items.selected_packaging_id IS 'Embalagem opcional escolhida (products.product_type=packaging). Fundacao do ciclo de venda de embalagens (2026-06-26).';
COMMENT ON COLUMN quote_items.selected_packaging_name IS 'Snapshot do nome da embalagem opcional no momento da escolha.';
COMMENT ON COLUMN quote_items.selected_packaging_unit_cost IS 'Custo unitario da embalagem opcional no momento da escolha (snapshot).';

-- Guarda de integridade: selected_packaging_id deve ser produto type=packaging ativo
CREATE OR REPLACE FUNCTION public.fn_validate_selected_packaging()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $function$
BEGIN
  IF NEW.selected_packaging_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM products WHERE id=NEW.selected_packaging_id AND product_type='packaging' AND is_active) THEN
      RAISE EXCEPTION 'selected_packaging_id % nao referencia produto type=packaging ativo', NEW.selected_packaging_id;
    END IF;
  END IF;
  RETURN NEW;
END$function$;
DROP TRIGGER IF EXISTS trg_validate_selected_packaging ON quote_items;
CREATE TRIGGER trg_validate_selected_packaging BEFORE INSERT OR UPDATE OF selected_packaging_id ON quote_items
  FOR EACH ROW EXECUTE FUNCTION fn_validate_selected_packaging();

NOTIFY pgrst, 'reload schema';;
