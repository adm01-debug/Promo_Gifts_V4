/**
 * Tela `/admin/frete`. Os hooks de `@/hooks/freight` são mockados: aqui o que
 * se trava é o que a tela mostra em cada estado, o que bloqueia o salvar e o
 * que ela entrega ao hook de gravação (que é quem grava e dispara o toast).
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import type { FreightSettingsRow } from '@/services/freightSettingsService';

interface SettingsState {
  row: FreightSettingsRow | null;
  isLoading: boolean;
  isFetching: boolean;
  isError: boolean;
}

const h = vi.hoisted(() => {
  const state: SettingsState = { row: null, isLoading: false, isFetching: false, isError: false };
  return { state, refetch: vi.fn(), mutate: vi.fn(), update: { isPending: false } };
});

vi.mock('@/hooks/freight', () => ({
  useFreightSettings: () => ({
    ...h.state,
    settings: null,
    error: null,
    refetch: h.refetch,
  }),
  useUpdateFreightSettings: () => ({ mutate: h.mutate, isPending: h.update.isPending }),
  useBusinessCalendarYear: () => ({
    rows: [],
    isLoading: false,
    isFetching: false,
    isError: false,
    error: null,
    refetch: vi.fn(),
  }),
  useBusinessCalendarMutations: () => ({
    create: { mutate: vi.fn(), isPending: false },
    updateDescription: { mutate: vi.fn(), isPending: false },
    remove: { mutate: vi.fn(), isPending: false },
  }),
}));

vi.mock('@/components/seo/PageSEO', () => ({
  PageSEO: (props: { title: string; path?: string; noIndex?: boolean }) => (
    <div
      data-testid="page-seo"
      data-title={props.title}
      data-path={props.path}
      data-noindex={String(props.noIndex)}
    />
  ),
}));

import AdminFreteSettingsPage from '../AdminFreteSettingsPage';

/** A linha como nasce na migration, com os padrões confirmados pelo dono. */
const LINHA: FreightSettingsRow = {
  id: true,
  origin_cep: '03377-000',
  cubic_divisor_correios: 6000,
  cubic_divisor_rodoviario: 3333,
  default_fill_factor: 0.9,
  internal_buffer_days: 0,
  multi_personalization_rule: 'max',
  updated_at: '2026-11-19T21:31:00Z',
  updated_by: null,
};

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/admin/frete']}>
      <AdminFreteSettingsPage />
    </MemoryRouter>,
  );
}

const botaoSalvar = () => screen.getByRole('button', { name: 'Salvar' });

beforeEach(() => {
  vi.clearAllMocks();
  h.state = { row: LINHA, isLoading: false, isFetching: false, isError: false };
  h.update.isPending = false;
});

describe('AdminFreteSettingsPage — estados', () => {
  it('mostra título, SEO e container padrão mesmo enquanto carrega', () => {
    h.state = { row: null, isLoading: true, isFetching: true, isError: false };
    const { container } = renderPage();

    const seo = screen.getByTestId('page-seo');
    expect(seo).toHaveAttribute('data-title', 'Parâmetros de frete');
    expect(seo).toHaveAttribute('data-path', '/admin/frete');
    expect(seo).toHaveAttribute('data-noindex', 'true');
    expect(screen.getByTestId('page-title-frete')).toHaveTextContent('Parâmetros de frete');
    expect(container.querySelector('[class*="max-w-"][class*="mx-auto"]')).not.toBeNull();

    expect(screen.getByRole('status')).toHaveTextContent('Carregando parâmetros de frete...');
    expect(screen.queryByTestId('freight-settings-form')).not.toBeInTheDocument();
  });

  it('em erro avisa e deixa tentar de novo', async () => {
    h.state = { row: null, isLoading: false, isFetching: false, isError: true };
    renderPage();

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Não foi possível carregar os parâmetros de frete. Tente novamente.',
    );
    expect(screen.getByTestId('page-title-frete')).toBeInTheDocument();
    expect(screen.queryByTestId('freight-settings-form')).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }));
    expect(h.refetch).toHaveBeenCalledTimes(1);
  });

  it('não quebra quando a linha não está visível', () => {
    h.state = { row: null, isLoading: false, isFetching: false, isError: false };
    renderPage();

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Os parâmetros de frete não foram encontrados.',
    );
    expect(screen.queryByTestId('freight-settings-form')).not.toBeInTheDocument();
  });

  it('preenche o formulário com a linha salva', () => {
    renderPage();

    expect(screen.getByLabelText('CEP de origem')).toHaveValue('03377-000');
    expect(screen.getByLabelText('Divisor de cubagem — Correios')).toHaveValue('6000');
    expect(screen.getByLabelText('Divisor de cubagem — Rodoviário')).toHaveValue('3333');
    // 0.9 do banco aparece com vírgula e duas casas.
    expect(screen.getByLabelText('Fator de aproveitamento padrão')).toHaveValue('0,90');
    expect(screen.getByLabelText('Folga interna (dias úteis)')).toHaveValue('0');
    expect(screen.getByRole('radio', { name: /Usar o maior prazo/ })).toBeChecked();
    expect(screen.getByRole('radio', { name: /Somar os prazos/ })).not.toBeChecked();
  });

  it('mostra quando foi a última alteração', () => {
    renderPage();
    // 21:31 UTC − 3 h (America/Sao_Paulo, sem horário de verão) = 18:31 do mesmo dia 19/11.
    expect(screen.getByTestId('freight-settings-updated-at')).toHaveTextContent(
      'Atualizado em 19/11/2026 18:31',
    );
  });
});

