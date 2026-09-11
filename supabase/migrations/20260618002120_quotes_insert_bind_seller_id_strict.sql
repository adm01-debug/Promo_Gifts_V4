-- Melhoria #3 (refino): binding estrito de seller_id no INSERT.
-- Remove o ramo created_by=auth.uid() para não permitir criar com seller_id de terceiro
-- apenas marcando-se como criador. O app sempre grava seller_id=auth.uid(); coords+ seguem
-- podendo criar em nome de outro vendedor.
ALTER POLICY org_members_create_quotes ON public.quotes
  WITH CHECK (
    user_is_org_member(organization_id)
    AND (
      is_coord_or_above((SELECT auth.uid()))
      OR seller_id = (SELECT auth.uid())
    )
  );;
