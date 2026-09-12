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
    fireEvent.click(screen.getByRole('button', { name: 'Editar' }));
    expect(onEdit).toHaveBeenCalledOnce();
  });
});
