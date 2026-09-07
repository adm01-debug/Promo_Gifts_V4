/**
 * ContentStep — unit tests (B5)
 * Cobertura: render com dados padrão, null content guard, toggle dispara onChange,
 * acessibilidade semântica (fieldset/legend/label).
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ContentStep } from './ContentStep';
import { DEFAULT_BRANDING, DEFAULT_MAGAZINE_CONTENT, type Magazine } from '@/types/magazine';

function mkMag(overrides: Partial<Magazine> = {}): Magazine {
  return {
    id: 'mag_1',
    ownerId: 'u1',
    organizationId: null,
    title: 'Teste',
    subtitle: '',
    templateId: 'editorial-vogue',
    branding: { ...DEFAULT_BRANDING },
    content: { ...DEFAULT_MAGAZINE_CONTENT },
    items: [],
    pageOrder: null,
    status: 'draft',
    publicToken: null,
    viewCount: 0,
    publishedAt: null,
    archivedAt: null,
    createdAt: '2026-07-12T00:00:00Z',
    updatedAt: '2026-07-12T00:00:00Z',
    ...overrides,
  };
}

describe('ContentStep', () => {
  it('renderiza sem crash com content padrão', () => {
    render(<ContentStep magazine={mkMag()} onChange={vi.fn()} />);
    expect(screen.getByText('Campos exibidos por produto')).toBeInTheDocument();
    expect(screen.getByText('Estrutura da revista')).toBeInTheDocument();
  });

  it('null content → usa DEFAULT_MAGAZINE_CONTENT, sem crash', () => {
    // @ts-expect-error testing null content
    render(<ContentStep magazine={mkMag({ content: null })} onChange={vi.fn()} />);
    expect(screen.getByText('Campos exibidos por produto')).toBeInTheDocument();
  });

  it('toggle showPrice chama onChange com { showPrice: false }', () => {
    const onChange = vi.fn();
    render(<ContentStep magazine={mkMag()} onChange={onChange} />);
    const toggle = screen.getByTestId('magazine-toggle-showPrice');
    fireEvent.click(toggle);
    expect(onChange).toHaveBeenCalledWith({ showPrice: false });
  });

  it('toggle groupByCategory chama onChange com { groupByCategory: true }', () => {
    const onChange = vi.fn();
    const mag = mkMag({ content: { ...DEFAULT_MAGAZINE_CONTENT, groupByCategory: false } });
    render(<ContentStep magazine={mag} onChange={onChange} />);
    const toggle = screen.getByTestId('magazine-toggle-groupByCategory');
    fireEvent.click(toggle);
    expect(onChange).toHaveBeenCalledWith({ groupByCategory: true });
  });

  it('todos os 7 toggles de campo estão presentes no DOM', () => {
    render(<ContentStep magazine={mkMag()} onChange={vi.fn()} />);
    const keys = [
      'showPrice',
      'showCode',
      'showPersonalization',
      'showDescription',
      'showDimensions',
      'showMaterials',
      'showColors',
    ];
    for (const key of keys) {
      expect(screen.getByTestId(`magazine-toggle-${key}`)).toBeInTheDocument();
    }
  });

  it('toggle de estrutura está presente no DOM', () => {
    render(<ContentStep magazine={mkMag()} onChange={vi.fn()} />);
    expect(screen.getByTestId('magazine-toggle-groupByCategory')).toBeInTheDocument();
  });

  it('usa fieldset+legend para estrutura semântica acessível', () => {
    const { container } = render(<ContentStep magazine={mkMag()} onChange={vi.fn()} />);
    const fieldsets = container.querySelectorAll('fieldset');
    expect(fieldsets.length).toBeGreaterThanOrEqual(2);
  });

  it('labels são associados aos switches via htmlFor', () => {
    render(<ContentStep magazine={mkMag()} onChange={vi.fn()} />);
    const label = screen.getByText('Mostrar preço').closest('label');
    expect(label).toHaveAttribute('for', 'magazine-toggle-showPrice');
  });
});
