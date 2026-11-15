/**
 * Troca de identidade do projeto: os três fluxos que abrem OUTRO projeto passam
 * pelo MESMO descarte (`resetProjectIdentity`).
 *
 * O resultado preservado no card e o rastreio de "salvo"/"ficha" pertencem a UM
 * projeto. Trocar de produto, trocar de cliente ou carregar outro registro do
 * histórico é outro projeto — sem o descarte, a imagem da caneca reaparecia
 * rotulada "Mochila" quando a geração da mochila falhava.
 *
 * Contrato de código (não de render): a ligação dos três fluxos é feita em JSX
 * e dentro de um hook de data-layer, e é exatamente a ligação que faltou. Por
 * isso cada caso lê o corpo do handler no fonte e exige a chamada ao descarte
 * central. O inverso (nova tentativa do MESMO projeto NÃO descarta) é verificado
 * aqui no fonte e no comportamento em MockupResultCard.preserved.test.tsx.
 *
 * Execução: npx vitest run src/hooks/mockup/__tests__/trocaDeProjeto.test.ts
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const PAGINA = resolve(process.cwd(), 'src/pages/mockups/MockupGenerator.tsx');
const HOOK = resolve(process.cwd(), 'src/hooks/mockup/useMockupGenerator.ts');
const ESTADO = resolve(process.cwd(), 'src/hooks/mockup/useSavedMockupProject.ts');

/** Corpo do primeiro bloco `{...}` depois do marcador, com chaves balanceadas. */
function corpoDepoisDe(caminho: string, marcador: string): string {
  const fonte = readFileSync(caminho, 'utf8');
  const inicio = fonte.indexOf(marcador);
  expect(inicio, `marcador ausente em ${caminho}: ${marcador}`).toBeGreaterThanOrEqual(0);
  const abre = fonte.indexOf('{', inicio + marcador.length);
  let nivel = 0;
  for (let i = abre; i < fonte.length; i++) {
    if (fonte[i] === '{') nivel++;
    else if (fonte[i] === '}' && --nivel === 0) return fonte.slice(abre, i + 1);
  }
  throw new Error(`bloco não fechado em ${caminho}: ${marcador}`);
}

describe('troca de identidade do projeto — os três fluxos descartam o projeto anterior', () => {
  it('selecionar outro produto descarta a identidade do projeto', () => {
    expect(corpoDepoisDe(PAGINA, 'onProductSelect=')).toContain('resetProjectIdentity()');
  });

  it('selecionar outro cliente descarta a identidade do projeto', () => {
    expect(corpoDepoisDe(PAGINA, 'onClientSelect=')).toContain('resetProjectIdentity()');
  });

  it('carregar outro registro do histórico descarta a identidade do projeto', () => {
    expect(corpoDepoisDe(HOOK, 'const loadFromHistory = useCallback(')).toContain(
      'resetProjectIdentity()',
    );
  });

  it('nova tentativa do MESMO projeto NÃO descarta (é o caso que a preservação serve)', () => {
    expect(corpoDepoisDe(HOOK, 'const generateMockup = useCallback(')).not.toContain(
      'resetProjectIdentity()',
    );
  });

  it('o descarte central zera o registro salvo (id, URL e área) e abre outro projeto', () => {
    const corpo = corpoDepoisDe(ESTADO, 'const resetProjectIdentity = useCallback(');

    expect(corpo).toContain('setLastSavedRecordId(null)');
    expect(corpo).toContain('setLastSavedMockupUrl(null)');
    expect(corpo).toContain('setLastSavedArea(null)');
    expect(corpo).toContain('setProjectResetCount');
  });
});
