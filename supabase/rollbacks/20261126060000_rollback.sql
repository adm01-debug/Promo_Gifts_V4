BEGIN;
DROP FUNCTION IF EXISTS public.fn_admin_unlink_crm_seller(uuid);
DROP FUNCTION IF EXISTS public.fn_admin_link_crm_seller(bigint, uuid, text);
DROP FUNCTION IF EXISTS public.fn_admin_list_crm_seller_links(text, integer);
COMMIT;