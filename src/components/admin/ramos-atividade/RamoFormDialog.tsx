/**
 * RamoFormDialog — criar/editar ramo de atividade (tabela `ramo_atividade`).
 *
 * A validacao vive em `@/lib/crm/ramos-catalogo` (mesmas regras testadas na
 * lib); aqui so coletamos os campos e delegamos a mutation existente, que ja
 * trata toast e invalidacao da query.
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
import { useCreateRamoAtividade, useUpdateRamoAtividade } from '@/hooks/crm/useRamoAtividade';
import type { RamoAtividade } from '@/types/ramo-atividade';
import {
  RAMO_CORES_SUGERIDAS,
  RAMO_ICONES,
  RAMO_ICONE_MAX,
  RAMO_NOME_MAX,
  RAMO_SLUG_MAX,
  sugerirSlug,
  validarRamo,
  valoresIniciaisRamo,
  type RamoErros,
  type RamoFormValues,
} from '@/lib/crm/ramos-catalogo';

interface RamoFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Ausente = criar; presente = editar. */
  ramo?: RamoAtividade;
  ordemSugerida: number;
  /** Slugs dos OUTROS ramos — o indice UNIQUE nao aceita repeticao. */
  slugsOcupados: readonly string[];
}

function MensagemErro({ texto }: { texto?: string }) {
  if (!texto) return null;
  return <p className="mt-1 text-xs text-destructive">{texto}</p>;
}

