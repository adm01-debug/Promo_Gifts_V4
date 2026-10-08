import { useEffect, useCallback } from 'react';
import { toast } from 'sonner';

interface KeyboardShortcutsProps {
  onGenerate: () => void;
  onReset: () => void;
  onDownload: () => void;
  onStepChange?: (step: number) => void;
  canGenerate: boolean;
  canDownload: boolean;
  isLoading: boolean;
}

// Único atalho global: Ctrl/Cmd + Enter (gerar). Esc, Ctrl+R, Ctrl+D e 1-6 foram removidos
// (destrutivos / sequestravam atalhos do navegador). Limpar o formulário é só pelo botão Limpar.
// onReset/onDownload/onStepChange/canDownload seguem na interface por compatibilidade com o chamador.
export function useKeyboardShortcuts({ onGenerate, canGenerate, isLoading }: KeyboardShortcutsProps) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // Ignore if user is typing in an input/textarea
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return;
      }

      // Ctrl/Cmd + Enter: Generate mockup
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        if (canGenerate && !isLoading) {
          onGenerate();
          toast.info('⌨️ Gerando mockup...', { duration: 1500 });
        } else if (!canGenerate) {
          toast.warning('Complete todos os campos antes de gerar');
        }
        return;
      }
    },
    [canGenerate, isLoading, onGenerate],
  );

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
}

// Component that shows keyboard shortcuts hint
export function KeyboardShortcutsHint({ className }: { className?: string }) {
  return (
    <div className={className}>
      <div className="flex flex-wrap gap-4 text-[10px] text-muted-foreground">
        <span className="flex items-center gap-1">
          <kbd className="rounded bg-muted px-1.5 py-0.5 font-mono text-[9px]">Ctrl</kbd>
          <span>+</span>
          <kbd className="rounded bg-muted px-1.5 py-0.5 font-mono text-[9px]">Enter</kbd>
          <span className="ml-1">Gerar</span>
        </span>
      </div>
    </div>
  );
}
