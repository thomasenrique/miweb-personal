// Lógica pura (sin dependencias de Next ni Supabase) para poder probarla con `node --test`.
import type { Bill, BillFull, Card, Grupo, ProviderFull } from "./types.ts";

const ZONA = "America/Santiago";
const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
const MESES_LARGOS = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

/** $42.100 */
export function formatCLP(n: number): string {
  const v = Math.round(n);
  return (v < 0 ? "-$" : "$") + Math.abs(v).toLocaleString("es-CL");
}

/** Convierte "$42.100", "42100" o "20,5" en número. NaN si no es válido. */
export function parseMonto(s: string): number {
  const limpio = s.replace(/[$\s]/g, "").replace(/\./g, "").replace(",", ".");
  if (!/^\d+(\.\d+)?$/.test(limpio)) return NaN;
  return Number(limpio);
}

/** Fecha de hoy en Chile, "YYYY-MM-DD". */
export function hoyChile(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: ZONA }).format(now);
}

export function periodoDe(fecha: string): string {
  return fecha.slice(0, 7);
}

export function esPeriodo(s: string | undefined | null): s is string {
  return !!s && /^\d{4}-(0[1-9]|1[0-2])$/.test(s);
}

export function addMeses(periodo: string, n: number): string {
  const [y, m] = periodo.split("-").map(Number);
  const total = y * 12 + (m - 1) + n;
  return `${Math.floor(total / 12)}-${String((total % 12) + 1).padStart(2, "0")}`;
}

/** Los últimos `n` periodos terminando en `periodo` (orden cronológico). */
export function ultimosPeriodos(periodo: string, n: number): string[] {
  return Array.from({ length: n }, (_, i) => addMeses(periodo, i - n + 1));
}

export function mesCorto(periodo: string): string {
  return MESES[Number(periodo.slice(5, 7)) - 1];
}

export function tituloPeriodo(periodo: string, periodoHoy: string): string {
  const nombre = MESES_LARGOS[Number(periodo.slice(5, 7)) - 1];
  return periodo.slice(0, 4) === periodoHoy.slice(0, 4) ? nombre : `${nombre} ${periodo.slice(0, 4)}`;
}

/** "18 nov" */
export function fechaCorta(fecha: string): string {
  return `${Number(fecha.slice(8, 10))} ${MESES[Number(fecha.slice(5, 7)) - 1]}`;
}

