import { render, screen, waitFor } from '@testing-library/react';
import { HelmetProvider } from 'react-helmet-async';
import { QRCodeSVG } from 'qrcode.react';
import { describe, expect, it, vi } from 'vitest';

import { PageSEO } from '@/components/seo/PageSEO';
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerTitle,
} from '@/components/ui/drawer';

describe('dependências de UI compatíveis com React 19', () => {
  it('aplica metadados com react-helmet-async 3', async () => {
    render(
      <HelmetProvider>
        <PageSEO title="Compatibilidade" description="Contrato SEO" path="/compatibilidade" />
      </HelmetProvider>,
    );

    await waitFor(() => expect(document.title).toBe('Compatibilidade | Promo Gifts'));
    expect(document.head.querySelector('meta[name="description"]')).toHaveAttribute(
      'content',
      'Contrato SEO',
    );
    expect(document.head.querySelector('link[rel="canonical"]')).toHaveAttribute(
      'href',
      'https://www.promogifts.com.br/compatibilidade',
    );
    expect(document.head.querySelectorAll('link[rel="canonical"]')).toHaveLength(1);
  });

  it('renderiza QR code SVG com qrcode.react 4', () => {
    render(<QRCodeSVG data-testid="qr-code" value="otpauth://totp/PromoGifts:test" />);

    const qrCode = screen.getByTestId('qr-code');
    expect(qrCode.tagName.toLowerCase()).toBe('svg');
    expect(qrCode.querySelectorAll('path').length).toBeGreaterThan(0);
  });

  it('abre drawer controlado com vaul 1', () => {
    render(
      <Drawer open onOpenChange={vi.fn()} modal={false}>
        <DrawerContent>
          <DrawerTitle>Detalhes</DrawerTitle>
          <DrawerDescription>Conteúdo do drawer</DrawerDescription>
        </DrawerContent>
      </Drawer>,
    );

    expect(screen.getByRole('dialog', { name: 'Detalhes' })).toBeInTheDocument();
    expect(screen.getByText('Conteúdo do drawer')).toBeInTheDocument();
  });
});
