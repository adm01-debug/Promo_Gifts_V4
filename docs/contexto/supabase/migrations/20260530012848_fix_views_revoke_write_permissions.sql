-- HOTFIX: VIEWs com security_invoker=false permitem writes!
-- REVOGAR todas as permissões de escrita nas 3 VIEWs públicas.

REVOKE INSERT, UPDATE, DELETE ON v_products_public FROM anon;
REVOKE INSERT, UPDATE, DELETE ON v_products_public FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON v_products_public FROM public;

REVOKE INSERT, UPDATE, DELETE ON v_suppliers_public FROM anon;
REVOKE INSERT, UPDATE, DELETE ON v_suppliers_public FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON v_suppliers_public FROM public;

REVOKE INSERT, UPDATE, DELETE ON v_print_area_techniques_public FROM anon;
REVOKE INSERT, UPDATE, DELETE ON v_print_area_techniques_public FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON v_print_area_techniques_public FROM public;
