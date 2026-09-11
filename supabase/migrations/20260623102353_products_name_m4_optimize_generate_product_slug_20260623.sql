
-- ══════════════════════════════════════════════════════════════
-- M4: OTIMIZAR generate_product_slug — eliminar loop N+1
-- PROBLEMA: o loop tentava base-1, base-2, ... base-N até achar livre.
--   Para "Caneta plástica" (231 slugs existentes, alguns com SKU numérico
--   até 18527), o próximo produto faria 18527+ queries de checagem.
-- FIX: quando p_product_id disponível (que é o caso em 100% das chamadas
--   via trigger BEFORE INSERT/UPDATE, pois NEW.id já tem gen_random_uuid()),
--   usar os primeiros 8 chars hex do UUID como sufixo determinístico.
--   UUID garante unicidade sem qualquer loop.
--   Fallback: se o sufixo UUID ainda colidir (teoricamente impossível mas
--   defensivamente tratado), e para p_product_id IS NULL: loop limitado a 999.
-- BACKWARD COMPAT: slugs existentes não são alterados.
--   Novos produtos com nome duplicado passam de "base-N" para "base-<8hex>".
-- ══════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.generate_product_slug(
  p_name       text,
  p_product_id uuid DEFAULT NULL
)
 RETURNS text
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  v_base_slug   text;
  v_final_slug  text;
  v_hex_suffix  text;
  v_counter     integer := 0;
BEGIN
  -- Validação de entrada
  IF p_name IS NULL OR LENGTH(TRIM(p_name)) = 0 THEN
    RETURN NULL;
  END IF;

  -- Gerar slug base via slugify
  v_base_slug  := slugify(p_name);
  v_final_slug := v_base_slug;

  -- ── CAMINHO RÁPIDO: slug base disponível ─────────────────────────
  IF NOT EXISTS (
    SELECT 1 FROM products
    WHERE slug = v_final_slug
      AND is_deleted = false
      AND (p_product_id IS NULL OR id <> p_product_id)
  ) THEN
    RETURN v_final_slug;
  END IF;

  -- ── COLISÃO: sufixo determinístico via UUID (O(1) garantido) ─────
  -- Usa os primeiros 8 hex do UUID do produto como sufixo.
  -- Elimina 100% do loop N+1 anterior que chegava a 18527 iterações.
  IF p_product_id IS NOT NULL THEN
    v_hex_suffix := LEFT(REPLACE(p_product_id::text, '-', ''), 8);
    v_final_slug := v_base_slug || '-' || v_hex_suffix;

    IF NOT EXISTS (
      SELECT 1 FROM products
      WHERE slug = v_final_slug
        AND is_deleted = false
        AND id <> p_product_id
    ) THEN
      RETURN v_final_slug;
    END IF;

    -- Fallback extremamente improvável: sufixo hex colidiu (duplo produto com mesmo UUID truncado)
    -- Usar slug completo: base-<uuid-completo-sem-hifens>
    v_final_slug := v_base_slug || '-' || REPLACE(p_product_id::text, '-', '');
    RETURN v_final_slug;
  END IF;

  -- ── FALLBACK: sem p_product_id (chamada externa sem contexto) ────
  -- Loop limitado a 999 (antes era ilimitado).
  WHILE v_counter < 999 LOOP
    v_counter    := v_counter + 1;
    v_final_slug := v_base_slug || '-' || v_counter;
    IF NOT EXISTS (
      SELECT 1 FROM products
      WHERE slug = v_final_slug
        AND is_deleted = false
        AND (p_product_id IS NULL OR id <> p_product_id)
    ) THEN
      RETURN v_final_slug;
    END IF;
  END LOOP;

  -- Último recurso: base + timestamp
  RETURN v_base_slug || '-' || EXTRACT(EPOCH FROM NOW())::bigint;
END;
$function$;
;
