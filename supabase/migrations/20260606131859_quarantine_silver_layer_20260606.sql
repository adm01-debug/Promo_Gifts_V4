-- Quarentena reversivel da camada silver_* (duplicata de chat paralelo).
-- Dados preservados sob o novo nome; DROP fisico apos janela de estabilidade.
alter table public.silver_products     rename to _deprecated_silver_products_20260606;
alter table public.silver_variants     rename to _deprecated_silver_variants_20260606;
alter table public.silver_print_areas  rename to _deprecated_silver_print_areas_20260606;
alter table public.silver_images_queue rename to _deprecated_silver_images_queue_20260606;;
