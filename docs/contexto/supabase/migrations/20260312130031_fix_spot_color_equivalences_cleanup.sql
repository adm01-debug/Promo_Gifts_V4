-- FASE 1: Limpeza de equivalências SPOT duplicadas/erradas
-- 4 ações cirúrgicas identificadas na análise exaustiva

-- 1. DESATIVAR: 116 "Branco pastel" → "Branco" genérica (duplicata, verified=false)
--    Manter: 116 → "Branco Off White" (verified=true)
UPDATE color_equivalences 
SET is_active = false, notes = COALESCE(notes, '') || ' | DESATIVADA 12/03/2026: duplicata genérica, correta é Branco Off White'
WHERE id = 'cb832401-7e78-4114-991b-2187686cf4d7';

-- 2. DESATIVAR: 133 "Cinza escuro" → "Cinza" genérica (duplicata, verified=false)
--    Manter: 133 → "Cinza Chumbo" (verified=true)
UPDATE color_equivalences 
SET is_active = false, notes = COALESCE(notes, '') || ' | DESATIVADA 12/03/2026: duplicata genérica, correta é Cinza Chumbo'
WHERE id = 'a458a6ae-06d7-4f61-8ae5-841f42e06480';

-- 3. DESATIVAR: 154 "Azul aqua" → "Azul" genérica (duplicata, verified=false)
--    Manter: 154 → "Azul Piscina" (verified=true)
UPDATE color_equivalences 
SET is_active = false, notes = COALESCE(notes, '') || ' | DESATIVADA 12/03/2026: duplicata genérica, correta é Azul Piscina'
WHERE id = 'a60e5add-ef69-452c-a540-14b72660884d';

-- 4a. REATIVAR: 113 "Cinza" → "Cinza Claro" (original correta, foi desativada por engano)
UPDATE color_equivalences 
SET is_active = true, notes = COALESCE(notes, '') || ' | REATIVADA 12/03/2026: original correta conforme GUIA v1.0'
WHERE id = 'bde8147d-04eb-44a4-8aa7-be4430b31c73';

-- 4b. DESATIVAR: 113 "Cinza" → "Cinza" genérica (substituiu a correta por engano)
UPDATE color_equivalences 
SET is_active = false, notes = COALESCE(notes, '') || ' | DESATIVADA 12/03/2026: substituiu original por engano, correta é Cinza Claro'
WHERE id = '530e98b2-36cd-4840-a9d2-64bd53dbf128';
