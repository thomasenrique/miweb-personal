// Datos de ejemplo en memoria para usar la app sin Supabase (se pierden al reiniciar el servidor).
import "server-only";
import { addMeses, fechaVencimiento, hoyChile, periodoDe } from "./finanzas";
import type { Bill, Category, Contribution, Goal, Provider } from "./types";

const cat = (id: string, nombre: string, icono: string, grupo: Category["grupo"], orden: number, es_suscripcion = false): Category =>
  ({ id, nombre, icono, grupo, orden, es_suscripcion });

const categories: Category[] = [
  cat("luz", "Luz", "💡", "hogar", 1),
  cat("agua", "Agua", "💧", "hogar", 2),
  cat("gas", "Gas", "🔥", "hogar", 3),
  cat("internet", "Internet / teléfono", "📶", "hogar", 4),
  cat("comunes", "Gastos comunes", "🏢", "hogar", 5),
  cat("arriendo", "Arriendo o dividendo", "🏠", "hogar", 6),
  cat("subs", "Suscripciones", "🔁", "personal", 10, true),
  cat("otros", "Otros personales", "🧾", "personal", 11),
];

const p = (id: string, nombre: string, category_id: string, dia: number, monto: number, extra: Partial<Provider> = {}): Provider => ({
  id, nombre, category_id, numero_cliente: null, dia_vencimiento: dia, frecuencia: "mensual",
  mes_cobro: null, moneda: "CLP", monto_estimado: monto, activo: true, ...extra,
});

const providers: Provider[] = [
  p("enel", "Enel", "luz", 5, 42000),
  p("aguas", "Aguas Andinas", "agua", 18, 15800),
  p("metrogas", "Metrogas", "gas", 22, 22000),
  p("movistar", "Movistar Hogar", "internet", 8, 24990),
  p("entel", "Entel", "internet", 15, 28230),
  p("edificio", "Edificio", "comunes", 10, 89000),
  p("claude", "Claude", "subs", 12, 19000, { moneda: "USD" }),
  p("youtube", "YouTube Premium", "subs", 7, 4150),
  p("spotify", "Spotify", "subs", 3, 5850),
];

function generarCuentas(): Bill[] {
  const hoy = hoyChile();
  const actual = periodoDe(hoy);
  const out: Bill[] = [];
  let n = 0;
  for (let i = -5; i <= 0; i++) {
    const periodo = addMeses(actual, i);
    for (const prov of providers) {
      const venc = fechaVencimiento(periodo, prov.dia_vencimiento ?? 1);
      // En el mes actual solo están pagadas las que ya vencieron, salvo Aguas y Metrogas.
      if (i === 0 && (venc > hoy || prov.id === "aguas" || prov.id === "metrogas")) continue;
      const variacion = 1 + (((n * 37) % 21) - 10) / 100;
      const usd = prov.moneda === "USD";
      const monto = Math.round((prov.monto_estimado ?? 0) * (usd ? 1 : variacion));
      out.push({
        id: `demo-${n++}`, provider_id: prov.id, monto,
        moneda_original: prov.moneda, monto_original: usd ? 20 : null, tipo_cambio: usd ? 950 : null,
        fecha_pago: venc, periodo, fecha_vencimiento: venc,
        estado: i === 0 && prov.id === "entel" ? "revisar" : "pagado",
        fuente: n % 3 === 0 ? "manual" : "email", notas: null,
      });
    }
  }
  return out;
}

function generarMetas(): { goals: Goal[]; contributions: Contribution[] } {
  const hoy = hoyChile();
  const actual = periodoDe(hoy);
  const inicio = `${addMeses(actual, -5)}-01`;
  const goals: Goal[] = [
    {
      id: "auto", nombre: "Auto nuevo", icono: "🚗", precio_total: 16_000_000, meta_ahorro: 8_000_000,
      aporte_mensual_plan: 380_000, fecha_inicio: inicio, fecha_objetivo: null,
      usa_credito: true, tasa_anual: 14.5, n_cuotas: 36, estado: "activa",
    },
    {
      id: "switch", nombre: "Nintendo Switch", icono: "🎮", precio_total: 350_000, meta_ahorro: 350_000,
      aporte_mensual_plan: 50_000, fecha_inicio: `${addMeses(actual, -2)}-01`, fecha_objetivo: null,
      usa_credito: false, tasa_anual: null, n_cuotas: null, estado: "activa",
    },
  ];
  const montosAuto = [600_000, 350_000, 420_000, 380_000, 400_000, 350_000];
  const contributions: Contribution[] = [
    ...montosAuto.map((monto, i) => ({
      id: `ca-${i}`, goal_id: "auto", monto, fecha: `${addMeses(actual, i - 5)}-12`, nota: i === 0 ? "Bono" : null,
    })),
    { id: "cs-0", goal_id: "switch", monto: 55_000, fecha: `${addMeses(actual, -2)}-05`, nota: null },
    { id: "cs-1", goal_id: "switch", monto: 50_000, fecha: `${addMeses(actual, -1)}-05`, nota: null },
  ];
  return { goals, contributions };
}

type Store = {
  categories: Category[];
  providers: Provider[];
  bills: Bill[];
  goals: Goal[];
  contributions: Contribution[];
};

// Un solo store por proceso (sobrevive a recargas en desarrollo).
const g = globalThis as unknown as { __demoStore?: Store };
if (g.__demoStore && !g.__demoStore.goals) Object.assign(g.__demoStore, generarMetas());
export const demo: Store = (g.__demoStore ??= { categories, providers, bills: generarCuentas(), ...generarMetas() });
