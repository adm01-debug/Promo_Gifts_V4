-- BUG P1: a policy quote_items_delete exigia is_org_owner_or_admin(), mas o RPC
-- update_quote_transactional (SECURITY INVOKER) faz DELETE dos itens antigos antes
-- de reinserir. Resultado: vendedor comum editando o PRÓPRIO orçamento recebia
-- "permission denied" no DELETE → toda a edição falhava. INSERT/SELECT/UPDATE já
-- usavam can_access_quote; o DELETE estava fora de padrão.
-- Segurança preservada: o trigger trg_quote_items_parent_immutable (BEFORE INS/UPD/DEL)
-- continua bloqueando qualquer alteração em itens de orçamentos approved/converted.
DROP POLICY IF EXISTS quote_items_delete ON public.quote_items;
CREATE POLICY quote_items_delete ON public.quote_items
  FOR DELETE
  USING (can_access_quote(quote_id));;
