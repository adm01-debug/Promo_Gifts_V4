import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { KitCard } from '@/components/kit-library/KitCard';

describe('KitCard', () => {
  it('renders the canonical cover image when the saved kit has one', () => {
    render(
      <KitCard
        variant="mine"
        data={{
          id: 'kit-1',
          name: 'Kit Boas-vindas',
          color: '#2563eb',
          icon: 'Package',
          totalPrice: 120,
          itemsCount: 3,
          coverImageUrl: 'https://cdn.example.test/kit-cover.jpg',
        }}
      />,
    );

    expect(screen.getByAltText('Capa do kit Kit Boas-vindas')).toHaveAttribute(
      'src',
      'https://cdn.example.test/kit-cover.jpg',
    );
  });

  it('keeps action controls available when it falls back to a color-only card', () => {
    const onEdit = vi.fn();
    render(
      <KitCard
        variant="mine"
        data={{
          id: 'kit-2',
          name: 'Kit sem capa',
          color: '#2563eb',
          icon: 'Package',
          totalPrice: 120,
          itemsCount: 3,
          coverImageUrl: null,
        }}
        onEdit={onEdit}
      />,
    );

    expect(screen.queryByRole('img', { name: /capa do kit/i })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /abrir kit/i }));
    expect(onEdit).toHaveBeenCalledOnce();
  });

  it('shows "Continuar edição" for a draft and "Abrir kit" for a ready kit', () => {
    const { rerender } = render(
      <KitCard
        variant="mine"
        data={{
          id: 'kit-3',
          name: 'Kit rascunho',
          color: '#2563eb',
          icon: 'Package',
          totalPrice: 120,
          itemsCount: 3,
          isDraft: true,
        }}
      />,
    );
    expect(screen.getByRole('button', { name: /continuar edição/i })).toBeInTheDocument();

    rerender(
      <KitCard
        variant="mine"
        data={{
          id: 'kit-3',
          name: 'Kit pronto',
          color: '#2563eb',
          icon: 'Package',
          totalPrice: 120,
          itemsCount: 3,
          isDraft: false,
        }}
      />,
    );
    expect(screen.getByRole('button', { name: /abrir kit/i })).toBeInTheDocument();
  });

  it('shows client name and relative edit time when present on the snapshot', () => {
    render(
      <KitCard
        variant="mine"
        data={{
          id: 'kit-4',
          name: 'Kit com cliente',
          color: '#2563eb',
          icon: 'Package',
          totalPrice: 120,
          itemsCount: 3,
          clientName: 'Acme Corp',
          updatedAt: new Date().toISOString(),
        }}
      />,
    );
    expect(screen.getByText('Acme Corp')).toBeInTheDocument();
    expect(screen.getByText(/^Editado/)).toBeInTheDocument();
  });

  it('omits client and edit-time lines when the snapshot has no such data', () => {
    render(
      <KitCard
        variant="mine"
        data={{
          id: 'kit-5',
          name: 'Kit sem metadados',
          color: '#2563eb',
          icon: 'Package',
          totalPrice: 120,
          itemsCount: 3,
        }}
      />,
    );
    expect(screen.queryByText(/^Editado/)).not.toBeInTheDocument();
  });
});
