-- ═══════════════════════════════════════════════════════════
-- fn_sanitize_url: normaliza URLs malformadas antes de gravar
-- Corrige: https:/ → https://, http:/ → http://
--          trim de espaços, remoção de \r\n embutidos
-- ═══════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.fn_sanitize_url(p_url TEXT)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
SET search_path TO 'public'
AS $$
DECLARE
  v_url TEXT := p_url;
BEGIN
  IF v_url IS NULL THEN RETURN NULL; END IF;

  -- Trim espaços externos
  v_url := TRIM(v_url);

  -- Remover caracteres de controle embutidos (CR, LF, TAB)
  v_url := REPLACE(v_url, CHR(13), '');
  v_url := REPLACE(v_url, CHR(10), '');
  v_url := REPLACE(v_url, CHR(9),  '');

  -- Corrigir https:/ (1 slash) → https://
  -- Usando REGEXP_REPLACE para precisão: ^https:/(?!/)
  v_url := REGEXP_REPLACE(v_url, '^https:/([^/])', 'https://\1');

  -- Corrigir http:/ (1 slash) → http://
  v_url := REGEXP_REPLACE(v_url, '^http:/([^/])', 'http://\1');

  -- Se ficou vazio após trim, retornar NULL
  IF v_url = '' THEN RETURN NULL; END IF;

  RETURN v_url;
END;
$$;

-- ═══════════════════════════════════════════════════════════
-- Trigger BEFORE INSERT/UPDATE em product_images
-- Sanitiza url_original e url_cdn antes de gravar
-- ═══════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.fn_sanitize_product_image_urls()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Sanitizar url_original (CDN do fornecedor)
  NEW.url_original := fn_sanitize_url(NEW.url_original);

  -- Sanitizar url_cdn (CF Images) — só aplicar trim e controles
  IF NEW.url_cdn IS NOT NULL THEN
    NEW.url_cdn := TRIM(NEW.url_cdn);
    NEW.url_cdn := REPLACE(NEW.url_cdn, CHR(13), '');
    NEW.url_cdn := REPLACE(NEW.url_cdn, CHR(10), '');
  END IF;

  RETURN NEW;
END;
$$;

-- Criar trigger BEFORE INSERT OR UPDATE (fires before row is written)
DROP TRIGGER IF EXISTS trg_sanitize_image_urls ON product_images;
CREATE TRIGGER trg_sanitize_image_urls
  BEFORE INSERT OR UPDATE OF url_original, url_cdn
  ON product_images
  FOR EACH ROW
  EXECUTE FUNCTION fn_sanitize_product_image_urls();

-- Comentário explicativo
COMMENT ON FUNCTION public.fn_sanitize_url(TEXT) IS
  'Normaliza URLs: corrige https:/(1slash), http:/(1slash), remove CR/LF/TAB embutidos, trim.';
COMMENT ON FUNCTION public.fn_sanitize_product_image_urls() IS
  'Trigger BEFORE INSERT/UPDATE: sanitiza url_original e url_cdn em product_images.';
COMMENT ON TRIGGER trg_sanitize_image_urls ON product_images IS
  'Previne gravação de URLs malformadas. Corrige https:/ → https://, trim, remove ctrl chars.';;
