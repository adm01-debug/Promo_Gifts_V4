import { useState } from 'react';
import { AlertTriangle, ClipboardCheck, RefreshCw, Sparkles, Wand2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { useDebouncedFilters } from '@/hooks/common';
import { useToast } from '@/hooks/ui';
import {
  DEFAULT_LIMIT,
  DEFAULT_MIN_MATCHES,
  describeApplyOutcome,
  describeClassificationError,
  formatarDataHora,
  resumirSuggestions,
  type ClassificationApplyRow,
} from '@/lib/admin/classificationAudit';
import {
  useApplyClassificationSuggestions,
  useClassificationSuggestions,
  useClassificationSummary,
} from '@/hooks/admin/useClassificationAudit';
import { ClassificationKpis } from './ClassificationKpis';
import { ClassificationSuggestionsTable } from './ClassificationSuggestionsTable';
import { ClassificationApplyDialog } from './ClassificationApplyDialog';

const MIN_MATCHES_OPTIONS = [2, 3, 4, 5];

/**
 * Classificação sugerida — única porta de entrada do schema
 * `classification_audit` (deny-all). Mostra a trilha de análise de categorização
 * (`category_suggestions`) e permite aplicar as sugestões de alta confiança em
 * `public.product_category_assignments`, sempre com prévia (dry-run) antes de gravar.
 */
export function ClassificationAuditManager() {
  const { toast } = useToast();
  const [search, setSearch] = useState('');
  const [somenteGaps, setSomenteGaps] = useState(true);
  const [minMatches, setMinMatches] = useState(DEFAULT_MIN_MATCHES);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [preview, setPreview] = useState<ClassificationApplyRow[] | null>(null);

  const buscaDebounced = useDebouncedFilters(search, 350);

  const {
    summary,
    isLoading: summaryLoading,
    isFetching: summaryFetching,
    error: summaryError,
    refetch: refetchSummary,
  } = useClassificationSummary();

  const {
    rows,
    isLoading: rowsLoading,
    isFetching: rowsFetching,
    error: rowsError,
    refetch: refetchRows,
  } = useClassificationSuggestions({
    search: buscaDebounced,
    somenteGaps,
    minMatches,
    limit: DEFAULT_LIMIT,
  });

  const { apply, isApplying, lastResult, reset } = useApplyClassificationSuggestions();

  const resumo = resumirSuggestions(rows);
  const erro = summaryError ?? rowsError;

  const recarregar = () => {
    refetchSummary();
    refetchRows();
  };

  const abrirRevisao = async () => {
    reset();
    setPreview(null);
    setDialogOpen(true);
    try {
      setPreview(await apply(true, minMatches));
    } catch {
      setPreview([]);
    }
  };

  const fecharDialogo = (open: boolean) => {
    setDialogOpen(open);
    if (!open) setPreview(null);
  };

  const confirmarAplicacao = async () => {
    try {
      const resultado = await apply(false, minMatches);
      toast({
        title: resultado.length > 0 ? 'Classificação aplicada' : 'Nada a aplicar',
        description: describeApplyOutcome(resultado),
      });
      setDialogOpen(false);
      setPreview(null);
      recarregar();
    } catch (falha) {
      toast({
        title: 'Falha ao aplicar',
        description: describeClassificationError(falha),
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="space-y-3" data-testid="classification-audit-manager">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              Classificação sugerida
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Trilha de análise automática de categorias: onde o nome do produto casa com uma
              categoria que ele ainda não tem, e onde um kit precisa de decisão humana. Última
              análise: {formatarDataHora(summary.ultimaAnalise)}.
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              data-testid="classification-refresh"
              disabled={summaryFetching || rowsFetching}
              onClick={recarregar}
            >
              <RefreshCw
                className={`mr-1.5 h-3.5 w-3.5 ${summaryFetching || rowsFetching ? 'animate-spin' : ''}`}
              />
              Recarregar
            </Button>
            <Button
              size="sm"
              data-testid="classification-open-apply"
              disabled={summary.totalSugestoes === 0 || isApplying}
              onClick={abrirRevisao}
            >
              <Wand2 className="mr-1.5 h-3.5 w-3.5" />
              Revisar e aplicar
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <ClassificationKpis summary={summary} isLoading={summaryLoading} />

          <div className="flex flex-wrap items-end gap-3 rounded-md border border-border p-3">
            <div className="min-w-[220px] flex-1">
              <Label htmlFor="classification-search" className="text-xs">
                Buscar produto, SKU ou categoria
              </Label>
              <Input
                id="classification-search"
                data-testid="classification-search"
                value={search}
                placeholder="Ex.: caneca, KIT-010, Brindes > Canecas"
                onChange={(evento) => setSearch(evento.target.value)}
              />
            </div>
            <div className="w-[190px]">
              <Label className="text-xs">Mínimo de matches</Label>
              <Select
                value={String(minMatches)}
                onValueChange={(valor) => setMinMatches(Number(valor))}
              >
                <SelectTrigger data-testid="classification-min-matches">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MIN_MATCHES_OPTIONS.map((opcao) => (
                    <SelectItem key={opcao} value={String(opcao)}>
                      {opcao}+ matches
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2 pb-2">
              <Switch
                id="classification-only-gaps"
                data-testid="classification-only-gaps"
                checked={somenteGaps}
                onCheckedChange={setSomenteGaps}
              />
              <Label htmlFor="classification-only-gaps" className="text-sm">
                Somente gaps
              </Label>
            </div>
          </div>

          {Boolean(erro) && (
            <div
              className="flex flex-col gap-2 rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm"
              data-testid="classification-error"
            >
              <div className="flex items-center gap-2 font-medium text-destructive">
                <AlertTriangle className="h-4 w-4" />
                Não foi possível carregar a classificação
              </div>
              <p className="text-muted-foreground">{describeClassificationError(erro)}</p>
              <div>
                <Button
                  variant="outline"
                  size="sm"
                  data-testid="classification-retry"
                  onClick={recarregar}
                >
                  Tentar de novo
                </Button>
              </div>
            </div>
          )}

          {!erro && rowsLoading && (
            <div className="space-y-2" data-testid="classification-loading">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-40 w-full" />
            </div>
          )}

          {!erro && !rowsLoading && rows.length === 0 && (
            <div
              className="flex items-center gap-2 rounded-md border border-border bg-muted/30 p-3 text-sm"
              data-testid="classification-empty"
            >
              <ClipboardCheck className="h-4 w-4 text-primary" />
              Nenhuma sugestão para os filtros atuais. A trilha é preenchida pela análise automática
              de categorias — se ela nunca rodou, este recorte fica vazio.
            </div>
          )}

          {!erro && !rowsLoading && rows.length > 0 && (
            <ClassificationSuggestionsTable rows={rows} resumo={resumo} />
          )}
        </CardContent>
      </Card>

      <ClassificationApplyDialog
        open={dialogOpen}
        onOpenChange={fecharDialogo}
        minMatches={minMatches}
        preview={preview}
        isApplying={isApplying}
        onConfirm={confirmarAplicacao}
      />

      {lastResult && lastResult.length > 0 && !dialogOpen ? (
        <p className="text-xs text-muted-foreground" data-testid="classification-last-result">
          Última execução: {describeApplyOutcome(lastResult)}
        </p>
      ) : null}
    </div>
  );
}
