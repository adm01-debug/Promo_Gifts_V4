-- Corrige contradição NOT NULL + ON DELETE SET NULL -> NO ACTION (bloqueio limpo de FK).
-- Dados já válidos (FKs antigas enforçavam o mesmo ref): recriação é segura.

-- products.category_id (NOT NULL): nao pode zerar categoria -> bloqueia delete de categoria em uso
ALTER TABLE public.products DROP CONSTRAINT products_category_id_fkey;
ALTER TABLE public.products ADD CONSTRAINT products_category_id_fkey
  FOREIGN KEY (category_id) REFERENCES public.categories(id) ON DELETE NO ACTION;

-- products.supplier_id (NOT NULL)
ALTER TABLE public.products DROP CONSTRAINT products_supplier_id_fkey;
ALTER TABLE public.products ADD CONSTRAINT products_supplier_id_fkey
  FOREIGN KEY (supplier_id) REFERENCES public.suppliers(id) ON DELETE NO ACTION;

-- quote_history.user_id (NOT NULL, auditoria): preserva historico bloqueando delete do autor
ALTER TABLE public.quote_history DROP CONSTRAINT quote_history_user_id_fkey;
ALTER TABLE public.quote_history ADD CONSTRAINT quote_history_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE NO ACTION;

-- quotes.seller_id (NOT NULL): corrige o vicio herdado no sweep
ALTER TABLE public.quotes DROP CONSTRAINT quotes_seller_id_fkey;
ALTER TABLE public.quotes ADD CONSTRAINT quotes_seller_id_fkey
  FOREIGN KEY (seller_id) REFERENCES public.profiles(user_id) ON DELETE NO ACTION;

NOTIFY pgrst, 'reload schema';;
