import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { TabsContent } from '@/components/ui/tabs';
import { X, Search, Loader2, Truck } from 'lucide-react';
import { ESTADOS_BR } from '@/utils/masks';
import { type Supplier } from './types';
import React from 'react';

interface SupplierAddressTabProps {
  editingSupplier: Partial<Supplier>;
  transportadoraPadrao: string;
  setTransportadoraPadrao: (v: string) => void;
  setTransportadoraId: (v: string) => void;
  carrierSearch: string;
  setCarrierSearch: (v: string) => void;
  carrierResults: Array<{ id: string; nome_fantasia: string; razao_social: string }>;
  searchingCarriers: boolean;
  showCarrierDropdown: boolean;
  setShowCarrierDropdown: (v: boolean) => void;
  searchCarriers: (term: string) => void;
  carrierSearchTimeout: React.RefObject<ReturnType<typeof setTimeout> | undefined>;
  updateField: (field: string, value: unknown) => void;
  handleCepLookup: (cep: string) => void;
}

export function SupplierAddressTab({
  editingSupplier,
  transportadoraPadrao,
  setTransportadoraPadrao,
  setTransportadoraId,
  carrierSearch,
  setCarrierSearch,
  carrierResults,
  searchingCarriers,
  showCarrierDropdown,
  setShowCarrierDropdown,
  searchCarriers,
  carrierSearchTimeout,
  updateField,
  handleCepLookup,
}: SupplierAddressTabProps) {
  const fieldClass = 'mt-1.5 h-9';

  return (
    <TabsContent value="address" className="space-y-3 pt-3">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="sup-cep" className="text-xs font-semibold">
            CEP
          </Label>
          <Input
            id="sup-cep"
            value={editingSupplier.cep || ''}
            onChange={(e) => handleCepLookup(e.target.value)}
            placeholder="00000-000"
            className={`${fieldClass} font-mono`}
            maxLength={9}
          />
        </div>
        <div>
          <Label htmlFor="sup-tipo-logradouro" className="text-xs font-semibold">
            Tipo Logradouro
          </Label>
          <select
            id="sup-tipo-logradouro"
            value={editingSupplier.tipo_logradouro || ''}
            onChange={(e) => updateField('tipo_logradouro', e.target.value)}
            onBlur={(e) => updateField('tipo_logradouro', e.target.value)}
            className="mt-1.5 h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="">Selecione</option>
            {[
              'Rua',
              'Avenida',
              'Alameda',
              'Travessa',
              'Praça',
              'Rodovia',
              'Estrada',
              'Viela',
              'Largo',
              'Outro',
            ].map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div>
        <Label htmlFor="sup-logradouro" className="text-xs font-semibold">
          Logradouro
        </Label>
        <Input
          id="sup-logradouro"
          value={editingSupplier.logradouro || ''}
          onChange={(e) => updateField('logradouro', e.target.value)}
          className={fieldClass}
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="sup-numero" className="text-xs font-semibold">
            Número
          </Label>
          <Input
            id="sup-numero"
            value={editingSupplier.numero || ''}
            onChange={(e) => updateField('numero', e.target.value)}
            className={fieldClass}
          />
        </div>
        <div>
          <Label htmlFor="sup-complemento" className="text-xs font-semibold">
            Complemento
          </Label>
          <Input
            id="sup-complemento"
            value={editingSupplier.complemento || ''}
            onChange={(e) => updateField('complemento', e.target.value)}
            className={fieldClass}
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="sup-bairro" className="text-xs font-semibold">
            Bairro
          </Label>
          <Input
            id="sup-bairro"
            value={editingSupplier.bairro || ''}
            onChange={(e) => updateField('bairro', e.target.value)}
            className={fieldClass}
          />
        </div>
        <div>
          <Label htmlFor="sup-cidade" className="text-xs font-semibold">
            Cidade
          </Label>
          <Input
            id="sup-cidade"
            value={editingSupplier.cidade || ''}
            onChange={(e) => updateField('cidade', e.target.value)}
            className={fieldClass}
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="sup-estado" className="text-xs font-semibold">
            Estado
          </Label>
          <select
            id="sup-estado"
            value={editingSupplier.estado || ''}
            onChange={(e) => updateField('estado', e.target.value)}
            onBlur={(e) => updateField('estado', e.target.value)}
            className="mt-1.5 h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="">Selecione</option>
            {ESTADOS_BR.map((uf) => (
              <option key={uf} value={uf}>
                {uf}
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label htmlFor="sup-pais" className="text-xs font-semibold">
            País
          </Label>
          <Input
            id="sup-pais"
            value={editingSupplier.pais || 'Brasil'}
            onChange={(e) => updateField('pais', e.target.value)}
            className={fieldClass}
          />
        </div>
      </div>
      <div>
        <Label htmlFor="sup-ponto-ref" className="text-xs font-semibold">
          Ponto de Referência
        </Label>
        <Input
          id="sup-ponto-ref"
          value={editingSupplier.ponto_referencia || ''}
          onChange={(e) => updateField('ponto_referencia', e.target.value)}
          className={fieldClass}
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="sup-latitude" className="text-xs font-semibold">
            Latitude
          </Label>
          <Input
            id="sup-latitude"
            type="number"
            step="any"
            value={editingSupplier.latitude ?? ''}
            onChange={(e) =>
              updateField('latitude', e.target.value ? parseFloat(e.target.value) : null)
            }
            className={`${fieldClass} font-mono`}
          />
        </div>
        <div>
          <Label htmlFor="sup-longitude" className="text-xs font-semibold">
            Longitude
          </Label>
          <Input
            id="sup-longitude"
            type="number"
            step="any"
            value={editingSupplier.longitude ?? ''}
            onChange={(e) =>
              updateField('longitude', e.target.value ? parseFloat(e.target.value) : null)
            }
            className={`${fieldClass} font-mono`}
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="sup-gmaps-url" className="text-xs font-semibold">
            Google Maps URL
          </Label>
          <Input
            id="sup-gmaps-url"
            value={editingSupplier.google_maps_url || ''}
            onChange={(e) => updateField('google_maps_url', e.target.value)}
            className={fieldClass}
          />
        </div>
        <div>
          <Label htmlFor="sup-gplace-id" className="text-xs font-semibold">
            Google Place ID
          </Label>
          <Input
            id="sup-gplace-id"
            value={editingSupplier.google_place_id || ''}
            onChange={(e) => updateField('google_place_id', e.target.value)}
            className={fieldClass}
          />
        </div>
      </div>
      <div>
        <Label htmlFor="sup-horario" className="text-xs font-semibold">
          Horário de Funcionamento
        </Label>
        <Input
          id="sup-horario"
          value={editingSupplier.horario_funcionamento || ''}
          onChange={(e) => updateField('horario_funcionamento', e.target.value)}
          className={fieldClass}
        />
      </div>
      {/* TRANSPORTADORA PADRÃO */}
      <div className="relative">
        <Label
          htmlFor="sup-transportadora-search"
          className="flex items-center gap-1.5 text-xs font-semibold"
        >
          <Truck className="h-3.5 w-3.5" />
          Transportadora Padrão
        </Label>
        {transportadoraPadrao ? (
          <div className="mt-1 flex items-center gap-2">
            <div className={`${fieldClass} flex flex-1 items-center px-3 text-sm`}>
              {transportadoraPadrao}
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="Fechar"
              className="h-9 w-9 shrink-0"
              onClick={() => {
                setTransportadoraPadrao('');
                setTransportadoraId('');
                setCarrierSearch('');
              }}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <div className="relative mt-1">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="sup-transportadora-search"
              value={carrierSearch}
              onChange={(e) => {
                const val = e.target.value;
                setCarrierSearch(val);
                clearTimeout(carrierSearchTimeout.current);
                carrierSearchTimeout.current = setTimeout(() => searchCarriers(val), 400);
              }}
              onFocus={() => {
                if (carrierResults.length > 0) setShowCarrierDropdown(true);
              }}
              onBlur={() => setTimeout(() => setShowCarrierDropdown(false), 200)}
              placeholder="Buscar transportadora..."
              className={`${fieldClass} pl-9`}
            />
            {searchingCarriers && (
              <Loader2 className="absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 animate-spin text-muted-foreground" />
            )}
            {showCarrierDropdown &&
              !searchingCarriers &&
              carrierResults.length === 0 &&
              carrierSearch.length >= 2 && (
                <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover p-2 shadow-lg">
                  <p className="text-xs text-muted-foreground">
                    Nenhuma transportadora encontrada
                  </p>
                </div>
              )}
            {showCarrierDropdown && carrierResults.length > 0 && (
              <div className="absolute z-50 mt-1 max-h-48 w-full overflow-y-auto rounded-md border bg-popover shadow-lg">
                {carrierResults.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    className="w-full px-3 py-2 text-left text-sm transition-colors hover:bg-accent/50"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      const displayName = c.nome_fantasia || c.razao_social;
                      setTransportadoraPadrao(displayName);
                      setTransportadoraId(c.id);
                      setCarrierSearch('');
                      setShowCarrierDropdown(false);
                    }}
                  >
                    <span className="font-medium">{c.nome_fantasia || c.razao_social}</span>
                    {c.nome_fantasia && c.razao_social && (
                      <span className="ml-2 text-xs text-muted-foreground">
                        ({c.razao_social})
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
      <div>
        <Label htmlFor="sup-instrucoes-entrega" className="text-xs font-semibold">
          Instruções de Entrega
        </Label>
        <Textarea
          id="sup-instrucoes-entrega"
          value={editingSupplier.instrucoes_entrega || ''}
          onChange={(e) => updateField('instrucoes_entrega', e.target.value)}
          className="mt-1.5 min-h-[60px]"
        />
      </div>
    </TabsContent>
  );
}
