import { describe, expect, it } from 'vitest';
import { buildTemplatePersonalizationSnapshot } from '@/hooks/kit-builder/useTemplateSnapshot';
import type { KitPersonalization } from '@/lib/kit-builder';

describe('template de kit — fronteira de privacidade', () => {
  it('remove o envelope privado do rascunho sem alterar a personalização', () => {
    const source = {
      box: { enabled: false },
      items: {
        'item-1:base': { enabled: true, techniqueId: 'laser', estimatedPrice: 2 },
      },
      __draft: {
        quoteClient: {
          client_id: 'crm-private',
          client_email: 'private@example.test',
          client_cnpj: '00.000.000/0001-00',
        },
      },
    } as KitPersonalization & { __draft: unknown };

    const snapshot = buildTemplatePersonalizationSnapshot(source);

    expect(snapshot).not.toHaveProperty('__draft');
    expect(snapshot.items['item-1:base']).toMatchObject({ techniqueId: 'laser' });
    expect(source).toHaveProperty('__draft');
  });
});
