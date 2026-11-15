// Lógica pura de metas de ahorro y simulador de crédito (probada con `node --test`).
import { addMeses, mesCorto, periodoDe } from "./finanzas.ts";
import type { GoalFull } from "./types.ts";

/** Meses entre dos periodos YYYY-MM (b − a). */
export function mesesEntre(a: string, b: string): number {
  const [ya, ma] = a.split("-").map(Number);
  const [yb, mb] = b.split("-").map(Number);
  return (yb - ya) * 12 + (mb - ma);
}

/** "ago 2027" */
export function periodoCorto(periodo: string): string {
  return `${mesCorto(periodo)} ${periodo.slice(0, 4)}`;
}

/** Cuota mensual con amortización francesa. tasaAnual en %, p. ej. 14.5. */
export function cuotaCredito(financiado: number, tasaAnual: number, n: number): number {
  if (financiado <= 0 || n <= 0) return 0;
  const i = tasaAnual / 100 / 12;
  if (i === 0) return financiado / n;
  return (financiado * i) / (1 - Math.pow(1 + i, -n));
}

export type Simulacion = { financiado: number; cuota: number; total: number; intereses: number; pctPie: number };

export function simularCredito(precio: number, pie: number, tasaAnual: number, n: number): Simulacion {
  const pieReal = Math.max(0, Math.min(pie, precio));
  const financiado = precio - pieReal;
  const cuota = cuotaCredito(financiado, tasaAnual, n);
  const total = cuota * n;
  return {
    financiado,
    cuota: Math.round(cuota),
    total: Math.round(total),
    intereses: Math.round(total - financiado),
    pctPie: precio > 0 ? Math.round((pieReal / precio) * 100) : 0,
  };
}

export function ahorrado(g: GoalFull): number {
  return g.contributions.reduce((s, c) => s + c.monto, 0);
}

/** 0 a 1 */
export function progreso(g: GoalFull): number {
  return Math.max(0, Math.min(1, ahorrado(g) / g.meta_ahorro));
}

export type Proyeccion = {
  ahorrado: number;
  restante: number;
  /** Meses que faltan con el aporte planeado; 0 si ya se logró; null sin plan. */
  mesesRestantes: number | null;
  /** Periodo YYYY-MM estimado de llegada. */
  llegada: string | null;
  /** Lo que el plan esperaba tener ahorrado a este mes (incluido). null sin plan. */
  esperadoHoy: number | null;
  /** ahorrado − esperado: positivo = adelantado. */
  diferencia: number | null;
  /** Promedio real por mes desde el inicio. */
  promedioMensual: number;
  lograda: boolean;
};

export function proyectar(g: GoalFull, hoy: string): Proyeccion {
  const total = ahorrado(g);
  const restante = Math.max(0, g.meta_ahorro - total);
  const actual = periodoDe(hoy);
  const transcurridos = Math.max(1, mesesEntre(periodoDe(g.fecha_inicio), actual) + 1);
  const plan = g.aporte_mensual_plan;
  const lograda = restante === 0;
  const mesesRestantes = lograda ? 0 : plan ? Math.ceil(restante / plan) : null;
  const esperadoHoy = plan ? Math.min(g.meta_ahorro, plan * transcurridos) : null;
  return {
    ahorrado: total,
    restante,
    mesesRestantes,
    llegada: mesesRestantes === null ? null : addMeses(actual, mesesRestantes),
    esperadoHoy,
    diferencia: esperadoHoy === null ? null : total - esperadoHoy,
    promedioMensual: Math.round(total / transcurridos),
    lograda,
  };
}

export type PuntoSerie = { periodo: string; plan: number | null; real: number | null };

/** Serie mensual plan vs real desde el inicio hasta la llegada estimada (o hoy). */
export function serieAhorro(g: GoalFull, hoy: string): PuntoSerie[] {
  const inicio = periodoDe(g.fecha_inicio);
  const actual = periodoDe(hoy);
  const p = proyectar(g, hoy);
  const finPlan = g.aporte_mensual_plan
    ? addMeses(inicio, Math.ceil(g.meta_ahorro / g.aporte_mensual_plan) - 1)
    : actual;
  const fin = [actual, finPlan, p.llegada ?? actual].sort().at(-1)!;
  const n = Math.min(120, mesesEntre(inicio, fin) + 1);

  const porMes = new Map<string, number>();
  for (const c of g.contributions) {
    const k = periodoDe(c.fecha);
    porMes.set(k, (porMes.get(k) ?? 0) + c.monto);
  }
  // Aportes anteriores al inicio cuentan en el primer mes.
  let acumulado = [...porMes].filter(([k]) => k < inicio).reduce((s, [, v]) => s + v, 0);

  return Array.from({ length: n }, (_, i) => {
    const periodo = addMeses(inicio, i);
    acumulado += porMes.get(periodo) ?? 0;
    return {
      periodo,
      plan: g.aporte_mensual_plan ? Math.min(g.meta_ahorro, g.aporte_mensual_plan * (i + 1)) : null,
      real: periodo <= actual ? acumulado : null,
    };
  });
}
