
-- ═══════════════════════════════════════════════════════════════════════════
-- MIGRAÇÃO: upgrade_category_icons_uuid_fk_and_sync_trigger
-- Melhoria 2 de 3 — Arquitetura UUID FK + Trigger de sync robusto
-- ═══════════════════════════════════════════════════════════════════════════

-- ── PASSO 1: Coluna category_id (nullable para backfill seguro) ──────────
ALTER TABLE public.category_icons
  ADD COLUMN IF NOT EXISTS category_id UUID
    REFERENCES public.categories(id)
    ON UPDATE CASCADE
    ON DELETE SET NULL;

COMMENT ON COLUMN public.category_icons.category_id IS
  'FK para categories(id). Substitui link frágil por TEXT. '
  'ON UPDATE CASCADE / ON DELETE SET NULL. Backfilled por nome.';

-- ── PASSO 2: Backfill — DISTINCT ON para desambiguar nomes duplicados ────
UPDATE public.category_icons ci
SET category_id = sub.cat_id
FROM (
  SELECT DISTINCT ON (ci2.id)
    ci2.id  AS ci_id,
    c.id    AS cat_id
  FROM public.category_icons ci2
  JOIN public.categories c ON c.name = ci2.category_name
  WHERE ci2.category_id IS NULL
  ORDER BY
    ci2.id,
    c.is_active   DESC,
    c.level       ASC,
    c.display_order ASC,
    c.created_at  ASC
) sub
WHERE ci.id = sub.ci_id;

-- ── PASSO 3: Índice único parcial em category_id ─────────────────────────
CREATE UNIQUE INDEX IF NOT EXISTS idx_category_icons_category_id_unique
  ON public.category_icons (category_id)
  WHERE category_id IS NOT NULL;

-- ── PASSO 4: Função do trigger (UUID-first, fallback por nome) ───────────
CREATE OR REPLACE FUNCTION public.fn_sync_categories_icon_to_registry()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN

  -- ── INSERT em categories → registrar icon ─────────────────────────────
  IF TG_OP = 'INSERT' THEN
    IF NEW.icon IS NOT NULL THEN
      INSERT INTO public.category_icons
        (category_id, category_name, icon, is_active, created_at, updated_at)
      VALUES
        (NEW.id, NEW.name, NEW.icon, NEW.is_active, NOW(), NOW())
      ON CONFLICT (category_id) WHERE category_id IS NOT NULL
        DO UPDATE SET
          icon          = EXCLUDED.icon,
          category_name = EXCLUDED.category_name,
          is_active     = EXCLUDED.is_active,
          updated_at    = NOW();
    END IF;
    RETURN NEW;
  END IF;

  -- ── UPDATE em categories → sincronizar ────────────────────────────────
  IF TG_OP = 'UPDATE' THEN

    -- Early exit se nada relevante mudou
    IF NOT (
      NEW.icon         IS DISTINCT FROM OLD.icon
      OR NEW.name      IS DISTINCT FROM OLD.name
      OR NEW.is_active IS DISTINCT FROM OLD.is_active
    ) THEN
      RETURN NEW;
    END IF;

    -- ── CASO A: Icon removido → desativar ─────────────────────────────
    IF NEW.icon IS NULL THEN
      UPDATE public.category_icons
        SET is_active  = false, updated_at = NOW()
      WHERE category_id = NEW.id;

      IF NOT FOUND THEN
        UPDATE public.category_icons
          SET is_active  = false, updated_at = NOW()
        WHERE category_name = OLD.name AND category_id IS NULL;
      END IF;

    -- ── CASO B: Icon definido → sincronizar ───────────────────────────
    ELSE

      -- Tentativa 1: via UUID (rota precisa)
      UPDATE public.category_icons
        SET icon          = NEW.icon,
            category_name = NEW.name,
            is_active     = NEW.is_active,
            updated_at    = NOW()
      WHERE category_id = NEW.id;

      -- Tentativa 2: adotar entrada legada sem UUID (fallback por nome)
      IF NOT FOUND THEN
        -- CTE para limitar a 1 linha sem LIMIT no UPDATE direto
        WITH legado AS (
          SELECT id
          FROM public.category_icons
          WHERE category_name = OLD.name
            AND category_id IS NULL
          ORDER BY created_at ASC
          LIMIT 1
        )
        UPDATE public.category_icons ci
          SET category_id   = NEW.id,
              icon          = NEW.icon,
              category_name = NEW.name,
              is_active     = NEW.is_active,
              updated_at    = NOW()
        FROM legado
        WHERE ci.id = legado.id;
      END IF;

      -- Tentativa 3: criar nova entrada se nenhuma foi encontrada
      IF NOT FOUND THEN
        INSERT INTO public.category_icons
          (category_id, category_name, icon, is_active, created_at, updated_at)
        VALUES
          (NEW.id, NEW.name, NEW.icon, NEW.is_active, NOW(), NOW())
        ON CONFLICT (category_id) WHERE category_id IS NOT NULL
          DO UPDATE SET
            icon          = EXCLUDED.icon,
            category_name = EXCLUDED.category_name,
            is_active     = EXCLUDED.is_active,
            updated_at    = NOW();
      END IF;

    END IF; -- fim CASO A / CASO B

    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.fn_sync_categories_icon_to_registry() IS
  'Sincroniza category_icons quando categories.icon/name/is_active mudam. '
  'Estratégia 3 camadas: (1) UUID exact, (2) adotar entrada legada sem UUID, '
  '(3) criar nova entrada. SECURITY DEFINER para contornar RLS em category_icons.';

-- ── PASSO 5: Criar o trigger ──────────────────────────────────────────────
DROP TRIGGER IF EXISTS trg_sync_category_icon ON public.categories;

CREATE TRIGGER trg_sync_category_icon
  AFTER INSERT OR UPDATE OF icon, name, is_active
  ON public.categories
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_sync_categories_icon_to_registry();
;
