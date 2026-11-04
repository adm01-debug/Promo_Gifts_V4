CREATE OR REPLACE FUNCTION public.fn_normalize_packing_type(p_raw text)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE PARALLEL SAFE
 SET search_path TO 'public', 'extensions'
AS $function$
SELECT CASE WHEN p_raw IS NULL OR trim(p_raw)='' THEN NULL ELSE (
  SELECT CASE
    WHEN p_raw ~* '^\s*(sem\s+(poly)?bag|sem\s+embal|sem\s+embagem|a\s+granel|sem\s+packing)' THEN 'Sem embalagem'
    WHEN p_raw ~* 'caixa.*(berco|berço|aveludad)|(berco|berço|aveludad).*caixa' THEN 'Caixa com berço aveludado'
    WHEN p_raw ~* 'kraft.*(pret|negr)|(pret|negr).*kraft' THEN 'Caixa Kraft Preta'
    WHEN p_raw ~* 'caixa.*(oferta|presente|gift)|oferta|presente' THEN 'Caixa de presente/oferta'
    WHEN p_raw ~* '(caixa|manga|luva|estojo).*kraft|(kraft|craft)' THEN 'Caixa Kraft'
    WHEN p_raw ~* 'caixa\s+pret[ao](\s*$|\s+com)' THEN 'Caixa Preta'
    WHEN p_raw ~* 'caixa\s+branc|branc[ao]\s+caixa|caixa\s{1,3}branc|caixa\s+individual\s+branc|caixa\s+em\s+pp' THEN 'Caixa Branca'
    WHEN p_raw ~* 'caixa.*madeira|madeira.*caixa|caixa.*bambu' THEN 'Caixa de madeira/bambu'
    WHEN p_raw ~* 'caixa.*(papel[aã]o|cart[aã]o)|cart[aã]o|papel[aã]o' THEN 'Caixa de papelão'
    WHEN p_raw ~* 'caixa.*(prateada|prata)' THEN 'Caixa prateada'
    WHEN p_raw ~* 'caixa' THEN 'Caixa (outros)'
    -- cortiça: usar literal direto (ç não resolve em regex pg)
    WHEN lower(p_raw) LIKE '%cortiça%' OR lower(p_raw) LIKE '%cortica%' OR p_raw ~* 'manga.*(bambu|papel|cart|kraft)' THEN 'Manga/estojo de papel'
    WHEN p_raw ~* 'estojo.*(papel|bambu|print)' THEN 'Manga/estojo de papel'
    WHEN p_raw ~* 'estojo|case\b|pouch' THEN 'Estojo'
    WHEN p_raw ~* 'bolsa|maleta|sacola|saco\s+(de\s+)?algod|(bolsa|saco|bag)\s+(de\s+)?(veludo|velvet|couro|pano|juta)|\d{3}[DT]\b' THEN 'Bolsa/maleta'
    WHEN p_raw ~* 'tnt|non[- ]?woven|saco\s+de\s+tnt|saco\s+tnt|capa\s+de\s+tnt' THEN 'Saco TNT/non-woven'
    WHEN p_raw ~* 'polybag|poly[- ]?bag|^sem\s+polybag' THEN 'Polybag'
    WHEN p_raw ~* 'pl[aá]stic[ao]?\s*bolha|bolha\s*pl[aá]stic|bolha\s*$' THEN 'Saco plástico bolha'
    WHEN p_raw ~* 'zip\s*lock|ziplock|zip\b|fecho\s*adesivo|c/\s*zip|com\s+zip' THEN 'Saco plástico zip'
    WHEN p_raw ~* 'papel\s+seda|manteiga|seda\b' THEN 'Papel seda/manteiga'
    WHEN p_raw ~* '\blata\b|tin\b|metal|met.lica|alum.n' THEN 'Lata/metal'
    WHEN p_raw ~* 'manga\s+(br|pr|plas|pl[aá])' THEN 'Saco plástico'
    WHEN lower(p_raw) IN ('plástic','plastico','plástico','plástica') OR p_raw ~* '^pl.stic$' THEN 'Saco plástico'
    WHEN p_raw ~* 'pl[aá]stic[ao]|sac[oa]\s+pl[aá]stic|saquinho|pel[ií]cula|shrink|v[aá]cuo|vedado|retr[aá]til|^pu$|courino' THEN 'Saco plástico'
    ELSE 'Outros'
  END
) END $function$
