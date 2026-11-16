import { test } from "node:test";
import assert from "node:assert/strict";
import {
  aPagarEnPeriodo, capitalPendiente, cuotaDelPeriodo, cuotasPagadas, interesTotal,
  primerMesPagoTarjeta, proyeccion, resumenTarjeta, saldoRestante, vencimientoCuota,
} from "./deudas.ts";
import type { Card, DebtFull, ProviderFull } from "./types.ts";

const visa: Card = { id: "visa", nombre: "Visa", tipo: "credito", ultimos4: "4821", cupo: 3_000_000, dia_facturacion: 20, dia_pago: 5, activa: true };

function compra(o: Partial<DebtFull>): DebtFull {
  return {
    id: "d", tipo: "compra", card_id: visa.id, card: visa, descripcion: "X", institucion: null, grupo: "hogar",
    fecha: "2026-08-10", monto_total: 699_600, n_cuotas: 12, valor_cuota: 62_400, primer_mes_pago: "2026-09",
    dia_pago: null, saldada: false, notas: null, ...o,
  };
}

test("primera cuota según facturación", () => {
  // Factura día 20, paga día 5 → el estado de cuenta se paga al mes siguiente.
  assert.equal(primerMesPagoTarjeta("2026-11-15", 20, 5), "2026-12");
  assert.equal(primerMesPagoTarjeta("2026-11-20", 20, 5), "2026-12");
  assert.equal(primerMesPagoTarjeta("2026-11-21", 20, 5), "2027-01");
  // Factura día 5, paga día 25 → se paga en el mismo mes del cierre.
  assert.equal(primerMesPagoTarjeta("2026-11-03", 5, 25), "2026-11");
  assert.equal(primerMesPagoTarjeta("2026-11-06", 5, 25), "2026-12");
});

test("cuotas pagadas por fecha y saldo", () => {
  const d = compra({});
  assert.equal(vencimientoCuota(d, 1), "2026-09-05");
  assert.equal(cuotasPagadas(d, "2026-11-15"), 3); // sep, oct, nov
  assert.equal(cuotasPagadas(d, "2026-11-05"), 2); // el día del pago aún no cuenta
  assert.equal(saldoRestante(d, "2026-11-15"), 9 * 62_400);
  assert.equal(cuotasPagadas(compra({ saldada: true }), "2026-09-01"), 12);
  assert.equal(cuotaDelPeriodo(d, "2026-12"), 4);
  assert.equal(cuotaDelPeriodo(d, "2027-09"), null);
});

test("interés y capital pendiente", () => {
  assert.equal(interesTotal(compra({})), 49_200);
  assert.equal(interesTotal(compra({ valor_cuota: 58_300 })), 0); // sin interés
  assert.equal(capitalPendiente(compra({}), "2026-11-15"), 524_700); // 699.600 × 9/12
});

test("a pagar por mes y proyección", () => {
  const a = compra({ id: "a" });
  const b = compra({ id: "b", n_cuotas: 1, valor_cuota: 84_200, monto_total: 84_200, primer_mes_pago: "2026-12" });
  const s = compra({ id: "s", saldada: true });
  assert.equal(aPagarEnPeriodo([a, b, s], "2026-12"), 62_400 + 84_200);
  assert.deepEqual(proyeccion([a, b], "2026-12", 2).map((p) => p.total), [146_600, 62_400]);
});

test("resumen de tarjeta", () => {
  const r = resumenTarjeta(visa, [compra({})], "2026-11-15");
  assert.equal(r.usado, 524_700);
  assert.equal(r.disponible, 3_000_000 - 524_700);
  assert.equal(r.proximoPago, "2026-12-05"); // el pago del 5 nov ya pasó
  assert.equal(r.montoProximo, 62_400);
  assert.equal(r.activas, 1);
});

test("el pago de la tarjeta suma las suscripciones del ciclo", () => {
  const cat = { id: "s", nombre: "Suscripciones", icono: "🔁", grupo: "personal" as const, es_suscripcion: true, orden: 1 };
  const sub = (id: string, dia: number): ProviderFull => ({
    id, nombre: id, category_id: "s", category: cat, numero_cliente: null, dia_vencimiento: dia, frecuencia: "mensual",
    mes_cobro: null, moneda: "CLP", monto_estimado: 5_000, activo: true, card_id: visa.id, card: visa, monto_variable: false,
  });
  // Pago del 5 dic: estado que cierra el 20 nov → cobros del 21 oct al 20 nov.
  const r = resumenTarjeta(visa, [compra({})], "2026-11-15", [sub("a", 14), sub("b", 25)]);
  assert.equal(r.suscripcionesProximo, 10_000); // a: 14 nov; b: 25 oct
  assert.equal(r.montoProximo, 62_400 + 10_000);
});
