import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Building2,
  Phone,
  DollarSign,
  Settings2,
  MapPin,
  Globe,
  UserPlus,
  Landmark,
  Loader2,
  Plus,
  Trash2,
} from 'lucide-react';
import { maskPhone } from '@/utils/masks';
import { applyPixMask, pixPlaceholder, validatePixKey } from '@/utils/pixMask';
import { type Supplier, type SupplierContact, type PixKey, CONTACT_ROLES } from './types';
import { SupplierBasicTab } from './SupplierBasicTab';
import { SupplierAddressTab } from './SupplierAddressTab';
import React from 'react';

interface SupplierFormDialogProps {
  editingSupplier: Partial<Supplier> | null;
  setEditingSupplier: (s: Partial<Supplier> | null) => void;
  isNew: boolean;
  saving: boolean;
  /** Erro CNPJ vindo do backend (SSOT: mapCnpjError) — exibido inline. */
  cnpjError?: string;
  uploadingLogo: boolean;
  fetchingCnpj: boolean;
  contacts: SupplierContact[];
  formaPagamento: string[];
  setFormaPagamento: React.Dispatch<React.SetStateAction<string[]>>;
  pixKeys: PixKey[];
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
  transportadoraPadrao: string;
  setTransportadoraPadrao: (v: string) => void;
  transportadoraId: string;
  setTransportadoraId: (v: string) => void;
  carrierSearch: string;
  setCarrierSearch: (v: string) => void;
  carrierResults: Array<{ id: string; nome_fantasia: string; razao_social: string }>;
  searchingCarriers: boolean;
  showCarrierDropdown: boolean;
  setShowCarrierDropdown: (v: boolean) => void;
  searchCarriers: (term: string) => void;
  carrierSearchTimeout: React.RefObject<ReturnType<typeof setTimeout> | undefined>;
  logoInputRef: React.RefObject<HTMLInputElement | null>;
  updateField: (field: string, value: unknown) => void;
  handleSave: () => void;
  handleLogoUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleCnpjLookup: () => void;
  handleCepLookup: (cep: string) => void;
  updateContact: (id: string, field: keyof SupplierContact, value: string) => void;
  addContact: () => void;
  removeContact: (id: string) => void;
  updatePixKey: (id: string, field: keyof Omit<PixKey, 'id'>, value: boolean | string) => void;
  addPixKey: () => void;
  removePixKey: (id: string) => void;
}

