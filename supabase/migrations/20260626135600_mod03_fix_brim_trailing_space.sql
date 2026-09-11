-- Qualidade de dados: remove espaco no final do nome do tipo "Brim " (0 produtos, slug ja correto).
UPDATE material_types
   SET name = btrim(name), updated_at = now()
 WHERE id = '6405e224-61a9-490a-ae2f-9b11c08bd3d9'
   AND name <> btrim(name);;
