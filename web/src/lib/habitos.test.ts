import { test } from "node:test";
import assert from "node:assert/strict";
import {
  diaSemana, lunesDe, marcasPorDia, mesVecino, racha, rangoDelMes, rangoMes, resumenMes, semanaCerrada, semanaDeHabito, semanaISO, sumarDias,
} from "./habitos.ts";

const m = (habit_id: string, fecha: string) => ({ habit_id, fecha });

test("fechas: día de semana, lunes y semana ISO", () => {
  assert.equal(diaSemana("2026-11-16"), 0); // lunes
  assert.equal(diaSemana("2026-11-01"), 6); // domingo
  assert.equal(lunesDe("2026-11-01"), "2026-10-26");
  assert.equal(semanaISO("2026-11-16"), 47);
  assert.equal(semanaISO("2027-01-01"), 53); // viernes: aún semana 53 de 2026
  assert.equal(semanaISO("2026-01-01"), 1);
  assert.equal(sumarDias("2026-02-28", 1), "2026-03-01");
});

test("meses: rango y vecinos", () => {
  assert.deepEqual(rangoMes("2026-02"), { inicio: "2026-02-01", fin: "2026-02-28", dias: 28 });
  assert.equal(mesVecino("2026-01", -1), "2025-12");
  assert.equal(mesVecino("2026-12", 1), "2027-01");
});

test("marcasPorDia agrupa sin repetir", () => {
  const p = marcasPorDia([m("gym", "2026-11-02"), m("gym", "2026-11-02"), m("aseo", "2026-11-02")]);
  assert.deepEqual(p.get("2026-11-02"), ["gym", "aseo"]);
});

test("racha cuenta hasta hoy o desde ayer si hoy está vacío", () => {
  const p = marcasPorDia([m("a", "2026-11-13"), m("a", "2026-11-14"), m("a", "2026-11-15")]);
  assert.equal(racha(p, "2026-11-16"), 3);
  p.set("2026-11-16", ["a"]);
  assert.equal(racha(p, "2026-11-16"), 4);
  assert.equal(racha(new Map(), "2026-11-16"), 0);
});

test("semana cerrada: 7 días con algo y ya terminada", () => {
  const dias = Array.from({ length: 7 }, (_, i) => m("a", sumarDias("2026-11-09", i)));
  const p = marcasPorDia(dias);
  assert.equal(semanaCerrada("2026-11-09", p, "2026-11-16"), true);
  assert.equal(semanaCerrada("2026-11-09", p, "2026-11-15"), false); // el domingo aún no termina
  p.delete("2026-11-12");
  assert.equal(semanaCerrada("2026-11-09", p, "2026-11-16"), false);
});

test("resumen del mes", () => {
  const marks = [
    m("gym", "2026-11-02"), m("leer", "2026-11-02"), m("aseo", "2026-11-02"),
    m("gym", "2026-11-04"),
    m("gym", "2026-10-31"), // otro mes: no cuenta
  ];
  const r = resumenMes("2026-11", marcasPorDia(marks), "2026-11-16");
  assert.equal(r.total, 4);
  assert.equal(r.diasCompletos, 1);
  assert.equal(r.diasActivos, 2);
  assert.equal(r.diasTranscurridos, 16);
  assert.deepEqual(r.porHabito, { gym: 2, leer: 1, aseo: 1 });
  assert.equal(resumenMes("2026-10", new Map(), "2026-11-16").diasTranscurridos, 31);
});

test("rango del mes", () => {
  assert.deepEqual(rangoDelMes(10), { logrado: null, siguiente: { min: 30, nombre: "Bronce", icono: "🥉" }, faltan: 20 });
  assert.equal(rangoDelMes(65).logrado?.nombre, "Plata");
  assert.equal(rangoDelMes(95).siguiente, null);
});

test("semana de un hábito", () => {
  const p = marcasPorDia([m("gym", "2026-11-16"), m("gym", "2026-11-18")]);
  assert.deepEqual(semanaDeHabito("gym", p, "2026-11-18"), [true, false, true, false, false, false, false]);
});
