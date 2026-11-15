import { test } from "node:test";
import assert from "node:assert/strict";
import {
  addMeses, alertasVencimiento, cuentaPagadaRapida, calcularPendientes, costoMensual, fechaVencimiento, formatCLP, hoyChile,
  parseMonto, resumenSuscripciones, textoVencimiento, totalPorCategoria, totalPorGrupo,
  ultimosPeriodos, variacion,
} from "./finanzas.ts";
import type { BillFull, Category, ProviderFull } from "./types.ts";

const luz: Category = { id: "c1", nombre: "Luz", icono: "💡", grupo: "hogar", es_suscripcion: false, orden: 1 };
const subs: Category = { id: "c2", nombre: "Suscripciones", icono: "🔁", grupo: "personal", es_suscripcion: true, orden: 2 };

function prov(o: Partial<ProviderFull>): ProviderFull {
  return {
    id: "p", nombre: "X", category_id: luz.id, category: luz, numero_cliente: null,
    dia_vencimiento: null, frecuencia: "mensual", mes_cobro: null, moneda: "CLP",
    monto_estimado: null, activo: true, ...o,
  };
}
function bill(p: ProviderFull, o: Partial<BillFull>): BillFull {
  return {
    id: "b" + Math.random(), provider_id: p.id, provider: p, monto: 0, moneda_original: "CLP",
    monto_original: null, tipo_cambio: null, fecha_pago: null, periodo: "2026-11",
    fecha_vencimiento: null, estado: "pagado", fuente: "manual", notas: null, ...o,
  };
}

test("formato y parseo de CLP", () => {
  assert.equal(formatCLP(184320), "$184.320");
  assert.equal(formatCLP(0), "$0");
  assert.equal(parseMonto("$42.100"), 42100);
  assert.equal(parseMonto("20,5"), 20.5);
  assert.ok(Number.isNaN(parseMonto("abc")));
  assert.ok(Number.isNaN(parseMonto("")));
});

test("periodos", () => {
  assert.equal(addMeses("2026-11", 2), "2027-01");
  assert.equal(addMeses("2026-01", -1), "2025-12");
  assert.deepEqual(ultimosPeriodos("2026-02", 3), ["2025-12", "2026-01", "2026-02"]);
  assert.equal(fechaVencimiento("2026-02", 31), "2026-02-28");
  assert.equal(hoyChile(new Date("2026-11-15T02:00:00Z")), "2026-11-14"); // 23:00 en Chile
});

test("pendientes: excluye pagados, anuales fuera de mes e inactivos", () => {
  const enel = prov({ id: "enel", dia_vencimiento: 18, monto_estimado: 40000 });
  const agua = prov({ id: "agua", dia_vencimiento: 10 });
  const anual = prov({ id: "anual", frecuencia: "anual", mes_cobro: 3, category: subs, category_id: subs.id });
  const viejo = prov({ id: "viejo", activo: false });
  const bills = [bill(agua, { monto: 15000 })];
  const r = calcularPendientes([enel, agua, anual, viejo], bills, "2026-11", "2026-11-15");
  assert.deepEqual(r.map((x) => x.provider.id), ["enel"]);
  assert.equal(r[0].dias, 3);
  assert.equal(textoVencimiento(r[0]), "Vence en 3 días");
  assert.equal(textoVencimiento({ ...r[0], dias: -2 }), "Vencida hace 2 días");
});

test("totales por grupo y categoría ignoran pendientes", () => {
  const enel = prov({ id: "enel" });
  const spot = prov({ id: "spot", category: subs, category_id: subs.id });
  const bills = [
    bill(enel, { monto: 40000 }),
    bill(spot, { monto: 5850 }),
    bill(enel, { monto: 99999, estado: "pendiente" }),
  ];
  assert.deepEqual(totalPorGrupo(bills), { hogar: 40000, personal: 5850 });
  assert.deepEqual(totalPorCategoria(bills).map((c) => c.total), [40000, 5850]);
});

test("suscripciones: anual se prorratea", () => {
  const spot = prov({ id: "s", category: subs, monto_estimado: 5850 });
  const anual = prov({ id: "a", category: subs, frecuencia: "anual", mes_cobro: 1, monto_estimado: 120000 });
  assert.equal(costoMensual(anual), 10000);
  const r = resumenSuscripciones([spot, anual, prov({ id: "l" })]);
  assert.equal(r.mensual, 15850);
  assert.equal(r.anual, 190200);
});

test("variación", () => {
  assert.equal(variacion(106, 100), 6);
  assert.equal(variacion(50, 0), null);
});

test("alertas de vencimiento: vencidas y próximas 7 días", () => {
  const hoy = "2026-11-15";
  const provs = [
    prov({ id: "a", dia_vencimiento: 10 }), // vencida hace 5
    prov({ id: "b", dia_vencimiento: 15 }), // hoy
    prov({ id: "c", dia_vencimiento: 22 }), // en 7 días
    prov({ id: "d", dia_vencimiento: 23 }), // en 8 días: fuera
    prov({ id: "e", dia_vencimiento: null }), // sin día
  ];
  const al = alertasVencimiento(calcularPendientes(provs, [], "2026-11", hoy));
  assert.deepEqual(al.vencidas.map((p) => p.provider.id), ["a"]);
  assert.deepEqual(al.proximas.map((p) => p.provider.id), ["b", "c"]);
});

test("pago rápido usa el monto estimado y marca pagado hoy", () => {
  const p = prov({ id: "luz", dia_vencimiento: 31, monto_estimado: 42100 });
  const b = cuentaPagadaRapida(p, "2026-11", "2026-11-15")!;
  assert.equal(b.monto, 42100);
  assert.equal(b.estado, "pagado");
  assert.equal(b.fecha_pago, "2026-11-15");
  assert.equal(b.periodo, "2026-11");
  assert.equal(b.fecha_vencimiento, "2026-11-30");
  assert.equal(b.moneda_original, "CLP");
});

test("pago rápido: sin monto estimado no se puede", () => {
  assert.equal(cuentaPagadaRapida(prov({ monto_estimado: null }), "2026-11", "2026-11-15"), null);
  assert.equal(cuentaPagadaRapida(prov({ monto_estimado: 0 }), "2026-11", "2026-11-15"), null);
});
