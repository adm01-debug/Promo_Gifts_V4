import { supabase } from '@/integrations/supabase/client';

import { logger } from '@/lib/logger';
export interface UserNotificationPreference {
  id: string;
  user_id: string;
  category: string;
  in_app_enabled: boolean;
  push_enabled: boolean;
  created_at: string;
  updated_at: string;
}

export const notificationPreferenceService = {
  async getPreferences(): Promise<UserNotificationPreference[]> {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return [];

    const { data, error } = await supabase
      .from('user_notification_preferences')
      .select('*')
      .eq('user_id', userData.user.id);

    if (error) {
      logger.error('[notificationPreferenceService] getPreferences error:', error.message);
      return [];
    }

    return data as UserNotificationPreference[];
  },

  async updatePreference(
    category: string,
    updates: Partial<Pick<UserNotificationPreference, 'in_app_enabled' | 'push_enabled'>>,
  ): Promise<boolean> {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return false;

    const { error } = await supabase.from('user_notification_preferences').upsert(
      {
        user_id: userData.user.id,
        category,
        ...updates,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id, category' },
    );

    if (error) {
      logger.error('[notificationPreferenceService] updatePreference error:', error.message);
      return false;
    }

    return true;
  },

  subscribeToPreferences(onUpdate: (preference: UserNotificationPreference) => void): () => void {
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let cancelled = false;

    void supabase.auth.getUser().then(({ data: userData }) => {
      if (cancelled || !userData.user) return;
      channel = supabase
        // BUG-RT-CHANNEL FIX: tópico único por inscrição — evita reaproveitar canal já
        // inscrito (crash "postgres_changes ... after subscribe()") em montagens concorrentes.
        .channel(`user_notification_preferences_realtime:${crypto.randomUUID()}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'user_notification_preferences',
            filter: `user_id=eq.${userData.user.id}`,
          },
          (payload) => {
            onUpdate(payload.new as UserNotificationPreference);
          },
        )
        .subscribe();
    });

    return () => {
      cancelled = true;
      if (channel) supabase.removeChannel(channel);
    };
  },
};
