-- Remove a policy permissiva redundante que anulava o filtro is_active para anon.
-- A policy PUBLIC product_images_select (is_active=true OR autenticado) já cobre o anon
-- corretamente: anônimo passa a ver SÓ imagens ativas; autenticado continua vendo tudo.
DROP POLICY IF EXISTS product_images_anon_select ON public.product_images;;
