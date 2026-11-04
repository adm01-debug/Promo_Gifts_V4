CREATE OR REPLACE FUNCTION public.fn_sync_category_image_url_on_slug_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  -- Constante: base da URL do Cloudflare Images (account hash fixo)
  v_base_url  CONSTANT text := 'https://imagedelivery.net/vKMs9Ow8bA_enuhLXZ2HAw/';
  -- Prefixo de naming convention para imagens de categoria
  v_prefix    CONSTANT text := 'cat-';
  -- Variant padrão (público)
  v_variant   CONSTANT text := '/public';
  -- URL canônica esperada para o slug ANTIGO
  v_old_canonical text;
BEGIN
  -- ── GUARD 1: image_url precisa estar preenchida para agir ───
  IF NEW.image_url IS NULL THEN
    RETURN NEW;
  END IF;

  -- ── GUARD 2: novo slug deve ser não-nulo e não-vazio ────────
  -- (evita construir URL inválida com NULL ou string vazia)
  IF NEW.slug IS NULL OR trim(NEW.slug) = '' THEN
    -- Slug virou nulo/vazio: decisão humana sobre image_url
    -- O trigger NÃO limpa automaticamente — preserva a URL
    RETURN NEW;
  END IF;

  -- ── GUARD 3: old slug deve ser não-nulo ─────────────────────
  -- (se OLD.slug era NULL, não havia URL canônica para comparar)
  IF OLD.slug IS NULL OR trim(OLD.slug) = '' THEN
    RETURN NEW;
  END IF;

  -- ── LÓGICA PRINCIPAL ────────────────────────────────────────
  -- Calcula a URL canônica que deveria existir para o slug ANTIGO
  v_old_canonical := v_base_url || v_prefix || OLD.slug || v_variant;

  -- Se a URL atual é exatamente a URL canônica do slug antigo:
  --   → Atualiza para a URL canônica do novo slug (sincronização automática)
  -- Se a URL atual é customizada (diferente do padrão):
  --   → NÃO altera nada (preserva intenção do autor)
  IF NEW.image_url = v_old_canonical THEN
    NEW.image_url := v_base_url || v_prefix || NEW.slug || v_variant;

    RAISE NOTICE
      '[trg_sync_image_url] category.id=% | slug: % → % | image_url atualizada automaticamente',
      NEW.id, OLD.slug, NEW.slug;
  END IF;

  RETURN NEW;
END;
$function$
