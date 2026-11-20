/**
 * fuzz.test.ts — 200 combinações com semente fixa.
 *
 * Não verifica números: verifica o que nunca pode deixar de ser verdade, em
 * qualquer entrada. A heurística de empacotamento pode melhorar sem quebrar
 * estes testes; o que ela não pode é perder peça, estourar peso ou prometer
 * uma ocupação acima de 100%.
 *
 * Semente fixa porque um fuzz que muda a cada execução não é reproduzível:
 * quando cair, tem de cair igual na próxima vez.
 */
import { describe, expect, it } from 'vitest';

import type { ProductMeasureRow } from '../columns';
import { planFreight, type PlanOptions } from '../planFreight';
import type { MixMode } from '../types';
import { CAIXAS_PADRAO, SETTINGS_PADRAO } from './fixtures/boxes';

/** mulberry32: gerador determinístico e barato, suficiente para fuzz. */
function criarRandom(seed: number): () => number {
  let estado = seed >>> 0;
  return () => {
    estado = (estado + 0x6d2b79f5) >>> 0;
    let t = estado;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const COMBINACOES = 200;
const OPCOES_BASE: Omit<PlanOptions, 'mixMode'> = {
  computedAt: '2026-11-19T12:00:00.000Z',
  itemsHash: 'fuzz',
};

interface Caso {
  inputs: Array<{ row: ProductMeasureRow; quantity: number; shipsSeparately?: boolean }>;
  mixMode: MixMode;
}

function gerarCasos(): Caso[] {
  const random = criarRandom(20261119);
  const inteiro = (min: number, max: number) => min + Math.floor(random() * (max - min + 1));
  const casos: Caso[] = [];

  for (let i = 0; i < COMBINACOES; i += 1) {
    const quantosProdutos = inteiro(1, 4);
    const inputs: Caso['inputs'] = [];

    for (let p = 0; p < quantosProdutos; p += 1) {
      // lados de 1 a 30 cm entram sempre nas caixas padrão. A cada 10 casos a
      // primeira peça ganha 70 cm de comprimento (o maior lado interno é o da
      // GG, 59,4 cm) para a amostra passar também pelo caminho "não cabe". O
      // sorteio é feito de qualquer jeito, para não deslocar a sequência.
      const lado = () => inteiro(1, 30);
      const comprimentoSorteado = lado();
      inputs.push({
        row: {
          id: `fuzz-${i}-${p}`,
          name: `Peça ${i}-${p}`,
          sku: `SKU-${i}-${p}`,
          height_cm: lado(),
          width_cm: lado(),
          length_cm: i % 10 === 9 && p === 0 ? 70 : comprimentoSorteado,
          diameter_cm: null,
          weight_g: inteiro(1, 3000),
        },
        quantity: inteiro(1, 500),
        shipsSeparately: random() < 0.15,
      });
    }

    casos.push({ inputs, mixMode: random() < 0.5 ? 'misturar' : 'separar' });
  }

  return casos;
}

describe('fuzz — invariantes do plano', () => {
  const casos = gerarCasos();

  it(`gera ${COMBINACOES} casos determinísticos`, () => {
    expect(casos).toHaveLength(COMBINACOES);
    // a semente é fixa: o primeiro caso é sempre o mesmo
    expect(casos[0].inputs[0].row.id).toBe('fuzz-0-0');
  });

  it('nenhuma invariante quebra em 200 combinações', () => {
    let planosOk = 0;
    let planosNaoCabe = 0;

    for (const [indice, caso] of casos.entries()) {
      const plan = planFreight(
        caso.inputs,
        CAIXAS_PADRAO,
        { ...OPCOES_BASE, mixMode: caso.mixMode },
        SETTINGS_PADRAO,
      );
      const onde = `caso ${indice} (${caso.mixMode})`;

      // status é um dos três e só um
      expect(['ok', 'nao_cabe', 'dados_insuficientes'], onde).toContain(plan.status);

      if (plan.status === 'nao_cabe') {
        planosNaoCabe += 1;
        expect(plan.volumes, onde).toEqual([]);
        expect(plan.warnings.length, onde).toBeGreaterThan(0);
        continue;
      }

      if (plan.status === 'dados_insuficientes') {
        // todas as linhas do fuzz têm medida e peso, então este status só
        // apareceria por quantidade inválida — que o gerador não produz
        expect(plan.missing.length + plan.warnings.length, onde).toBeGreaterThan(0);
        continue;
      }

      planosOk += 1;

      // 1. nenhuma peça desaparece nem se multiplica
      const esperado = new Map<string, number>();
      for (const input of caso.inputs) {
        esperado.set(input.row.id, (esperado.get(input.row.id) ?? 0) + input.quantity);
      }
      const empacotado = new Map<string, number>();
      for (const volume of plan.volumes) {
        for (const item of volume.items) {
          empacotado.set(item.productId, (empacotado.get(item.productId) ?? 0) + item.quantity);
        }
      }
      expect(empacotado, `${onde}: quantidades`).toEqual(esperado);

      // 2. nenhum volume passa do peso máximo da própria caixa
      for (const volume of plan.volumes) {
        expect(
          volume.grossWeightG,
          `${onde}: peso na caixa ${volume.box.code}`,
        ).toBeLessThanOrEqual(volume.box.maxWeightG);
      }

      // 3. a ocupação nunca promete mais de 100% do espaço aproveitável — a
      //    não ser a peça que vai sozinha, que pode ocupar até a caixa inteira
      //    (1 ÷ 0,9 do aproveitável)
      for (const volume of plan.volumes) {
        const unidades = volume.items.reduce((soma, item) => soma + item.quantity, 0);
        expect(
          volume.fillRatio,
          `${onde}: ocupação na caixa ${volume.box.code}`,
        ).toBeLessThanOrEqual(unidades === 1 ? 1 / 0.9 + 0.0001 : 1.0001);
        expect(volume.fillRatio, `${onde}: ocupação negativa`).toBeGreaterThanOrEqual(0);
      }

      // 4. os totais são a soma dos volumes
      const caixas = plan.volumes.length;
      const somaDeCaixas = Object.values(plan.totals.boxesByCode).reduce((a, b) => a + b, 0);
      expect(somaDeCaixas, `${onde}: boxesByCode`).toBe(caixas);
      expect(plan.totals.grossWeightG, `${onde}: peso total`).toBeGreaterThan(0);
      // plano calculado nunca sai com peso cubado zero
      expect(plan.totals.cubicWeightG.correios, `${onde}: cubado Correios`).toBeGreaterThan(0);
      expect(plan.totals.cubicWeightG.rodoviario, `${onde}: cubado rodoviário`).toBeGreaterThan(0);

      // 5. "não mistura" nunca divide caixa com outro produto
      const separados = new Set(caso.inputs.filter((i) => i.shipsSeparately).map((i) => i.row.id));
      for (const volume of plan.volumes) {
        const ids = volume.items.map((i) => i.productId);
        if (ids.some((id) => separados.has(id))) {
          expect(
            new Set(ids).size,
            `${onde}: caixa ${volume.box.code} mistura um "não mistura"`,
          ).toBe(1);
        }
      }
    }

    // a amostra tem de exercitar os dois caminhos, senão não está testando nada
    expect(planosOk, 'planos ok').toBeGreaterThan(0);
    expect(planosNaoCabe, 'planos que não cabem').toBe(20);
    expect(planosOk + planosNaoCabe, 'cobertura da amostra').toBe(COMBINACOES);
  });

  /**
   * O tempo fica em caso próprio, e não junto das invariantes, por um motivo
   * prático: num runner lento o teste combinado reprovaria por relógio e
   * esconderia o que realmente importa saber — se alguma invariante quebrou.
   *
   * O teto é deliberadamente folgado. Medido nesta máquina: ~230 ms para as
   * 200 combinações, bem dentro do alvo de 2 s da etapa 19. Os runners da CI
   * têm 2 vCPU e rodam 2 workers em paralelo (ver o comentário de `maxWorkers`
   * em `vitest.config.ts`), então o que este caso precisa pegar é uma
   * regressão de ordem de grandeza — um empacotador que virou quadrático —,
   * não contenção de CPU.
   */
  it('200 combinações rodam em tempo de ordem de grandeza aceitável', () => {
    const inicio = performance.now();
    for (const caso of casos) {
      planFreight(
        caso.inputs,
        CAIXAS_PADRAO,
        { ...OPCOES_BASE, mixMode: caso.mixMode },
        SETTINGS_PADRAO,
      );
    }
    const duracaoMs = performance.now() - inicio;

    expect(duracaoMs, `fuzz levou ${Math.round(duracaoMs)} ms`).toBeLessThan(8000);
  });
});
