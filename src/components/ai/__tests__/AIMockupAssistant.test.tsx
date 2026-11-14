import type { ReactNode } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, afterEach } from 'vitest';

vi.mock('framer-motion', () => {
  const Div = ({
    children,
    className,
  }: {
    children?: ReactNode;
    className?: string;
    [key: string]: unknown;
  }) => <div className={className}>{children}</div>;
  return {
    m: { div: Div },
    AnimatePresence: ({ children }: { children?: ReactNode }) => <>{children}</>,
  };
});

import { AIMockupAssistant } from '../AIMockupAssistant';

afterEach(() => {
  vi.unstubAllEnvs();
});

async function openAssistant() {
  const user = userEvent.setup();
  render(<AIMockupAssistant />);
  await user.click(screen.getByRole('button'));
  return user;
}

describe('AIMockupAssistant — texto livre sem backend', () => {
  it('em produção oculta o campo de texto livre e mantém as ações rápidas', async () => {
    vi.stubEnv('DEV', false);
    const user = await openAssistant();

    expect(screen.queryByPlaceholderText('Pergunte sobre o mockup...')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Enviar pergunta' })).not.toBeInTheDocument();

    const quick = screen.getByRole('button', { name: /Melhor posição/ });
    expect(screen.getByRole('button', { name: /Tamanho ideal/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Cores sugeridas/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Dicas gerais/ })).toBeInTheDocument();

    await user.click(quick);
    expect(screen.getByText(/Posicione a logo no centro-alto/)).toBeInTheDocument();
    expect(screen.queryByText(/está em desenvolvimento\. Em breve/)).not.toBeInTheDocument();
  });

  it('em DEV mantém o campo de texto livre', async () => {
    vi.stubEnv('DEV', true);
    await openAssistant();

    expect(screen.getByPlaceholderText('Pergunte sobre o mockup...')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Enviar pergunta' })).toBeInTheDocument();
  });
});
