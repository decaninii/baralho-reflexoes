import { createBrowserClient } from '@supabase/ssr';

// Use este client em componentes de tela ("use client").
export function supabaseBrowser() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}