function diasDelMes(periodo: string): number {
  const [y, m] = periodo.split("-").map(Number);
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

/** Fecha de vencimiento dentro del periodo; el día 31 se ajusta al último día del mes. */
export function fechaVencimiento(periodo: string, dia: number): string {
  const d = Math.min(dia, diasDelMes(periodo));
  return `${periodo}-${String(d).padStart(2, "0")}`;
}

export function diasEntre(desde: string, hasta: string): number {
  return Math.round((Date.parse(hasta) - Date.parse(desde)) / 86_400_000);
}

/** ¿Este proveedor cobra en el periodo dado? */
export function cobraEnPeriodo(p: ProviderFull, periodo: string): boolean {
  if (!p.activo) return false;
  if (p.frecuencia === "mensual") return true;
  return p.mes_cobro === Number(periodo.slice(5, 7));
}

export type Pendiente = {
  provider: ProviderFull;
  /** Cuenta ya registrada como pendiente (monto real ingresado, falta pagarla). */
  bill?: BillFull;
  vencimiento: string | null;
  /** Días que faltan (negativo = vencido). null si no tiene día de vencimiento. */
  dias: number | null;
  montoEstimado: number;
};

/**
 * Proveedores que cobran en el periodo y aún no tienen una cuenta registrada,
 * más las cuentas registradas con estado "pendiente". Ordenados por vencimiento.
 */
export function calcularPendientes(
  providers: ProviderFull[],
  bills: BillFull[],
  periodo: string,
  hoy: string,
  estimados?: Map<string, number>,
): Pendiente[] {
  const conCuenta = new Set(bills.filter((b) => b.periodo === periodo).map((b) => b.provider_id));
  const out: Pendiente[] = [];
  for (const p of providers) {
    if (!cobraEnPeriodo(p, periodo) || conCuenta.has(p.id)) continue;
    const vencimiento = p.dia_vencimiento ? fechaVencimiento(periodo, p.dia_vencimiento) : null;
    out.push({
      provider: p,
      vencimiento,
      dias: vencimiento ? diasEntre(hoy, vencimiento) : null,
      montoEstimado: estimados?.get(p.id) ?? p.monto_estimado ?? 0,
    });
  }
  return out.sort((a, b) => (a.vencimiento ?? "9999").localeCompare(b.vencimiento ?? "9999"));
}

/** Cuentas registradas del periodo con estado "pendiente": ya tienen monto real, falta pagarlas. */
export function cuentasPorPagar(bills: BillFull[], periodo: string, hoy: string): Pendiente[] {
  return bills
    .filter((b) => b.periodo === periodo && b.estado === "pendiente")
    .map((b) => ({
      provider: b.provider,
      bill: b,
      vencimiento: b.fecha_vencimiento,
      dias: b.fecha_vencimiento ? diasEntre(hoy, b.fecha_vencimiento) : null,
      montoEstimado: b.monto,
    }))
    .sort((a, b) => (a.vencimiento ?? "9999").localeCompare(b.vencimiento ?? "9999"));
}

/**
 * Monto esperado de los proveedores de monto variable: promedio de lo registrado en los
 * `historial` meses anteriores a `periodo` (por defecto 3). Sin historial no aparece en el mapa
 * (se usa el monto estimado del proveedor).
 */
export function estimadosVariables(
  providers: ProviderFull[],
  bills: BillFull[],
  periodo: string,
  historial = 3,
): Map<string, number> {
  const previos = new Set(ultimosPeriodos(addMeses(periodo, -1), historial));
  const out = new Map<string, number>();
  for (const p of providers) {
    if (!p.monto_variable) continue;
    const montos = bills.filter((b) => b.provider_id === p.id && previos.has(b.periodo)).map((b) => b.monto);
    if (montos.length) out.set(p.id, Math.round(montos.reduce((s, m) => s + m, 0) / montos.length));
  }
  return out;
}

export function textoVencimiento(p: Pendiente): string {
  if (p.dias === null || !p.vencimiento) return "Sin día de vencimiento";
  if (p.dias < 0) return `Vencida hace ${-p.dias} ${-p.dias === 1 ? "día" : "días"}`;
  if (p.dias === 0) return "Vence hoy";
  if (p.dias === 1) return "Vence mañana";
  if (p.dias <= 7) return `Vence en ${p.dias} días`;
  return `Vence el ${fechaCorta(p.vencimiento)}`;
}

export type Alertas = { vencidas: Pendiente[]; proximas: Pendiente[] };

/** Separa los pendientes vencidos de los que vencen dentro de la ventana (por defecto 7 días). */
export function alertasVencimiento(pendientes: Pendiente[], ventanaDias = 7): Alertas {
  const conDia = pendientes.filter((p): p is Pendiente & { dias: number } => p.dias !== null);
  return {
    vencidas: conDia.filter((p) => p.dias < 0),
    proximas: conDia.filter((p) => p.dias >= 0 && p.dias <= ventanaDias),
  };
}

/**
 * Cuenta "pagada" armada a partir del proveedor y su monto estimado, para registrar con un toque.
 * Devuelve null si el proveedor no tiene monto estimado (hay que usar el formulario completo).
 * El monto estimado siempre está en CLP, así que la cuenta se guarda en CLP.
 */
export function cuentaPagadaRapida(p: ProviderFull, periodo: string, hoy: string): Omit<Bill, "id"> | null {
  // Si el monto cambia cada mes, el estimado no sirve para registrar el pago.
  if (p.monto_variable || !p.monto_estimado || p.monto_estimado <= 0) return null;
  return {
    provider_id: p.id,
    monto: Math.round(p.monto_estimado),
    moneda_original: "CLP",
    monto_original: null,
    tipo_cambio: null,
    fecha_pago: hoy,
    periodo,
    fecha_vencimiento: p.dia_vencimiento ? fechaVencimiento(periodo, p.dia_vencimiento) : null,
    estado: "pagado",
    fuente: "manual",
    notas: "Pago rápido con el monto estimado",
  };
}

/** Cuentas que cuentan como gasto realizado (pagadas o por revisar). */
export function cuentasDelGasto(bills: BillFull[]): BillFull[] {
  return bills.filter((b) => b.estado !== "pendiente");
}

export function totalPorGrupo(bills: BillFull[]): Record<Grupo, number> {
  const t: Record<Grupo, number> = { hogar: 0, personal: 0 };
  for (const b of cuentasDelGasto(bills)) t[b.provider.category.grupo] += b.monto;
  return t;
}

export type TotalCategoria = { id: string; nombre: string; icono: string; total: number };

export function totalPorCategoria(bills: BillFull[]): TotalCategoria[] {
  const m = new Map<string, TotalCategoria>();
  for (const b of cuentasDelGasto(bills)) {
    const c = b.provider.category;
    const t = m.get(c.id) ?? { id: c.id, nombre: c.nombre, icono: c.icono, total: 0 };
    t.total += b.monto;
    m.set(c.id, t);
  }
  return [...m.values()].sort((a, b) => b.total - a.total);
}

export function totalPorPeriodo(bills: BillFull[], periodos: string[]): number[] {
  return periodos.map((p) =>
    cuentasDelGasto(bills)
      .filter((b) => b.periodo === p)
      .reduce((s, b) => s + b.monto, 0),
  );
}

/** Variación porcentual redondeada; null si no hay base. */
export function variacion(actual: number, anterior: number): number | null {
  if (anterior <= 0) return null;
  return Math.round(((actual - anterior) / anterior) * 100);
}

/** Costo mensual equivalente de una suscripción (anual / 12). */
export function costoMensual(p: ProviderFull): number {
  const m = p.monto_estimado ?? 0;
  return p.frecuencia === "anual" ? Math.round(m / 12) : m;
}

export function resumenSuscripciones(providers: ProviderFull[]) {
  const subs = providers.filter((p) => p.activo && p.category.es_suscripcion);
  const mensual = subs.reduce((s, p) => s + costoMensual(p), 0);
  return { subs, mensual, anual: mensual * 12 };
}

export function filtrarGrupo<T extends { provider: ProviderFull } | ProviderFull>(
  items: T[],
  grupo: Grupo | "todo",
): T[] {
  if (grupo === "todo") return items;
  return items.filter((i) => {
    const p: ProviderFull = "provider" in i ? i.provider : (i as ProviderFull);
    return p.category.grupo === grupo;
  });
}

// ——— Medios de pago de las suscripciones ———

/** ¿La suscripción se cobra sola en una tarjeta de crédito? */
export function esCargoCredito(p: ProviderFull): boolean {
  return p.category.es_suscripcion && p.card?.tipo === "credito";
}

/** Fecha de cobro en el periodo (sin día de cobro se asume el 1). */
export function fechaCobro(p: ProviderFull, periodo: string): string {
  return fechaVencimiento(periodo, p.dia_vencimiento ?? 1);
}

/**
 * Cuentas que hay que registrar solas: suscripciones activas cobradas a tarjeta de crédito
 * cuyo día de cobro ya llegó en el periodo y que todavía no tienen cuenta ese mes.
 */
export function cargosAutomaticos(
  providers: ProviderFull[],
  bills: BillFull[],
  periodo: string,
  hoy: string,
): Omit<Bill, "id">[] {
  const conCuenta = new Set(bills.filter((b) => b.periodo === periodo).map((b) => b.provider_id));
  const out: Omit<Bill, "id">[] = [];
  for (const p of providers) {
    if (!esCargoCredito(p) || !cobraEnPeriodo(p, periodo) || conCuenta.has(p.id)) continue;
    if (!p.monto_estimado || p.monto_estimado <= 0) continue;
    const fecha = fechaCobro(p, periodo);
    if (fecha > hoy) continue;
    out.push({
      provider_id: p.id,
      monto: Math.round(p.monto_estimado),
      moneda_original: "CLP",
      monto_original: null,
      tipo_cambio: null,
      fecha_pago: fecha,
      periodo,
      fecha_vencimiento: fecha,
      estado: "pagado",
      fuente: "manual",
      notas: `Cargo automático a ${p.card!.nombre}`,
    });
  }
  return out;
}

export type GrupoTarjeta = {
  /** null = sin tarjeta asignada. */
  card: Card | null;
  items: ProviderFull[];
  /** Lo que se cobra en un mes normal (las anuales prorrateadas). */
  mensual: number;
  /** Próximo cobro desde hoy (incluye hoy). */
  proximo: { provider: ProviderFull; fecha: string } | null;
};

/** Próxima fecha de cobro de la suscripción desde hoy, mirando hasta 12 meses. */
export function proximoCobro(p: ProviderFull, hoy: string): string | null {
  if (!p.activo) return null;
  const actual = periodoDe(hoy);
  for (let i = 0; i <= 12; i++) {
    const per = addMeses(actual, i);
    if (!cobraEnPeriodo(p, per)) continue;
    const f = fechaCobro(p, per);
    if (f >= hoy) return f;
  }
  return null;
}

/**
 * Agrupa las suscripciones por la tarjeta con que se cobran.
 * Orden: débito, crédito, y al final las sin tarjeta.
 */
export function agruparPorTarjeta(subs: ProviderFull[], hoy: string): GrupoTarjeta[] {
  const m = new Map<string, GrupoTarjeta>();
  for (const p of subs) {
    const key = p.card?.id ?? "";
    const g = m.get(key) ?? { card: p.card, items: [], mensual: 0, proximo: null };
    g.items.push(p);
    if (p.activo) g.mensual += costoMensual(p);
    const f = proximoCobro(p, hoy);
    if (f && (!g.proximo || f < g.proximo.fecha)) g.proximo = { provider: p, fecha: f };
    m.set(key, g);
  }
  const rango = (g: GrupoTarjeta) => (g.card == null ? 2 : g.card.tipo === "debito" ? 0 : 1);
  return [...m.values()].sort((a, b) => rango(a) - rango(b) || (a.card?.nombre ?? "").localeCompare(b.card?.nombre ?? ""));
}
