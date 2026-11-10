import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { KitCard } from '@/components/kit-library/KitCard';

describe('KitCard', () => {
  it('shows historical unknown values honestly and keeps the draft actions available', () => {
    const onEdit = vi.fn();
    render(
      <KitCard
        variant="mine"
        data={{
          id: 'draft-null',
          name: null,
          color: '#2563eb',
          icon: 'Package',
          totalPrice: null,
          itemsCount: null,
          kitQuantity: null,
          status: null,
          updatedAt: null,
          isDraft: true,
        }}
        onEdit={onEdit}
      />,
    );
    expect(screen.getByText('Nome não informado')).toBeInTheDocument();
    expect(screen.getByText('Não informado')).toBeInTheDocument();
    expect(screen.getByText('Quantidade de itens não informada')).toBeInTheDocument();
    expect(screen.getByText('Quantidade não informada')).toBeInTheDocument();
    expect(screen.getByText('Status não informado')).toBeInTheDocument();
    expect(screen.getByText('Edição não informada')).toBeInTheDocument();
    expect(screen.queryByText(/R\$\s*0,00/)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /continuar edição/i }));
    expect(onEdit).toHaveBeenCalledOnce();
  });
  it('distinguishes a known numerical zero from an unknown value', () => {
    render(
      <KitCard
        variant="mine"
        data={{
          id: 'zero',
          name: 'Kit zero',
          color: '#2563eb',
          icon: 'Package',
          totalPrice: 0,
          itemsCount: 0,
          kitQuantity: 0,
        }}
      />,
    );
    expect(screen.getByText(/R\$\s*0,00/)).toBeInTheDocument();
    expect(screen.getByText('0 itens')).toBeInTheDocument();
    expect(screen.queryByText('Não informado')).not.toBeInTheDocument();
  });
  it.each([NaN, Infinity, -Infinity])(
    'does not format a non-finite price %s as money',
    (totalPrice) => {
      render(
        <KitCard
          variant="mine"
          data={{
            id: 'nonfinite',
            name: 'Incompleto',
            color: '#2563eb',
            icon: 'Package',
            totalPrice,
            itemsCount: 2,
            updatedAt: 'invalid-date',
          }}
        />,
      );
      expect(screen.getByText('Não informado')).toBeInTheDocument();
      expect(screen.getByText('Edição não informada')).toBeInTheDocument();
    },
  );
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
