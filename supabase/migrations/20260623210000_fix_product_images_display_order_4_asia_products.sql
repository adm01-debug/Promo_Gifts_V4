UPDATE product_images SET display_order = new_order FROM (...) WHERE ...;
4 produtos ASIA Import reindexados: Caderno A5 RPET, Caneca 340ml, Copo fibra trigo, Garrafa PET 550ml;
ROW_NUMBER() OVER (PARTITION BY product_id ORDER BY tipo-prioridade, is_primary DESC, display_order, created_at);
Trigger AFTER disparou e atualizou products.images JSONB automaticamente;
