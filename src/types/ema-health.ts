export type EmaHealthStatus = 'ERROR' | 'OK' | 'UNKNOWN' | 'WARN';

export interface EmaHealthComponentV1 {
  id: string;
  status: EmaHealthStatus;
  last_refreshed_at: string | null;
  next_scheduled_at: string | null;
  detail: string;
  source: 'rupture_health_check';
}

export interface EmaHealthResponseV1 {
  version: 1;
  checked_at: string;
  freshness: {
    last_refreshed_at: string | null;
    status: EmaHealthStatus;
    semantics: 'read_model_refresh';
  };
  components: EmaHealthComponentV1[];
}
