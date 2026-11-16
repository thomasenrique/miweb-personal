// Lógica pura del "libre disponible": sueldo menos los compromisos del mes (probada con `node --test`).
import { aPagarEnPeriodo } from "./deudas.ts";
import { calcularPendientes } from "./finanzas.ts";
import type { BillFull, DebtFull, GoalFull, ProviderFull } from "./types.ts";

export type Presupuesto = {
  sueldo: number;
  /** Cuentas registradas del mes (pagadas, pendientes o por revisar) + estimado de las que faltan. */
  cuentas: number;
  cuotas: number;
  metas: number;
  comprometido: number;
  libre: number;
  /** 0 a 1 (puede pasar de 1 si el mes no alcanza). */
  usado: number;
};

export function calcularPresupuesto(
  sueldo: number,
  datos: { bills: BillFull[]; providers: ProviderFull[]; debts: DebtFull[]; goals: GoalFull[] },
  periodo: string,
  hoy: string,
): Presupuesto {
  const registradas = datos.bills.filter((b) => b.periodo === periodo).reduce((s, b) => s + b.monto, 0);
  const faltan = calcularPendientes(datos.providers, datos.bills, periodo, hoy).reduce((s, p) => s + p.montoEstimado, 0);
  const cuentas = registradas + faltan;
  const cuotas = aPagarEnPeriodo(datos.debts, periodo);
  const metas = datos.goals
    .filter((g) => g.estado === "activa")
    .reduce((s, g) => s + (g.aporte_mensual_plan ?? 0), 0);
  const comprometido = cuentas + cuotas + metas;
  return {
    sueldo, cuentas, cuotas, metas, comprometido,
    libre: sueldo - comprometido,
    usado: sueldo > 0 ? comprometido / sueldo : 0,
  };
}
