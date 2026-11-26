/**
 * RamosAtividadeManager — manutencao do catalogo de ramos de atividade e
 * segmentos (aba /admin/cadastros?tab=ramos).
 *
 * Fecha o CRUD que existia so em service/hooks: criar, editar, ativar/desativar
 * e excluir. A exclusao mostra o cascade real — as FKs
 * `ramo_atividade_filho.ramo_atividade_id` e
 * `produto_ramo_atividade.ramo_atividade_filho_id` sao ON DELETE CASCADE, entao
 * apagar um ramo apaga segmentos e vinculos de produto — com a contagem
 * conferida no banco antes de habilitar o botao.
 */
import { useMemo, useState } from 'react';
import { FolderTree, Pencil, Plus, Power, Search, Trash2 } from 'lucide-react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useDeleteRamoAtividade, useToggleRamoAtividade } from '@/hooks/crm/useRamoAtividade';
import { useDeleteSegmento, useToggleSegmento } from '@/hooks/crm/useRamoAtividadeFilho';
import { useImpactoProdutos, useRamosAdministracao } from '@/hooks/crm/useRamosAdministracao';
import type { RamoAtividade, RamoAtividadeFilho } from '@/types/ramo-atividade';
import {
  descreverImpacto,
  filtrarArvore,
  impactoExclusaoRamo,
  impactoExclusaoSegmento,
  proximaOrdem,
} from '@/lib/crm/ramos-catalogo';
import { RamoFormDialog } from './RamoFormDialog';
import { SegmentoFormDialog } from './SegmentoFormDialog';

type AlvoExclusao =
  | { tipo: 'ramo'; ramo: RamoAtividade; segmentos: RamoAtividadeFilho[] }
  | { tipo: 'segmento'; ramo: RamoAtividade; segmento: RamoAtividadeFilho };

function ResumoTile({
  rotulo,
  valor,
  detalhe,
}: {
  rotulo: string;
  valor: number;
  detalhe: string;
}) {
  return (
    <div className="rounded-lg border p-3">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{rotulo}</p>
      <p className="mt-1 text-2xl font-semibold leading-none">{valor}</p>
      <p className="mt-1 text-xs text-muted-foreground">{detalhe}</p>
    </div>
  );
}