export function RamoFormDialog({
  open,
  onOpenChange,
  ramo,
  ordemSugerida,
  slugsOcupados,
}: RamoFormDialogProps) {
  const criar = useCreateRamoAtividade();
  const atualizar = useUpdateRamoAtividade();
  const [valores, setValores] = useState<RamoFormValues>(() =>
    valoresIniciaisRamo(ramo, ordemSugerida),
  );
  const [erros, setErros] = useState<RamoErros>({});
  const [slugTocado, setSlugTocado] = useState(Boolean(ramo));

  useEffect(() => {
    if (!open) return;
    setValores(valoresIniciaisRamo(ramo, ordemSugerida));
    setErros({});
    setSlugTocado(Boolean(ramo));
  }, [open, ramo, ordemSugerida]);

  const salvando = criar.isPending || atualizar.isPending;

  const alterarNome = (nome: string) => {
    setValores((atual) => ({
      ...atual,
      nome,
      slug: slugTocado ? atual.slug : sugerirSlug(nome, slugsOcupados),
    }));
  };

  const salvar = async () => {
    const resultado = validarRamo(valores, { slugsOcupados });
    if (!resultado.ok) {
      setErros(resultado.erros);
      return;
    }
    setErros({});
    try {
      if (ramo) {
        await atualizar.mutateAsync({ id: ramo.id, ...resultado.valores });
      } else {
        await criar.mutateAsync(resultado.valores);
      }
      onOpenChange(false);
    } catch {
      /* a mutation ja exibe o erro sanitizado */
    }
  };

  const opcoesIcone = RAMO_ICONES.some((opcao) => opcao.valor === valores.icone)
    ? RAMO_ICONES
    : [...RAMO_ICONES, { valor: valores.icone, rotulo: `${valores.icone} (atual)` }];

  return (
    <Dialog open={open} onOpenChange={(proximo) => !salvando && onOpenChange(proximo)}>
      <DialogContent className="sm:max-w-lg" data-testid="ramo-form-dialog">
        <DialogHeader>
          <DialogTitle>{ramo ? 'Editar ramo de atividade' : 'Novo ramo de atividade'}</DialogTitle>
          <DialogDescription>
            O ramo agrupa segmentos usados para classificar produtos e montar filtros do catalogo.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="ramo-nome" className="text-xs font-semibold">
              Nome <span className="text-destructive">*</span>
            </Label>
            <Input
              id="ramo-nome"
              data-testid="ramo-form-nome"
              className="mt-1.5 h-9"
              maxLength={RAMO_NOME_MAX}
              value={valores.nome}
              aria-invalid={Boolean(erros.nome)}
              onChange={(e) => alterarNome(e.target.value)}
            />
            <MensagemErro texto={erros.nome} />
          </div>

          <div>
            <Label htmlFor="ramo-slug" className="text-xs font-semibold">
              Slug <span className="text-destructive">*</span>
            </Label>
            <Input
              id="ramo-slug"
              data-testid="ramo-form-slug"
              className="mt-1.5 h-9 font-mono"
              maxLength={RAMO_SLUG_MAX}
              value={valores.slug}
              aria-invalid={Boolean(erros.slug)}
              onChange={(e) => {
                setSlugTocado(true);
                setValores((atual) => ({ ...atual, slug: e.target.value }));
              }}
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Identificador usado nas URLs do catalogo. Gerado a partir do nome enquanto voce nao
              editar o campo.
            </p>
            <MensagemErro texto={erros.slug} />
          </div>

          <div>
            <Label htmlFor="ramo-descricao" className="text-xs font-semibold">
              Descricao
            </Label>
            <Textarea
              id="ramo-descricao"
              data-testid="ramo-form-descricao"
              className="mt-1.5"
              rows={2}
              value={valores.descricao}
              onChange={(e) => setValores((atual) => ({ ...atual, descricao: e.target.value }))}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="ramo-icone" className="text-xs font-semibold">
                Icone
              </Label>
              <Select
                value={valores.icone}
                onValueChange={(icone) => setValores((atual) => ({ ...atual, icone }))}
              >
                <SelectTrigger id="ramo-icone" data-testid="ramo-form-icone" className="mt-1.5 h-9">
                  <SelectValue placeholder="Escolha um icone" />
                </SelectTrigger>
                <SelectContent>
                  {opcoesIcone.map((opcao) => (
                    <SelectItem key={opcao.valor} value={opcao.valor}>
                      {opcao.rotulo}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="mt-1 text-xs text-muted-foreground">
                Identificador do icone (ate {RAMO_ICONE_MAX} caracteres).
              </p>
              <MensagemErro texto={erros.icone} />
            </div>

            <div>
              <Label htmlFor="ramo-ordem" className="text-xs font-semibold">
                Ordem
              </Label>
              <Input
                id="ramo-ordem"
                data-testid="ramo-form-ordem"
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

          <div>
            <Label htmlFor="ramo-cor" className="text-xs font-semibold">
              Cor
            </Label>
            <div className="mt-1.5 flex items-center gap-2">
              <Input
                id="ramo-cor"
                data-testid="ramo-form-cor"
                className="h-9 w-20 p-1"
                type="color"
                value={valores.cor}
                aria-invalid={Boolean(erros.cor)}
                onChange={(e) => setValores((atual) => ({ ...atual, cor: e.target.value }))}
              />
              <span className="font-mono text-xs text-muted-foreground">{valores.cor}</span>
              <div className="flex flex-wrap gap-1">
                {RAMO_CORES_SUGERIDAS.map((cor) => (
                  <button
                    key={cor}
                    type="button"
                    aria-label={`Usar cor ${cor}`}
                    className="h-5 w-5 rounded-full border"
                    style={{ backgroundColor: cor }}
                    onClick={() => setValores((atual) => ({ ...atual, cor }))}
                  />
                ))}
              </div>
            </div>
            <MensagemErro texto={erros.cor} />
          </div>

          <div className="flex items-center gap-2">
            <Switch
              id="ramo-ativo"
              data-testid="ramo-form-ativo"
              checked={valores.ativo}
              onCheckedChange={(ativo) => setValores((atual) => ({ ...atual, ativo }))}
            />
            <Label htmlFor="ramo-ativo" className="text-sm">
              Ramo ativo no catalogo
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
            data-testid="ramo-form-submit"
            className="gap-1.5"
            disabled={salvando}
            onClick={salvar}
          >
            {salvando && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            {ramo ? 'Salvar' : 'Criar ramo'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
