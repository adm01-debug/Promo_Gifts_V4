import { ArrowLeftRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface SwapItemBannerProps {
  displayName: string;
  /** Navigates to the items step, in replace mode (FT-129) or plain edit mode. */
  onSwap: () => void;
}

/** Faixa "Configurando: <item>" com o botão "Trocar item" do passo de personalização. */
export function SwapItemBanner({ displayName, onSwap }: SwapItemBannerProps) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-dashed px-3 py-2">
      <span className="truncate text-sm text-muted-foreground">
        Configurando: <strong className="text-foreground">{displayName}</strong>
      </span>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-auto shrink-0 gap-1.5 px-2 py-1 text-xs"
        onClick={onSwap}
      >
        <ArrowLeftRight className="h-3 w-3" />
        Trocar item
      </Button>
    </div>
  );
}
