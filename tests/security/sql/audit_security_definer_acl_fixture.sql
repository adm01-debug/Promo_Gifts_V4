\set ON_ERROR_STOP on

CREATE ROLE anon NOLOGIN;

CREATE FUNCTION public.fn_product_active_for_rls(p_id uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER AS $$ SELECT p_id IS NOT NULL $$;
CREATE FUNCTION public.fn_product_active_for_rls(p_id text) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER AS $$ SELECT p_id IS NOT NULL $$;
CREATE FUNCTION public.get_quote_token_public(_token text) RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER AS $$ SELECT _token $$;
CREATE FUNCTION public.get_quote_token_public(_token uuid) RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER AS $$ SELECT _token $$;
CREATE FUNCTION public.get_sitemap_public(p_limit integer, p_offset integer) RETURNS integer
LANGUAGE sql STABLE SECURITY DEFINER AS $$ SELECT p_limit + p_offset $$;
CREATE FUNCTION public.get_sitemap_public(p_limit bigint, p_offset bigint) RETURNS bigint
LANGUAGE sql STABLE SECURITY DEFINER AS $$ SELECT p_limit + p_offset $$;
CREATE FUNCTION public.leaky_admin_helper() RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER AS $$ SELECT true $$;

REVOKE ALL ON FUNCTION public.fn_product_active_for_rls(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.fn_product_active_for_rls(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_quote_token_public(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_quote_token_public(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_sitemap_public(integer, integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_sitemap_public(bigint, bigint) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.leaky_admin_helper() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_product_active_for_rls(uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.fn_product_active_for_rls(text) TO anon;
GRANT EXECUTE ON FUNCTION public.get_quote_token_public(text) TO anon;
GRANT EXECUTE ON FUNCTION public.get_quote_token_public(uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.get_sitemap_public(integer, integer) TO anon;
GRANT EXECUTE ON FUNCTION public.get_sitemap_public(bigint, bigint) TO anon;
GRANT EXECUTE ON FUNCTION public.leaky_admin_helper() TO anon;
