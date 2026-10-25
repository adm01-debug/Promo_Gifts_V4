/**
 * AnonymizeAccountDialog — LGPD, direito ao esquecimento (self-service).
 * Chama a edge `anonymize-user`, que exige a frase de confirmação; em caso de
 * sucesso a conta fica banida, então a sessão local é encerrada em seguida.
 */
import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { logger } from '@/lib/logger';

const CONFIRM_PHRASE = 'EXCLUIR MINHA CONTA';

interface AnonymizeAccountDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AnonymizeAccountDialog({ open, onOpenChange }: AnonymizeAccountDialogProps) {
  const { signOut } = useAuth();
  const [phrase, setPhrase] = useState('');
  const [loading, setLoading] = useState(false);

  const handleOpenChange = (next: boolean) => {
    if (loading) return;
    if (!next) setPhrase('');
    onOpenChange(next);
  };

  const handleConfirm = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.functions.invoke('anonymize-user', {
        body: { confirm_phrase: CONFIRM_PHRASE },
      });
      if (error) throw error;
      toast.success('Conta anonimizada', {
        description: 'Seus dados pessoais foram removidos e o acesso foi encerrado.',
      });
      onOpenChange(false);
      try {
        await signOut();
      } catch (err) {
        logger.error('[AnonymizeAccountDialog] signOut error:', err);
      }
    } catch (err) {
      logger.error('[AnonymizeAccountDialog] anonymize error:', err);
      toast.error('Não foi possível anonimizar a conta', {
        description: 'Nada foi alterado de forma irreversível. Tente novamente ou contate o suporte.',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Excluir meus dados (LGPD)</DialogTitle>
          <DialogDescription>
            Esta ação é irreversível: seu nome, e-mail, telefone e foto são anonimizados, o histórico
            de logins é apagado e o acesso à conta é bloqueado. Orçamentos e pedidos permanecem sem
            identificação pessoal. Digite <strong>{CONFIRM_PHRASE}</strong> para confirmar.
          </DialogDescription>
        </DialogHeader>
        <Input
          value={phrase}
          onChange={(e) => setPhrase(e.target.value)}
          placeholder={CONFIRM_PHRASE}
          aria-label="Frase de confirmação"
          autoComplete="off"
          disabled={loading}
        />
        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={loading}>
            Cancelar
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={loading || phrase !== CONFIRM_PHRASE}
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Excluir meus dados
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
