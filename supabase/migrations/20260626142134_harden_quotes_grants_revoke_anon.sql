-- quotes são B2B privados por organização/seller. Nenhuma policy concede acesso a anon
-- (auth.uid() NULL reprova user_is_org_member) → acesso direto de anon já era negado por RLS
-- (SELECT retornava 0 linhas). O compartilhamento público de orçamento usa a RPC SECURITY DEFINER
-- get_quote_token_by_value (que ignora grants de tabela). Removemos grants desnecessários de anon
-- (defesa-em-profundidade) e os DDL-grants de authenticated; mantém-se SELECT/INSERT/UPDATE/DELETE
-- de authenticated, gated por RLS.
REVOKE ALL ON public.quotes FROM anon;
REVOKE REFERENCES, TRIGGER ON public.quotes FROM authenticated;;
