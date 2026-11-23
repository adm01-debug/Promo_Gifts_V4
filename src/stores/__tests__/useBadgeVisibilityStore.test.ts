import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useBadgeVisibilityStore } from '../useBadgeVisibilityStore';

const mergeProfilePreferences = vi.hoisted(() => vi.fn());

vi.mock('@/lib/profile-preferences', () => ({ mergeProfilePreferences }));

describe('useBadgeVisibilityStore', () => {
  beforeEach(() => {
    useBadgeVisibilityStore.setState({
      routeSettings: {},
      badgesEnabled: true,
      syncError: null,
    });
    vi.clearAllMocks();
    mergeProfilePreferences.mockResolvedValue(undefined);
  });

  it('should initialize with default values', () => {
    const state = useBadgeVisibilityStore.getState();
    expect(state.badgesEnabled).toBe(true);
    expect(state.routeSettings).toEqual({});
    expect(state.syncError).toBe(null);
  });

  it('should toggle badges for a specific route and theme (light)', async () => {
    const { toggleBadges, isBadgeEnabled } = useBadgeVisibilityStore.getState();

    await toggleBadges('/home', 'light');

    expect(isBadgeEnabled('/home', 'light')).toBe(false);
    expect(isBadgeEnabled('/home', 'dark')).toBe(true);
  });

  it('should handle global fallback if route is not configured', () => {
    const { isBadgeEnabled } = useBadgeVisibilityStore.getState();
    expect(isBadgeEnabled('/anywhere', 'light')).toBe(true);

    useBadgeVisibilityStore.setState({ badgesEnabled: false });
    expect(isBadgeEnabled('/anywhere', 'light')).toBe(false);
  });

  it('should merge only the badge_visibility key when syncing (ACH-039)', async () => {
    const { toggleBadges } = useBadgeVisibilityStore.getState();

    const success = await toggleBadges('/home', 'light', 'user-123');

    expect(success).toBe(true);
    expect(mergeProfilePreferences).toHaveBeenCalledWith('user-123', {
      badge_visibility: { '/home': { light: false, dark: true } },
    });
  });

  it('should merge only the badge_visibility key on setBadgesEnabled too', async () => {
    const { setBadgesEnabled } = useBadgeVisibilityStore.getState();

    const success = await setBadgesEnabled('/home', 'dark', false, 'user-123');

    expect(success).toBe(true);
    expect(mergeProfilePreferences).toHaveBeenCalledWith('user-123', {
      badge_visibility: { '/home': { light: true, dark: false } },
    });
  });

  it('should handle backend sync failure and set syncError', async () => {
    mergeProfilePreferences.mockRejectedValueOnce(new Error('Network error'));

    const { toggleBadges } = useBadgeVisibilityStore.getState();
    const success = await toggleBadges('/home', 'light', 'user-123');

    expect(success).toBe(false);
    expect(useBadgeVisibilityStore.getState().syncError).not.toBeNull();
    expect(useBadgeVisibilityStore.getState().isBadgeEnabled('/home', 'light')).toBe(false);
  });

  it('should initialize from profile preferences', () => {
    const { initializeFromProfile } = useBadgeVisibilityStore.getState();
    const mockPreferences = {
      badge_visibility: {
        '/home': { light: false, dark: true },
      },
    };

    initializeFromProfile(mockPreferences);

    const state = useBadgeVisibilityStore.getState();
    expect(state.routeSettings['/home'].light).toBe(false);
    expect(state.routeSettings['/home'].dark).toBe(true);
  });
});
