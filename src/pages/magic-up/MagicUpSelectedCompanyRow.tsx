/**
 * MagicUpSelectedCompanyRow — empresa selecionada no cartão "Empresa" do Magic Up.
 *
 * Mostra a empresa escolhida no CRM (logo, nome, ramo) e expõe a ação de
 * remover. A remoção é destrutiva (limpa a seleção e o logo da empresa), então
 * passa pelo ConfirmDialog do kit antes de chamar `onRemove` (E-22).
 */
import { useState } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import type { SelectedClient } from '@/hooks/intelligence';

interface MagicUpSelectedCompanyRowProps {
  client: SelectedClient;
  /** Chamado somente após a confirmação do usuário. */
  onRemove: () => void;
}

export function MagicUpSelectedCompanyRow({ client, onRemove }: MagicUpSelectedCompanyRowProps) {
  const [confirmOpen, setConfirmOpen] = useState(false);

  return (
    <div className="flex items-center gap-3 rounded-lg border border-primary/20 bg-primary/5 p-2">
      {client.logo_url && (
        <img
          src={client.logo_url}
          alt=""
          className="h-8 w-8 rounded border bg-background object-contain"
          loading="lazy"
        />
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{client.name}</p>
        {client.ramo_atividade && (
          <p className="text-[10px] text-muted-foreground">{client.ramo_atividade}</p>
        )}
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7 shrink-0"
        onClick={() => setConfirmOpen(true)}
        aria-label="Remover empresa"
      >
        <X className="h-3.5 w-3.5" />
      </Button>
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Remover empresa?"
        description={`A empresa ${client.name} sai da configuração e o logo carregado dela também é limpo.`}
        confirmLabel="Remover"
        cancelLabel="Cancelar"
        variant="destructive"
        testId="magic-up-remove-client"
        onConfirm={onRemove}
      />
    </div>
  );
}
