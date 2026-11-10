import { afterEach, describe, expect, it } from 'vitest';

import { e2eName, e2eScope, isE2eName } from '../../e2e/fixtures/test-user';

const originalPrefix = process.env.E2E_TEST_PREFIX;

afterEach(() => {
  if (originalPrefix === undefined) delete process.env.E2E_TEST_PREFIX;
  else process.env.E2E_TEST_PREFIX = originalPrefix;
});

describe('namespace E2E canônico', () => {
  it('deriva um prefixo por spec compatível com o cleanup padrão', () => {
    delete process.env.E2E_TEST_PREFIX;

    const prefix = e2eScope('quote-create');
    const name = e2eName('orcamento', { prefix });

    expect(prefix).toBe('[E2E] quote-create');
    expect(isE2eName(name)).toBe(true);
  });

  it('mantém o namespace único da rodada no prefixo do spec', () => {
    process.env.E2E_TEST_PREFIX = '[E2E] quotes-4242-1';

    const prefix = e2eScope('04o-quotes-single-delete-undo');

    expect(prefix).toBe('[E2E] quotes-4242-1-04o-quotes-single-delete-undo');
    expect(prefix.startsWith(process.env.E2E_TEST_PREFIX)).toBe(true);
  });

  it('rejeita namespace que não pode ser filtrado com segurança pela Edge', () => {
    process.env.E2E_TEST_PREFIX = '[E2E:legacy]';

    expect(() => e2eScope('quote-create')).toThrow(/não permite escopo canônico/);
  });
});
