/**
 * MockupPhotoPicker — escolha da FOTO real que vai para a geração.
 *
 * Extraído de MockupProductSelector. O defeito-alvo (Codex M04): o seletor decidia
 * sozinho entre `selected_thumbnail` e a primeira imagem da variante, e mandava para a
 * geração a MINIATURA do CDN — não havia escolha explícita entre as fotos da mesma
 * variante. Aqui a galeria mostra só as fotos reais já resolvidas ao ORIGINAL
 * (`getMockupVariantPhotos`), o usuário escolhe uma, e um produto sem foto utilizável
 * não deixa avançar.
 */
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getCdnUrl } from '@/utils/image-utils';
import type { Product } from '@/hooks/products';

interface Props {
  product: Product;
  /** Fotos reais do produto, já na resolução ORIGINAL. */
  photos: string[];
  onPick: (photoOriginalUrl: string) => void;
  onBack: () => void;
}

export function MockupPhotoPicker({ product, photos, onPick, onBack }: Props) {
  return (
    <div className="space-y-3 rounded-lg border border-border/30 p-3">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft aria-hidden="true" className="mr-1 h-4 w-4" /> Voltar
        </Button>
        <span className="truncate text-sm font-medium">{product.name}</span>
      </div>

      {photos.length === 0 ? (
        <p role="alert" className="py-4 text-sm text-muted-foreground">
          Este produto não tem foto utilizável para gerar o mockup.
        </p>
      ) : (
        <div
          role="group"
          aria-label="Fotos disponíveis do produto"
          className="grid grid-cols-3 gap-2"
        >
          {photos.map((photo, index) => (
            <button
              key={photo}
              type="button"
              data-testid="mockup-photo-option"
              aria-label={`Usar foto ${index + 1} de ${photos.length}`}
              onClick={() => onPick(photo)}
              className="overflow-hidden rounded-md border border-border/30 transition-colors hover:border-primary/50 focus-visible:ring-2 focus-visible:ring-primary"
            >
              {/* Miniatura só para exibir; o que vai para a geração é `photo` (original). */}
              <img
                src={getCdnUrl(photo, 'thumbnail')}
                alt=""
                className="aspect-square w-full object-cover"
                loading="lazy"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
