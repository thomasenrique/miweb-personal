import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/** MODO_DEMO=1 fuerza datos de ejemplo aunque haya claves (solo para desarrollo local). */
export const supabaseConfigurado =
  process.env.MODO_DEMO !== "1" &&
  Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

export async function crearSupabase() {
  const store = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => store.getAll(),
        setAll: (lista) => {
          try {
            for (const { name, value, options } of lista) store.set(name, value, options);
          } catch {
            // Llamado desde un Server Component: el proxy refresca la sesión.
          }
        },
      },
    },
  );
}
