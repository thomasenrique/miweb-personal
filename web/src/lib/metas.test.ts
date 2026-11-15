import { test } from "node:test";
import assert from "node:assert/strict";
import { cuotaCredito, mesesEntre, progreso, proyectar, serieAhorro, simularCredito } from "./metas.ts";
import type { GoalFull } from "./types.ts";

function meta(o: Partial<GoalFull>): GoalFull {
  return {
    id: "g", nombre: "Auto", icono: "🚗", precio_total: 16_000_000, meta_ahorro: 8_000_000,
    aporte_mensual_plan: 400_000, fecha_inicio: "2026-06-01", fecha_objetivo: null,
    usa_credito: true, tasa_anual: 14.5, n_cuotas: 36, estado: "activa", contributions: [], ...o,
  };
}
const aporte = (monto: number, fecha: string) => ({ id: fecha + monto, goal_id: "g", monto, fecha, nota: null });

test("cuota con amortización francesa (caso de los requisitos)", () => {
  assert.equal(Math.round(cuotaCredito(8_000_000, 14.5, 36)), 275_368);
  assert.equal(cuotaCredito(1200, 0, 12), 100);
  assert.equal(cuotaCredito(0, 10, 12), 0);
});

test("simulación completa", () => {
  const s = simularCredito(16_000_000, 8_000_000, 14.5, 36);
  assert.equal(s.financiado, 8_000_000);
  assert.equal(s.cuota, 275_368);
  assert.equal(s.total, 9_913_242);
  assert.equal(s.intereses, 1_913_242);
  assert.equal(s.pctPie, 50);
  assert.equal(simularCredito(100, 150, 10, 12).financiado, 0); // pie mayor al precio
});

test("meses entre periodos", () => {
  assert.equal(mesesEntre("2026-11", "2027-08"), 9);
  assert.equal(mesesEntre("2026-11", "2026-11"), 0);
});

test("proyección: adelantado, llegada y promedio", () => {
  const g = meta({ contributions: [aporte(1_000_000, "2026-06-10"), aporte(1_200_000, "2026-08-05"), aporte(500_000, "2026-11-01")] });
  const p = proyectar(g, "2026-11-15");
  assert.equal(p.ahorrado, 2_700_000);
  assert.equal(p.restante, 5_300_000);
  assert.equal(p.mesesRestantes, 14); // 5.3M / 400k = 13.25 → 14
  assert.equal(p.llegada, "2028-01");
  assert.equal(p.esperadoHoy, 2_400_000); // 6 meses (jun–nov) × 400k
  assert.equal(p.diferencia, 300_000);
  assert.equal(p.promedioMensual, 450_000);
  assert.equal(progreso(g), 2_700_000 / 8_000_000);
});

test("meta lograda y sin plan", () => {
  const lograda = proyectar(meta({ meta_ahorro: 100, contributions: [aporte(150, "2026-07-01")] }), "2026-11-15");
  assert.equal(lograda.lograda, true);
  assert.equal(lograda.mesesRestantes, 0);
  const sinPlan = proyectar(meta({ aporte_mensual_plan: null }), "2026-11-15");
  assert.equal(sinPlan.mesesRestantes, null);
  assert.equal(sinPlan.llegada, null);
});

test("serie plan vs real", () => {
  const g = meta({ meta_ahorro: 1_000_000, aporte_mensual_plan: 250_000, contributions: [aporte(300_000, "2026-06-02"), aporte(-50_000, "2026-07-20")] });
  const s = serieAhorro(g, "2026-07-15");
  // Faltan 750k a 250k/mes desde julio → llega en octubre, un mes después del plan original.
  assert.deepEqual(s.map((x) => x.periodo), ["2026-06", "2026-07", "2026-08", "2026-09", "2026-10"]);
  assert.deepEqual(s.map((x) => x.plan), [250_000, 500_000, 750_000, 1_000_000, 1_000_000]);
  assert.deepEqual(s.map((x) => x.real), [300_000, 250_000, null, null, null]);
});
