
-- ═══════════════════════════════════════════════════════════════════════════
-- MIGRAÇÃO: tighten_icon_constraint_require_lowercase_second_char
-- Objetivo:  Fechar os 2 gaps identificados na auditoria exaustiva:
--            Gap B23: "COFFEE" (all-caps) passava no regex antigo
--            Gap B44: "NULL" (string all-caps) passava no regex antigo
--
-- Solução:   Apertar o regex de:
--              ANTIGO: ^[A-Z][a-zA-Z0-9]+$   (2º char pode ser qualquer coisa)
--              NOVO:   ^[A-Z][a-z][a-zA-Z0-9]*$  (2º char DEVE ser minúsculo)
--
-- Fundamento: TODOS os ícones Lucide React reais têm o 2º char em minúsculo.
--             Coffee (Co), Wine (Wi), GlassWater (Gl), PawPrint (Pa), Cpu (Cp)...
--             Nenhum ícone Lucide começa com dois caracteres maiúsculos.
--
-- Verificação prévia: 66 ícones existentes — ZERO seriam bloqueados.
--
-- Rollback:
--   ALTER TABLE categories DROP CONSTRAINT chk_icon_lucide_format;
--   ALTER TABLE categories ADD CONSTRAINT chk_icon_lucide_format
--     CHECK (icon IS NULL OR icon ~ '^[A-Z][a-zA-Z0-9]+$') NOT VALID;
--   ALTER TABLE categories VALIDATE CONSTRAINT chk_icon_lucide_format;
-- ═══════════════════════════════════════════════════════════════════════════

-- GUARDA: confirmar que nenhum valor existente quebraria antes de prosseguir
DO $$
DECLARE
  v_bloqueados INT;
  v_exemplos   TEXT;
BEGIN
  SELECT
    COUNT(*),
    STRING_AGG(DISTINCT icon, ', ' ORDER BY icon)
  INTO v_bloqueados, v_exemplos
  FROM public.categories
  WHERE icon IS NOT NULL
    AND NOT (icon ~ '^[A-Z][a-z][a-zA-Z0-9]*$');

  IF v_bloqueados > 0 THEN
    RAISE EXCEPTION
      'ABORTADO: % valores existentes falhariam no novo regex. Exemplos: [%]',
      v_bloqueados, v_exemplos;
  END IF;

  RAISE NOTICE 'PRE-CHECK OK: 0 valores existentes seriam bloqueados.';
END;
$$;

-- PASSO 1: Remover constraint antiga
ALTER TABLE public.categories
  DROP CONSTRAINT IF EXISTS chk_icon_lucide_format;

-- PASSO 2: Adicionar constraint mais restritiva
ALTER TABLE public.categories
  ADD CONSTRAINT chk_icon_lucide_format
  CHECK (
    icon IS NULL
    OR (icon ~ '^[A-Z][a-z][a-zA-Z0-9]*$')
  )
  NOT VALID;

-- PASSO 3: Validar contra todos os rows existentes
ALTER TABLE public.categories
  VALIDATE CONSTRAINT chk_icon_lucide_format;

-- PASSO 4: Atualizar comentário da coluna
COMMENT ON COLUMN public.categories.icon IS
  'Nome PascalCase de ícone Lucide React (ex: Coffee, Wine, PawPrint, Gamepad2). '
  'Regra: 1º char maiúsculo [A-Z], 2º char MINÚSCULO obrigatório [a-z], resto alphanumerico [a-zA-Z0-9]*. '
  'Constraint chk_icon_lucide_format: ^[A-Z][a-z][a-zA-Z0-9]*$ '
  'Garante que "COFFEE" (all-caps), "NULL" (string), siglas "TV"/"USB" sejam rejeitados. '
  'Todos os ícones reais do Lucide React seguem este padrão. '
  'Fonte de verdade: este campo. archive.category_icons é legada/arquivada.';
;