export function RamosAtividadeManager() {
  const { arvore, resumo, isLoading, isError, refetch } = useRamosAdministracao();
  const [busca, setBusca] = useState('');
  const [incluirInativos, setIncluirInativos] = useState(true);
  const [ramoForm, setRamoForm] = useState<{ aberto: boolean; ramo?: RamoAtividade }>({
    aberto: false,
  });
  const [segmentoForm, setSegmentoForm] = useState<{
    aberto: boolean;
    ramoId: string;
    segmento?: RamoAtividadeFilho;
  }>({ aberto: false, ramoId: '' });
  const [alvo, setAlvo] = useState<AlvoExclusao | null>(null);

  const excluirRamo = useDeleteRamoAtividade();
  const excluirSegmento = useDeleteSegmento();
  const alternarRamo = useToggleRamoAtividade();
  const alternarSegmento = useToggleSegmento();

  const visivel = useMemo(
    () => filtrarArvore(arvore, { busca, incluirInativos }),
    [arvore, busca, incluirInativos],
  );

  const idsAlvo = useMemo(() => {
    if (!alvo) return [];
    return alvo.tipo === 'ramo' ? alvo.segmentos.map((s) => s.id) : [alvo.segmento.id];
  }, [alvo]);
  const { contagens, isLoading: conferindoVinculos } = useImpactoProdutos(idsAlvo);

  const ramosOpcoes = useMemo(
    () => arvore.map((no) => ({ id: no.ramo.id, nome: no.ramo.nome })),
    [arvore],
  );

  const slugsRamoLivre = useMemo(
    () => arvore.map((no) => no.ramo.slug).filter((slug) => slug !== ramoForm.ramo?.slug),
    [arvore, ramoForm.ramo],
  );
  const slugsSegmentoLivre = useMemo(
    () =>
      arvore
        .flatMap((no) => no.segmentos.map((s) => s.slug))
        .filter((slug) => slug !== segmentoForm.segmento?.slug),
    [arvore, segmentoForm.segmento],
  );

  const ordemRamoSugerida = useMemo(() => proximaOrdem(arvore.map((no) => no.ramo)), [arvore]);
  const ordemSegmentoSugerida = useMemo(
    () => proximaOrdem(arvore.find((no) => no.ramo.id === segmentoForm.ramoId)?.segmentos ?? []),
    [arvore, segmentoForm.ramoId],
  );

  const impacto = alvo
    ? alvo.tipo === 'ramo'
      ? impactoExclusaoRamo(alvo.segmentos, contagens)
      : impactoExclusaoSegmento(contagens.get(alvo.segmento.id) ?? 0)
    : null;
  const linhasImpacto = alvo && impacto ? descreverImpacto(impacto, alvo.tipo) : [];

  const excluindo = excluirRamo.isPending || excluirSegmento.isPending;

  const confirmarExclusao = async () => {
    if (!alvo) return;
    try {
      if (alvo.tipo === 'ramo') {
        await excluirRamo.mutateAsync(alvo.ramo.id);
      } else {
        await excluirSegmento.mutateAsync(alvo.segmento.id);
      }
      setAlvo(null);
    } catch {
      /* a mutation ja exibe o erro sanitizado */
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex items-center gap-3 rounded-lg border border-destructive/30 p-4 text-sm">
        <span className="text-destructive">Nao foi possivel carregar ramos e segmentos.</span>
        <Button size="sm" variant="outline" onClick={refetch}>
          Tentar novamente
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4" data-testid="ramos-manager">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3" data-testid="ramos-resumo">
        <ResumoTile
          rotulo="Ramos"
          valor={resumo.ramos}
          detalhe={`${resumo.ramosAtivos} ativos · ${resumo.ramosInativos} inativos`}
        />
        <ResumoTile
          rotulo="Segmentos"
          valor={resumo.segmentos}
          detalhe={`${resumo.segmentosAtivos} ativos · ${resumo.segmentosInativos} inativos`}
        />
        <ResumoTile
          rotulo="Ramos sem segmento"
          valor={resumo.ramosSemSegmento}
          detalhe="Nao classificam nenhum produto"
        />
      </div>

      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="relative w-full md:max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar ramo ou segmento..."
            aria-label="Buscar ramo ou segmento"
            className="pl-9"
            data-testid="ramos-busca"
          />
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <Switch
              id="ramos-incluir-inativos"
              data-testid="ramos-incluir-inativos"
              checked={incluirInativos}
              onCheckedChange={setIncluirInativos}
            />
            <Label htmlFor="ramos-incluir-inativos" className="text-sm">
              Incluir inativos
            </Label>
          </div>
          <Button
            size="sm"
            className="gap-1.5"
            data-testid="ramo-novo"
            onClick={() => setRamoForm({ aberto: true })}
          >
            <Plus className="h-3.5 w-3.5" />
            Novo ramo
          </Button>
        </div>
      </div>

      {visivel.length === 0 ? (
        <p
          className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground"
          data-testid="ramos-vazio"
        >
          {busca.trim()
            ? 'Nenhum ramo ou segmento corresponde a busca.'
            : 'Nenhum ramo cadastrado ainda.'}
        </p>
      ) : (
        <Accordion type="multiple" className="space-y-2" data-testid="ramos-lista">
          {visivel.map((no) => (
            <AccordionItem key={no.ramo.id} value={no.ramo.id} className="rounded-lg border px-4">
              <AccordionTrigger
                className="hover:no-underline"
                data-testid={`ramo-item-${no.ramo.slug}`}
              >
                <div className="flex flex-1 flex-wrap items-center gap-2 pr-2">
                  <span
                    className="h-3 w-3 shrink-0 rounded-full border"
                    style={{ backgroundColor: no.ramo.cor }}
                    aria-hidden
                  />
                  <span className="font-medium">{no.ramo.nome}</span>
                  <Badge variant="outline" className="font-mono text-xs">
                    {no.ramo.slug}
                  </Badge>
                  <Badge variant="secondary" className="text-xs">
                    {no.segmentos.length} segmento(s)
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    ordem {no.ramo.ordem}
                  </Badge>
                  {!no.ramo.ativo && (
                    <Badge variant="destructive" className="text-xs">
                      Inativo
                    </Badge>
                  )}
                </div>
              </AccordionTrigger>

              <AccordionContent className="pb-4">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-3">
                  <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                    <span>
                      Icone: <span className="font-mono">{no.ramo.icone}</span>
                    </span>
                    <span>
                      Cor: <span className="font-mono">{no.ramo.cor}</span>
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="gap-1.5"
                      onClick={() => setRamoForm({ aberto: true, ramo: no.ramo })}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      Editar
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="gap-1.5"
                      disabled={alternarRamo.isPending}
                      onClick={() => alternarRamo.mutate({ id: no.ramo.id, ativo: !no.ramo.ativo })}
                    >
                      <Power className="h-3.5 w-3.5" />
                      {no.ramo.ativo ? 'Desativar' : 'Ativar'}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="gap-1.5 text-destructive"
                      onClick={() =>
                        setAlvo({ tipo: 'ramo', ramo: no.ramo, segmentos: no.segmentos })
                      }
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Excluir
                    </Button>
                  </div>
                </div>

                {no.ramo.descricao && (
                  <p className="pt-3 text-sm text-muted-foreground">{no.ramo.descricao}</p>
                )}

                <div className="space-y-2 pt-3">
                  <div className="flex items-center justify-between">
                    <h4 className="flex items-center gap-2 text-sm font-medium">
                      <FolderTree className="h-4 w-4" />
                      Segmentos
                    </h4>
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1.5"
                      onClick={() => setSegmentoForm({ aberto: true, ramoId: no.ramo.id })}
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Novo segmento
                    </Button>
                  </div>

                  {no.segmentos.length === 0 ? (
                    <p className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">
                      Nenhum segmento neste ramo.
                    </p>
                  ) : (
                    <ul
                      className="divide-y rounded-lg border"
                      data-testid={`ramo-segmentos-${no.ramo.slug}`}
                    >
                      {no.segmentos.map((segmento) => (
                        <li
                          key={segmento.id}
                          className="flex items-center justify-between gap-3 px-3 py-2"
                        >
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium">{segmento.nome}</p>
                            <p className="truncate font-mono text-xs text-muted-foreground">
                              {segmento.slug} · ordem {segmento.ordem}
                            </p>
                          </div>
                          <div className="flex shrink-0 items-center gap-2">
                            <Switch
                              checked={segmento.ativo}
                              aria-label={`Segmento ${segmento.nome} ativo`}
                              disabled={alternarSegmento.isPending}
                              onCheckedChange={(ativo) =>
                                alternarSegmento.mutate({ id: segmento.id, ativo })
                              }
                            />
                            <Button
                              size="sm"
                              variant="ghost"
                              aria-label={`Editar ${segmento.nome}`}
                              onClick={() =>
                                setSegmentoForm({
                                  aberto: true,
                                  ramoId: no.ramo.id,
                                  segmento,
                                })
                              }
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              aria-label={`Excluir ${segmento.nome}`}
                              onClick={() => setAlvo({ tipo: 'segmento', ramo: no.ramo, segmento })}
                            >
                              <Trash2 className="h-3.5 w-3.5 text-destructive" />
                            </Button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      )}

      <RamoFormDialog
        open={ramoForm.aberto}
        onOpenChange={(aberto) => setRamoForm((atual) => ({ ...atual, aberto }))}
        ramo={ramoForm.ramo}
        ordemSugerida={ordemRamoSugerida}
        slugsOcupados={slugsRamoLivre}
      />

      <SegmentoFormDialog
        open={segmentoForm.aberto}
        onOpenChange={(aberto) => setSegmentoForm((atual) => ({ ...atual, aberto }))}
        ramoId={segmentoForm.ramoId}
        ramos={ramosOpcoes}
        segmento={segmentoForm.segmento}
        ordemSugerida={ordemSegmentoSugerida}
        slugsOcupados={slugsSegmentoLivre}
      />

      <ConfirmDialog
        open={Boolean(alvo)}
        onOpenChange={(proximo) => !proximo && !excluindo && setAlvo(null)}
        title={alvo?.tipo === 'ramo' ? 'Excluir ramo?' : 'Excluir segmento?'}
        description={
          alvo
            ? `${alvo.tipo === 'ramo' ? alvo.ramo.nome : `"${alvo.segmento.nome}" em ${alvo.ramo.nome}`}${
                conferindoVinculos ? ' — conferindo vinculos de produto...' : ''
              }`
            : undefined
        }
        confirmLabel="Excluir"
        variant="destructive"
        loading={conferindoVinculos || excluindo}
        testId="ramos-exclusao"
        impactPreview={
          conferindoVinculos
            ? undefined
            : { title: 'Isso sera apagado em cascata:', items: linhasImpacto }
        }
        onConfirm={confirmarExclusao}
      />
    </div>
  );
}
