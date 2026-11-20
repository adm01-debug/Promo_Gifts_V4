/**
 * Formulário de caixa, sozinho (sem a aba): o que depende das props e do DOM.
 * A rolagem de verdade só existe em navegador; aqui se trava que a validação
 * recusada pede para trazer o primeiro campo com erro à vista.
 */
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ShippingBoxFormDialog } from '../ShippingBoxFormDialog';

const onOpenChange = vi.fn();
const onSave = vi.fn();
const scrollIntoView = vi.fn();

function renderDialog(props: { saving?: boolean; newBoxFillFactor?: number } = {}) {
  render(
    <ShippingBoxFormDialog
      open
      onOpenChange={onOpenChange}
      box={null}
      newBoxFillFactor={props.newBoxFillFactor ?? 0.9}
      saving={props.saving ?? false}
      onSave={onSave}
    />,
  );
  return screen.getByRole('dialog');
}

/** O bloco do campo: rótulo, input e mensagem de erro. */
function fieldBlock(dialog: HTMLElement, label: string) {
  return within(dialog).getByLabelText(label).parentElement;
}

beforeEach(() => {
  vi.clearAllMocks();
  Element.prototype.scrollIntoView = scrollIntoView;
});

describe('ShippingBoxFormDialog — rolagem', () => {
  it('a área dos campos rola por CSS nativo (max-h + overflow-y-auto)', () => {
    const dialog = renderDialog();
    const area = within(dialog).getByLabelText('Peso máximo (kg)').closest('.overflow-y-auto');

    expect(area).not.toBeNull();
    expect(area).toHaveClass('max-h-[64vh]');
    expect(dialog.querySelector('[data-radix-scroll-area-viewport]')).toBeNull();
  });

  it('salvar sem o peso máximo traz o campo do peso, com a mensagem, para a vista', async () => {
    const user = userEvent.setup();
    const dialog = renderDialog();
    await user.type(within(dialog).getByLabelText('Código'), 'P');
    await user.type(within(dialog).getByLabelText('Nome'), 'Caixa P');
    await user.type(within(dialog).getByLabelText('Altura externa (cm)'), '27');
    await user.type(within(dialog).getByLabelText('Largura externa (cm)'), '33');
    await user.type(within(dialog).getByLabelText('Comprimento externo (cm)'), '33');
    await user.click(within(dialog).getByTestId('admin-save-btn'));

    const bloco = fieldBlock(dialog, 'Peso máximo (kg)');
    expect(bloco).toHaveTextContent('Informe o peso máximo em kg');
    expect(scrollIntoView).toHaveBeenCalledTimes(1);
    expect(scrollIntoView.mock.contexts[0]).toBe(bloco);
    expect(scrollIntoView).toHaveBeenCalledWith({ block: 'center' });
    expect(onSave).not.toHaveBeenCalled();
  });

  it('com vários erros, vai para o primeiro campo errado da tela', async () => {
    const user = userEvent.setup();
    const dialog = renderDialog();
    // Tudo em branco: Código é o primeiro campo com erro.
    await user.click(within(dialog).getByTestId('admin-save-btn'));

    expect(scrollIntoView.mock.contexts[0]).toBe(fieldBlock(dialog, 'Código'));
  });

  it('erro só no peso da caixa vazia: abre o Avançado e rola até ele', async () => {
    const user = userEvent.setup();
    const dialog = renderDialog();
    await user.type(within(dialog).getByLabelText('Código'), 'P');
    await user.type(within(dialog).getByLabelText('Nome'), 'Caixa P');
    await user.type(within(dialog).getByLabelText('Altura externa (cm)'), '27');
    await user.type(within(dialog).getByLabelText('Largura externa (cm)'), '33');
    await user.type(within(dialog).getByLabelText('Comprimento externo (cm)'), '33');
    await user.type(within(dialog).getByLabelText('Peso máximo (kg)'), '10');
    await user.click(within(dialog).getByRole('button', { name: 'Avançado' }));
    await user.clear(within(dialog).getByLabelText('Peso da caixa vazia (g)'));
    await user.click(within(dialog).getByRole('button', { name: 'Avançado' }));
    await user.click(within(dialog).getByTestId('admin-save-btn'));

    expect(scrollIntoView.mock.contexts[0]).toBe(fieldBlock(dialog, 'Peso da caixa vazia (g)'));
  });

  it('validação aceita não rola nada', async () => {
    const user = userEvent.setup();
    const dialog = renderDialog({ newBoxFillFactor: 0.8 });
    await user.type(within(dialog).getByLabelText('Código'), 'P');
    await user.type(within(dialog).getByLabelText('Nome'), 'Caixa P');
    await user.type(within(dialog).getByLabelText('Altura externa (cm)'), '27');
    await user.type(within(dialog).getByLabelText('Largura externa (cm)'), '33');
    await user.type(within(dialog).getByLabelText('Comprimento externo (cm)'), '33');
    await user.type(within(dialog).getByLabelText('Peso máximo (kg)'), '10');
    await user.click(within(dialog).getByTestId('admin-save-btn'));

    expect(scrollIntoView).not.toHaveBeenCalled();
    // O fator sugerido (0,80) vai como foi aberto; 10 kg × 1000 = 10000 g.
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({ fill_factor: 0.8, max_weight_g: 10000 }),
    );
  });
});

describe('ShippingBoxFormDialog — fechar durante o salvar', () => {
  it('Esc fecha o formulário quando nada está sendo salvo', async () => {
    const user = userEvent.setup();
    renderDialog({ saving: false });
    await user.keyboard('{Escape}');

    expect(onOpenChange).toHaveBeenCalledTimes(1);
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('Esc durante o salvar é ignorado: o formulário continua aberto', async () => {
    const user = userEvent.setup();
    renderDialog({ saving: true });
    await user.keyboard('{Escape}');

    expect(onOpenChange).not.toHaveBeenCalled();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('o X do canto também não fecha durante o salvar', async () => {
    const user = userEvent.setup();
    const dialog = renderDialog({ saving: true });
    await user.click(within(dialog).getByRole('button', { name: /fechar|close/i }));

    expect(onOpenChange).not.toHaveBeenCalled();
  });
});
