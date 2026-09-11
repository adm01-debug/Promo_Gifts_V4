
-- MELHORIA 8a: Vincular os 17 grupos residuais
WITH groups AS (
  SELECT content_hash,
    (array_agg(id ORDER BY created_at ASC, id ASC))[1] AS root_id
  FROM public.product_images
  WHERE deleted_at IS NULL AND content_hash IS NOT NULL
  GROUP BY content_hash
  HAVING COUNT(*) > 1 AND COUNT(canonical_image_id) = 0
),
update_roots AS (
  UPDATE public.product_images
  SET is_shared = false, last_modified_source = 'migration'
  FROM groups
  WHERE id = groups.root_id AND canonical_image_id IS NULL
  RETURNING id
),
update_deps AS (
  UPDATE public.product_images pi
  SET canonical_image_id = g.root_id,
      is_shared = true,
      last_modified_source = 'migration'
  FROM groups g
  WHERE pi.content_hash = g.content_hash
    AND pi.id <> g.root_id
    AND pi.deleted_at IS NULL
    AND pi.canonical_image_id IS NULL
  RETURNING pi.id
)
SELECT 
  (SELECT COUNT(*) FROM update_roots) AS roots_marked,
  (SELECT COUNT(*) FROM update_deps) AS deps_linked;

-- MELHORIA 8b: Função auto-link para novos content_hash preenchidos
CREATE OR REPLACE FUNCTION public.fn_autolink_canonical_on_content_hash()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_root_id uuid;
BEGIN
  -- Só age quando content_hash foi preenchido pela primeira vez
  IF NEW.content_hash IS NULL OR (OLD.content_hash IS NOT NULL AND OLD.content_hash = NEW.content_hash) THEN
    RETURN NEW;
  END IF;
  -- Se já tem canonical_image_id, não interfere
  IF NEW.canonical_image_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

  -- Buscar root do grupo (imagem mais antiga com mesmo content_hash que é root)
  SELECT id INTO v_root_id
  FROM public.product_images
  WHERE content_hash = NEW.content_hash
    AND deleted_at IS NULL
    AND canonical_image_id IS NULL
    AND id <> NEW.id
    AND is_shared = false
  ORDER BY created_at ASC, id ASC
  LIMIT 1;

  IF v_root_id IS NOT NULL THEN
    -- Vincular este como dependente do root encontrado
    NEW.canonical_image_id := v_root_id;
    NEW.is_shared := true;
  ELSE
    -- Verificar se há algum membro do grupo que já é dependente → seu canonical é o root
    SELECT pi2.canonical_image_id INTO v_root_id
    FROM public.product_images pi2
    WHERE pi2.content_hash = NEW.content_hash
      AND pi2.deleted_at IS NULL
      AND pi2.canonical_image_id IS NOT NULL
      AND pi2.id <> NEW.id
    LIMIT 1;

    IF v_root_id IS NOT NULL THEN
      NEW.canonical_image_id := v_root_id;
      NEW.is_shared := true;
    END IF;
    -- Se não há outro membro → este é o único, nada a fazer
  END IF;

  RETURN NEW;
END;
$$;

-- Trigger: dispara ao preencher content_hash
DROP TRIGGER IF EXISTS trg_autolink_canonical_on_content_hash ON public.product_images;
CREATE TRIGGER trg_autolink_canonical_on_content_hash
  BEFORE UPDATE OF content_hash ON public.product_images
  FOR EACH ROW
  WHEN (NEW.content_hash IS NOT NULL AND (OLD.content_hash IS NULL OR OLD.content_hash <> NEW.content_hash))
  EXECUTE FUNCTION public.fn_autolink_canonical_on_content_hash();

-- Segurança: revogar acesso à função
REVOKE ALL ON FUNCTION public.fn_autolink_canonical_on_content_hash() FROM anon, authenticated;
;
