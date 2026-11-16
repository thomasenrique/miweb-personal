import { test } from "node:test";
import assert from "node:assert/strict";
import { calcularPresupuesto } from "./presupuesto.ts";
import type { BillFull, DebtFull, GoalFull, ProviderFull } from "./types.ts";

const cat = { id: "c", nombre: "Luz", icono: "💡", grupo: "hogar" as const, es_suscripcion: false, orden: 1 };
const prov = (id: string, monto: number): ProviderFull => ({
  id, nombre: id, category_id: "c", numero_cliente: null, dia_vencimiento: 20, frecuencia: "mensual",
  mes_cobro: null, moneda: "CLP", monto_estimado: monto, activo: true, category: cat,
});
const luz = prov("luz", 40_000);
const agua = prov("agua", 15_000);
const bill: BillFull = {
  id: "b", provider_id: "luz", monto: 42_100, moneda_original: "CLP", monto_original: null, tipo_cambio: null,
  fecha_pago: "2026-11-05", periodo: "2026-11", fecha_vencimiento: null, estado: "pagado", fuente: "manual",
  notas: null, provider: luz,
};
const deuda: DebtFull = {
  id: "d", tipo: "credito", card_id: null, descripcion: "Crédito", institucion: null, grupo: "personal",
  fecha: "2026-01-01", monto_total: 1_000_000, n_cuotas: 12, valor_cuota: 90_000, primer_mes_pago: "2026-06",
  dia_pago: 10, saldada: false, notas: null, card: null,
};
const meta = (estado: GoalFull["estado"], plan: number | null): GoalFull => ({
  id: estado, nombre: "Auto", icono: "🚗", precio_total: 1, meta_ahorro: 1, aporte_mensual_plan: plan,
  fecha_inicio: "2026-01-01", fecha_objetivo: null, usa_credito: false, tasa_anual: null, n_cuotas: null,
  estado, contributions: [],
});

test("descuenta cuentas (reales + estimadas), cuotas y metas activas", () => {
  const p = calcularPresupuesto(
    1_000_000,
    { bills: [bill], providers: [luz, agua], debts: [deuda], goals: [meta("activa", 200_000), meta("pausada", 50_000)] },
    "2026-11",
    "2026-11-15",
  );
  assert.equal(p.cuentas, 42_100 + 15_000);
  assert.equal(p.cuotas, 90_000);
  assert.equal(p.metas, 200_000);
  assert.equal(p.libre, 1_000_000 - 57_100 - 90_000 - 200_000);
  assert.ok(Math.abs(p.usado - 0.3471) < 0.001);
});

test("libre negativo cuando no alcanza", () => {
  const p = calcularPresupuesto(100_000, { bills: [], providers: [luz], debts: [deuda], goals: [] }, "2026-11", "2026-11-15");
  assert.equal(p.libre, 100_000 - 40_000 - 90_000);
  assert.ok(p.usado > 1);
});
