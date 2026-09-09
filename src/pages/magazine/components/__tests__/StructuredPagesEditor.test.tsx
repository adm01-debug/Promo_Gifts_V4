import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { DEFAULT_BRANDING, DEFAULT_MAGAZINE_CONTENT, type Magazine } from '@/types/magazine';
import { createMagazinePageDefinition } from '../../pagination';
import { StructuredPagesEditor } from '../StructuredPagesEditor';

function magazine(overrides: Partial<Magazine> = {}): Magazine {
  return {
    id: 'magazine-1',
    ownerId: 'owner-1',
    organizationId: null,
    title: 'Coleção 2026',
    subtitle: 'Brindes que conectam',
    templateId: 'editorial-vogue',
    branding: DEFAULT_BRANDING,
    content: DEFAULT_MAGAZINE_CONTENT,
    items: [],
    pageOrder: null,
    status: 'draft',
    publicToken: null,
    viewCount: 0,
    publishedAt: null,
    archivedAt: null,
    createdAt: '2026-09-09T00:00:00Z',
    updatedAt: '2026-09-09T00:00:00Z',
    ...overrides,
  };
}

describe('StructuredPagesEditor', () => {
  it('converts the legacy automatic layout only after an explicit action', () => {
    const onChange = vi.fn();
    render(<StructuredPagesEditor magazine={magazine()} onChange={onChange} />);
    expect(onChange).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Estruturar páginas' }));
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange.mock.calls[0][0].pages.map((page: { kind: string }) => page.kind)).toEqual([
      'cover',
      'institutional',
      'contact',
    ]);
  });

  it('adds editable pages before contact and preserves the boundary pages', () => {
    const onChange = vi.fn();
    const pageOrder = {
      version: 2 as const,
      pages: [
        createMagazinePageDefinition('cover'),
        createMagazinePageDefinition('products'),
        createMagazinePageDefinition('contact'),
      ],
    };
    render(<StructuredPagesEditor magazine={magazine({ pageOrder })} onChange={onChange} />);
    fireEvent.click(screen.getByRole('button', { name: 'Seção' }));
    const next = onChange.mock.calls[0][0];
    expect(next.pages.map((page: { kind: string }) => page.kind)).toEqual([
      'cover',
      'products',
      'section',
      'contact',
    ]);
    expect(screen.getByRole('button', { name: 'Mover página 1 para cima' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Excluir página 1' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Excluir página 3' })).toBeDisabled();
  });

  it('edits institutional copy without changing branding or colors', () => {
    const onChange = vi.fn();
    const institutional = createMagazinePageDefinition('institutional', {
      title: 'Sobre nós',
      body: 'Texto original',
    });
    const pageOrder = {
      version: 2 as const,
      pages: [
        createMagazinePageDefinition('cover'),
        institutional,
        createMagazinePageDefinition('contact'),
      ],
    };
    const input = magazine({ pageOrder });
    render(<StructuredPagesEditor magazine={input} onChange={onChange} />);
    fireEvent.change(screen.getByLabelText('Texto da página 2'), {
      target: { value: 'Texto revisado' },
    });
    expect(onChange.mock.calls[0][0].pages[1].body).toBe('Texto revisado');
    expect(input.branding).toEqual(DEFAULT_BRANDING);
  });

  it('não persiste uma duplicação que ultrapassaria 200 páginas', () => {
    const onChange = vi.fn();
    const pageOrder = {
      version: 2 as const,
      pages: [
        createMagazinePageDefinition('cover'),
        ...Array.from({ length: 198 }, (_, index) =>
          createMagazinePageDefinition('institutional', {
            id: `institutional-${index}`,
            title: `Página ${index}`,
          }),
        ),
        createMagazinePageDefinition('contact'),
      ],
    };
    render(<StructuredPagesEditor magazine={magazine({ pageOrder })} onChange={onChange} />);
    fireEvent.click(screen.getByRole('button', { name: 'Duplicar página 2' }));
    expect(onChange).not.toHaveBeenCalled();
  });
});
