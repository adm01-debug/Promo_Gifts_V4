/**
 * Formulário de caixa, sozinho (sem a aba): o que depende das props e do DOM.
 * A rolagem de verdade só existe em navegador; aqui se trava que a validação
 * recusada, e o código recusado pelo banco, pedem para trazer o primeiro campo
 * com erro à vista, e que um duplo clique grava uma vez só.
 */
import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ShippingBoxFormDialog, type RejectedShippingBoxCode } from '../ShippingBoxFormDialog';

const onOpenChange = vi.fn();
const onSave = vi.fn();
const scrollIntoView = vi.fn();

interface DialogOptions {
  open?: boolean;
  saving?: boolean;
  newBoxFillFactor?: number;
  newBoxSortOrder?: number;
  rejectedCode?: RejectedShippingBoxCode | null;
}

function dialogElement(props: DialogOptions = {}) {
  return (
    <ShippingBoxFormDialog
      open={props.open ?? true}
      onOpenChange={onOpenChange}
      box={null}
      newBoxFillFactor={props.newBoxFillFactor ?? 0.9}
      newBoxSortOrder={props.newBoxSortOrder ?? 0}
      saving={props.saving ?? false}
      rejectedCode={props.rejectedCode ?? null}
      onSave={onSave}
    />
  );
}

function renderDialog(props: DialogOptions = {}) {
  render(dialogElement(props));
  return screen.getByRole('dialog');
}

/** Preenche a caixa P real (27 × 33 × 33 cm, 10 kg), válida. */
async function fillBoxP(user: ReturnType<typeof userEvent.setup>, dialog: HTMLElement) {
  await user.type(within(dialog).getByLabelText('Código'), 'P');
  await user.type(within(dialog).getByLabelText('Nome'), 'Caixa P');
  await user.type(within(dialog).getByLabelText('Altura externa (cm)'), '27');
  await user.type(within(dialog).getByLabelText('Largura externa (cm)'), '33');
  await user.type(within(dialog).getByLabelText('Comprimento externo (cm)'), '33');
  await user.type(within(dialog).getByLabelText('Peso máximo (kg)'), '10');
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
  it('a área dos campos rola por CSS nativo, em coluna flexível dentro do diálogo', () => {
    const dialog = renderDialog();
    const area = within(dialog).getByLabelText('Peso máximo (kg)').closest('.overflow-y-auto');

    // `relative` faz a área ser o ancestral posicionado dos campos escondidos
    // (o input do Switch é absolute): sem isso a rolagem desloca o diálogo todo.
    expect(area).not.toBeNull();
    expect(area).toHaveClass('relative', 'min-h-0', 'flex-1', 'overflow-y-auto');
    expect(area).not.toHaveClass('max-h-[64vh]');
    // Cabeçalho, área e rodapé na mesma coluna, dentro do diálogo de no máximo
    // 90vh: nada fica cortado nem sobra altura para deslocar o diálogo.
    expect(dialog).toHaveClass('flex', 'max-h-[90vh]', 'flex-col', 'overflow-hidden');
    expect(area?.closest('form')).toHaveClass('flex', 'min-h-0', 'flex-1', 'flex-col');
    expect(dialog.querySelector('[data-radix-scroll-area-viewport]')).toBeNull();
  });

  it('salvar sem o peso máximo traz o campo do peso, com a mensagem, para a vista', async () => {
    const user = userEvent.setup();
    const dialog = renderDialog();
    await fillBoxP(user, dialog);
    await user.clear(within(dialog).getByLabelText('Peso máximo (kg)'));
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
    await fillBoxP(user, dialog);
    await user.click(within(dialog).getByRole('button', { name: 'Avançado' }));
    await user.clear(within(dialog).getByLabelText('Peso da caixa vazia (g)'));
    await user.click(within(dialog).getByRole('button', { name: 'Avançado' }));
    await user.click(within(dialog).getByTestId('admin-save-btn'));

    expect(scrollIntoView.mock.contexts[0]).toBe(fieldBlock(dialog, 'Peso da caixa vazia (g)'));
  });

  it('validação aceita não rola nada', async () => {
    const user = userEvent.setup();
    const dialog = renderDialog({ newBoxFillFactor: 0.8, newBoxSortOrder: 3 });
    await fillBoxP(user, dialog);
    await user.click(within(dialog).getByTestId('admin-save-btn'));

    expect(scrollIntoView).not.toHaveBeenCalled();
    // O fator (0,80) e a ordem (3) sugeridos vão como foram abertos; 10 kg × 1000 = 10000 g.
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({ fill_factor: 0.8, sort_order: 3, max_weight_g: 10000 }),
    );
  });

  it('o código que o banco recusou rola até o campo Código, onde está a mensagem', async () => {
    const user = userEvent.setup();
    const { rerender } = render(dialogElement());
    const dialog = screen.getByRole('dialog');
    await fillBoxP(user, dialog);
    expect(scrollIntoView).not.toHaveBeenCalled();

    rerender(
      dialogElement({
        rejectedCode: { code: 'P', message: 'Já existe uma caixa com o código P.' },
      }),
    );

    const bloco = fieldBlock(dialog, 'Código');
    expect(bloco).toHaveTextContent('Já existe uma caixa com o código P.');
    expect(scrollIntoView).toHaveBeenCalledTimes(1);
    expect(scrollIntoView.mock.contexts[0]).toBe(bloco);
    expect(scrollIntoView).toHaveBeenCalledWith({ block: 'center' });

    // Trocar o código apaga o aviso e não rola de novo.
    await user.type(within(dialog).getByLabelText('Código'), '2');
    expect(bloco).not.toHaveTextContent('Já existe');
    expect(scrollIntoView).toHaveBeenCalledTimes(1);
  });

  it('a ordem sugerida abre no campo e a dica explica o desempate', () => {
    const dialog = renderDialog({ newBoxSortOrder: 4 });
    const ordem = within(dialog).getByLabelText('Ordem de exibição');

    expect(ordem).toHaveValue('4');
    expect(ordem).toHaveAccessibleDescription(
      'Menor número aparece primeiro; empate ordena pelo código.',
    );
  });
});

