/**
 * Duas guardas resgatadas de
 * `salvo/codex-fix-gate1-kit-pdf-types-261109-2252:src/hooks/useMagicUpState.ts`,
 * que a main nunca recebeu:
 *
 *  - `isAreaShape` (:61-63, usada em :347) — a main fazia cast cego em
 *    `useMagicUpState.ts:290`: `(loc.options[0]?.shape || 'rectangle') as AreaShape`.
 *    O valor vem do banco, que não tem CHECK prendendo-o aos cinco formatos,
 *    então um shape desconhecido entrava no tipo sem ser barrado.
 *    `git grep isAreaShape origin/main` dava zero.
 *
 *  - prazo de 30 s com `AbortController` (:278-279, :290, :298, :333) — a main
 *    só tinha a flag `cancelled`, que descarta a resposta mas **não aborta a
 *    requisição**: consulta que nunca responde prendia o spinner para sempre.
 */
import { describe, expect, it, vi } from 'vitest';
import { isAreaShape, type AreaShape } from '@/types/gravacao';
import {
  montarAreasDeGravacao,
  prazoDeConsulta,
} from '@/hooks/intelligence/useMagicUpState.helpers';

describe('isAreaShape — o shape vem do banco, sem CHECK', () => {
  it.each<AreaShape>(['circle', 'custom', 'oval', 'rectangle', 'triangle'])(
    'aceita %s',
    (shape) => {
      expect(isAreaShape(shape)).toBe(true);
    },
  );

  it.each([
    ['string desconhecida', 'hexagon'],
    ['string vazia', ''],
    ['nulo', null],
    ['indefinido', undefined],
    ['número', 3],
    ['objeto', { shape: 'circle' }],
    ['array', ['circle']],
    ['caixa diferente', 'Circle'],
  ])('recusa %s', (_rotulo, valor) => {
    expect(isAreaShape(valor)).toBe(false);
  });
});

function localizacao(shape: unknown) {
  return {
    location_code: 'FRENTE',
    location_name: 'Frente',
    location_order: 1,
    options: [
      {
        technique_id: 't1',
        tecnica_nome: 'Serigrafia',
        codigo_tabela: 'SERI',
        efetiva_largura_max: 10,
        efetiva_altura_max: 5,
        is_curved: false,
        shape,
      },
    ],
  } as unknown as Parameters<typeof montarAreasDeGravacao>[0] extends
    | readonly (infer T)[]
    | undefined
    ? T
    : never;
}

describe('montarAreasDeGravacao', () => {
  it('shape desconhecido do banco cai no default em vez de entrar no tipo', () => {
    const [area] = montarAreasDeGravacao([localizacao('hexagon')]);
    // Antes: 'hexagon' entrava como AreaShape e chegava ao renderizador.
    expect(area.shape).toBe('rectangle');
  });

  it('shape válido é preservado', () => {
    const [area] = montarAreasDeGravacao([localizacao('oval')]);
    expect(area.shape).toBe('oval');
  });

  it('shape ausente cai no default', () => {
    const [area] = montarAreasDeGravacao([localizacao(undefined)]);
    expect(area.shape).toBe('rectangle');
  });

  it('sem localizações, devolve lista vazia', () => {
    expect(montarAreasDeGravacao(undefined)).toEqual([]);
    expect(montarAreasDeGravacao([])).toEqual([]);
  });

  it('a primeira área é a primária e as medidas vêm do máximo das opções', () => {
    const [area] = montarAreasDeGravacao([localizacao('circle')]);
    expect(area.is_primary).toBe(true);
    expect(area.max_width).toBe(10);
    expect(area.max_height).toBe(5);
    expect(area.unit).toBe('cm');
    expect(area.techniques).toEqual([{ id: 't1', nome: 'Serigrafia', codigo: 'SERI' }]);
  });
});

describe('prazoDeConsulta — aborta de verdade, não só descarta', () => {
  it('aborta sozinho quando o prazo vence', () => {
    vi.useFakeTimers();
    try {
      const prazo = prazoDeConsulta(30_000);
      expect(prazo.signal.aborted).toBe(false);
      vi.advanceTimersByTime(29_999);
      expect(prazo.signal.aborted).toBe(false);
      vi.advanceTimersByTime(1);
      // É isto que a flag `cancelled` da main não fazia: a requisição em si cai.
      expect(prazo.signal.aborted).toBe(true);
    } finally {
      vi.useRealTimers();
    }
  });

  it('encerrar aborta na hora e cancela o prazo pendente', () => {
    vi.useFakeTimers();
    try {
      const prazo = prazoDeConsulta(30_000);
      prazo.encerrar();
      expect(prazo.signal.aborted).toBe(true);
      // Sem o clearTimeout, o timer sobreviveria ao desmonte do componente.
      expect(vi.getTimerCount()).toBe(0);
    } finally {
      vi.useRealTimers();
    }
  });

  it('cada consulta tem seu próprio signal', () => {
    const a = prazoDeConsulta();
    const b = prazoDeConsulta();
    a.encerrar();
    expect(a.signal.aborted).toBe(true);
    expect(b.signal.aborted).toBe(false);
    b.encerrar();
  });
});
