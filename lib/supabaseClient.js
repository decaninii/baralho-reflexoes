import { createBrowserClient } from '@supabase/ssr';

// Use este client em componentes de tela ("use client").
// Só cria o client de verdade no navegador — evita que o Next tente
// instanciar isso durante o build/prerender no servidor (onde as
// variáveis de ambiente às vezes ainda não estão disponíveis).
export function supabaseBrowser() {
  if (typeof window === 'undefined') return null;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    console.error('Variáveis do Supabase ausentes (NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY).');
    return null;
  }
  return createBrowserClient(url, key);
}
