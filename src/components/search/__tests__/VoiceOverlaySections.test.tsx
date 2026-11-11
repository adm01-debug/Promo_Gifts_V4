import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

vi.mock('framer-motion', async () => {
  const R = await import('react');
  const MOTION_PROPS = new Set(['initial', 'animate', 'exit', 'transition']);
  const factory = (tag: string) =>
    ({ children, ...rest }: Record<string, unknown> & { children?: React.ReactNode }) => {
      const domProps = Object.fromEntries(Object.entries(rest).filter(([k]) => !MOTION_PROPS.has(k)));
      return R.createElement(tag, domProps, children);
    };
  return {
    m: { div: factory('div'), p: factory('p') },
    AnimatePresence: ({ children }: { children?: React.ReactNode }) => R.createElement(R.Fragment, null, children),
  };
});

import { VoiceSuggestions, VoiceTextInput, VoiceOverlayFooter } from '../voice/VoiceOverlaySections';

describe('VoiceSuggestions', () => {
  it('só aparece na fase idle e fora do boot', () => {
    const { container, rerender } = render(<VoiceSuggestions phase="listening" showBooting={false} />);
    expect(container).toBeEmptyDOMElement();
    rerender(<VoiceSuggestions phase="idle" showBooting />);
    expect(container).toBeEmptyDOMElement();
  });

  it('sem histórico sugere comandos padrão', () => {
    const onCommandSelect = vi.fn();
    render(<VoiceSuggestions phase="idle" showBooting={false} onCommandSelect={onCommandSelect} />);
    expect(screen.getByText('Experimente dizer')).toBeInTheDocument();
    fireEvent.click(screen.getByText('"Abre os orçamentos"'));
    expect(onCommandSelect).toHaveBeenCalledWith('Abre os orçamentos');
  });

  it('com histórico mostra no máximo 4 comandos recentes', () => {
    const onCommandSelect = vi.fn();
    const recent = Array.from({ length: 6 }, (_, i) => ({
      timestamp: i,
      transcript: `comando ${i}`,
    })) as unknown as React.ComponentProps<typeof VoiceSuggestions>['recentCommands'];
    render(
      <VoiceSuggestions phase="idle" showBooting={false} recentCommands={recent} onCommandSelect={onCommandSelect} />,
    );
    expect(screen.getByText('Comandos recentes')).toBeInTheDocument();
    expect(screen.getAllByRole('button')).toHaveLength(4);
    fireEvent.click(screen.getByText('"comando 2"'));
    expect(onCommandSelect).toHaveBeenCalledWith('comando 2');
  });
});

describe('VoiceTextInput', () => {
  it('começa oculto (rodapé interno não renderiza nada)', () => {
    const { container } = render(<VoiceTextInput phase="idle" />);
    expect(container).toBeEmptyDOMElement();
  });
});

describe('VoiceOverlayFooter', () => {
  it('mostra atalhos e dispara fechar/digitar', () => {
    const onClose = vi.fn();
    const onToggleTextInput = vi.fn();
    render(<VoiceOverlayFooter onClose={onClose} onToggleTextInput={onToggleTextInput} />);
    expect(screen.getByText('ESC')).toBeInTheDocument();
    expect(screen.getByText('SPACE')).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText('Digitar comando'));
    fireEvent.click(screen.getByLabelText('Fechar assistente de voz'));
    expect(onToggleTextInput).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
