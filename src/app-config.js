// app-config.js — the ONLY file a family edits to enable sync.
// Both values are public by design (the anon key is meant to ship to browsers;
// Row Level Security protects the data). Leave empty to run fully locally.

export const appConfig = {
  supabase: {
    url: 'https://aawudrbesftaogyuczoq.supabase.co',
    anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFhd3VkcmJlc2Z0YW9neXVjem9xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAzMDYzNDcsImV4cCI6MjA5NTg4MjM0N30.4Ri1BTN_NJ-p7ir9NWP8R85kDBHjbPZ5Dtm0KuDFBco',
  },
};

export function isSupabaseConfigured() {
  return Boolean(appConfig.supabase.url && appConfig.supabase.anonKey);
}
