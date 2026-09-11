-- Melhoria #3: hardening do INSERT de quotes.
-- Antes: with_check = user_is_org_member(organization_id) — qualquer membro da org podia
-- inserir um orçamento com seller_id de OUTRO vendedor (via API direta).
-- Agora: além de ser membro da org, o criador precisa ser coord+ OU estar gravando o
-- orçamento em seu próprio nome (seller_id/created_by = auth.uid()). Espelha exatamente o
-- padrão já usado (e testado em produção) nas policies de SELECT/UPDATE de quotes.
-- Coordenadores+ continuam podendo criar em nome de terceiros (sem regressão no fluxo real).
ALTER POLICY org_members_create_quotes ON public.quotes
  WITH CHECK (
    user_is_org_member(organization_id)
    AND (
      is_coord_or_above((SELECT auth.uid()))
      OR seller_id = (SELECT auth.uid())
      OR created_by = (SELECT auth.uid())
    )
  );;
