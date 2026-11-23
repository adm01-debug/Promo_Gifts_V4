import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { logger } from '@/lib/logger';
import { mergeProfilePreferences } from '@/lib/profile-preferences';
interface ThemeSettings {
  light: boolean;
  dark: boolean;
}

interface BadgeVisibilityStore {
  routeSettings: Record<string, ThemeSettings>;
  badgesEnabled: boolean;
  syncError: string | null;
  toggleBadges: (path: string, theme: string, userId?: string) => Promise<boolean>;
  setBadgesEnabled: (
    path: string,
    theme: string,
    enabled: boolean,
    userId?: string,
  ) => Promise<boolean>;
  isBadgeEnabled: (path: string, theme: string) => boolean;
  initializeFromProfile: (preferences: Record<string, unknown>) => void;
}

export const useBadgeVisibilityStore = create<BadgeVisibilityStore>()(
  persist(
    (set, get) => ({
      routeSettings: {},
      badgesEnabled: true,
      syncError: null,

      isBadgeEnabled: (path, theme) => {
        const settings = get().routeSettings[path];
        if (settings) {
          return theme === 'dark' ? settings.dark : settings.light;
        }
        return get().badgesEnabled;
      },

      toggleBadges: async (path, theme, userId) => {
        const currentSettings = get().routeSettings[path] || {
          light: get().badgesEnabled,
          dark: get().badgesEnabled,
        };
        const isDark = theme === 'dark';
        const nextEnabled = isDark ? !currentSettings.dark : !currentSettings.light;
        const nextSettings = { ...currentSettings, [isDark ? 'dark' : 'light']: nextEnabled };
        const newRouteSettings = { ...get().routeSettings, [path]: nextSettings };
        set({ routeSettings: newRouteSettings, badgesEnabled: nextEnabled, syncError: null });

        if (userId) {
          try {
            await mergeProfilePreferences(userId, { badge_visibility: newRouteSettings });
            return true;
          } catch (err) {
            logger.error('[BadgeVisibilityStore] Sync failed:', err);
            set({
              syncError:
                'Erro ao sincronizar prefer\u00eancias com o servidor. As altera\u00e7\u00f5es foram salvas apenas localmente.',
            });
            return false;
          }
        }
        return true;
      },

      setBadgesEnabled: async (path, theme, enabled, userId) => {
        const currentSettings = get().routeSettings[path] || { light: true, dark: true };
        const isDark = theme === 'dark';
        const nextSettings = { ...currentSettings, [isDark ? 'dark' : 'light']: enabled };
        const newRouteSettings = { ...get().routeSettings, [path]: nextSettings };
        set({ routeSettings: newRouteSettings, badgesEnabled: enabled, syncError: null });

        if (userId) {
          try {
            await mergeProfilePreferences(userId, { badge_visibility: newRouteSettings });
            return true;
          } catch (err) {
            logger.error('[BadgeVisibilityStore] Sync failed:', err);
            set({ syncError: 'Erro ao salvar altera\u00e7\u00f5es no servidor.' });
            return false;
          }
        }
        return true;
      },

      initializeFromProfile: (preferences: Record<string, unknown>) => {
        if (preferences?.badge_visibility) {
          set({
            routeSettings: preferences.badge_visibility as Record<string, ThemeSettings>,
            syncError: null,
          });
        }
      },
    }),
    {
      name: 'badge-visibility-v2',
      partialize: (state) => ({
        routeSettings: state.routeSettings,
        badgesEnabled: state.badgesEnabled,
      }),
    },
  ),
);
