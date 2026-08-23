// Public client configuration only. Never place service_role keys or secrets here.
window.AMPRO_CONFIG = {
  supabaseUrl: "https://YOUR_PROJECT.supabase.co",
  supabaseAnonKey: "YOUR_SUPABASE_ANON_KEY",
  redirectUrl: window.location.origin + window.location.pathname.replace(/auth\.html$/, "index.html"),
  environment: "production"
};
