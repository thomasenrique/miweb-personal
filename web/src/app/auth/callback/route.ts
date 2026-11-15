import { NextResponse, type NextRequest } from "next/server";
import { crearSupabase } from "@/lib/supabase/server";

/** Destino del enlace mágico: canjea el código por una sesión. */
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  if (code) {
    const sb = await crearSupabase();
    const { error } = await sb.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL("/", request.url));
  }
  return NextResponse.redirect(new URL("/login?error=" + encodeURIComponent("El enlace expiró. Pide uno nuevo."), request.url));
}
