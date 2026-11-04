-- ETAPA 2: Remover triggers duplicados de updated_at
-- Cada tabela abaixo tem 2 triggers fazendo a mesma coisa. Remover o excedente.

-- categories: manter set_updated_at_trigger, remover trigger_categories_updated_at
DROP TRIGGER IF EXISTS trigger_categories_updated_at ON public.categories;

-- material_groups: manter material_groups_updated_at, remover update_material_groups_updated_at (mesma funcao)
DROP TRIGGER IF EXISTS update_material_groups_updated_at ON public.material_groups;

-- orders: manter set_updated_at_trigger, remover update_orders_updated_at
DROP TRIGGER IF EXISTS update_orders_updated_at ON public.orders;

-- product_videos: manter set_updated_at_product_videos, remover trg_product_videos_updated
DROP TRIGGER IF EXISTS trg_product_videos_updated ON public.product_videos;

-- products: manter set_updated_at_trigger, remover update_products_updated_at
DROP TRIGGER IF EXISTS update_products_updated_at ON public.products;
