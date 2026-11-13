CREATE OR REPLACE FUNCTION public.get_sitemap_public(p_limit integer DEFAULT 1000, p_offset integer DEFAULT 0)
 RETURNS TABLE(url_type text, url_path text, identifier text, title text, lastmod timestamp with time zone, priority numeric, changefreq text, image_url text)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_catalog', 'pg_temp'
AS $function$
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
$function$
