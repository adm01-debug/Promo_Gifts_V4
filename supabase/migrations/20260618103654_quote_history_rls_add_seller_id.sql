-- Melhoria #1: quote_history RLS — adicionar seller_id às policies SELECT e INSERT.
--
-- Problema: as policies verificavam apenas created_by e assigned_to, ignorando seller_id.
-- Cenário quebrado: coord cria quote com seller_id=sellerA e created_by=coordId.
-- SellerA pode SELECT/UPDATE o quote (via quotes_select_scope/quotes_update_scope),
-- mas NÃO consegue ler nem inserir no seu próprio quote_history. Isso faz com que
-- nosso novo audit trail (create/update_quote_transactional) silenciosamente falhe
-- ao tentar INSERT quando chamado como authenticated sellerA.
--
-- Solução: adicionar q.seller_id = auth.uid() às condições de EXISTS em ambas as policies.

-- SELECT policy
DROP POLICY IF EXISTS "Sellers and coord view quote_history" ON public.quote_history;
CREATE POLICY "Sellers and coord view quote_history"
  ON public.quote_history
  FOR SELECT
  USING (
    is_coord_or_above(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.quotes q
      WHERE q.id = quote_history.quote_id
        AND (
          q.seller_id   = auth.uid()
          OR q.created_by  = auth.uid()
          OR q.assigned_to = auth.uid()
        )
    )
  );

-- INSERT policy
DROP POLICY IF EXISTS "Sellers and coord create quote_history" ON public.quote_history;
CREATE POLICY "Sellers and coord create quote_history"
  ON public.quote_history
  FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND (
      is_coord_or_above(auth.uid())
      OR EXISTS (
        SELECT 1 FROM public.quotes q
        WHERE q.id = quote_history.quote_id
          AND (
            q.seller_id   = auth.uid()
            OR q.created_by  = auth.uid()
            OR q.assigned_to = auth.uid()
          )
      )
    )
  );;
