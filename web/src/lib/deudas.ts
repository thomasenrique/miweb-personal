// Lógica pura de tarjetas, compras en cuotas y créditos (probada con `node --test`).
import { addMeses, cobraEnPeriodo, esCargoCredito, fechaCobro, fechaVencimiento, periodoDe } from "./finanzas.ts";
import { mesesEntre } from "./metas.ts";
import type { Card, DebtFull, Grupo, ProviderFull } from "./types.ts";

/**
 * Mes (YYYY-MM) en que se paga la cuota 1 de una compra con tarjeta.
 * Compra hasta el día de facturación → entra en el estado de cuenta de ese mes;
 * si no, en el del mes siguiente. Si el día de pago es ≤ al de facturación,
 * ese estado de cuenta se paga al mes siguiente.
 */
export function primerMesPagoTarjeta(fechaCompra: string, diaFacturacion: number, diaPago: number): string {
  const dia = Number(fechaCompra.slice(8, 10));
  const mesCierre = dia <= diaFacturacion ? periodoDe(fechaCompra) : addMeses(periodoDe(fechaCompra), 1);
  return diaPago > diaFacturacion ? mesCierre : addMeses(mesCierre, 1);
}

/** Día en que se paga la deuda: el de la tarjeta para compras, el propio para créditos (por defecto, fin de mes). */
export function diaPagoDe(d: DebtFull): number {
  return d.card?.dia_pago ?? d.dia_pago ?? 31;
}

/** Fecha de vencimiento (YYYY-MM-DD) de la cuota k (1..n). */
export function vencimientoCuota(d: DebtFull, k: number): string {
  return fechaVencimiento(addMeses(d.primer_mes_pago, k - 1), diaPagoDe(d));
}

/** Número de cuota (1..n) que se paga en el periodo, o null si ninguna. */
export function cuotaDelPeriodo(d: DebtFull, periodo: string): number | null {
  const k = mesesEntre(d.primer_mes_pago, periodo) + 1;
  return k >= 1 && k <= d.n_cuotas ? k : null;
}

/** Cuotas pagadas a la fecha: las que vencieron antes de hoy (o todas si está saldada). */
export function cuotasPagadas(d: DebtFull, hoy: string): number {
  if (d.saldada) return d.n_cuotas;
  let n = 0;
  for (let k = 1; k <= d.n_cuotas; k++) {
    if (vencimientoCuota(d, k) < hoy) n = k;
    else break;
  }
  return n;
}

export function terminada(d: DebtFull, hoy: string): boolean {
  return cuotasPagadas(d, hoy) >= d.n_cuotas;
}

/** Lo que falta pagar (cuotas pendientes × valor cuota). */
export function saldoRestante(d: DebtFull, hoy: string): number {
  return (d.n_cuotas - cuotasPagadas(d, hoy)) * d.valor_cuota;
}

/** Interés total = valor cuota × n − monto (0 si es sin interés). */
export function interesTotal(d: Pick<DebtFull, "valor_cuota" | "n_cuotas" | "monto_total">): number {
  return Math.max(0, d.valor_cuota * d.n_cuotas - d.monto_total);
}

/** Total de cuotas que se pagan en un periodo (excluye saldadas). */
export function aPagarEnPeriodo(debts: DebtFull[], periodo: string): number {
  return debts.reduce((s, d) => (!d.saldada && cuotaDelPeriodo(d, periodo) ? s + d.valor_cuota : s), 0);
}

export function proyeccion(debts: DebtFull[], desde: string, meses: number) {
  return Array.from({ length: meses }, (_, i) => {
    const periodo = addMeses(desde, i);
    return { periodo, total: aPagarEnPeriodo(debts, periodo) };
  });
}

/** Capital pendiente de una compra (para el cupo): monto × cuotas pendientes / n. */
export function capitalPendiente(d: DebtFull, hoy: string): number {
  return Math.round((d.monto_total * (d.n_cuotas - cuotasPagadas(d, hoy))) / d.n_cuotas);
}

/**
 * Suscripciones cobradas a la tarjeta que entran en el estado de cuenta que se paga en `periodoPago`.
 */
export function suscripcionesEnPago(card: Card, providers: ProviderFull[], periodoPago: string): number {
  if (card.tipo !== "credito" || card.dia_facturacion == null || card.dia_pago == null) return 0;
  let total = 0;
  for (const p of providers) {
    if (p.card_id !== card.id || !esCargoCredito(p)) continue;
    for (let i = -2; i <= 0; i++) {
      const per = addMeses(periodoPago, i);
      if (!cobraEnPeriodo(p, per)) continue;
      if (primerMesPagoTarjeta(fechaCobro(p, per), card.dia_facturacion, card.dia_pago) === periodoPago) {
        total += p.monto_estimado ?? 0;
      }
    }
  }
  return total;
}

export function resumenTarjeta(card: Card, debts: DebtFull[], hoy: string, providers: ProviderFull[] = []) {
  const propias = debts.filter((d) => d.card_id === card.id);
  const usado = propias.reduce((s, d) => s + capitalPendiente(d, hoy), 0);
  const actual = periodoDe(hoy);
  const diaPago = card.dia_pago ?? 31;
  const vencimientoActual = fechaVencimiento(actual, diaPago);
  // Si el pago de este mes ya pasó, el próximo es el del mes siguiente.
  const periodoProximo = vencimientoActual < hoy ? addMeses(actual, 1) : actual;
  const cuotasProximo = aPagarEnPeriodo(propias, periodoProximo);
  const suscripcionesProximo = suscripcionesEnPago(card, providers, periodoProximo);
  return {
    usado,
    disponible: card.cupo == null ? null : Math.max(0, card.cupo - usado),
    pctUsado: card.cupo ? Math.min(100, Math.round((usado / card.cupo) * 100)) : null,
    proximoPago: fechaVencimiento(periodoProximo, diaPago),
    cuotasProximo,
    suscripcionesProximo,
    montoProximo: cuotasProximo + suscripcionesProximo,
    activas: propias.filter((d) => !terminada(d, hoy)).length,
  };
}

export function filtrarDeudasGrupo(debts: DebtFull[], grupo: Grupo | "todo"): DebtFull[] {
  return grupo === "todo" ? debts : debts.filter((d) => d.grupo === grupo);
}
