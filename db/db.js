import { createClient } from "@supabase/supabase-js";

let supabase;

/**
 * Retorna uma instância única do cliente Supabase.
 * - Usa SERVICE_ROLE_KEY no backend (Hono, Node.js)
 * - Usa ANON_KEY no frontend (browser)
 */
export function getSupabase(env = process.env) {
  if (supabase) return supabase;

  const isServer = typeof window === "undefined";
  const url = env.SUPABASE_URL;

  // ⚙️ Se for backend (Node/Hono), usa a chave mais poderosa
  const key = isServer
    ? env.SUPABASE_SERVICE_ROLE_KEY
    : env.SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error(
      "❌ SUPABASE_URL ou SUPABASE_KEY ausente. Verifique suas variáveis de ambiente."
    );
  }

  supabase = createClient(url, key, {
    auth: {
      persistSession: !isServer, // não manter sessão no backend
    },
  });

  console.log(`🔗 Supabase inicializado no ${isServer ? "backend" : "frontend"}`);
  return supabase;
}
