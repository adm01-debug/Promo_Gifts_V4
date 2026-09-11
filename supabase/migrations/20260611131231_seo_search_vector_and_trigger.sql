
-- ============================================================
-- ETAPA 9a: search_vector e índices regulares (sem CONCURRENTLY)
-- ============================================================

-- === Índices regulares SEO ===
CREATE INDEX IF NOT EXISTS idx_products_seo_audit_pending
    ON public.products (seo_last_audit_at ASC NULLS FIRST)
    WHERE is_active = true AND is_deleted = false;

CREATE UNIQUE INDEX IF NOT EXISTS idx_products_slug_unique
    ON public.products (slug)
    WHERE slug IS NOT NULL AND is_deleted = false;

-- === Atualizar search_vector onde NULL ===
UPDATE products
   SET search_vector = to_tsvector('portuguese',
         COALESCE(name, '') || ' ' ||
         COALESCE(short_description, '') || ' ' ||
         COALESCE(description, '') || ' ' ||
         COALESCE(meta_title, '') || ' ' ||
         COALESCE(brand, '') || ' ' ||
         COALESCE(supplier_reference, '')
       )
WHERE is_deleted = false
  AND (search_vector IS NULL OR search_vector = ''::tsvector);

-- === Função de manutenção do search_vector ===
CREATE OR REPLACE FUNCTION public.fn_update_product_search_vector()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF (TG_OP = 'INSERT')
     OR (OLD.name              IS DISTINCT FROM NEW.name)
     OR (OLD.description       IS DISTINCT FROM NEW.description)
     OR (OLD.short_description IS DISTINCT FROM NEW.short_description)
     OR (OLD.meta_title        IS DISTINCT FROM NEW.meta_title)
     OR (OLD.brand             IS DISTINCT FROM NEW.brand)
     OR (OLD.supplier_reference IS DISTINCT FROM NEW.supplier_reference)
  THEN
    NEW.search_vector := to_tsvector('portuguese',
        COALESCE(NEW.name, '') || ' ' ||
        COALESCE(NEW.short_description, '') || ' ' ||
        COALESCE(NEW.description, '') || ' ' ||
        COALESCE(NEW.meta_title, '') || ' ' ||
        COALESCE(NEW.brand, '') || ' ' ||
        COALESCE(NEW.supplier_reference, '')
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_products_search_vector ON public.products;
CREATE TRIGGER trg_products_search_vector
    BEFORE INSERT OR UPDATE ON public.products
    FOR EACH ROW EXECUTE FUNCTION public.fn_update_product_search_vector();

COMMENT ON FUNCTION public.fn_update_product_search_vector() IS
    'Mantém search_vector (tsvector PT) atualizado. Só recalcula quando name/description/meta_title/brand mudam.';
;
