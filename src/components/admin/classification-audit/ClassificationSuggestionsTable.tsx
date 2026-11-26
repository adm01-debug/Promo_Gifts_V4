import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  hasConflict,
  type ClassificationListSummary,
  type ClassificationSuggestion,
  type ConfidenceBadge,
} from '@/lib/admin/classificationAudit';

function tomConfianca(tone: ConfidenceBadge['tone']): string {
  if (tone === 'success') return 'text-success';
  if (tone === 'warning') return 'text-warning';
  return 'text-muted-foreground';
}

/**
 * Tabela da trilha. "Gap" = categoria sugerida que o produto ainda não tem;
 * conflito de material/tipo bloqueia a aplicação automática e pede decisão humana.
 */
export function ClassificationSuggestionsTable({
  rows,
  resumo,
}: {
  rows: ClassificationSuggestion[];
  resumo: ClassificationListSummary;
}) {
  return (
    <>
      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <span data-testid="classification-count">{resumo.total} sugestão(ões) no recorte</span>
        <span>·</span>
        <span>{resumo.gaps} gap(s)</span>
        <span>·</span>
        <span>{resumo.kits} kit(s)</span>
        <span>·</span>
        <span>{resumo.conflitos} conflito(s)</span>
      </div>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Produto</TableHead>
              <TableHead>Categoria sugerida</TableHead>
              <TableHead>Confiança</TableHead>
              <TableHead className="text-right">Matches</TableHead>
              <TableHead className="text-right">Score</TableHead>
              <TableHead>Categorias atuais</TableHead>
              <TableHead>Situação</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={`${row.id}-${row.productId}`} data-testid="classification-row">
                <TableCell className="max-w-[260px]">
                  <div className="flex flex-col">
                    <span
                      className="truncate font-medium"
                      title={row.tokensMatched ? `Tokens: ${row.tokensMatched}` : row.produto}
                    >
                      {row.produto}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {row.sku || 'sem SKU'}
                      {row.isKit ? ' · kit' : ''}
                    </span>
                  </div>
                </TableCell>
                <TableCell className="max-w-[220px]">
                  <span className="truncate" title={row.categoriaSugerida}>
                    {row.categoriaSugerida || '—'}
                  </span>
                  <span className="ml-1 text-xs text-muted-foreground">(nível {row.nivel})</span>
                </TableCell>
                <TableCell>
                  <span
                    className={`text-sm font-medium ${tomConfianca(row.confianca.tone)}`}
                    data-testid="classification-confidence"
                  >
                    {row.confianca.emoji} {row.confianca.label}
                  </span>
                </TableCell>
                <TableCell className="text-right">{row.matches}</TableCell>
                <TableCell className="text-right">{row.score}</TableCell>
                <TableCell className="max-w-[200px] truncate text-xs text-muted-foreground">
                  {row.categoriasAtuais || '—'}
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap items-center gap-1">
                    {row.alreadyAssigned ? (
                      <Badge variant="outline">Já atribuída</Badge>
                    ) : (
                      <Badge variant="outline" className="text-warning">
                        Gap
                      </Badge>
                    )}
                    {row.materialConflict ? (
                      <Badge variant="outline" className="text-destructive">
                        Material
                      </Badge>
                    ) : null}
                    {row.typeConflict ? (
                      <Badge variant="outline" className="text-destructive">
                        Tipo
                      </Badge>
                    ) : null}
                    {!hasConflict(row) && row.approvedAuto ? (
                      <Badge variant="outline" className="text-success">
                        Auto
                      </Badge>
                    ) : null}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <p className="text-xs text-muted-foreground">
        Todos os produtos listados estão ativos. Passe o mouse no nome para ver os tokens que
        casaram com a categoria sugerida.
      </p>
    </>
  );
}
