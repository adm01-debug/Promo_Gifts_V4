
WITH aliases (computed, target_slug) AS (
  VALUES
    ('caramelo',        'marrom-caramelo'),
    ('creme',           'bege-nude'),
    ('bege',            'bege-nude'),
    ('cafe',            'marrom-cafe'),
    ('cereja',          'vermelho-cereja'),
    ('cromado',         'prata-cromado'),
    ('cromado-satinado','prata-cromado'),
    ('dourado',         'dourado-brilhante'),
    ('dourado-satinado','dourado-acetinado'),
    ('grafite',         'cinza-grafite'),
    ('inox',            'prata-inox'),
    ('kiwi',            'verde-limao'),
    ('lavanda',         'roxo-lilas'),
    ('lilas',           'roxo-lilas'),
    ('milho',           'amarelo-milho'),
    ('multicolorido',   'colorido'),
    ('off-white',       'branco-off-white'),
    ('oliva',           'verde-exercito'),
    ('pessego',         'rosa-salmao'),
    ('reciclado',       'natural'),
    ('amadeirado',      'madeira'),
    ('amarela',         'amarelo'),
    ('bordo',           'vermelho-bordo'),
    ('branca',          'branco'),
    ('preta',           'preto'),
    ('preta-azul',      'preto'),
    ('preta-verde',     'preto'),
    ('preta-vermelha',  'preto'),
    ('vermelha',        'vermelho'),
    ('bege-azul',       'azul'),
    ('bege-verde',      'verde'),
    ('bege-vermelho',   'vermelho'),
    ('camel',           'bege-nude'),
    ('champanhe',       'dourado-champanhe'),
    ('chumbo',          'cinza-chumbo'),
    ('chumbo-',         'cinza-chumbo'),
    ('marron',          'marrom'),
    ('marron-claro',    'marrom-conhaque'),
    ('marron-escuro',   'marrom-chocolate'),
    ('salmao',          'rosa-salmao'),
    ('sortido',         'colorido'),
    ('estampa',         'colorido'),
    ('turquesa',        'azul-tiffany-turquesa'),
    ('pink',            'rosa-pink'),
    ('cha',             'marrom'),
    ('cru',             'natural'),
    ('goiaba',          'rosa-bebe'),
    ('reciclado',       'natural')
),
computed_nulls AS (
  SELECT
    sc.id AS sc_id,
    LOWER(TRIM(REGEXP_REPLACE(
      REGEXP_REPLACE(UNACCENT(REPLACE(
        REGEXP_REPLACE(REGEXP_REPLACE(sc.name,'\s*#[^\s]*','','g'),'\s*\([^)]*\)','','g'),
        '/',' ')),
      '[^a-zA-Z0-9\s]','','g'),'\s+','-','g')
    )) AS cslug
  FROM supplier_colors sc
  WHERE sc.color_variation_id IS NULL
),
matched AS (
  SELECT cn.sc_id, cv.id AS cv_id
  FROM computed_nulls cn
  JOIN aliases a ON cn.cslug = a.computed
  JOIN color_variations cv ON cv.slug = a.target_slug
),
hex_matched AS (
  SELECT sc.id AS sc_id, cv.id AS cv_id
  FROM supplier_colors sc
  JOIN color_variations cv ON (
    CASE
      WHEN sc.hex_code ILIKE '#18%' OR sc.hex_code ILIKE '#00%' OR sc.hex_code ILIKE '#0e%' THEN 'azul'
      WHEN sc.hex_code ILIKE '#fb00%' OR sc.hex_code ILIKE '#ff00%' OR sc.hex_code ILIKE '#f00%' THEN 'vermelho'
      WHEN sc.hex_code ILIKE '#fd%' OR sc.hex_code ILIKE '#fe%' OR sc.hex_code ILIKE '#ff%' THEN 'branco'
      ELSE NULL
    END = cv.slug
  )
  WHERE sc.color_variation_id IS NULL
    AND sc.name ~ '^#[0-9A-Fa-f]{6}$'
)
UPDATE supplier_colors sc
SET color_variation_id = COALESCE(m.cv_id, hm.cv_id),
    updated_at = NOW()
FROM (
  SELECT sc_id, cv_id FROM matched
  UNION ALL
  SELECT sc_id, cv_id FROM hex_matched
) all_matches(sc_id, cv_id)
LEFT JOIN matched m ON m.sc_id = all_matches.sc_id
LEFT JOIN hex_matched hm ON hm.sc_id = all_matches.sc_id
WHERE sc.id = all_matches.sc_id
  AND sc.color_variation_id IS NULL;
;
