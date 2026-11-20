/**
 * Produtos ativos que ainda não têm peso e medidas para o cálculo de frete.
 * Leitura em duas consultas (produtos e fornecedores); o filtro "sem dados" é
 * a regra do motor (`getFreightReadiness`), aplicada no navegador.
 */
import { useQuery } from '@tanstack/react-query';
import {
  buildReadinessRows,
  type ReadinessReportRow,
} from '@/components/admin/freight/freightReadinessRows';
import {
  fetchActiveProductsForFreight,
  fetchSupplierNames,
} from '@/services/freightReadinessService';

const READINESS_QUERY_KEY = ['freight-readiness-report'] as const;

export interface FreightReadinessReport {
  rows: ReadinessReportRow[];
  /** Produtos ativos lidos, prontos ou não. */
  totalActive: number;
}

export function useFreightReadinessReport() {
  return useQuery({
    queryKey: READINESS_QUERY_KEY,
    // O relatório é lido ao voltar do cadastro: sem cache velho, o item corrigido some da lista.
    staleTime: 0,
    refetchOnMount: 'always',
    // Corrigiu o produto em outra aba e voltou: a lista refaz a leitura ao focar a janela.
    refetchOnWindowFocus: true,
    queryFn: async (): Promise<FreightReadinessReport> => {
      const [products, suppliers] = await Promise.all([
        fetchActiveProductsForFreight(),
        fetchSupplierNames(),
      ]);
      return { rows: buildReadinessRows(products, suppliers), totalActive: products.length };
    },
  });
}
