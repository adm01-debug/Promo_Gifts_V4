/**
 * Favorite Toggle Button
 * Ícone de coração reusado nos cards de item e de caixa do Kit Maker.
 * Usa o mesmo store de favoritos do catálogo principal (useFavoritesStore),
 * garantindo que favoritar aqui reflita em /favoritos sem duplicar lógica.
 */
import { Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useFavoritesStore } from '@/stores/useFavoritesStore';

interface FavoriteToggleButtonProps {
  productId: string;
  productName: string;
  className?: string;
}

export function FavoriteToggleButton({
  productId,
  productName,
  className,
}: FavoriteToggleButtonProps) {
  // Subscribe to `favoriteIds` (not the stable `isFavorite` function reference)
  // so the icon re-renders when the store changes — same pattern as the catalog
  // pages, which subscribe to a changing slice (e.g. `favoriteCount`) alongside it.
  const favoriteIds = useFavoritesStore((s) => s.favoriteIds);
  const toggleFavorite = useFavoritesStore((s) => s.toggleFavorite);
  const favorited = favoriteIds.has(productId);

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className={cn('h-7 w-7 shrink-0', className)}
      aria-label={favorited ? `Remover ${productName} dos favoritos` : `Favoritar ${productName}`}
      aria-pressed={favorited}
      onClick={(e) => {
        e.stopPropagation();
        toggleFavorite(productId);
      }}
    >
      <Heart className={cn('h-4 w-4', favorited && 'fill-destructive text-destructive')} />
    </Button>
  );
}