describe('AdminFreteSettingsPage — salvar', () => {
  it('sem alteração o botão Salvar fica desabilitado', () => {
    renderPage();
    expect(botaoSalvar()).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Desfazer alterações' })).toBeDisabled();
  });

  it('aplica a máscara 00000-000 enquanto o CEP é digitado', async () => {
    const user = userEvent.setup();
    renderPage();
    const cep = screen.getByLabelText('CEP de origem');

    await user.clear(cep);
    await user.type(cep, '01310100');

    // 8 dígitos: 01310 + hífen + 100.
    expect(cep).toHaveValue('01310-100');
  });

  it('CEP inválido bloqueia o salvar e não chama o update', async () => {
    const user = userEvent.setup();
    renderPage();
    const cep = screen.getByLabelText('CEP de origem');

    await user.clear(cep);
    await user.type(cep, '0337');
    await user.click(botaoSalvar());

    expect(h.mutate).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Informe o CEP completo, no formato 00000-000.',
    );
    expect(cep).toHaveAttribute('aria-invalid', 'true');
  });

  it('salvar 6000 → 5000 envia só o divisor dos Correios', async () => {
    const user = userEvent.setup();
    renderPage();
    const divisor = screen.getByLabelText('Divisor de cubagem — Correios');

    await user.clear(divisor);
    await user.type(divisor, '5000');
    expect(botaoSalvar()).toBeEnabled();
    await user.click(botaoSalvar());

    expect(h.mutate).toHaveBeenCalledTimes(1);
    expect(h.mutate).toHaveBeenCalledWith({ cubic_divisor_correios: 5000 }, expect.anything());
  });

  it('envia junto todos os campos alterados, já convertidos', async () => {
    const user = userEvent.setup();
    renderPage();

    const fator = screen.getByLabelText('Fator de aproveitamento padrão');
    await user.clear(fator);
    await user.type(fator, '0,85');
    const folga = screen.getByLabelText('Folga interna (dias úteis)');
    await user.clear(folga);
    await user.type(folga, '2');
    await user.click(screen.getByRole('radio', { name: /Somar os prazos/ }));
    await user.click(botaoSalvar());

    // "0,85" vira o número 0.85; "2" vira 2; a opção "Somar os prazos" é 'sum'.
    expect(h.mutate).toHaveBeenCalledWith(
      {
        default_fill_factor: 0.85,
        internal_buffer_days: 2,
        multi_personalization_rule: 'sum',
      },
      expect.anything(),
    );
  });

  it.each([
    ['Fator de aproveitamento padrão', '1,20', 'Use um valor entre 0,50 e 1,00'],
    ['Divisor de cubagem — Rodoviário', '0', 'Use um valor entre 1000 e 10000.'],
    [
      'Divisor de cubagem — Correios',
      '6.000',
      'Use só algarismos, sem ponto nem vírgula, maior que zero (ex.: 6000).',
    ],
    ['Folga interna (dias úteis)', '1,5', 'Use só algarismos, sem ponto nem vírgula (ex.: 2).'],
    ['Folga interna (dias úteis)', '61', 'Use um valor entre 0 e 60 dias.'],
  ])('%s = "%s" mostra o erro e não salva', async (rotulo, texto, mensagem) => {
    const user = userEvent.setup();
    renderPage();
    const campo = screen.getByLabelText(rotulo);

    await user.clear(campo);
    await user.type(campo, texto);
    await user.click(botaoSalvar());

    expect(h.mutate).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveTextContent(mensagem);
  });

  it('escrever o mesmo valor de outro jeito não habilita o salvar', async () => {
    const user = userEvent.setup();
    renderPage();
    const fator = screen.getByLabelText('Fator de aproveitamento padrão');

    await user.clear(fator);
    await user.type(fator, '0.9');

    // 0.9 e 0,90 são o mesmo fator: nada mudou.
    expect(botaoSalvar()).toBeDisabled();
  });

  it('Desfazer alterações volta ao valor salvo', async () => {
    const user = userEvent.setup();
    renderPage();
    const divisor = screen.getByLabelText('Divisor de cubagem — Correios');

    await user.clear(divisor);
    await user.type(divisor, '5000');
    await user.click(screen.getByRole('button', { name: 'Desfazer alterações' }));

    expect(divisor).toHaveValue('6000');
    expect(botaoSalvar()).toBeDisabled();
    expect(h.mutate).not.toHaveBeenCalled();
  });

  it('enquanto salva, o botão fica desabilitado', async () => {
    const user = userEvent.setup();
    const { rerender } = renderPage();
    const divisor = screen.getByLabelText('Divisor de cubagem — Correios');
    await user.clear(divisor);
    await user.type(divisor, '5000');

    h.update.isPending = true;
    rerender(
      <MemoryRouter initialEntries={['/admin/frete']}>
        <AdminFreteSettingsPage />
      </MemoryRouter>,
    );

    expect(botaoSalvar()).toBeDisabled();
  });

  it('enquanto salva, nenhum campo aceita digitação', () => {
    h.update.isPending = true;
    renderPage();

    for (const campo of screen.getAllByRole('textbox')) expect(campo).toBeDisabled();
    // 5 campos de texto + 2 opções da regra de personalização = 7 controles travados
    expect(screen.getAllByRole('textbox')).toHaveLength(5);
    for (const opcao of screen.getAllByRole('radio')) expect(opcao).toBeDisabled();
    expect(screen.getAllByRole('radio')).toHaveLength(2);
  });

  it('enquanto relê a linha salva, campos e opções ficam travados e nada é enviado', async () => {
    h.state = { ...h.state, isFetching: true };
    const user = userEvent.setup();
    renderPage();
    const folga = screen.getByLabelText('Folga interna (dias úteis)');

    for (const campo of screen.getAllByRole('textbox')) expect(campo).toBeDisabled();
    for (const opcao of screen.getAllByRole('radio')) expect(opcao).toBeDisabled();
    // Digitar durante a releitura não entra: seria descartado quando ela chegasse.
    await user.type(folga, '2');
    await user.click(screen.getByRole('radio', { name: /Somar os prazos/ }));
    expect(folga).toHaveValue('0');
    expect(screen.getByRole('radio', { name: /Usar o maior prazo/ })).toBeChecked();
    expect(botaoSalvar()).toBeDisabled();
    expect(h.mutate).not.toHaveBeenCalled();
  });

  it('terminada a releitura, os campos voltam a aceitar digitação', () => {
    renderPage();

    for (const campo of screen.getAllByRole('textbox')) expect(campo).toBeEnabled();
    for (const opcao of screen.getAllByRole('radio')) expect(opcao).toBeEnabled();
  });

  it('a dica do fator padrão diz para que ele serve: sugestão na caixa nova', () => {
    renderPage();

    expect(screen.getByLabelText('Fator de aproveitamento padrão')).toHaveAccessibleDescription(
      /Valor sugerido ao cadastrar uma caixa nova\./,
    );
  });

  it('recarrega os campos quando a linha salva muda', () => {
    const { rerender } = renderPage();
    expect(screen.getByLabelText('Divisor de cubagem — Correios')).toHaveValue('6000');

    h.state = {
      ...h.state,
      row: { ...LINHA, cubic_divisor_correios: 5000, updated_at: '2026-11-20T12:00:00Z' },
    };
    rerender(
      <MemoryRouter initialEntries={['/admin/frete']}>
        <AdminFreteSettingsPage />
      </MemoryRouter>,
    );

    expect(screen.getByLabelText('Divisor de cubagem — Correios')).toHaveValue('5000');
    // 12:00 UTC − 3 h = 09:00 do dia 20/11.
    expect(screen.getByTestId('freight-settings-updated-at')).toHaveTextContent(
      'Atualizado em 20/11/2026 09:00',
    );
  });

  it('a aba Feriados abre o cadastro de feriados', async () => {
    renderPage();
    expect(screen.getByRole('tab', { name: 'Parâmetros' })).toHaveAttribute(
      'aria-selected',
      'true',
    );

    await userEvent.click(screen.getByRole('tab', { name: 'Feriados' }));

    expect(screen.getByRole('heading', { name: 'Feriados' })).toBeInTheDocument();
    expect(screen.getByText(/Nenhum feriado cadastrado em/)).toBeInTheDocument();
  });
});

