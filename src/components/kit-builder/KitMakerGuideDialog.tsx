/**
 * Kit Maker Guide Dialog
 * Substitui o antigo atalho "Ver tutoriais" / "Guia do Kit Maker" que sempre
 * reabria o KitOnboardingTour genérico — agora mostra conteúdo real por
 * capítulo, já aberto no capítulo correspondente ao passo atual do builder.
 */
import { useEffect, useState } from 'react';
import { BookOpen } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { KIT_MAKER_GUIDE_CHAPTERS, type KitMakerGuideChapterId } from '@/lib/kit-builder';

interface KitMakerGuideDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Capítulo aberto ao exibir o diálogo. Padrão: o primeiro capítulo (Itens). */
  initialChapter?: KitMakerGuideChapterId;
}

export function KitMakerGuideDialog({
  open,
  onOpenChange,
  initialChapter,
}: KitMakerGuideDialogProps) {
  const [activeChapter, setActiveChapter] = useState<KitMakerGuideChapterId>(
    initialChapter ?? KIT_MAKER_GUIDE_CHAPTERS[0].id,
  );

  // Reabrir o guia num passo diferente deve pular direto para o capítulo
  // correspondente, mesmo que o usuário tenha navegado por outra aba antes.
  useEffect(() => {
    if (open) setActiveChapter(initialChapter ?? KIT_MAKER_GUIDE_CHAPTERS[0].id);
  }, [open, initialChapter]);

  const chapter =
    KIT_MAKER_GUIDE_CHAPTERS.find((c) => c.id === activeChapter) ?? KIT_MAKER_GUIDE_CHAPTERS[0];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-display">
            <BookOpen className="h-5 w-5 text-primary" /> Guia do Kit Maker
          </DialogTitle>
          <DialogDescription>Como funciona cada etapa da montagem do kit</DialogDescription>
        </DialogHeader>
        <div className="-mx-6 -mb-6 grid grid-cols-[9rem_1fr] border-t">
          <nav className="space-y-1 border-r p-3" aria-label="Capítulos do guia">
            {KIT_MAKER_GUIDE_CHAPTERS.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setActiveChapter(c.id)}
                aria-current={c.id === activeChapter ? 'true' : undefined}
                className={cn(
                  'block w-full rounded-md px-2.5 py-2 text-left text-sm transition-colors',
                  c.id === activeChapter
                    ? 'bg-primary/10 font-semibold text-primary'
                    : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground',
                )}
              >
                {c.title}
              </button>
            ))}
          </nav>
          <div className="p-5">
            <h3 className="mb-2 font-display text-base font-semibold">{chapter.title}</h3>
            <p className="text-sm leading-relaxed text-muted-foreground">{chapter.content}</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
