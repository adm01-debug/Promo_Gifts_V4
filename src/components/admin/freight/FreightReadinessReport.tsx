/**
 * Relatório "Produtos sem dados de frete" (sub-aba de Caixas de transporte).
 *
 * Lista os produtos ativos sem peso ou sem medidas — os que o cálculo de frete
 * se recusa a estimar — com o que falta em cada um e o link para o cadastro.
 */
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Download, Loader2, PackageX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useFreightReadinessReport } from '@/hooks/freight/useFreightReadinessReport';
import {
  filterBySupplier,
  NO_SUPPLIER_FILTER,
  NO_SUPPLIER_LABEL,
  buildReadinessCsv,
} from './freightReadinessRows';

const ALL_SUPPLIERS = 'all';
const PAGE_STEP = 200;

function downloadCsv(content: string) {
  const url = URL.createObjectURL(new Blob([content], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = `produtos-sem-dados-de-frete_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function FreightReadinessReport() {
  const { data, isLoading, isError, refetch } = useFreightReadinessReport();
  const [supplierId, setSupplierId] = useState(ALL_SUPPLIERS);
  const [visible, setVisible] = useState(PAGE_STEP);

  const rows = useMemo(() => data?.rows ?? [], [data]);
  const suppliers = useMemo(() => {
    const byId = new Map<string, string>();
    for (const r of rows) if (r.supplierId) byId.set(r.supplierId, r.supplierName);
    return [...byId.entries()].sort((a, b) => a[1].localeCompare(b[1], 'pt-BR'));
  }, [rows]);
  const filtered = useMemo(
    () => filterBySupplier(rows, supplierId === ALL_SUPPLIERS ? '' : supplierId),
    [rows, supplierId],
  );

  if (isLoading) {
    return (
      <div
        role="status"
        className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground"
      >
        <Loader2 className="h-4 w-4 animate-spin" />
        Carregando produtos...
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div
        role="alert"
        className="flex flex-wrap items-center gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm"
      >
        <span className="text-destructive">Não foi possível carregar o relatório.</span>
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            void refetch();
          }}
        >
          Tentar novamente
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4" data-testid="freight-readiness-report">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="rounded-lg bg-primary/10 p-2 text-primary">
            <PackageX className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">Produtos sem dados de frete</h2>
            <p className="text-sm text-muted-foreground">
              {rows.length} de {data.totalActive} produtos ativos não têm peso ou medidas completos.
              Sem eles o frete não é calculado.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select
            value={supplierId}
            onValueChange={(value) => {
              setSupplierId(value);
              setVisible(PAGE_STEP);
            }}
          >
            <SelectTrigger className="w-[220px]" aria-label="Filtrar por fornecedor">
              <SelectValue placeholder="Fornecedor" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_SUPPLIERS}>Todos os fornecedores</SelectItem>
              <SelectItem value={NO_SUPPLIER_FILTER}>{NO_SUPPLIER_LABEL}</SelectItem>
              {suppliers.map(([id, name]) => (
                <SelectItem key={id} value={id}>
                  {name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            disabled={filtered.length === 0}
            onClick={() => downloadCsv(buildReadinessCsv(filtered))}
          >
            <Download className="mr-1.5 h-4 w-4" />
            Exportar CSV
          </Button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-lg border border-dashed py-12 text-center text-sm text-muted-foreground">
          {rows.length === 0
            ? 'Todos os produtos ativos têm peso e medidas para o frete.'
            : 'Nenhum produto sem dados para este fornecedor.'}
        </div>
      ) : (
        <>
          <div className="overflow-x-auto rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>SKU</TableHead>
                  <TableHead className="min-w-[220px]">Produto</TableHead>
                  <TableHead>Fornecedor</TableHead>
                  <TableHead>O que falta</TableHead>
                  <TableHead className="w-[1%]">
                    <span className="sr-only">Ações</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.slice(0, visible).map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-mono text-xs">{row.sku}</TableCell>
                    <TableCell>{row.name}</TableCell>
                    <TableCell>{row.supplierName}</TableCell>
                    <TableCell>{row.missingLabel}</TableCell>
                    <TableCell>
                      <Button asChild size="sm" variant="outline">
                        <Link
                          to={`/admin/cadastros/produto/${row.id}`}
                          target="_blank"
                          rel="noopener"
                          aria-label={`Abrir cadastro de ${row.sku}`}
                        >
                          Abrir cadastro
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>
              Mostrando {Math.min(visible, filtered.length)} de {filtered.length}
            </span>
            {visible < filtered.length && (
              <Button variant="outline" size="sm" onClick={() => setVisible((v) => v + PAGE_STEP)}>
                Mostrar mais
              </Button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
