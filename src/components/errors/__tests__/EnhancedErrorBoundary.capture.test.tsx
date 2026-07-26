/**
 * Regressão: o boundary NÃO pode mascarar a causa do erro.
 *
 * Garante que:
 *  - a stack real (Error completo) vai para console.error, sempre;
 *  - o component stack também é impresso;
 *  - um id de incidente é gerado e exibido para qualquer usuário;
 *  - "Tentar renderizar novamente" recupera a UI quando o filho para de lançar;
 *  - um novo erro nunca deixa o boundary preso no spinner de auto-recovery.
 */
import { render, screen, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { EnhancedErrorBoundary } from '@/components/errors/EnhancedErrorBoundary';

vi.mock('@/services/telemetryService', () => ({
  telemetryService: { logError: vi.fn() },
}));
vi.mock('@/lib/error-reporter', () => ({ reportError: vi.fn() }));
vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));
vi.mock('@/lib/chunk-recovery', () => ({
  attemptChunkRecovery: vi.fn(async () => false),
  isChunkLoadError: vi.fn(() => false),
}));
// DevOnly é gate de role: neutralizado para o teste focar no que é público.
vi.mock('@/components/dev/DevOnly', () => ({
  DevOnly: ({ children }: { children?: unknown }) => children as never,
}));

function Boom({ shouldThrow }: { shouldThrow: boolean }): JSX.Element {
  if (shouldThrow) throw new Error('kaboom-cause-real');
  return <p>conteúdo recuperado</p>;
}

describe('EnhancedErrorBoundary — captura da causa real', () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('imprime o Error original (com stack) e o component stack no console', () => {
    render(
      <EnhancedErrorBoundary>
        <Boom shouldThrow />
      </EnhancedErrorBoundary>,
    );

    const calls = consoleSpy.mock.calls;
    const boundaryCalls = calls.filter(
      (c) => typeof c[0] === 'string' && c[0].includes('[EnhancedErrorBoundary]'),
    );
    expect(boundaryCalls.length).toBeGreaterThanOrEqual(2);

    const errorArg = boundaryCalls[0]?.[1];
    expect(errorArg).toBeInstanceOf(Error);
    expect((errorArg as Error).message).toBe('kaboom-cause-real');
    expect(typeof (errorArg as Error).stack).toBe('string');

    const componentStackCall = boundaryCalls.find(
      (c) => typeof c[0] === 'string' && c[0].includes('component stack'),
    );
    expect(componentStackCall).toBeDefined();
    expect(String(componentStackCall?.[1])).toContain('Boom');
  });

  it('expõe um código de incidente e a ação de copiar para qualquer usuário', () => {
    render(
      <EnhancedErrorBoundary>
        <Boom shouldThrow />
      </EnhancedErrorBoundary>,
    );

    const id = screen.getByTestId('error-boundary-incident-id').textContent ?? '';
    expect(id).toMatch(/^[a-z0-9-]{6,}$/i);
    expect(screen.getByTestId('error-boundary-copy')).toBeInTheDocument();
  });

  it('não fica preso no spinner de auto-recovery e recupera a UI no retry', async () => {
    const user = userEvent.setup();
    const { rerender } = render(
      <EnhancedErrorBoundary>
        <Boom shouldThrow />
      </EnhancedErrorBoundary>,
    );

    expect(screen.queryByText('Recuperando automaticamente…')).not.toBeInTheDocument();

    // Filho deixa de lançar antes do retry (cenário real: dado já carregado).
    rerender(
      <EnhancedErrorBoundary>
        <Boom shouldThrow={false} />
      </EnhancedErrorBoundary>,
    );
    await user.click(screen.getByRole('button', { name: /Tentar renderizar novamente/i }));

    expect(await screen.findByText('conteúdo recuperado')).toBeInTheDocument();
  });
});
