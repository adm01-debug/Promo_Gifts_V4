-- Public sitemap boundary for Vercel.
--
-- The underlying sitemap views intentionally remain inaccessible to `anon` and
-- use security_invoker. This bounded function exposes only the eight fields
-- required by sitemap.xml, without reopening the views in PostgREST/GraphQL.

CREATE OR REPLACE FUNCTION public.get_sitemap_public(
  p_limit INTEGER DEFAULT 1000,
  p_offset INTEGER DEFAULT 0
) RETURNS TABLE (
  url_type TEXT,
  url_path TEXT,
  identifier TEXT,
  title TEXT,
  lastmod TIMESTAMPTZ,
  priority NUMERIC,
  changefreq TEXT,
  image_url TEXT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
BEGIN
  IF p_limit IS NULL OR p_limit NOT BETWEEN 1 AND 1000 THEN
    RAISE EXCEPTION 'sitemap_limit_invalid' USING ERRCODE = '22023';
  END IF;

  IF p_offset IS NULL OR p_offset NOT BETWEEN 0 AND 15000 THEN
    RAISE EXCEPTION 'sitemap_offset_invalid' USING ERRCODE = '22023';
  END IF;

  RETURN QUERY
  SELECT
    sitemap.url_type,
    sitemap.url_path,
    sitemap.identifier,
    sitemap.title,
    sitemap.lastmod,
    sitemap.priority,
    sitemap.changefreq,
    sitemap.image_url
  FROM public.vw_sitemap_all AS sitemap
  ORDER BY sitemap.priority DESC, sitemap.lastmod DESC, sitemap.url_path ASC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

REVOKE ALL ON FUNCTION public.get_sitemap_public(INTEGER, INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_sitemap_public(INTEGER, INTEGER) TO anon, authenticated, service_role;

COMMENT ON FUNCTION public.get_sitemap_public(INTEGER, INTEGER) IS
  'Bounded, field-minimized public sitemap API. Underlying views remain private.';
