import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

type Action = { action: string; response: string };

const h = vi.hoisted(() => ({
  addEntry: vi.fn(),
  reset: vi.fn(),
  simulateCommand: vi.fn(),
  startListening: vi.fn(),
  stopListening: vi.fn(),
  stopSpeaking: vi.fn(),
  capturedOnAction: null as null | ((a: Action) => void),
  lastProps: null as null | Record<string, unknown>,
}));

vi.mock('@/hooks/voice/useVoiceHistory', () => ({
  useVoiceHistory: () => ({ history: [{ id: 'h1', text: 'buscar canecas' }], addEntry: h.addEntry }),
}));

vi.mock('@/hooks/intelligence', () => ({
  useVoiceAgent: ({ onAction }: { onAction: (a: Action) => void }) => {
    h.capturedOnAction = onAction;
    return {
      phase: 'listening',
      partialTranscript: 'parcial',
      finalTranscript: 'final',
      agentResponse: 'resposta',
      error: null,
      currentAction: null,
      reset: h.reset,
      startListening: h.startListening,
      stopListening: h.stopListening,
      stopSpeaking: h.stopSpeaking,
      simulateCommand: h.simulateCommand,
    };
  },
}));

vi.mock('../VoiceSearchOverlay', () => ({
  VoiceSearchOverlay: (props: Record<string, unknown>) => {
    h.lastProps = props;
    return (
      <div>
        <span>{String(props.phase)}</span>
        <button onClick={props.onClose as () => void}>fechar</button>
        <button onClick={() => (props.onCommandSelect as (c: string) => void)('mostrar kits')}>comando</button>
      </div>
    );
  },
}));

import VoiceSearchOverlayConnected from '../VoiceSearchOverlayConnected';

describe('VoiceSearchOverlayConnected', () => {
  beforeEach(() => vi.clearAllMocks());

  it('repassa o estado do agente de voz para o overlay', () => {
    render(<VoiceSearchOverlayConnected isOpen onClose={vi.fn()} />);
    expect(screen.getByText('listening')).toBeInTheDocument();
    expect(h.lastProps).toMatchObject({
      isOpen: true,
      partialTranscript: 'parcial',
      finalTranscript: 'final',
      agentResponse: 'resposta',
      recentCommands: [{ id: 'h1', text: 'buscar canecas' }],
      onStartListening: h.startListening,
      onStopListening: h.stopListening,
      onStopSpeaking: h.stopSpeaking,
    });
  });

  it('fechar chama onClose e reseta o agente', () => {
    const onClose = vi.fn();
    render(<VoiceSearchOverlayConnected isOpen onClose={onClose} />);
    fireEvent.click(screen.getByText('fechar'));
    expect(onClose).toHaveBeenCalled();
    expect(h.reset).toHaveBeenCalled();
  });

  it('selecionar comando simula o comando no agente', () => {
    render(<VoiceSearchOverlayConnected isOpen onClose={vi.fn()} />);
    fireEvent.click(screen.getByText('comando'));
    expect(h.simulateCommand).toHaveBeenCalledWith('mostrar kits');
  });

  it('ações salvam no histórico (exceto answer) e são repassadas', () => {
    const onAction = vi.fn();
    render(<VoiceSearchOverlayConnected isOpen onClose={vi.fn()} onAction={onAction} />);
    const search = { action: 'search', response: 'buscando' };
    h.capturedOnAction?.(search);
    expect(h.addEntry).toHaveBeenCalledWith('buscando', search);
    expect(onAction).toHaveBeenCalledWith(search);

    h.addEntry.mockClear();
    h.capturedOnAction?.({ action: 'answer', response: 'oi' });
    expect(h.addEntry).not.toHaveBeenCalled();
    expect(onAction).toHaveBeenCalledTimes(2);
  });
});
