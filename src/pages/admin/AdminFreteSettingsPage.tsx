/**
 * Admin: parâmetros globais de frete (`freight_settings`, linha única).
 *
 * Rota: /admin/frete (AdminRoute — o mesmo grupo que a RLS deixa salvar).
 * As caixas de transporte ficam em /admin/cadastros?tab=caixas.
 *
 * O `PageSEO` e o container ficam fora dos estados de carregando/erro: o
 * teste AdminStandardRules exige os dois já no primeiro render.
 */
import { Link } from 'react-router-dom';
import { Loader2, Truck } from 'lucide-react';
import { FreightSettingsForm } from '@/components/admin/freight-settings/FreightSettingsForm';
import { PageSEO } from '@/components/seo/PageSEO';
import { Button } from '@/components/ui/button';
import { useFreightSettings, useUpdateFreightSettings } from '@/hooks/freight';

function FreightSettingsBody() {
  const { row, isLoading, isFetching, isError, refetch } = useFreightSettings();
  const update = useUpdateFreightSettings();

  if (row) {
    return (
      <FreightSettingsForm
        key={row.updated_at}
        row={row}
        saving={update.isPending}
        syncing={isFetching}
        onSave={(patch) => update.mutate(patch)}
      />
    );
  }

  if (isLoading) {
    return (
      <div
        role="status"
        className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground"
      >
        <Loader2 className="h-4 w-4 animate-spin" />
        Carregando parâmetros de frete...
      </div>
    );
  }

  return (
    <div
      role="alert"
      className="flex flex-wrap items-center gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm"
    >
      <span className="text-destructive">
        {isError
          ? 'Não foi possível carregar os parâmetros de frete. Tente novamente.'
          : 'Os parâmetros de frete não foram encontrados. Tente novamente; se continuar, avise o suporte.'}
      </span>
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

export default function AdminFreteSettingsPage() {
  return (
    <>
      <PageSEO
        title="Parâmetros de frete"
        description="CEP de origem, divisores de cubagem, fator de aproveitamento e prazos do cálculo de frete."
        path="/admin/frete"
        noIndex
      />
      <div className="mx-auto w-full max-w-3xl animate-fade-in space-y-4 px-3 py-3 pb-24 sm:px-4 sm:py-4 md:pb-6 lg:px-6">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-primary/10 p-3">
            <Truck className="h-8 w-8 text-primary" />
          </div>
          <div>
            <h1
              data-testid="page-title-frete"
              className="font-display text-3xl font-bold tracking-tight"
            >
              Parâmetros de frete
            </h1>
            <p className="text-muted-foreground">
              Regras gerais do cálculo de frete. As caixas ficam em{' '}
              <Link to="/admin/cadastros?tab=caixas" className="underline underline-offset-2">
                Cadastros → Caixas de transporte
              </Link>
              .
            </p>
          </div>
        </div>

        <FreightSettingsBody />
      </div>
    </>
  );
}
