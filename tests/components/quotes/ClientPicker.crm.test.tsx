import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ClientPicker, type ClientData } from '@/components/quotes/ClientPicker';

vi.mock('@/components/favorites/FavoritesClientPicker', () => ({
  FavoritesClientPicker: ({
    onSelect,
  }: {
    onSelect: (client: { id: string; name: string }) => void;
  }) => (
    <button type="button" onClick={() => onSelect({ id: 'crm-42', name: 'Empresa CRM' })}>
      Selecionar empresa CRM
    </button>
  ),
}));

describe('ClientPicker CRM', () => {
  it('preserva a identidade CRM e permite complementar o contato manualmente', () => {
    let value: Partial<ClientData> = {};
    const onChange = vi.fn((next: Partial<ClientData>) => {
      value = next;
    });
    const { rerender } = render(<ClientPicker value={value} onChange={onChange} />);

    fireEvent.click(screen.getByRole('button', { name: 'Selecionar empresa CRM' }));
    expect(value).toMatchObject({
      client_id: 'crm-42',
      client_company: 'Empresa CRM',
      client_name: 'Empresa CRM',
    });

    rerender(<ClientPicker value={value} onChange={onChange} />);
    fireEvent.change(screen.getByLabelText('E-mail'), {
      target: { value: 'compras@empresa.test' },
    });
    expect(value.client_id).toBe('crm-42');
    expect(value.client_email).toBe('compras@empresa.test');
  });
});
