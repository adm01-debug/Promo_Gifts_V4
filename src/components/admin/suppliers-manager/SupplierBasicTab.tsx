import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { TabsContent } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ImagePlus, Loader2, Search, X } from 'lucide-react';
import { maskCnpj, maskPhone, ESTADOS_BR, normalizeCnpj, validateCnpj } from '@/utils/masks';
import { type Supplier } from './types';
import React from 'react';

interface SupplierBasicTabProps {
  editingSupplier: Partial<Supplier>;
  uploadingLogo: boolean;
  fetchingCnpj: boolean;
  cnpjError?: string;
  foneFixo1: string;
  setFoneFixo1: (v: string) => void;
  foneFixo2: string;
  setFoneFixo2: (v: string) => void;
  inscricaoEstadual: string;
  setInscricaoEstadual: (v: string) => void;
  regimeTributario: string;
  setRegimeTributario: (v: string) => void;
  estadoFaturamento: string;
  setEstadoFaturamento: (v: string) => void;
  logoInputRef: React.RefObject<HTMLInputElement | null>;
  updateField: (field: string, value: unknown) => void;
  handleLogoUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleCnpjLookup: () => void;
}

export function SupplierBasicTab({
  editingSupplier,
  uploadingLogo,
  fetchingCnpj,
  cnpjError,
  foneFixo1,
  setFoneFixo1,
  foneFixo2,
  setFoneFixo2,
  inscricaoEstadual,
  setInscricaoEstadual,
  regimeTributario,
  setRegimeTributario,
  estadoFaturamento,
  setEstadoFaturamento,
  logoInputRef,
  updateField,
  handleLogoUpload,
  handleCnpjLookup,
}: SupplierBasicTabProps) {
  const fieldClass = 'mt-1.5 h-9';

  return (
    <TabsContent value="basic" className="space-y-4 pt-3">
      {/* LOGO + NOME FANTASIA + CÓDIGO */}
      <div className="flex items-center gap-4">
        <div className="relative shrink-0">
          {editingSupplier.logo_url ? (
            <div className="relative h-20 w-20 overflow-hidden rounded-lg border border-border bg-muted">
              <img
                src={editingSupplier.logo_url}
                alt="Logo"
                className="h-full w-full object-contain"
                loading="lazy"
              />
              <button
                type="button"
                onClick={() => updateField('logo_url', null)}
                className="absolute -right-1 -top-1 rounded-full bg-destructive p-0.5 text-destructive-foreground"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => logoInputRef.current?.click()}
              disabled={uploadingLogo}
              className="flex h-20 w-20 flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-border text-muted-foreground transition-colors hover:border-primary/50 hover:text-primary"
            >
              {uploadingLogo ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <>
                  <ImagePlus className="h-5 w-5" />
                  <span className="text-[10px]">Logo</span>
                </>
              )}
            </button>
          )}
          <input
            ref={logoInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleLogoUpload}
          />
        </div>
        <div className="flex-1">
          <Label htmlFor="sup-trading-name" className="text-xs font-semibold">
            Nome Fantasia
          </Label>
          <Input
            id="sup-trading-name"
            value={editingSupplier.trading_name || ''}
            onChange={(e) => updateField('trading_name', e.target.value)}
            className={fieldClass}
          />
        </div>
        <div className="w-40 shrink-0">
          <Label htmlFor="sup-code" className="text-xs font-semibold">
            Código <span className="text-destructive">*</span>
          </Label>
          <Input
            id="sup-code"
            value={editingSupplier.code || ''}
            data-testid="admin-code-input"
            onChange={(e) => updateField('code', e.target.value)}
            className={`${fieldClass} font-mono uppercase`}
          />
        </div>
      </div>
      <div>
        <Label htmlFor="sup-name" className="text-xs font-semibold">
          Razão Social <span className="text-destructive">*</span>
        </Label>
        <Input
          id="sup-name"
          value={editingSupplier.name || ''}
          data-testid="admin-name-input"
          onChange={(e) => updateField('name', e.target.value)}
          className={fieldClass}
        />
      </div>
      {/* CNPJ + INSCRIÇÃO ESTADUAL */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="sup-cnpj" className="text-xs font-semibold">
            CNPJ
          </Label>
          <div className="flex gap-1.5">
            <Input
              id="sup-cnpj"
              value={maskCnpj(editingSupplier.cnpj || '')}
              data-testid="admin-cnpj-input"
              onChange={(e) => updateField('cnpj', normalizeCnpj(e.target.value))}
              className={`${fieldClass} flex-1 font-mono`}
              maxLength={18}
              inputMode="numeric"
              aria-invalid={(() => {
                const d = (editingSupplier.cnpj ?? '').replace(/\D/g, '');
                return d.length > 0 && (d.length !== 14 || !validateCnpj(d));
              })()}
              aria-describedby="admin-cnpj-error"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-9 shrink-0 px-2.5"
              disabled={
                fetchingCnpj || (editingSupplier.cnpj?.replace(/\D/g, '') ?? '').length !== 14
              }
              onClick={handleCnpjLookup}
            >
              {fetchingCnpj ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Search className="h-3.5 w-3.5" />
              )}
            </Button>
          </div>
          {(() => {
            const d = (editingSupplier.cnpj ?? '').replace(/\D/g, '');
            if (d.length === 0) return null;
            if (d.length !== 14) {
              return (
                <p
                  id="admin-cnpj-error"
                  data-testid="admin-cnpj-error"
                  className="mt-1 text-xs text-destructive"
                >
                  CNPJ deve ter 14 dígitos (atual: {d.length}).
                </p>
              );
            }
            if (!validateCnpj(d)) {
              return (
                <p
                  id="admin-cnpj-error"
                  data-testid="admin-cnpj-error"
                  className="mt-1 text-xs text-destructive"
                >
                  CNPJ inválido — verifique os dígitos.
                </p>
              );
            }
            return null;
          })()}
          {cnpjError ? (
            <p
              id="admin-cnpj-backend-error"
              data-testid="admin-cnpj-backend-error"
              className="mt-1 text-xs text-destructive"
            >
              {cnpjError}
            </p>
          ) : null}
        </div>
        <div>
          <Label htmlFor="sup-ie" className="text-xs font-semibold">
            Inscrição Estadual
          </Label>
          <Input
            id="sup-ie"
            value={inscricaoEstadual}
            onChange={(e) => setInscricaoEstadual(e.target.value)}
            placeholder="Ex: 123.456.789.000"
            className={fieldClass}
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="sup-fone1" className="text-xs font-semibold">
            Fone Fixo 01
          </Label>
          <Input
            id="sup-fone1"
            value={foneFixo1}
            onChange={(e) => setFoneFixo1(maskPhone(e.target.value))}
            placeholder="(00) 0000-0000"
            className={fieldClass}
            maxLength={15}
          />
        </div>
        <div>
          <Label htmlFor="sup-fone2" className="text-xs font-semibold">
            Fone Fixo 02
          </Label>
          <Input
            id="sup-fone2"
            value={foneFixo2}
            onChange={(e) => setFoneFixo2(maskPhone(e.target.value))}
            placeholder="(00) 0000-0000"
            className={fieldClass}
            maxLength={15}
          />
        </div>
      </div>
      {/* REGIME TRIBUTÁRIO + ESTADO DE FATURAMENTO */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label id="sup-regime-trib-label" className="text-xs font-semibold">
            Regime Tributário
          </Label>
          <Select value={regimeTributario} onValueChange={setRegimeTributario}>
            <SelectTrigger aria-labelledby="sup-regime-trib-label" className={fieldClass}>
              <SelectValue placeholder="Selecione o regime" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="MEI">MEI</SelectItem>
              <SelectItem value="Simples Nacional">Simples Nacional</SelectItem>
              <SelectItem value="Lucro Real">Lucro Real</SelectItem>
              <SelectItem value="Lucro Presumido">Lucro Presumido</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label id="sup-estado-fat-label" className="text-xs font-semibold">
            Estado de Faturamento
          </Label>
          <Select value={estadoFaturamento} onValueChange={setEstadoFaturamento}>
            <SelectTrigger aria-labelledby="sup-estado-fat-label" className={fieldClass}>
              <SelectValue placeholder="Selecione o estado" />
            </SelectTrigger>
            <SelectContent>
              {ESTADOS_BR.map((uf) => (
                <SelectItem key={uf} value={uf}>
                  {uf}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="flex items-center justify-between rounded-lg border border-border p-3">
        <Label htmlFor="sup-ativo" className="text-sm">
          Ativo
        </Label>
        <Switch
          id="sup-ativo"
          checked={editingSupplier.active ?? true}
          onCheckedChange={(v) => updateField('active', v)}
        />
      </div>
    </TabsContent>
  );
}
