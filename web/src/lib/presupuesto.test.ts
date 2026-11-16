import { test } from "node:test";
import assert from "node:assert/strict";
import { calcularPresupuesto, proyectarLibre } from "./presupuesto.ts";
import type { BillFull, DebtFull, GoalFull, ProviderFull } from "./types.ts";

const cat = { id: "c", nombre: "Luz", icono: "💡", grupo: "hogar" as const, es_suscripcion: false, orden: 1 };
const prov = (id: string, monto: number): ProviderFull => ({
  id, nombre: id, category_id: "c", numero_cliente: null, dia_vencimiento: 20, frecuencia: "mensual",
  mes_cobro: null, moneda: "CLP", monto_estimado: monto, activo: true, card_id: null, category: cat, card: null,
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

test("proyección: libera cuotas al terminar la deuda y deja de aportar a metas logradas", () => {
  const corta: DebtFull = { ...deuda, id: "c", descripcion: "Notebook", n_cuotas: 2, valor_cuota: 50_000, primer_mes_pago: "2026-11" };
  const g = { ...meta("activa", 100_000), meta_ahorro: 250_000 };
  const r = proyectarLibre(1_000_000, { bills: [], providers: [luz], debts: [corta], goals: [g] }, "2026-11", "2026-11-15", 4);
  assert.deepEqual(r.map((m) => m.periodo), ["2026-11", "2026-12", "2027-01", "2027-02"]);
  assert.deepEqual(r.map((m) => m.cuotas), [50_000, 50_000, 0, 0]);
  assert.deepEqual(r.map((m) => m.metas), [100_000, 100_000, 100_000, 50_000]);
  assert.deepEqual(r.map((m) => m.libre), [810_000, 810_000, 860_000, 910_000]);
  assert.equal(r[3].acumulado, 810_000 + 810_000 + 860_000 + 910_000);
  assert.deepEqual(r[2].notas, ["termina Notebook"]);
  assert.deepEqual(r[3].notas, ["logras Auto"]);
});

test("proyección: cobro anual solo en su mes", () => {
  const anual: ProviderFull = { ...prov("dominio", 24_000), frecuencia: "anual", mes_cobro: 1 };
  const r = proyectarLibre(500_000, { bills: [], providers: [anual], debts: [], goals: [] }, "2026-11", "2026-11-15", 3);
  assert.deepEqual(r.map((m) => m.cuentas), [0, 0, 24_000]);
});
