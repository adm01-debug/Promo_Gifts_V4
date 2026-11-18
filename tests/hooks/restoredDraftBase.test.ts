/**
 * Preservação das chaves de rascunho que a tela atual não modela.
 *
 * RESGATE da PR #3788 (branch salvo/codex-fix-gate1-kit-pdf-types-261109-2252):
 * a função `mergeRestoredBase` dela nunca chegou à main. A main adotou outro
 * caminho de UI (QuoteDraftRecovery, PR #3805), então a função foi trazida para
 * src/hooks/quotes/restoredDraftBase.ts e ligada aos dois lados.
 *
 * Assimetria que ela conserta, medida:
 * - leitura: src/lib/quotes/quoteDraftRecovery.ts usa `.passthrough()` em 5 pontos,
 *   logo campo extra SOBREVIVE à leitura;
 * - aplicação: src/hooks/quotes/quoteDraftApply.ts sabe aplicar 18 campos;
 * - gravação: src/pages/quotes/QuoteBuilderPage.tsx:179-196 grava 13.
 * Os 5 que sobram (companyInfo, contactInfo, deliveryDate, deliveryMode,
 * validityDays) eram apagados do rascunho na primeira gravação após restaurar.
 */
import { describe, expect, it, beforeEach } from 'vitest';
import {
  chaveDoRascunho,
  esquecerBaseRestaurada,
  mesclarComBaseRestaurada,
  registrarBaseRestaurada,
} from '@/hooks/quotes/restoredDraftBase';

const CHAVE = chaveDoRascunho('orc-1');

describe('base de rascunho restaurado', () => {
  beforeEach(() => {
    esquecerBaseRestaurada(CHAVE);
    esquecerBaseRestaurada(chaveDoRascunho('orc-2'));
    esquecerBaseRestaurada(chaveDoRascunho(undefined));
  });

  it('monta a mesma chave que o QuoteAutoSave usa, inclusive para orçamento novo', () => {
    expect(chaveDoRascunho('orc-1')).toBe('quote_draft_orc-1');
    expect(chaveDoRascunho(undefined)).toBe('quote_draft_new');
    expect(chaveDoRascunho('')).toBe('quote_draft_new');
  });

  it('sem base registrada devolve os dados da tela sem tocar em nada', () => {
    const tela = { clientId: 'c-1', items: [{ id: 'i-1' }] };
    expect(mesclarComBaseRestaurada(CHAVE, tela)).toBe(tela);
  });

  it('preserva os campos que a tela não modela e deixa a tela mandar nos que modela', () => {
    // Rascunho restaurado: 13 campos da tela + os 5 que só o rascunho tinha.
    registrarBaseRestaurada(CHAVE, {
      clientId: 'c-antigo',
      deliveryTime: 'date:2026-12-20',
      companyInfo: { razao_social: 'ACME LTDA', cnpj: '00.000.000/0001-00' },
      contactInfo: { nome: 'Maria' },
      deliveryMode: 'data',
      deliveryDate: '2026-12-20T12:00:00',
      validityDays: 30,
    });

    const gravado = mesclarComBaseRestaurada(CHAVE, {
      clientId: 'c-1',
      deliveryTime: 'date:2026-12-20',
    }) as Record<string, unknown>;

    // A tela manda no que ela modela.
    expect(gravado.clientId).toBe('c-1');
    // E o que só o rascunho tinha sobrevive à gravação.
    expect(gravado.deliveryMode).toBe('data');
    expect(gravado.deliveryDate).toBe('2026-12-20T12:00:00');
    expect(gravado.validityDays).toBe(30);
    expect(gravado.companyInfo).toEqual({
      razao_social: 'ACME LTDA',
      cnpj: '00.000.000/0001-00',
    });
    expect(gravado.contactInfo).toEqual({ nome: 'Maria' });
  });

  it('lê cada orçamento independentemente e não reusa a base do anterior', () => {
    registrarBaseRestaurada(CHAVE, { validityDays: 30 });
    const outro = mesclarComBaseRestaurada(chaveDoRascunho('orc-2'), {
      clientId: 'c-2',
    }) as Record<string, unknown>;
    expect(outro.validityDays).toBeUndefined();
    expect(outro.clientId).toBe('c-2');
  });

  it('ignora base que não é objeto simples e nunca quebra a gravação', () => {
    registrarBaseRestaurada(CHAVE, null);
    registrarBaseRestaurada(CHAVE, [1, 2, 3]);
    registrarBaseRestaurada(CHAVE, 'texto');
    const tela = { clientId: 'c-1' };
    expect(mesclarComBaseRestaurada(CHAVE, tela)).toBe(tela);
  });

  it('esquecer a base volta ao comportamento de gravar só o que a tela tem', () => {
    registrarBaseRestaurada(CHAVE, { validityDays: 30 });
    expect((mesclarComBaseRestaurada(CHAVE, { a: 1 }) as Record<string, unknown>).validityDays).toBe(
      30,
    );
    esquecerBaseRestaurada(CHAVE);
    const tela = { a: 1 };
    expect(mesclarComBaseRestaurada(CHAVE, tela)).toBe(tela);
  });
});