describe('ShippingBoxFormDialog — envio único', () => {
  it('duplo clique em Criar caixa grava uma vez só', async () => {
    const user = userEvent.setup();
    const dialog = renderDialog();
    await fillBoxP(user, dialog);
    await user.dblClick(within(dialog).getByTestId('admin-save-btn'));

    expect(onSave).toHaveBeenCalledTimes(1);
  });

  it('com o salvar em andamento, nem o envio direto do formulário grava', () => {
    const dialog = renderDialog({ saving: true });
    // O submit sobe do campo até o formulário, como o Enter faz.
    fireEvent.submit(within(dialog).getByLabelText('Nome'));

    expect(onSave).not.toHaveBeenCalled();
  });

  it('terminado o salvar sem fechar (código recusado), o envio volta a funcionar', async () => {
    const user = userEvent.setup();
    const { rerender } = render(dialogElement());
    const dialog = screen.getByRole('dialog');
    await fillBoxP(user, dialog);
    await user.click(within(dialog).getByTestId('admin-save-btn'));
    expect(onSave).toHaveBeenCalledTimes(1);

    rerender(dialogElement({ saving: true }));
    rerender(dialogElement({ saving: false }));
    await user.click(within(dialog).getByTestId('admin-save-btn'));

    expect(onSave).toHaveBeenCalledTimes(2);
  });

  it('fechar e abrir de novo zera o envio em andamento', async () => {
    const user = userEvent.setup();
    const { rerender } = render(dialogElement());
    await fillBoxP(user, screen.getByRole('dialog'));
    await user.click(screen.getByTestId('admin-save-btn'));
    expect(onSave).toHaveBeenCalledTimes(1);

    rerender(dialogElement({ open: false }));
    rerender(dialogElement({ open: true }));
    const reaberto = screen.getByRole('dialog');
    await fillBoxP(user, reaberto);
    await user.click(within(reaberto).getByTestId('admin-save-btn'));

    expect(onSave).toHaveBeenCalledTimes(2);
  });
});

describe('ShippingBoxFormDialog — durante o salvar', () => {
  it('mostra o ícone de carregando e trava botão, campos, chave e Avançado', () => {
    const dialog = renderDialog({ saving: true });

    expect(within(dialog).getByTestId('admin-save-btn')).toBeDisabled();
    expect(
      within(dialog).getByTestId('admin-save-btn').querySelector('.animate-spin'),
    ).not.toBeNull();
    for (const rotulo of [
      'Código',
      'Nome',
      'Altura externa (cm)',
      'Peso máximo (kg)',
      'Ordem de exibição',
    ]) {
      expect(within(dialog).getByLabelText(rotulo)).toBeDisabled();
    }
    expect(within(dialog).getByRole('switch')).toBeDisabled();
    expect(within(dialog).getByRole('button', { name: 'Avançado' })).toBeDisabled();
  });

  it('sem salvar, nada está travado e não há ícone de carregando', () => {
    const dialog = renderDialog();

    expect(within(dialog).getByTestId('admin-save-btn')).toBeEnabled();
    expect(dialog.querySelector('.animate-spin')).toBeNull();
    expect(within(dialog).getByLabelText('Nome')).toBeEnabled();
    expect(within(dialog).getByRole('switch')).toBeEnabled();
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
