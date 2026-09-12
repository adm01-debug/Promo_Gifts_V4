/**
 * ClientPicker — campo de seleção/busca de cliente para orçamentos.
 * Permite selecionar uma empresa real do CRM sem impedir ajustes manuais dos
 * dados comerciais que serão congelados no orçamento.
 */
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { User } from 'lucide-react';
import { FavoritesClientPicker } from '@/components/favorites/FavoritesClientPicker';

export interface ClientData {
  client_id?: string;
  client_name: string;
  client_email: string;
  client_phone: string;
  client_company: string;
  client_cnpj: string;
}

interface ClientPickerProps {
  value: Partial<ClientData>;
  onChange: (next: Partial<ClientData>) => void;
}

export function ClientPicker({ value, onChange }: ClientPickerProps) {
  const set = (k: keyof ClientData) => (e: React.ChangeEvent<HTMLInputElement>) =>
    onChange({ ...value, [k]: e.target.value });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <User className="h-4 w-4 text-primary" /> Cliente
        </CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <FavoritesClientPicker
            selectedClientId={value.client_id}
            selectedClientName={value.client_company}
            onSelect={(client) =>
              onChange(
                client
                  ? {
                      ...value,
                      client_id: client.id,
                      client_company: client.name,
                      client_name: value.client_name || client.name,
                    }
                  : { ...value, client_id: undefined },
              )
            }
          />
          <p className="mt-1 text-xs text-muted-foreground">
            Busque uma empresa do CRM ou preencha os dados abaixo manualmente.
          </p>
        </div>
        <div className="space-y-1">
          <Label htmlFor="quote-client-name">Nome</Label>
          <Input
            id="quote-client-name"
            value={value.client_name ?? ''}
            onChange={set('client_name')}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="quote-client-company">Empresa</Label>
          <Input
            id="quote-client-company"
            value={value.client_company ?? ''}
            onChange={set('client_company')}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="quote-client-email">E-mail</Label>
          <Input
            id="quote-client-email"
            type="email"
            value={value.client_email ?? ''}
            onChange={set('client_email')}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="quote-client-phone">Telefone</Label>
          <Input
            id="quote-client-phone"
            value={value.client_phone ?? ''}
            onChange={set('client_phone')}
          />
        </div>
        <div className="space-y-1 sm:col-span-2">
          <Label htmlFor="quote-client-cnpj">CNPJ</Label>
          <Input
            id="quote-client-cnpj"
            value={value.client_cnpj ?? ''}
            onChange={set('client_cnpj')}
          />
        </div>
      </CardContent>
    </Card>
  );
}
