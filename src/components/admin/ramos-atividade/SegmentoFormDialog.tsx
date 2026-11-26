/**
 * SegmentoFormDialog — criar/editar segmento (`ramo_atividade_filho`).
 *
 * O segmento e o nivel que os produtos referenciam (`produto_ramo_atividade`),
 * por isso o slug dele tambem e UNIQUE — validado antes de chegar ao banco.
 */
import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
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
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { useCreateSegmento, useUpdateSegmento } from '@/hooks/crm/useRamoAtividadeFilho';
import type { RamoAtividadeFilho } from '@/types/ramo-atividade';
import {
  RAMO_ICONE_MAX,
  SEGMENTO_NOME_MAX,
  SEGMENTO_SLUG_MAX,
  sugerirSlug,
  validarSegmento,
  valoresIniciaisSegmento,
  type SegmentoErros,
  type SegmentoFormValues,
} from '@/lib/crm/ramos-catalogo';

interface SegmentoFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ramoId: string;
  ramos: readonly { id: string; nome: string }[];
  /** Ausente = criar; presente = editar. */
  segmento?: RamoAtividadeFilho;
  ordemSugerida: number;
  /** Slugs dos OUTROS segmentos (UNIQUE global entre ramos). */
  slugsOcupados: readonly string[];
}

function MensagemErro({ texto }: { texto?: string }) {
  if (!texto) return null;
  return <p className="mt-1 text-xs text-destructive">{texto}</p>;
}

export function SegmentoFormDialog({
  open,
  onOpenChange,
  ramoId,
  ramos,
  segmento,
  ordemSugerida,
  slugsOcupados,
}: SegmentoFormDialogProps) {
  const criar = useCreateSegmento();
  const atualizar = useUpdateSegmento();
  const [valores, setValores] = useState<SegmentoFormValues>(() =>
    valoresIniciaisSegmento(ramoId, segmento, ordemSugerida),
  );
  const [erros, setErros] = useState<SegmentoErros>({});
  const [slugTocado, setSlugTocado] = useState(Boolean(segmento));

  useEffect(() => {
    if (!open) return;
    setValores(valoresIniciaisSegmento(ramoId, segmento, ordemSugerida));
    setErros({});
    setSlugTocado(Boolean(segmento));
  }, [open, ramoId, segmento, ordemSugerida]);

  const salvando = criar.isPending || atualizar.isPending;

  const alterarNome = (nome: string) => {
    setValores((atual) => ({
      ...atual,
      nome,
      slug: slugTocado ? atual.slug : sugerirSlug(nome, slugsOcupados),
    }));
  };

  const salvar = async () => {
    const resultado = validarSegmento(valores, {
      ramosConhecidos: ramos.map((ramo) => ramo.id),
      slugsOcupados,
    });
    if (!resultado.ok) {
      setErros(resultado.erros);
      return;
    }
    setErros({});
    try {
      if (segmento) {
        await atualizar.mutateAsync({ id: segmento.id, ...resultado.valores });
      } else {
        await criar.mutateAsync(resultado.valores);
      }
      onOpenChange(false);
    } catch {
      /* a mutation ja exibe o erro sanitizado */
    }
  };

  return (
    <Dialog open={open} onOpenChange={(proximo) => !salvando && onOpenChange(proximo)}>
      <DialogContent className="sm:max-w-md" data-testid="segmento-form-dialog">
        <DialogHeader>
          <DialogTitle>{segmento ? 'Editar segmento' : 'Novo segmento'}</DialogTitle>
          <DialogDescription>
            Segmentos ficam dentro de um ramo e sao o vinculo usado pelos produtos.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="segmento-ramo" className="text-xs font-semibold">
              Ramo <span className="text-destructive">*</span>
            </Label>
            <Select
              value={valores.ramoId}
              onValueChange={(ramo) => setValores((atual) => ({ ...atual, ramoId: ramo }))}
            >
              <SelectTrigger
                id="segmento-ramo"
                data-testid="segmento-form-ramo"
                className="mt-1.5 h-9"
              >
                <SelectValue placeholder="Escolha o ramo" />
              </SelectTrigger>
              <SelectContent>
                {ramos.map((ramo) => (
                  <SelectItem key={ramo.id} value={ramo.id}>
                    {ramo.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <MensagemErro texto={erros.ramoId} />
          </div>

          <div>
            <Label htmlFor="segmento-nome" className="text-xs font-semibold">
              Nome <span className="text-destructive">*</span>
            </Label>
            <Input
              id="segmento-nome"
              data-testid="segmento-form-nome"
              className="mt-1.5 h-9"
              maxLength={SEGMENTO_NOME_MAX}
              value={valores.nome}
              aria-invalid={Boolean(erros.nome)}
              onChange={(e) => alterarNome(e.target.value)}
            />
            <MensagemErro texto={erros.nome} />
          </div>

          <div>
            <Label htmlFor="segmento-slug" className="text-xs font-semibold">
              Slug <span className="text-destructive">*</span>
            </Label>
            <Input
              id="segmento-slug"
              data-testid="segmento-form-slug"
              className="mt-1.5 h-9 font-mono"
              maxLength={SEGMENTO_SLUG_MAX}
              value={valores.slug}
              aria-invalid={Boolean(erros.slug)}
              onChange={(e) => {
                setSlugTocado(true);
                setValores((atual) => ({ ...atual, slug: e.target.value }));
              }}
            />
            <MensagemErro texto={erros.slug} />
          </div>

          <div>
            <Label htmlFor="segmento-descricao" className="text-xs font-semibold">
              Descricao
            </Label>
            <Textarea
              id="segmento-descricao"
              data-testid="segmento-form-descricao"
              className="mt-1.5"
              rows={2}
              value={valores.descricao}
              onChange={(e) => setValores((atual) => ({ ...atual, descricao: e.target.value }))}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="segmento-icone" className="text-xs font-semibold">
                Icone
              </Label>
              <Input
                id="segmento-icone"
                data-testid="segmento-form-icone"
                className="mt-1.5 h-9 font-mono"
                maxLength={RAMO_ICONE_MAX}
                placeholder="opcional"
                value={valores.icone}
                aria-invalid={Boolean(erros.icone)}
                onChange={(e) => setValores((atual) => ({ ...atual, icone: e.target.value }))}
              />
              <MensagemErro texto={erros.icone} />
            </div>

            <div>
              <Label htmlFor="segmento-ordem" className="text-xs font-semibold">
                Ordem
              </Label>
              <Input
                id="segmento-ordem"
                data-testid="segmento-form-ordem"
                className="mt-1.5 h-9"
                type="number"
                min={0}
                value={valores.ordem}
                aria-invalid={Boolean(erros.ordem)}
                onChange={(e) => setValores((atual) => ({ ...atual, ordem: e.target.value }))}
              />
              <MensagemErro texto={erros.ordem} />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Switch
              id="segmento-ativo"
              data-testid="segmento-form-ativo"
              checked={valores.ativo}
              onCheckedChange={(ativo) => setValores((atual) => ({ ...atual, ativo }))}
            />
            <Label htmlFor="segmento-ativo" className="text-sm">
              Segmento ativo no catalogo
            </Label>
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={salvando}
            onClick={() => onOpenChange(false)}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            size="sm"
            data-testid="segmento-form-submit"
            className="gap-1.5"
            disabled={salvando}
            onClick={salvar}
          >
            {salvando && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            {segmento ? 'Salvar' : 'Criar segmento'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
