import "server-only";

/**
 * Dólar observado de una fecha (YYYY-MM-DD) desde mindicador.cl.
 * Si ese día no hay valor (fin de semana/feriado) usa el último disponible del año.
 * Devuelve null si el servicio no responde.
 */
export async function dolarDelDia(fecha: string): Promise<number | null> {
  const [y, m, d] = fecha.split("-");
  try {
    const r = await fetch(`https://mindicador.cl/api/dolar/${d}-${m}-${y}`, { signal: AbortSignal.timeout(5000) });
    if (r.ok) {
      const j = (await r.json()) as { serie?: { valor: number }[] };
      if (j.serie?.length) return j.serie[0].valor;
    }
    const ra = await fetch(`https://mindicador.cl/api/dolar/${y}`, { signal: AbortSignal.timeout(5000) });
    if (!ra.ok) return null;
    const ja = (await ra.json()) as { serie?: { fecha: string; valor: number }[] };
    const previo = ja.serie?.find((s) => s.fecha.slice(0, 10) <= fecha);
    return previo?.valor ?? null;
  } catch {
    return null;
  }
}
