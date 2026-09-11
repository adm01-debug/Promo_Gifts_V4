
-- ═══════════════════════════════════════════════════════════════
-- MIGRATION: add_trigger_sync_category_image_url_on_slug_change
-- Objetivo: Sincronizar automaticamente image_url quando o slug
--           de uma categoria muda, desde que a URL siga o padrão
--           canônico do Cloudflare Images (cat-{slug}).
--           URLs customizadas são preservadas sem alteração.
--
-- Autor  : Sistema — gerado após simulação de 14 cenários
-- Data   : 2026-06-23
-- Tabela : public.categories
-- ═══════════════════════════════════════════════════════════════

-- ───────────────────────────────────────────────────────────────
-- STEP 1: Criar (ou substituir) a função do trigger
-- ───────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.fn_sync_category_image_url_on_slug_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;

-- ───────────────────────────────────────────────────────────────
-- STEP 2: Criar o trigger vinculado à função
-- Dispara BEFORE UPDATE, SOMENTE quando slug mudar
-- ───────────────────────────────────────────────────────────────
DROP TRIGGER IF EXISTS trg_sync_image_url_on_slug_update ON public.categories;

CREATE TRIGGER trg_sync_image_url_on_slug_update
  BEFORE UPDATE OF slug
  ON public.categories
  FOR EACH ROW
  WHEN (OLD.slug IS DISTINCT FROM NEW.slug)
  EXECUTE FUNCTION public.fn_sync_category_image_url_on_slug_change();

-- ───────────────────────────────────────────────────────────────
-- STEP 3: Comentar a função para documentar o contrato
-- ───────────────────────────────────────────────────────────────
COMMENT ON FUNCTION public.fn_sync_category_image_url_on_slug_change() IS
'Trigger BEFORE UPDATE OF slug em categories.
Quando o slug muda, sincroniza image_url SE ela seguir o padrão canônico:
  https://imagedelivery.net/vKMs9Ow8bA_enuhLXZ2HAw/cat-{slug}/public
URLs customizadas (fora desse padrão) são preservadas sem alteração.
Guards: image_url NULL, novo slug NULL/vazio, old slug NULL → sem ação.
Emite RAISE NOTICE para auditoria em cada sincronização executada.';

COMMENT ON TRIGGER trg_sync_image_url_on_slug_update ON public.categories IS
'Sincroniza categories.image_url ao mudar o slug quando a URL segue o padrão canônico Cloudflare Images (cat-{slug}). Criado em 2026-06-23.';
;
