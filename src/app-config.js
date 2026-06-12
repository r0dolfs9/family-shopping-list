// app-config.js — the ONLY file a family edits to enable sync.
// Both values are public by design (the anon key is meant to ship to browsers;
// Row Level Security protects the data). Leave empty to run fully locally.

export const appConfig = {
  supabase: {
    url: '',     // e.g. 'https://xxxx.supabase.co'
    anonKey: '', // 'Project Settings → API → anon public' key
  },
};

export function isSupabaseConfigured() {
  return Boolean(appConfig.supabase.url && appConfig.supabase.anonKey);
}
