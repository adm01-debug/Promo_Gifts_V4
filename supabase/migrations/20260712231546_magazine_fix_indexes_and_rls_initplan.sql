-- ============================================================================
-- FIX P2 — Índices redundantes, FK sem índice e RLS reavaliada por linha.
-- ============================================================================

-- (a) REDUNDANTES — mesmas colunas na mesma ordem que um UNIQUE já existente.
--     Índice redundante = custo de escrita e storage por zero ganho de leitura.

-- idx_magazine_items_mag_pos (magazine_id, position)
--   ⊂ magazine_items_position_unique UNIQUE (magazine_id, position)
DROP INDEX IF EXISTS public.idx_magazine_items_mag_pos;

-- idx_magazines_owner (owner_id) WHERE deleted_at IS NULL
--   ⊂ idx_magazines_not_deleted (owner_id, updated_at DESC) WHERE deleted_at IS NULL
--     (mesmo predicado, owner_id como coluna líder → serve as mesmas queries)
DROP INDEX IF EXISTS public.idx_magazines_owner;

-- (b) FK SEM ÍNDICE — magazine_public_reactions.item_id → magazine_items(id) ON DELETE CASCADE.
--     Sem índice, todo DELETE em magazine_items faz SEQ SCAN em reactions para
--     achar as linhas a cascatear. Itens são removidos a cada edição de revista.
CREATE INDEX IF NOT EXISTS idx_mag_reactions_item
  ON public.magazine_public_reactions (item_id)
  WHERE item_id IS NOT NULL;

-- (c) RLS: auth.uid() direto no predicado é reavaliado POR LINHA.
--     Envolver em (SELECT auth.uid()) força um InitPlan → avaliado UMA vez.
--     Recomendação oficial do Supabase p/ RLS em escala. Semântica idêntica.

DROP POLICY IF EXISTS magazines_owner_all ON public.magazines;
CREATE POLICY magazines_owner_all ON public.magazines
  FOR ALL TO authenticated
  USING      (owner_id = (SELECT auth.uid()) AND deleted_at IS NULL)
  WITH CHECK (owner_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS magazines_org_read ON public.magazines;
CREATE POLICY magazines_org_read ON public.magazines
  FOR SELECT TO authenticated
  USING (
    organization_id IS NOT NULL
    AND deleted_at IS NULL
    AND EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = magazines.organization_id
        AND om.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS magazine_items_via_owner_or_org ON public.magazine_items;
CREATE POLICY magazine_items_via_owner_or_org ON public.magazine_items
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.magazines m
      WHERE m.id = magazine_items.magazine_id
        AND (
          m.owner_id = (SELECT auth.uid())
          OR (
            m.organization_id IS NOT NULL
            AND EXISTS (
              SELECT 1 FROM public.organization_members om
              WHERE om.organization_id = m.organization_id
                AND om.user_id = (SELECT auth.uid())
            )
          )
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.magazines m
      WHERE m.id = magazine_items.magazine_id
        AND m.owner_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS templates_owner_all ON public.magazine_templates;
CREATE POLICY templates_owner_all ON public.magazine_templates
  FOR ALL TO authenticated
  USING      (owner_id = (SELECT auth.uid()))
  WITH CHECK (owner_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS templates_org_read ON public.magazine_templates;
CREATE POLICY templates_org_read ON public.magazine_templates
  FOR SELECT TO authenticated
  USING (
    shared_in_org = true
    AND organization_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = magazine_templates.organization_id
        AND om.user_id = (SELECT auth.uid())
    )
  );

-- (d) Índice de cobertura para o EXISTS das policies acima.
CREATE INDEX IF NOT EXISTS idx_org_members_org_user
  ON public.organization_members (organization_id, user_id);;
