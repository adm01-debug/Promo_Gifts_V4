-- BUG P3 (hardening de consistência): qip_insert_own_quote só permitia o seller_id,
-- enquanto qip_select/update/delete já incluem is_coord_or_above(). Isso bloqueava um
-- coordenador (ou acima) de inserir personalizações ao editar o orçamento de um vendedor,
-- gerando falha assimétrica no update transacional. Alinhamos a regra de INSERT às demais.
DROP POLICY IF EXISTS qip_insert_own_quote ON public.quote_item_personalizations;
CREATE POLICY qip_insert_own_quote ON public.quote_item_personalizations
  FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1
    FROM public.quote_items qi
    JOIN public.quotes q ON q.id = qi.quote_id
    WHERE qi.id = quote_item_personalizations.quote_item_id
      AND (q.seller_id = (SELECT auth.uid()) OR is_coord_or_above((SELECT auth.uid())))
  ));;