describe('AdminFreteSettingsPage — foco', () => {
  const scrollIntoView = vi.mocked(Element.prototype.scrollIntoView);

  it('salvar recusado pela validação rola e foca o primeiro campo inválido', async () => {
    const user = userEvent.setup();
    renderPage();
    const fator = screen.getByLabelText('Fator de aproveitamento padrão');
    const folga = screen.getByLabelText('Folga interna (dias úteis)');
    // Fator (1,20 passa de 1,00) e folga (61 passa de 60) inválidos: vale o primeiro da tela.
    await user.clear(fator);
    await user.type(fator, '1,20');
    await user.clear(folga);
    await user.type(folga, '61');
    scrollIntoView.mockClear();
    await user.click(botaoSalvar());

    expect(h.mutate).not.toHaveBeenCalled();
    expect(scrollIntoView).toHaveBeenCalledTimes(1);
    expect(scrollIntoView.mock.contexts[0]).toBe(fator);
    expect(fator).toHaveFocus();
  });

  it('salvar válido não rola nem tira o foco do botão', async () => {
    const user = userEvent.setup();
    renderPage();
    const divisor = screen.getByLabelText('Divisor de cubagem — Correios');
    await user.clear(divisor);
    await user.type(divisor, '5000');
    scrollIntoView.mockClear();
    await user.click(botaoSalvar());

    expect(scrollIntoView).not.toHaveBeenCalled();
    expect(h.mutate).toHaveBeenCalledTimes(1);
  });

  it('depois de salvar, o formulário remontado devolve o foco ao primeiro campo', async () => {
    h.mutate.mockImplementation((_patch: unknown, options?: { onSuccess?: () => void }) =>
      options?.onSuccess?.(),
    );
    const user = userEvent.setup();
    const { rerender } = renderPage();
    const divisor = screen.getByLabelText('Divisor de cubagem — Correios');
    await user.clear(divisor);
    await user.type(divisor, '5000');
    await user.click(botaoSalvar());
    expect(screen.getByLabelText('CEP de origem')).not.toHaveFocus();

    h.state = {
      ...h.state,
      row: { ...LINHA, cubic_divisor_correios: 5000, updated_at: '2026-11-20T12:00:00Z' },
    };
    rerender(
      <MemoryRouter initialEntries={['/admin/frete']}>
        <AdminFreteSettingsPage />
      </MemoryRouter>,
    );

    expect(screen.getByLabelText('CEP de origem')).toHaveFocus();
  });

  it('a linha mudar sem um salvar desta tela não rouba o foco', () => {
    const { rerender } = renderPage();

    h.state = { ...h.state, row: { ...LINHA, updated_at: '2026-11-20T12:00:00Z' } };
    rerender(
      <MemoryRouter initialEntries={['/admin/frete']}>
        <AdminFreteSettingsPage />
      </MemoryRouter>,
    );

    expect(screen.getByLabelText('CEP de origem')).not.toHaveFocus();
  });
});
