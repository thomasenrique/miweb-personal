import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const PUBLICAS = ["/login", "/auth"];

/** Refresca la sesión de Supabase y manda a /login si no hay usuario. */
export async function proxy(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key || process.env.MODO_DEMO === "1") return NextResponse.next(); // modo demo

  // Si Supabase devuelve el código del enlace mágico a otra ruta (p. ej. la Site URL "/"),
  // lo mandamos al callback para canjearlo.
  const code = request.nextUrl.searchParams.get("code");
  if (code && !request.nextUrl.pathname.startsWith("/auth/callback")) {
    const cb = request.nextUrl.clone();
    cb.pathname = "/auth/callback";
    cb.search = `?code=${encodeURIComponent(code)}`;
    return NextResponse.redirect(cb);
  }

  let response = NextResponse.next({ request });
  const supabase = createServerClient(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (lista) => {
        for (const { name, value } of lista) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of lista) response.cookies.set(name, value, options);
      },
    },
  });

  const { data } = await supabase.auth.getUser();
  const publica = PUBLICAS.some((p) => request.nextUrl.pathname.startsWith(p));
  if (!data.user && !publica) {
    const login = request.nextUrl.clone();
    login.pathname = "/login";
    login.search = "";
    return NextResponse.redirect(login);
  }
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/|.*\\.(?:svg|png|jpg|ico|webmanifest)$).*)"],
};
