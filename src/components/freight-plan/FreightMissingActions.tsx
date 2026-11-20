/**
 * Produtos sem medida ou peso, e o que cada papel pode fazer a respeito.
 *
 * - Admin: link "Completar cadastro" para o formulário do produto.
 * - Vendedor: não edita cadastro; pede ao admin e leva a lista pronta
 *   (SKU + campos que faltam) para colar na conversa.
 *
 * Item avulso (`productId` vazio) não tem cadastro: aparece na lista, com texto
 * próprio, sem link e fora do "peça ao admin". Produto que o banco não devolveu
 * (`unavailable`) também tem texto próprio, sem campos nem link.
 */
import { Link } from 'react-router-dom';
import { Copy } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import type { IncompleteItem, MissingMeasure, ProductMeasureRow } from '@/lib/freight';

const MEASURE_LABEL: Record<MissingMeasure, string> = {
  height: 'altura',
  length: 'comprimento',
  weight: 'peso',
  width: 'largura',
};

export type FreightProductLabels = ReadonlyMap<string, Pick<ProductMeasureRow, 'name' | 'sku'>>;

interface FreightMissingActionsProps {
  missing: readonly IncompleteItem[];
  /** Nome e SKU por id. Sem entrada, a lista usa o nome do próprio item. */
  products?: FreightProductLabels;
  /** Produtos que o banco não devolveu: não dá para saber o que falta. */
  unavailable?: readonly { productId: string; name: string }[];
}

const AVULSO_TEXT = 'Item sem cadastro: sem peso e medidas não dá para calcular os volumes.';
const UNAVAILABLE_TEXT = 'Produto indisponível ou inativo — não foi possível ler as medidas.';

function missingFields(item: IncompleteItem): string {
  return item.missing.map((field) => MEASURE_LABEL[field]).join(', ');
}

function listLine(item: IncompleteItem, products?: FreightProductLabels): string {
  const sku = products?.get(item.productId)?.sku;
  const label = sku ? `${sku} — ${item.name}` : item.name;
  return `${label}: falta ${missingFields(item)}`;
}

export function FreightMissingActions({
  missing,
  products,
  unavailable = [],
}: FreightMissingActionsProps) {
  const { isAdmin } = useAuth();
  // Só produto com cadastro pode ser completado pelo admin.
  const registered = missing.filter((item) => item.productId !== '');

  const copyList = async () => {
    const text = registered.map((item) => listLine(item, products)).join('\n');
    try {
      await navigator.clipboard.writeText(text);
      toast.success('Lista copiada');
    } catch {
      toast.error('Não foi possível copiar a lista.');
    }
  };

  return (
    <div className="space-y-3">
      <ul className="space-y-2 text-sm">
        {unavailable.map((item) => (
          <li key={`unavailable-${item.productId}`}>
            <span className="font-medium">{item.name}</span>
            <span className="text-muted-foreground"> — {UNAVAILABLE_TEXT}</span>
          </li>
        ))}
        {missing.map((item, index) => (
          <li
            key={`${item.productId}-${index}`}
            className="flex flex-wrap items-center justify-between gap-2"
          >
            <span>
              <span className="font-medium">{item.name}</span>
              <span className="text-muted-foreground">
                {item.productId === '' ? ` — ${AVULSO_TEXT}` : ` — falta ${missingFields(item)}`}
              </span>
            </span>
            {isAdmin && item.productId !== '' && (
              <Button asChild size="sm" variant="outline">
                <Link to={`/admin/cadastros/produto/${item.productId}`}>Completar cadastro</Link>
              </Button>
            )}
          </li>
        ))}
      </ul>
      {!isAdmin && registered.length > 0 && (
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <span className="text-muted-foreground">
            Peça ao admin para completar o cadastro destes produtos.
          </span>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              void copyList();
            }}
          >
            <Copy className="mr-2 h-4 w-4" />
            Copiar lista
          </Button>
        </div>
      )}
    </div>
  );
}
