-- Enforça o invariante "toda quote tem dono" no nível de schema.
-- seller_id é a COLUNA DE ESCOPO do RLS (quotes_select_scope/quotes_update_scope filtram por ela);
-- o WITH CHECK do insert (is_coord_or_above(auth.uid()) OR seller_id=auth.uid()) NÃO garante não-nulo
-- para coordenadores (o 1º ramo curto-circuita) => um seller_id NULL criaria quote órfã/edge-case de RLS.
-- create_quote_transactional sempre seta seller_id (de auth.uid()); 0 nulos em todo o histórico.
-- O SET NOT NULL faz full scan de validação atômico (falharia se houvesse 1 nulo). Verificado: attnotnull=true.
ALTER TABLE public.quotes ALTER COLUMN seller_id SET NOT NULL;;
