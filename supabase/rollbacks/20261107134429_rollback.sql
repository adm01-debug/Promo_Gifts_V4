-- Rollback for 20261107134429_create_crm_seller_identity_links.sql
-- ATENCAO: remove os vinculos persistidos; exporte-os antes de executar.

DROP TABLE IF EXISTS public.crm_seller_identity_links;
