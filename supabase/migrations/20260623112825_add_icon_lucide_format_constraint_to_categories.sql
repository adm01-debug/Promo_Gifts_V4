
-- ═══════════════════════════════════════════════════════════════════════════
-- MIGRAÇÃO: add_icon_lucide_format_constraint_to_categories
-- Objetivo:  Garantir que categories.icon sempre seja um nome válido de
--            ícone Lucide React (PascalCase, somente letras/dígitos,
--            inicia com maiúscula).
-- Impacto:   APENAS VALIDAÇÃO — não altera nenhum dado existente.
-- Rollback:  ALTER TABLE categories DROP CONSTRAINT chk_icon_lucide_format;
-- Autor:     Sistema — Melhoria 1 de 3
-- ═══════════════════════════════════════════════════════════════════════════

-- ── GUARDA: abortar se algum valor existente quebraria a constraint ──────
DO $$
DECLARE
  v_bad_count  INTEGER;
  v_bad_sample TEXT;
BEGIN
  SELECT COUNT(*), STRING_AGG(DISTINCT icon, ', ' ORDER BY icon)
    INTO v_bad_count, v_bad_sample
  FROM public.categories
  WHERE icon IS NOT NULL
    AND NOT (icon ~ '^[A-Z][a-zA-Z0-9]+$');

  IF v_bad_count > 0 THEN
    RAISE EXCEPTION
      'ABORTADO: % valores existentes não passam no regex. Exemplos: [%]. '
      'Corrigir dados antes de aplicar a constraint.',
      v_bad_count, v_bad_sample;
  END IF;

  RAISE NOTICE 'PRÉ-VALIDAÇÃO OK: todos os valores existentes passam no regex.';
END;
$$;

-- ── APLICAR CONSTRAINT ───────────────────────────────────────────────────
ALTER TABLE public.categories
  ADD CONSTRAINT chk_icon_lucide_format
  CHECK (
    icon IS NULL
    OR (icon ~ '^[A-Z][a-zA-Z0-9]+$')
  )
  NOT VALID;          -- Verifica novos registros imediatamente;
                      -- valida rows existentes em background sem lock longo.

-- Validar rows existentes (confirma que TODOS passam — finaliza a constraint)
ALTER TABLE public.categories
  VALIDATE CONSTRAINT chk_icon_lucide_format;

-- ── COMENTÁRIO INLINE para futuros devs ─────────────────────────────────
COMMENT ON COLUMN public.categories.icon IS
  'Nome PascalCase de ícone Lucide React (ex: Coffee, Wine, PawPrint, Gamepad2). '
  'Regra: deve começar com letra maiúscula [A-Z], seguido de letras e/ou dígitos. '
  'Constraint chk_icon_lucide_format garante formato válido. '
  'Usado pelo frontend React para renderizar dinamicamente o ícone de cada categoria. '
  'Fonte de verdade: este campo. Tabela category_icons é legada/redundante.';
;
