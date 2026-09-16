// Garante consistência `types.ts` (Constants.public.Enums) ↔ union manual duplicada em src/;
// NÃO cobre `types.ts` ↔ banco ao vivo (isso já é coberto pelo pipeline de regeneração de types).
//
// Contexto (PLANO_DBA E44): o banco tem 15 enums em `public`. Se um valor novo for
// adicionado a um enum sem atualizar uma union TS manual que o duplica, um
// `switch`/`if` no frontend pode deixar de tratar o caso novo silenciosamente
// (sem erro de compilação, se não houver `default: assertNever(x)` exaustivo).
//
// Levantamento em 2026-09-16 (consulta pg_catalog + grep em src/) encontrou
// exatamente 2 dessas 15 enums com union manual duplicada fora do types.ts
// gerado: `AppRole` (src/lib/roles.ts) para `app_role`, e `StepUpAction`
// (src/hooks/auth/useStepUpAuth.ts) para `step_up_action`. As outras 13 não têm
// union manual equivalente em src/ — apenas referenciam
// `Database['public']['Enums'][...]` diretamente (sem duplicação) ou não são
// usadas como union TS no frontend.
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { Constants } from '@/integrations/supabase/types';

const dbEnums = Constants.public.Enums;

/** Contagem de valores ao vivo por enum (consulta pg_catalog em 2026-09-16). */
const EXPECTED_ENUM_VALUE_COUNTS = {
  app_role: 7,
  categoria_cor_enum: 8,
  conversation_event_type: 6,
  familia_cor_enum: 15,
  magazine_reaction_kind: 4,
  magazine_status: 3,
  org_role: 3,
  payment_status: 5,
  produtos_padronizacao_status: 4,
  role_migration_item_status: 4,
  role_migration_status: 5,
  silver_norm_status: 6,
  step_up_action: 8,
  supplier_raw_status: 6,
  tipo_cor_enum: 6,
};

/**
 * Extrai os literais string de uma declaração `type <Nome> = 'a' | 'b' | ...;`
 * a partir do texto-fonte de um arquivo TS.
 *
 * Union types não existem em runtime após a compilação — não há um jeito de
 * "importar" `AppRole`/`StepUpAction` e inspecionar seus membros como se faz
 * com `Constants`. Ler o literal da declaração no arquivo-fonte é a única forma
 * de comparar a union manual contra `Constants.public.Enums` em um teste que
 * roda de verdade (o typecheck do Vitest está desabilitado neste projeto —
 * ver `typecheck.enabled: false` em vitest.config.ts — então um teste
 * type-level nunca seria executado).
 */
function extractUnionLiterals(sourceText, typeName) {
  const declMatch = sourceText.match(
    new RegExp(`(?:export\\s+)?type\\s+${typeName}\\s*=([\\s\\S]*?);`),
  );
  if (!declMatch) {
    throw new Error(`Não encontrei "type ${typeName} = ...;" no arquivo fonte.`);
  }
  const literals = [...declMatch[1].matchAll(/'([^']+)'/g)].map((m) => m[1]);
  if (literals.length === 0) {
    throw new Error(`Nenhum literal string encontrado para "type ${typeName}".`);
  }
  return literals;
}

function expectSameSet(actual, expected, label) {
  expect(new Set(actual), label).toEqual(new Set(expected));
  expect(actual.length, `${label}: sem duplicatas`).toBe(new Set(actual).size);
}

describe('contrato de enums: Constants.public.Enums (types.ts) tem as 15 chaves esperadas', () => {
  it('expõe exatamente as 15 chaves de enum com a contagem certa de valores cada', () => {
    expect(Object.keys(dbEnums).sort()).toEqual(Object.keys(EXPECTED_ENUM_VALUE_COUNTS).sort());
    expect(Object.keys(dbEnums)).toHaveLength(15);

    for (const [name, count] of Object.entries(EXPECTED_ENUM_VALUE_COUNTS)) {
      expect(dbEnums[name], `enum "${name}" ausente em Constants.public.Enums`).toBeDefined();
      expect(dbEnums[name].length, `contagem de valores diverge para "${name}"`).toBe(count);
    }
  });
});

describe('contrato de enums: union manual duplicada em src/ vs Constants.public.Enums', () => {
  it('AppRole (src/lib/roles.ts) mantém o mesmo conjunto de valores que o enum app_role', () => {
    const source = readFileSync(path.resolve('src/lib/roles.ts'), 'utf8');
    const manualValues = extractUnionLiterals(source, 'AppRole');

    expectSameSet(manualValues, dbEnums.app_role, 'AppRole vs Constants.public.Enums.app_role');
  });

  it('StepUpAction (src/hooks/auth/useStepUpAuth.ts) mantém o mesmo conjunto de valores que o enum step_up_action', () => {
    const source = readFileSync(path.resolve('src/hooks/auth/useStepUpAuth.ts'), 'utf8');
    const manualValues = extractUnionLiterals(source, 'StepUpAction');

    expectSameSet(
      manualValues,
      dbEnums.step_up_action,
      'StepUpAction vs Constants.public.Enums.step_up_action',
    );
  });
});
