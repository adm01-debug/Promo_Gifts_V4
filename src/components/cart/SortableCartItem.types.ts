import type { SellerCart, SellerCartItem } from '@/hooks/products';

export interface SortableCartItemProps {
  item: SellerCartItem;
  index: number;
  otherCarts: SellerCart[];
  stockMap: Map<string, number>;
  companyAccentColor?: string | null;
  onRemove: (id: string, name: string) => void;
  onUpdateQuantity: (id: string, qty: number) => void;
  onUpdateNotes: (id: string, notes: string) => void;
  onMoveToCart: (itemId: string, targetCartId: string) => void;
  onDuplicateToCart: (itemId: string, targetCartId: string) => void;
  onNavigate: (path: string) => void;
  /**
   * Visual variant:
   *  - 'card' (padrão): usado no grid — imagem quadrada no topo, corpo abaixo.
   *  - 'row': usado no modo Lista — imagem compacta à esquerda, corpo à direita.
   *    Evita a imagem gigante quando a coluna ocupa 100% da largura da página.
   */
  variant?: 'card' | 'row';
}
