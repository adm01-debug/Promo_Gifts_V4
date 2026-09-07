/**
 * useBluePremiumTheme — desativado.
 *
 * O módulo Magazine usa o design system global do Promo Gifts.
 * Hook mantido como no-op para compatibilidade de import nos consumidores
 * (MagazineListPage, MagazineEditorPage, MagazineTemplatesGalleryPage).
 *
 * Para reativar o tema Blue Premium no futuro, restaure a implementação
 * original que setava data-pg-theme="blue-premium" no <html> e importava
 * ../blue-premium.css.
 */

// eslint-disable-next-line @typescript-eslint/no-empty-function
export function useBluePremiumTheme(): void {}
