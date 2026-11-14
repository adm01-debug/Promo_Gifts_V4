/**
 * MagicUp — card do logo do cliente (extraído de MagicUpConfigPanel.tsx para manter o arquivo
 * abaixo do limite do gate de tamanho ao corrigir o botão "Trocar logo").
 */
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Upload, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { useMagicUpState } from '@/hooks/intelligence';

type MagicUpStateReturn = ReturnType<typeof useMagicUpState>;

export function LogoCard({ m }: { m: MagicUpStateReturn }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
            2
          </span>
          Logo do Cliente
        </CardTitle>
        {m.selectedClient?.logo_url && m.logoPreview === m.selectedClient.logo_url && (
          <CardDescription className="text-xs">
            ✓ Logo carregado automaticamente da empresa
          </CardDescription>
        )}
      </CardHeader>
      <CardContent>
        <div
          className={cn(
            'rounded-lg border-2 border-dashed p-6 text-center transition-colors',
            m.logoPreview
              ? 'border-primary/30 bg-primary/5'
              : 'border-border hover:border-primary/50',
          )}
        >
          <input
            type="file"
            accept="image/*"
            onChange={m.handleLogoUpload}
            disabled={m.logoUploading}
            className="hidden"
            id="magic-logo-upload"
          />
          <label
            htmlFor="magic-logo-upload"
            className="flex cursor-pointer flex-col items-center gap-2"
          >
            {m.logoUploading ? (
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
            ) : m.logoPreview ? (
              <>
                <div className="h-20 w-20 overflow-hidden rounded-lg border bg-background">
                  <img
                    src={m.logoPreview}
                    alt="Logo"
                    className="h-full w-full object-contain"
                    loading="lazy"
                  />
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  type="button"
                  onClick={() => document.getElementById('magic-logo-upload')?.click()}
                >
                  Trocar logo
                </Button>
              </>
            ) : (
              <>
                <Upload className="h-10 w-10 text-muted-foreground" />
                <p className="text-sm font-medium">Clique para enviar o logo</p>
                <p className="text-xs text-muted-foreground">PNG, JPG, SVG · Máx. 10MB</p>
              </>
            )}
          </label>
        </div>
      </CardContent>
    </Card>
  );
}
