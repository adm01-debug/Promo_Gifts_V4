import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { IncompleteItem } from '@/lib/freight';
import { FreightMissingActions } from '../FreightMissingActions';

const h = vi.hoisted(() => ({
  auth: { isAdmin: false },
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => h.auth }));
vi.mock('sonner', () => ({ toast: h.toast }));

const FALTANTES: IncompleteItem[] = [
  { productId: 'sem-peso', name: 'Peça sem peso', missing: ['weight'] },
  { productId: '', name: 'Camiseta sob medida', missing: ['height', 'width', 'length', 'weight'] },
];
const PRODUTOS = new Map([['sem-peso', { name: 'Peça sem peso', sku: 'SKU-sem-peso' }]]);

function renderActions() {
  return render(
    <MemoryRouter>
      <FreightMissingActions missing={FALTANTES} products={PRODUTOS} />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('FreightMissingActions', () => {
  it('admin: link "Completar cadastro" só para produto cadastrado', () => {
    h.auth.isAdmin = true;
    renderActions();

    const links = screen.getAllByRole('link', { name: 'Completar cadastro' });
    expect(links).toHaveLength(1);
    expect(links[0]).toHaveAttribute('href', '/admin/cadastros/produto/sem-peso');
    expect(screen.queryByRole('button', { name: /Copiar lista/ })).not.toBeInTheDocument();
  });

  it('vendedor: pede ao admin e copia a lista com SKU e campos', async () => {
    h.auth.isAdmin = false;
    const user = userEvent.setup();
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
    renderActions();

    expect(screen.getByText(/Peça ao admin para completar o cadastro/)).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Completar cadastro' })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Copiar lista/ }));

    // Só produto com cadastro entra na lista: o avulso não tem o que o admin completar.
    expect(writeText).toHaveBeenCalledWith('SKU-sem-peso — Peça sem peso: falta peso');
    expect(h.toast.success).toHaveBeenCalledWith('Lista copiada');
  });

  it('item avulso: texto próprio e fora da lista copiada e da frase "peça ao admin"', () => {
    h.auth.isAdmin = false;
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
    render(
      <MemoryRouter>
        <FreightMissingActions
          missing={FALTANTES.filter((item) => item.productId === '')}
          products={PRODUTOS}
        />
      </MemoryRouter>,
    );

    expect(
      screen.getByText(/Item sem cadastro: sem peso e medidas não dá para calcular os volumes\./),
    ).toBeInTheDocument();
    expect(screen.queryByText(/falta altura/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Peça ao admin/)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Copiar lista/ })).not.toBeInTheDocument();
    expect(writeText).not.toHaveBeenCalled();
  });

  it('produto indisponível: texto próprio, sem campos, sem link e sem "peça ao admin"', () => {
    h.auth.isAdmin = true;
    render(
      <MemoryRouter>
        <FreightMissingActions
          missing={[]}
          unavailable={[{ productId: 'apagado', name: 'Caneta Azul' }]}
        />
      </MemoryRouter>,
    );

    expect(screen.getByText('Caneta Azul')).toBeInTheDocument();
    expect(
      screen.getByText(/Produto indisponível ou inativo — não foi possível ler as medidas\./),
    ).toBeInTheDocument();
    expect(screen.queryByText(/falta/)).not.toBeInTheDocument();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });
});
