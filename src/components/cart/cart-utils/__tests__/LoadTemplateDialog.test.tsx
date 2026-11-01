/**
 * LoadTemplateDialog — aplicar fecha o dialog e não duplica; excluir pede confirmação.
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LoadTemplateDialog } from '../CartDialogs';

const templates = [
  {
    id: 't1',
    name: 'Kit Onboarding',
    description: null,
    created_at: '2026-11-01T00:00:00Z',
    items: [{ product_id: 'p1', product_name: 'Caneta', product_price: 2, quantity: 10 }],
  },
];

async function openDialog() {
  const user = userEvent.setup();
  await user.click(screen.getByRole('button', { name: /Usar Template \(1\)/i }));
  return user;
}

describe('LoadTemplateDialog', () => {
  it('Aplicar chama onLoad uma vez e fecha o dialog', async () => {
    const onLoad = vi.fn().mockResolvedValue(undefined);
    render(<LoadTemplateDialog templates={templates} onLoad={onLoad} onDelete={vi.fn()} />);
    const user = await openDialog();

    await user.click(screen.getByRole('button', { name: 'Aplicar' }));

    await waitFor(() => expect(onLoad).toHaveBeenCalledTimes(1));
    expect(onLoad).toHaveBeenCalledWith(templates[0].items);
    await waitFor(() => expect(screen.queryByText('Templates Salvos')).not.toBeInTheDocument());
  });

  it('excluir exige confirmação: o 1º clique não chama onDelete', async () => {
    const onDelete = vi.fn();
    render(<LoadTemplateDialog templates={templates} onLoad={vi.fn()} onDelete={onDelete} />);
    const user = await openDialog();

    await user.click(screen.getByRole('button', { name: /Excluir template Kit Onboarding/i }));
    expect(onDelete).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: /Confirmar exclusão/i }));
    expect(onDelete).toHaveBeenCalledTimes(1);
    expect(onDelete).toHaveBeenCalledWith('t1');
  });
});
