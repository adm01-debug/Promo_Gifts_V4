import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { MagazineItem } from '@/types/magazine';
import { MagazinePageRenderer } from '../MagazinePageRenderer';
import { buildMockMagazine } from '../../templates-gallery/mockMagazine';

describe('MagazinePageRenderer — páginas editoriais', () => {
  it('não quebra com productSnapshot legado nulo', () => {
    const magazine = buildMockMagazine('editorial-vogue');
    magazine.items = [
      {
        ...magazine.items[0],
        productSnapshot: null,
      } as unknown as MagazineItem,
    ];

    expect(() =>
      render(
        <MagazinePageRenderer
          magazine={magazine}
          page={{ index: 1, kind: 'institutional', items: [], title: 'Sobre nós' }}
        />,
      ),
    ).not.toThrow();
  });

  it.each(['institutional', 'section'] as const)(
    'usa a imagem da variante selecionada na página %s',
    (kind) => {
      const magazine = buildMockMagazine('editorial-vogue');
      magazine.items = [
        {
          ...magazine.items[0],
          variantColorName: 'Azul',
          productSnapshot: {
            ...magazine.items[0].productSnapshot,
            image_url: 'https://example.com/base.png',
            colors: [{ name: 'Azul', hex: '#0000ff', image: 'https://example.com/azul.png' }],
          },
        },
      ];
      const { container } = render(
        <MagazinePageRenderer
          magazine={magazine}
          page={{
            index: 1,
            kind,
            items: [],
            ...(kind === 'section' ? { sectionTitle: 'Tecnologia' } : { title: 'Sobre nós' }),
          }}
        />,
      );
      expect(container.querySelector('img[src="https://example.com/azul.png"]')).not.toBeNull();
      expect(container.querySelector('img[src="https://example.com/base.png"]')).toBeNull();
    },
  );

  it('usa categoria segura quando o JSON legado contém chave desconhecida', () => {
    const magazine = buildMockMagazine('editorial-vogue');
    magazine.branding.category = 'legacy-invalid' as never;

    const { container } = render(
      <MagazinePageRenderer magazine={magazine} page={{ index: 0, kind: 'cover', items: [] }} />,
    );

    expect(
      container
        .querySelector<HTMLElement>('.mag-scope')
        ?.style.getPropertyValue('--mag-category-color'),
    ).toBe('#2e4c60');
  });

  it.each(['contact', 'back-cover'] as const)(
    'escolhe tinta escura legível para a categoria clara em %s',
    (kind) => {
      const magazine = buildMockMagazine('editorial-vogue');
      magazine.branding.category = 'bags';

      const { container } = render(
        <MagazinePageRenderer magazine={magazine} page={{ index: 2, kind, items: [] }} />,
      );

      expect(container.querySelector<HTMLElement>('.mag-page')?.style.color).toBe(
        'rgb(26, 26, 26)',
      );
    },
  );
});
