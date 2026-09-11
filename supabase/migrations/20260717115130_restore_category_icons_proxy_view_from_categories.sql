-- ============================================================================
-- RESTORE: public.category_icons (proxy view → public.categories)
-- ANTI-REGRESSÃO fix_version 20260717
--
-- CONTEXTO: archive.category_icons foi dropada com CASCADE em
-- 20260716000008_drop_archive_backup_schemas.sql, o que derrubou também
-- a proxy view public.category_icons. O frontend (useCategoryIcons.ts)
-- continua esperando esta view e recebia 404.
--
-- FONTE DA VERDADE: public.categories (colunas name, icon, is_active, id)
-- A view só expõe categorias ativas com icon preenchido.
--
-- COLUNAS EXPOSTAS (retrocompat com CategoryIcon interface do frontend):
--   id            → categories.id
--   category_name → categories.name
--   icon          → categories.icon
--   description   → NULL (não existe em categories; aceito por interface)
--   is_active     → categories.is_active
-- ============================================================================

CREATE OR REPLACE VIEW public.category_icons AS
SELECT
  c.id,
  c.name        AS category_name,
  c.icon,
  NULL::text    AS description,
  c.is_active
FROM public.categories c
WHERE c.icon IS NOT NULL;

COMMENT ON VIEW public.category_icons IS
  'PROXY VIEW (restaurada 2026-07-17) — leitura somente. '
  'Fonte de verdade: public.categories (icon, name, is_active). '
  'archive.category_icons foi dropada com CASCADE em 20260716000008. '
  'NAO usar security_invoker=on — categories tem RLS public_read OK. '
  'ANTI-REGRESSÃO fix_version 20260717. NAO dropar esta view.';

-- ── Read-only via INSTEAD NOTHING rules (impede auto-update)
CREATE OR REPLACE RULE category_icons_no_insert
  AS ON INSERT TO public.category_icons DO INSTEAD NOTHING;

CREATE OR REPLACE RULE category_icons_no_update
  AS ON UPDATE TO public.category_icons DO INSTEAD NOTHING;

CREATE OR REPLACE RULE category_icons_no_delete
  AS ON DELETE TO public.category_icons DO INSTEAD NOTHING;

-- ── Grants (replica política original: qualquer autenticado lê)
GRANT SELECT ON public.category_icons TO anon;
GRANT SELECT ON public.category_icons TO authenticated;

-- ── Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';;
