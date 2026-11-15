/**
 * KitLibraryStats — cards de estatística da Biblioteca de Kits (KMM-075).
 * "Publicados" usa o mesmo critério do filtro da página (status 'published' ou 'shared').
 */
import { FileText, Library, Sparkles, Star } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import type { CustomKitRow } from '@/hooks/kit-builder';

export function KitLibraryStats({ kits }: { kits: CustomKitRow[] }) {
  return (
    <div className="grid gap-3 sm:grid-cols-4">
      <LibraryStat
        icon={<Library className="h-5 w-5" />}
        label="Total de kits"
        value={kits.length}
        detail="Seus projetos no Kit Maker"
      />
      <LibraryStat
        icon={<FileText className="h-5 w-5" />}
        label="Rascunhos"
        value={kits.filter((kit) => kit.status === 'draft').length}
        detail="Em edição"
      />
      <LibraryStat
        icon={<Star className="h-5 w-5" />}
        label="Favoritos"
        value={kits.filter((kit) => kit.is_favorite).length}
        detail="Acesso rápido"
      />
      <LibraryStat
        icon={<Sparkles className="h-5 w-5" />}
        label="Publicados"
        value={kits.filter((kit) => ['published', 'shared'].includes(kit.status)).length}
        detail="Compartilhados com clientes"
      />
    </div>
  );
}

function LibraryStat({
  icon,
  label,
  value,
  detail,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  detail: string;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-4">
        <div className="rounded-xl bg-primary/10 p-3 text-primary">{icon}</div>
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-2xl font-bold">{value}</p>
          <p className="text-xs text-muted-foreground">{detail}</p>
        </div>
      </CardContent>
    </Card>
  );
}
