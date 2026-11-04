-- índices ajustados para schema real (user_id→seller_id em quotes; color_variations sem product_id skipado)
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_quotes_seller_org_status ON quotes(seller_id, organization_id, status);
CREATE INDEX IF NOT EXISTS idx_quote_items_quote_id ON quote_items(quote_id);
CREATE INDEX IF NOT EXISTS idx_product_images_product_id ON product_images(product_id);
CREATE INDEX IF NOT EXISTS idx_image_import_log_product_id ON image_import_log(product_id);
