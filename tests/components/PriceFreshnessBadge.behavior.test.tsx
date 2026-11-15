import { render, screen, fireEvent } from '@testing-library/react';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { PriceFreshnessBadge } from '@/components/products/PriceFreshnessBadge';

const NOW = new Date('2026-06-15T12:00:00.000Z').getTime();
const ago = (days: number) => new Date(NOW - days * 86400000).toISOString();
beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(NOW);
});
afterEach(() => vi.useRealTimers());

describe('confirmação de preço', () => {
  it('confirma uma vez sem acionar o contêiner ou navegação', () => {
    const onConfirm = vi.fn();
    const onParent = vi.fn();
    render(
      <div onClick={onParent}>
        <PriceFreshnessBadge priceUpdatedAt={ago(90)} onConfirm={onConfirm} />
      </div>,
    );
    expect(
      fireEvent.click(
        screen.getByRole('button', { name: 'Confirmar que validei este preço com o fornecedor' }),
      ),
    ).toBe(false);
    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onParent).not.toHaveBeenCalled();
  });
  it('oferece CTA curto para aging compacto', () => {
    render(<PriceFreshnessBadge priceUpdatedAt={ago(35)} variant="compact" onConfirm={vi.fn()} />);
    expect(screen.getByRole('button')).toHaveTextContent('Confirmei');
  });
  it.each([ago(1), null])('não oferece confirmação sem alerta %j', (priceUpdatedAt) => {
    render(<PriceFreshnessBadge priceUpdatedAt={priceUpdatedAt} onConfirm={vi.fn()} />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
  it.each(['inline', 'compact', 'icon-only', 'pdp'] as const)(
    'confirmação substitui alerta na variante %s',
    (variant) => {
      render(
        <PriceFreshnessBadge
          priceUpdatedAt={ago(90)}
          variant={variant}
          confirmedAt={new Date(NOW)}
          onConfirm={vi.fn()}
        />,
      );
      expect(screen.getByRole('status')).toHaveAccessibleName('Preço confirmado por você agora');
      expect(screen.queryByRole('button')).not.toBeInTheDocument();
    },
  );
  it('confirmação não suprime o estado fresh', () => {
    render(<PriceFreshnessBadge priceUpdatedAt={ago(1)} confirmedAt={ago(0)} />);
    expect(screen.getByRole('status')).not.toHaveAccessibleName(/confirmado por você/);
  });
  it.each([
    [NOW, 'agora'],
    [NOW - 10 * 60000, 'há 10 min'],
    [NOW - 2 * 3600000, 'há 2h'],
    [NOW - 86400000, 'ontem'],
    [NOW - 2 * 86400000, 'há 2 dias'],
    [NOW - 31 * 86400000, '15 de maio de 2026'],
    [NaN, 'agora'],
    [NOW + 86400000, 'agora'],
  ])('explica quando o preço foi confirmado: %s => %s', (ms, label) => {
    render(<PriceFreshnessBadge priceUpdatedAt={ago(90)} confirmedAt={new Date(ms)} />);
    expect(screen.getByRole('status')).toHaveAccessibleName(`Preço confirmado por você ${label}`);
  });
});

describe('tooltip com informação verificável', () => {
  it.each([
    [new Date(NOW - 86400000), 'Atualizado'],
    [ago(35), 'Próximo do limite'],
    [ago(90), 'Possivelmente defasado'],
    [null, 'Sem informação'],
    ['invalid', 'Sem informação'],
  ])('exibe data, classificação e regra ao receber foco %j', async (priceUpdatedAt, status) => {
    render(<PriceFreshnessBadge priceUpdatedAt={priceUpdatedAt} variant="icon-only" alwaysShow />);
    fireEvent.focus(screen.getByRole('status'));
    const tip = await screen.findByRole('tooltip');
    expect(tip).toHaveTextContent(status);
    expect(tip).toHaveTextContent('Regra de Preços: Até 30 dias');
    if (priceUpdatedAt === null || priceUpdatedAt === 'invalid')
      expect(tip).toHaveTextContent('O fornecedor não informou a data');
    if (status === 'Possivelmente defasado')
      expect(tip).toHaveTextContent('Confirme o valor com o fornecedor');
    if (status === 'Próximo do limite') expect(tip).toHaveTextContent('Recomendamos confirmar');
  });
});
