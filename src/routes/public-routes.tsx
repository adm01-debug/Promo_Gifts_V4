import { lazy } from 'react';
import { Route } from 'react-router-dom';
import {
  Auth,
  ResetPassword,
  ForgotPasswordConfirmation,
  SSOCallbackPage,
  Unauthorized,
  TermsPage,
  PrivacyPage,
  PublicMagazineView,
} from './lazy-pages';

// Dev-only harnesses. The import itself is gated so production builds neither
// expose the public routes nor ship their implementation chunks.
const ColorSwatchesHarness = import.meta.env.DEV
  ? lazy(() => import('@/pages/dev/ColorSwatchesHarness'))
  : null;
const ConfirmDialogHarness = import.meta.env.DEV
  ? lazy(() => import('@/pages/dev/ConfirmDialogHarness'))
  : null;
const AlertDialogHarness = import.meta.env.DEV
  ? lazy(() => import('@/pages/dev/AlertDialogHarness'))
  : null;
const DialogHarness = import.meta.env.DEV ? lazy(() => import('@/pages/dev/DialogHarness')) : null;
const UndoToastHarness = import.meta.env.DEV
  ? lazy(() => import('@/pages/dev/UndoToastHarness'))
  : null;
const CnpjFormHarness = import.meta.env.DEV
  ? lazy(() => import('@/pages/dev/CnpjFormHarness'))
  : null;
const MagazineRingHarness = import.meta.env.DEV
  ? lazy(() => import('@/pages/dev/MagazineRingHarness'))
  : null;
const TabSkipHarness = import.meta.env.DEV
  ? lazy(() => import('@/pages/dev/TabSkipHarness'))
  : null;

/**
 * Public routes — accessible without authentication.
 *
 * Includes login, password reset, SSO callback handling, and the
 * unauthorized landing page.
 */
export const publicRoutes = (
  <>
    <Route path="/auth" element={<Auth />} />
    {/* Alias legado — mantém /login funcionando para bookmarks e links externos */}
    <Route path="/login" element={<Auth />} />
    <Route path="/reset-password" element={<ResetPassword />} />
    <Route path="/forgot-password-confirmation" element={<ForgotPasswordConfirmation />} />
    <Route path="/auth/callback" element={<SSOCallbackPage />} />
    <Route path="/unauthorized" element={<Unauthorized />} />
    <Route path="/termos" element={<TermsPage />} />
    <Route path="/privacidade" element={<PrivacyPage />} />
    <Route path="/revista-publica/:token" element={<PublicMagazineView />} />
    {ColorSwatchesHarness && (
      <Route path="/__test/color-swatches" element={<ColorSwatchesHarness />} />
    )}
    {ConfirmDialogHarness && (
      <Route path="/__test/confirm-dialog" element={<ConfirmDialogHarness />} />
    )}
    {AlertDialogHarness && <Route path="/__test/alert-dialog" element={<AlertDialogHarness />} />}
    {DialogHarness && <Route path="/__test/dialog" element={<DialogHarness />} />}
    {UndoToastHarness && <Route path="/__test/undo-toast" element={<UndoToastHarness />} />}
    {CnpjFormHarness && <Route path="/__test/cnpj-form" element={<CnpjFormHarness />} />}
    {MagazineRingHarness && (
      <Route path="/__test/magazine-ring" element={<MagazineRingHarness />} />
    )}
    {TabSkipHarness && <Route path="/__test/tab-skip" element={<TabSkipHarness />} />}
  </>
);
