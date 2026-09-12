import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ClientPicker, type ClientData } from '@/components/quotes/ClientPicker';

vi.mock('@/components/favorites/FavoritesClientPicker', () => ({
  FavoritesClientPicker: ({
    onSelect,
  }: {
    onSelect: (client: { id: string; name: string } | null) => void;
  }) => (
    <div>
      <button type="button" onClick={() => onSelect({ id: 'crm-42', name: 'Empresa CRM' })}>
        Selecionar empresa CRM
      </button>
      <button type="button" onClick={() => onSelect({ id: 'crm-99', name: 'Empresa Nova' })}>
        Selecionar empresa nova
      </button>
      <button type="button" onClick={() => onSelect(null)}>
        Limpar empresa
      </button>
    </div>
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

  it('remove o vínculo CRM quando a empresa é sobrescrita manualmente', () => {
    let value: Partial<ClientData> = { client_id: 'crm-42', client_company: 'Empresa CRM' };
    const onChange = vi.fn((next: Partial<ClientData>) => {
      value = next;
    });
    render(<ClientPicker value={value} onChange={onChange} />);

    fireEvent.change(screen.getByLabelText('Empresa'), { target: { value: 'Empresa digitada' } });

    expect(value.client_company).toBe('Empresa digitada');
    expect(value.client_id).toBeUndefined();
  });

  it('troca o nome autofill ao selecionar outra empresa, mas preserva um contato manual', () => {
    let value: Partial<ClientData> = {};
    const onChange = vi.fn((next: Partial<ClientData>) => {
      value = next;
    });
    const { rerender } = render(<ClientPicker value={value} onChange={onChange} />);

    fireEvent.click(screen.getByRole('button', { name: 'Selecionar empresa CRM' }));
    rerender(<ClientPicker value={value} onChange={onChange} />);
    fireEvent.click(screen.getByRole('button', { name: 'Selecionar empresa nova' }));
    expect(value).toMatchObject({
      client_id: 'crm-99',
      client_company: 'Empresa Nova',
      client_name: 'Empresa Nova',
    });

    rerender(<ClientPicker value={value} onChange={onChange} />);
    fireEvent.change(screen.getByLabelText('Nome'), { target: { value: 'Joana Compras' } });
    rerender(<ClientPicker value={value} onChange={onChange} />);
    fireEvent.click(screen.getByRole('button', { name: 'Selecionar empresa CRM' }));
    expect(value.client_company).toBe('Empresa CRM');
    expect(value.client_name).toBe('Joana Compras');
  });
});
