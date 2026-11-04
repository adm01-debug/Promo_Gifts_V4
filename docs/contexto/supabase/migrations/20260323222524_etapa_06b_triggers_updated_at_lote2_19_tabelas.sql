-- ETAPA 6B: Adicionar trigger set_updated_at nas 19 tabelas restantes
-- NOTA: Excluindo 5 tabelas que ja possuem triggers proprios de timestamp
-- (category_accessory_categories, category_commemorative_dates, category_copywriting_config,
--  category_target_audiences, product_commemorative_dates)
CREATE TRIGGER set_updated_at_trigger BEFORE UPDATE ON public.property_definitions FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_updated_at_trigger BEFORE UPDATE ON public.scraper_images_staging FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_updated_at_trigger BEFORE UPDATE ON public.sm_images_staging FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_updated_at_trigger BEFORE UPDATE ON public.supplier_colors FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_updated_at_trigger BEFORE UPDATE ON public.supplier_field_mappings FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_updated_at_trigger BEFORE UPDATE ON public.supplier_image_requirements FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_updated_at_trigger BEFORE UPDATE ON public.supplier_packagings FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_updated_at_trigger BEFORE UPDATE ON public.supplier_products_raw FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_updated_at_trigger BEFORE UPDATE ON public.supplier_property_mappings FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_updated_at_trigger BEFORE UPDATE ON public.supplier_value_mappings FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_updated_at_trigger BEFORE UPDATE ON public.supplier_video_requirements FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_updated_at_trigger BEFORE UPDATE ON public.tabela_preco_gravacao_oficial_faixa FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_updated_at_trigger BEFORE UPDATE ON public.tags FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_updated_at_trigger BEFORE UPDATE ON public.target_audiences FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_updated_at_trigger BEFORE UPDATE ON public.tecnicas_gravacao FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_updated_at_trigger BEFORE UPDATE ON public.variation_types FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_updated_at_trigger BEFORE UPDATE ON public.variation_values FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_updated_at_trigger BEFORE UPDATE ON public.video_types FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_updated_at_trigger BEFORE UPDATE ON public.xbz_gallery_staging FOR EACH ROW EXECUTE FUNCTION set_updated_at();
