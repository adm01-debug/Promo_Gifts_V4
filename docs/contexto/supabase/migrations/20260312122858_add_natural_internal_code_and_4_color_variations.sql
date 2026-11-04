-- Corrigir internal_code do grupo Natural (próximo disponível = 18)
UPDATE color_groups 
SET internal_code = '18' 
WHERE id = 'f8f2599c-3950-464c-b91d-28ebd4548279' AND name = 'Natural';

-- Criar 4 color_variations faltantes
-- Padrão: internal_code = {grupo}.{seq}, slug = lowercase-hyphenated, sort_order = 100
INSERT INTO color_variations (organization_id, group_id, name, slug, hex_code, internal_code, sort_order)
VALUES
  -- Natural 18.1 — Madeira
  ('5db5aee1-064b-4ef4-9193-345dcd8274ea', 'f8f2599c-3950-464c-b91d-28ebd4548279',
   'Madeira', 'madeira', '#8B5E3C', '18.1', 100),

  -- Natural 18.2 — Kraft  
  ('5db5aee1-064b-4ef4-9193-345dcd8274ea', 'f8f2599c-3950-464c-b91d-28ebd4548279',
   'Kraft', 'kraft', '#C4A36D', '18.2', 100),

  -- Natural 18.3 — Bambu
  ('5db5aee1-064b-4ef4-9193-345dcd8274ea', 'f8f2599c-3950-464c-b91d-28ebd4548279',
   'Bambu', 'bambu', '#D4B87A', '18.3', 100),

  -- Cobre 17.2 — Bronze
  ('5db5aee1-064b-4ef4-9193-345dcd8274ea', '12e929ba-87ab-4e02-8598-059558fb1dc8',
   'Bronze', 'bronze', '#CD7F32', '17.2', 100);
