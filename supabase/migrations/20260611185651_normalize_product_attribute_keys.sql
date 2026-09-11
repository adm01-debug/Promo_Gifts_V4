
-- T65 FIX: Normalizar attribute_keys com caracteres especiais portugueses
-- Substituições: é→e, é→e, ã→a, ç→c, á→a, í→i, ó→o, ú→u, â→a, ê→e, ô→o, à→a
-- Também remover parênteses e barras

UPDATE product_attributes
SET attribute_key = lower(
  regexp_replace(
    regexp_replace(
      regexp_replace(
        regexp_replace(
          regexp_replace(
            regexp_replace(
              regexp_replace(
                regexp_replace(
                  regexp_replace(
                    regexp_replace(
                      regexp_replace(
                        regexp_replace(
                          regexp_replace(
                            regexp_replace(
                              regexp_replace(
                                regexp_replace(attribute_key,
                                  '[éè]', 'e', 'g'),
                                '[ãâ]', 'a', 'g'),
                              'ç', 'c', 'g'),
                            '[íì]', 'i', 'g'),
                          '[óòô]', 'o', 'g'),
                        '[úù]', 'u', 'g'),
                      'á', 'a', 'g'),
                    'ê', 'e', 'g'),
                  'à', 'a', 'g'),
                'ú', 'u', 'g'),
              '\(', '', 'g'),
            '\)', '', 'g'),
          '/', '_', 'g'),
        '\.', '', 'g'),
      '\s+', '_', 'g'),
    '[^a-z0-9_\-]', '', 'g')
),
updated_at = now()
WHERE attribute_key ~ '[^a-z0-9_\-]';
;
