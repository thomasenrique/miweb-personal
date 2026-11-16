// Datos de ejemplo en memoria para usar la app sin Supabase (se pierden al reiniciar el servidor).
import "server-only";
import { addMeses, fechaVencimiento, hoyChile, periodoDe } from "./finanzas";
import type { Bill, Card, Category, Contribution, Debt, Goal, Provider } from "./types";

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
  mes_cobro: null, moneda: "CLP", monto_estimado: monto, activo: true, card_id: null, monto_variable: false, ...extra,
});

const providers: Provider[] = [
  p("enel", "Enel", "luz", 5, 42000, { monto_variable: true }),
  p("aguas", "Aguas Andinas", "agua", 18, 15800, { monto_variable: true }),
  p("metrogas", "Metrogas", "gas", 22, 22000, { monto_variable: true }),
  p("movistar", "Movistar Hogar", "internet", 8, 24990),
  p("entel", "Entel", "internet", 15, 28230),
  p("edificio", "Edificio", "comunes", 10, 89000),
  p("claude", "Claude", "subs", 12, 19000, { moneda: "USD", card_id: "rut" }),
  p("youtube", "YouTube Premium", "subs", 7, 4150, { card_id: "visa" }),
  p("spotify", "Spotify", "subs", 3, 5850, { card_id: "rut" }),
  p("icloud", "iCloud", "subs", 20, 2900),
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

function generarDeudas(): { cards: Card[]; debts: Debt[] } {
  const actual = periodoDe(hoyChile());
  const cards: Card[] = [
    { id: "visa", nombre: "Visa BCI", tipo: "credito", ultimos4: "4821", cupo: 3_000_000, dia_facturacion: 20, dia_pago: 5, activa: true },
    { id: "master", nombre: "Master Santander", tipo: "credito", ultimos4: "1093", cupo: 2_000_000, dia_facturacion: 25, dia_pago: 10, activa: true },
    { id: "rut", nombre: "Cuenta RUT", tipo: "debito", ultimos4: "1234", cupo: null, dia_facturacion: null, dia_pago: null, activa: true },
  ];
  const d = (o: Partial<Debt> & Pick<Debt, "id" | "descripcion" | "monto_total" | "n_cuotas" | "valor_cuota" | "primer_mes_pago">): Debt => ({
    tipo: "compra", card_id: "visa", institucion: null, grupo: "hogar", fecha: `${addMeses(o.primer_mes_pago, -1)}-15`,
    dia_pago: null, saldada: false, notas: null, ...o,
  });
  const debts: Debt[] = [
    d({ id: "refri", descripcion: "Refrigerador", monto_total: 699_600, n_cuotas: 12, valor_cuota: 62_400, primer_mes_pago: addMeses(actual, -3) }),
    d({ id: "notebook", descripcion: "Notebook", card_id: "master", grupo: "personal", monto_total: 540_000, n_cuotas: 6, valor_cuota: 90_000, primer_mes_pago: addMeses(actual, -1) }),
    d({ id: "super", descripcion: "Supermercado", monto_total: 84_200, n_cuotas: 1, valor_cuota: 84_200, primer_mes_pago: addMeses(actual, 1) }),
    d({
      id: "consumo", tipo: "credito", card_id: null, descripcion: "Crédito de consumo", institucion: "BancoEstado",
      grupo: "personal", monto_total: 3_000_000, n_cuotas: 36, valor_cuota: 104_000, primer_mes_pago: addMeses(actual, -13), dia_pago: 15,
    }),
  ];
  return { cards, debts };
}

type Store = {
  categories: Category[];
  providers: Provider[];
  bills: Bill[];
  goals: Goal[];
  contributions: Contribution[];
  cards: Card[];
  debts: Debt[];
  sueldo: number | null;
};

// Un solo store por proceso (sobrevive a recargas en desarrollo).
const g = globalThis as unknown as { __demoStore?: Store };
if (g.__demoStore && !g.__demoStore.goals) Object.assign(g.__demoStore, generarMetas());
if (g.__demoStore && !g.__demoStore.cards) Object.assign(g.__demoStore, generarDeudas());
if (g.__demoStore) for (const pr of g.__demoStore.providers) pr.monto_variable ??= ["luz", "agua", "gas"].includes(pr.category_id);
if (g.__demoStore && g.__demoStore.sueldo === undefined) g.__demoStore.sueldo = 1_650_000;
export const demo: Store = (g.__demoStore ??= { categories, providers, bills: generarCuentas(), ...generarMetas(), ...generarDeudas(), sueldo: 1_650_000 });