export function SupplierFormDialog({
  editingSupplier,
  setEditingSupplier,
  isNew,
  saving,
  cnpjError,
  uploadingLogo,
  fetchingCnpj,
  contacts,
  formaPagamento,
  setFormaPagamento,
  pixKeys,
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
  transportadoraPadrao,
  setTransportadoraPadrao,
  transportadoraId: _transportadoraId,
  setTransportadoraId,
  carrierSearch,
  setCarrierSearch,
  carrierResults,
  searchingCarriers,
  showCarrierDropdown,
  setShowCarrierDropdown,
  searchCarriers,
  carrierSearchTimeout,
  logoInputRef,
  updateField,
  handleSave,
  handleLogoUpload,
  handleCnpjLookup,
  handleCepLookup,
  updateContact,
  addContact,
  removeContact,
  updatePixKey,
  addPixKey,
  removePixKey,
}: SupplierFormDialogProps) {
  const fieldClass = 'mt-1.5 h-9';

  if (!editingSupplier) return null;

  return (
    <Dialog
      open={!!editingSupplier}
      onOpenChange={(open) => {
        if (!open) setEditingSupplier(null);
      }}
    >
      <DialogContent data-testid="admin-form" className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            {isNew ? 'Novo Fornecedor' : `Editar: ${editingSupplier.name}`}
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="basic" className="mt-2">
          <TabsList className="grid h-9 w-full grid-cols-7">
            <TabsTrigger value="basic" className="gap-1.5 text-xs">
              <Building2 className="h-3.5 w-3.5" />
              Dados
            </TabsTrigger>
            <TabsTrigger value="contact" className="gap-1.5 text-xs">
              <Phone className="h-3.5 w-3.5" />
              Contatos
            </TabsTrigger>
            <TabsTrigger value="address" className="gap-1.5 text-xs">
              <MapPin className="h-3.5 w-3.5" />
              Endereço
            </TabsTrigger>
            <TabsTrigger value="social" className="gap-1.5 text-xs">
              <Globe className="h-3.5 w-3.5" />
              Site/Redes
            </TabsTrigger>
            <TabsTrigger value="commercial" className="gap-1.5 text-xs">
              <DollarSign className="h-3.5 w-3.5" />
              Comercial
            </TabsTrigger>
            <TabsTrigger value="financial" className="gap-1.5 text-xs">
              <Landmark className="h-3.5 w-3.5" />
              Financeiro
            </TabsTrigger>
            <TabsTrigger value="classification" className="gap-1.5 text-xs">
              <Settings2 className="h-3.5 w-3.5" />
              Tipo
            </TabsTrigger>
          </TabsList>

          {/* BASIC */}
          <SupplierBasicTab
            editingSupplier={editingSupplier}
            uploadingLogo={uploadingLogo}
            fetchingCnpj={fetchingCnpj}
            cnpjError={cnpjError}
            foneFixo1={foneFixo1}
            setFoneFixo1={setFoneFixo1}
            foneFixo2={foneFixo2}
            setFoneFixo2={setFoneFixo2}
            inscricaoEstadual={inscricaoEstadual}
            setInscricaoEstadual={setInscricaoEstadual}
            regimeTributario={regimeTributario}
            setRegimeTributario={setRegimeTributario}
            estadoFaturamento={estadoFaturamento}
            setEstadoFaturamento={setEstadoFaturamento}
            logoInputRef={logoInputRef}
            updateField={updateField}
            handleLogoUpload={handleLogoUpload}
            handleCnpjLookup={handleCnpjLookup}
          />

          {/* CONTACTS */}
          <TabsContent value="contact" className="space-y-3 pt-3">
            <div className="mb-1 flex items-center justify-between">
              <p className="text-xs text-muted-foreground">Adicione os contatos do fornecedor</p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 gap-1 text-xs"
                onClick={addContact}
              >
                <UserPlus className="h-3.5 w-3.5" />
                Adicionar Contato
              </Button>
            </div>
            <div className="max-h-[320px] space-y-3 overflow-y-auto pr-1">
              {contacts.map((contact, index) => (
                <div
                  key={contact.id}
                  className="space-y-3 rounded-lg border border-border bg-muted/30 p-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-muted-foreground">
                      Contato {index + 1}
                    </span>
                    {contacts.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                        onClick={() => removeContact(contact.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label
                        id={`sup-contact-role-label-${contact.id}`}
                        className="text-xs font-semibold"
                      >
                        Função / Cargo
                      </Label>
                      <Select
                        value={contact.role}
                        onValueChange={(v) => updateContact(contact.id, 'role', v)}
                      >
                        <SelectTrigger
                          aria-labelledby={`sup-contact-role-label-${contact.id}`}
                          className={`${fieldClass} w-full`}
                        >
                          <SelectValue placeholder="Selecione..." />
                        </SelectTrigger>
                        <SelectContent>
                          {CONTACT_ROLES.map((role) => (
                            <SelectItem key={role} value={role}>
                              {role}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label
                        htmlFor={`sup-contact-name-${contact.id}`}
                        className="text-xs font-semibold"
                      >
                        Nome
                      </Label>
                      <Input
                        id={`sup-contact-name-${contact.id}`}
                        value={contact.name}
                        onChange={(e) => updateContact(contact.id, 'name', e.target.value)}
                        placeholder="Ex.: João"
                        className={fieldClass}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label
                        htmlFor={`sup-contact-sig-${contact.id}`}
                        className="text-xs font-semibold"
                      >
                        Assinatura
                      </Label>
                      <Input
                        id={`sup-contact-sig-${contact.id}`}
                        value={contact.signature}
                        onChange={(e) => updateContact(contact.id, 'signature', e.target.value)}
                        className={fieldClass}
                      />
                    </div>
                    <div>
                      <Label
                        htmlFor={`sup-contact-nick-${contact.id}`}
                        className="text-xs font-semibold"
                      >
                        Apelido
                      </Label>
                      <Input
                        id={`sup-contact-nick-${contact.id}`}
                        value={contact.nickname}
                        onChange={(e) => updateContact(contact.id, 'nickname', e.target.value)}
                        className={fieldClass}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label
                        htmlFor={`sup-contact-phone-${contact.id}`}
                        className="text-xs font-semibold"
                      >
                        Telefone
                      </Label>
                      <Input
                        id={`sup-contact-phone-${contact.id}`}
                        value={contact.phone}
                        onChange={(e) =>
                          updateContact(contact.id, 'phone', maskPhone(e.target.value))
                        }
                        placeholder="(11) 99999-9999"
                        className={fieldClass}
                        maxLength={15}
                      />
                    </div>
                    <div>
                      <Label
                        htmlFor={`sup-contact-email-${contact.id}`}
                        className="text-xs font-semibold"
                      >
                        E-mail
                      </Label>
                      <Input
                        id={`sup-contact-email-${contact.id}`}
                        type="email"
                        value={contact.email}
                        onChange={(e) => updateContact(contact.id, 'email', e.target.value)}
                        className={fieldClass}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>

          {/* ADDRESS */}
          <SupplierAddressTab
            editingSupplier={editingSupplier}
            transportadoraPadrao={transportadoraPadrao}
            setTransportadoraPadrao={setTransportadoraPadrao}
            setTransportadoraId={setTransportadoraId}
            carrierSearch={carrierSearch}
            setCarrierSearch={setCarrierSearch}
            carrierResults={carrierResults}
            searchingCarriers={searchingCarriers}
            showCarrierDropdown={showCarrierDropdown}
            setShowCarrierDropdown={setShowCarrierDropdown}
            searchCarriers={searchCarriers}
            carrierSearchTimeout={carrierSearchTimeout}
            updateField={updateField}
            handleCepLookup={handleCepLookup}
          />

          {/* SOCIAL */}
          <TabsContent value="social" className="space-y-4 pt-3">
            <div>
              <Label htmlFor="sup-website" className="text-xs font-semibold">
                Website
              </Label>
              <Input
                id="sup-website"
                value={editingSupplier.website || ''}
                onChange={(e) => updateField('website', e.target.value)}
                className={fieldClass}
              />
            </div>
            <div>
              <Label htmlFor="sup-instagram" className="text-xs font-semibold">
                Instagram
              </Label>
              <Input
                id="sup-instagram"
                value={editingSupplier.instagram || ''}
                onChange={(e) => updateField('instagram', e.target.value)}
                className={fieldClass}
              />
            </div>
            <div>
              <Label htmlFor="sup-facebook" className="text-xs font-semibold">
                Facebook
              </Label>
              <Input
                id="sup-facebook"
                value={editingSupplier.facebook || ''}
                onChange={(e) => updateField('facebook', e.target.value)}
                className={fieldClass}
              />
            </div>
            <div>
              <Label htmlFor="sup-linkedin" className="text-xs font-semibold">
                LinkedIn
              </Label>
              <Input
                id="sup-linkedin"
                value={editingSupplier.linkedin || ''}
                onChange={(e) => updateField('linkedin', e.target.value)}
                className={fieldClass}
              />
            </div>
            <div>
              <Label htmlFor="sup-youtube" className="text-xs font-semibold">
                YouTube
              </Label>
              <Input
                id="sup-youtube"
                value={editingSupplier.youtube || ''}
                onChange={(e) => updateField('youtube', e.target.value)}
                className={fieldClass}
              />
            </div>
            <div>
              <Label htmlFor="sup-tiktok" className="text-xs font-semibold">
                TikTok
              </Label>
              <Input
                id="sup-tiktok"
                value={editingSupplier.tiktok || ''}
                onChange={(e) => updateField('tiktok', e.target.value)}
                className={fieldClass}
              />
            </div>
          </TabsContent>

          {/* COMMERCIAL */}
          <TabsContent value="commercial" className="space-y-4 pt-3">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="sup-markup" className="text-xs font-semibold">
                  Markup (%)
                </Label>
                <Input
                  id="sup-markup"
                  type="number"
                  value={editingSupplier.default_markup_percent ?? ''}
                  onChange={(e) =>
                    updateField(
                      'default_markup_percent',
                      e.target.value ? parseFloat(e.target.value) : null,
                    )
                  }
                  className={fieldClass}
                />
              </div>
              <div>
                <Label htmlFor="sup-min-order" className="text-xs font-semibold">
                  Pedido Mínimo (R$)
                </Label>
                <Input
                  id="sup-min-order"
                  type="number"
                  value={editingSupplier.min_order_value ?? ''}
                  onChange={(e) =>
                    updateField(
                      'min_order_value',
                      e.target.value ? parseFloat(e.target.value) : null,
                    )
                  }
                  className={fieldClass}
                />
              </div>
              <div>
                <Label htmlFor="sup-prazo" className="text-xs font-semibold">
                  Prazo (dias)
                </Label>
                <Input
                  id="sup-prazo"
                  type="number"
                  value={editingSupplier.delivery_time_days ?? ''}
                  onChange={(e) =>
                    updateField(
                      'delivery_time_days',
                      e.target.value ? parseInt(e.target.value, 10) : null,
                    )
                  }
                  className={fieldClass}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="sup-payment-terms" className="text-xs font-semibold">
                  Cond. Pagamento
                </Label>
                <Input
                  id="sup-payment-terms"
                  value={editingSupplier.payment_terms || ''}
                  onChange={(e) => updateField('payment_terms', e.target.value)}
                  className={fieldClass}
                />
              </div>
              <div>
                <Label htmlFor="sup-shipping-terms" className="text-xs font-semibold">
                  Cond. Frete
                </Label>
                <Input
                  id="sup-shipping-terms"
                  value={editingSupplier.shipping_terms || ''}
                  onChange={(e) => updateField('shipping_terms', e.target.value)}
                  className={fieldClass}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="sup-priority" className="text-xs font-semibold">
                Prioridade (0-100)
              </Label>
              <Input
                id="sup-priority"
                type="number"
                value={editingSupplier.priority ?? 50}
                onChange={(e) =>
                  updateField('priority', e.target.value ? parseInt(e.target.value, 10) : 50)
                }
                className={`${fieldClass} w-24`}
                min={0}
                max={100}
              />
            </div>
            <div>
              <Label htmlFor="sup-notes" className="text-xs font-semibold">
                Observações
              </Label>
              <Textarea
                id="sup-notes"
                value={editingSupplier.notes || ''}
                onChange={(e) => updateField('notes', e.target.value)}
                className="mt-1.5 min-h-[80px]"
              />
            </div>
          </TabsContent>

          {/* FINANCIAL */}
          <TabsContent value="financial" className="space-y-4 pt-3">
            <div>
              <Label id="sup-formas-pagamento-label" className="text-xs font-semibold">
                Formas de Pagamento
              </Label>
              <div
                role="group"
                aria-labelledby="sup-formas-pagamento-label"
                className="mt-1.5 flex gap-3"
              >
                {['Boleto', 'PIX', 'Transferência', 'Cartão'].map((method) => (
                  <label key={method} className="flex cursor-pointer items-center gap-1.5 text-sm">
                    <input
                      type="checkbox"
                      checked={formaPagamento.includes(method)}
                      onChange={(e) => {
                        if (e.target.checked) setFormaPagamento((prev) => [...prev, method]);
                        else setFormaPagamento((prev) => prev.filter((m) => m !== method));
                      }}
                      className="rounded border-border"
                    />
                    {method}
                  </label>
                ))}
              </div>
            </div>
            {formaPagamento.includes('PIX') && (
              <div className="space-y-4 rounded-lg border border-border bg-muted/30 p-4">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Chaves PIX
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 gap-1 text-xs"
                    onClick={addPixKey}
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Adicionar Chave
                  </Button>
                </div>
                {pixKeys.map((pix, idx) => (
                  <div
                    key={pix.id}
                    className="space-y-3 rounded-lg border border-border bg-background/50 p-3"
                  >
                    <div className="flex items-center justify-between">
                      <label className="flex cursor-pointer items-center gap-2 text-xs">
                        <input
                          type="radio"
                          name="pix-principal-edit"
                          checked={pix.principal}
                          onChange={() => updatePixKey(pix.id, 'principal', true)}
                          className="accent-primary"
                        />
                        <span
                          className={
                            pix.principal ? 'font-semibold text-primary' : 'text-muted-foreground'
                          }
                        >
                          {pix.principal ? '★ Principal' : `Chave ${idx + 1}`}
                        </span>
                      </label>
                      {pixKeys.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                          onClick={() => removePixKey(pix.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label
                          id={`sup-pix-tipo-label-${pix.id}`}
                          className="text-xs font-semibold"
                        >
                          Tipo de Chave
                        </Label>
                        <Select
                          value={pix.tipo}
                          onValueChange={(v) => updatePixKey(pix.id, 'tipo', v)}
                        >
                          <SelectTrigger
                            aria-labelledby={`sup-pix-tipo-label-${pix.id}`}
                            className={`${fieldClass} w-full`}
                          >
                            <SelectValue placeholder="Selecione..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="CNPJ">CNPJ</SelectItem>
                            <SelectItem value="CPF">CPF</SelectItem>
                            <SelectItem value="Email">E-mail</SelectItem>
                            <SelectItem value="Telefone">Telefone</SelectItem>
                            <SelectItem value="Aleatória">Chave Aleatória</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label
                          htmlFor={`sup-pix-chave-${pix.id}`}
                          className="text-xs font-semibold"
                        >
                          Chave PIX
                        </Label>
                        <Input
                          id={`sup-pix-chave-${pix.id}`}
                          value={pix.chave}
                          onChange={(e) =>
                            updatePixKey(pix.id, 'chave', applyPixMask(e.target.value, pix.tipo))
                          }
                          placeholder={pixPlaceholder(pix.tipo)}
                          className={`${fieldClass} ${validatePixKey(pix.chave, pix.tipo) ? 'border-destructive' : ''}`}
                        />
                        {validatePixKey(pix.chave, pix.tipo) && (
                          <p className="mt-1 text-xs text-destructive">
                            {validatePixKey(pix.chave, pix.tipo)}
                          </p>
                        )}
                      </div>
                    </div>
                    <div>
                      <Label htmlFor={`sup-pix-fav-${pix.id}`} className="text-xs font-semibold">
                        Favorecido (Nome)
                      </Label>
                      <Input
                        id={`sup-pix-fav-${pix.id}`}
                        value={pix.favorecido}
                        onChange={(e) => updatePixKey(pix.id, 'favorecido', e.target.value)}
                        className={fieldClass}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* CLASSIFICATION */}
          <TabsContent value="classification" className="space-y-6 pt-3">
            <div className="flex items-center justify-between rounded-lg border border-border p-4">
              <div>
                <p className="text-sm font-medium">Fornecedor de Produtos</p>
                <p className="text-xs text-muted-foreground">
                  Fornece produtos físicos para revenda
                </p>
              </div>
              <Switch
                checked={editingSupplier.is_product_supplier ?? true}
                onCheckedChange={(v) => updateField('is_product_supplier', v)}
              />
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border p-4">
              <div>
                <p className="text-sm font-medium">Fornecedor de Gravação</p>
                <p className="text-xs text-muted-foreground">
                  Fornece serviços de personalização/gravação
                </p>
              </div>
              <Switch
                checked={editingSupplier.is_engraving_supplier ?? false}
                onCheckedChange={(v) => updateField('is_engraving_supplier', v)}
              />
            </div>
          </TabsContent>
        </Tabs>

        <div className="mt-4 flex justify-end gap-2 border-t border-border pt-4">
          <Button variant="ghost" size="sm" onClick={() => setEditingSupplier(null)}>
            Cancelar
          </Button>
          <Button
            size="sm"
            disabled={saving}
            onClick={handleSave}
            data-testid="admin-save-btn"
            className="gap-1.5"
          >
            {saving ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Plus className="h-3.5 w-3.5" />
            )}
            {isNew ? 'Criar Fornecedor' : 'Salvar Alterações'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
