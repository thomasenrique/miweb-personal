"use server";

import { redirect } from "next/navigation";
import {
  addContribution, deleteContribution, deleteGoal, getGoal, saveGoal, updateGoalFields, type GoalInput,
} from "@/lib/data";
import { hoyChile, parseMonto } from "@/lib/finanzas";
import type { EstadoMeta } from "@/lib/types";

const texto = (f: FormData, k: string) => String(f.get(k) ?? "").trim();
const monto = (f: FormData, k: string) => {
  const t = texto(f, k);
  return t ? parseMonto(t) : null;
};
const fechaValida = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s);

function volverConError(ruta: string, msg: string): never {
  redirect(`${ruta}${ruta.includes("?") ? "&" : "?"}error=${encodeURIComponent(msg)}`);
}

export async function guardarMeta(form: FormData) {
  const id = texto(form, "id") || null;
  const volver = id ? `/metas/${id}/editar` : "/metas/nueva";

  const nombre = texto(form, "nombre");
  if (!nombre) volverConError(volver, "Ponle un nombre a la meta.");

  const precio = monto(form, "precio_total");
  if (!precio || !(precio > 0)) volverConError(volver, "Escribe el precio, por ejemplo 16.000.000.");

  const usa_credito = form.get("usa_credito") === "on";
  let meta_ahorro = precio;
  let tasa_anual: number | null = null;
  let n_cuotas: number | null = null;
  if (usa_credito) {
    const pie = monto(form, "meta_ahorro");
    if (!pie || !(pie > 0) || pie >= precio) {
      volverConError(volver, "Con crédito, el pie a ahorrar debe ser mayor que 0 y menor que el precio.");
    }
    meta_ahorro = pie;
    const tasa = monto(form, "tasa_anual");
    tasa_anual = tasa === null || Number.isNaN(tasa) ? null : tasa;
    const n = Number(texto(form, "n_cuotas"));
    n_cuotas = n >= 1 && n <= 120 ? n : null;
  }

  const plan = monto(form, "aporte_mensual_plan");
  if (plan !== null && !(plan > 0)) volverConError(volver, "El aporte mensual debe ser un monto válido.");

  const fecha_inicio = texto(form, "fecha_inicio") || hoyChile();
  if (!fechaValida(fecha_inicio)) volverConError(volver, "Fecha de inicio no válida.");
  const fecha_objetivo = texto(form, "fecha_objetivo") || null;

  const estado = (texto(form, "estado") || "activa") as EstadoMeta;

  const input: GoalInput = {
    nombre,
    icono: texto(form, "icono") || "🎯",
    precio_total: Math.round(precio),
    meta_ahorro: Math.round(meta_ahorro),
    aporte_mensual_plan: plan === null ? null : Math.round(plan),
    fecha_inicio,
    fecha_objetivo,
    usa_credito,
    tasa_anual,
    n_cuotas,
    estado: ["activa", "pausada", "lograda"].includes(estado) ? estado : "activa",
  };

  let nuevoId: string;
  try {
    nuevoId = await saveGoal(id, input);
  } catch (e) {
    volverConError(volver, `No se pudo guardar: ${(e as Error).message}`);
  }
  redirect(`/metas/${nuevoId}`);
}

export async function eliminarMeta(form: FormData) {
  const id = texto(form, "id");
  try {
    await deleteGoal(id);
  } catch (e) {
    volverConError(`/metas/${id}`, `No se pudo eliminar: ${(e as Error).message}`);
  }
  redirect("/metas");
}

export async function agregarAporte(form: FormData) {
  const goal_id = texto(form, "goal_id");
  const volver = `/metas/${goal_id}`;
  const valor = monto(form, "monto");
  if (!valor || !(valor > 0)) volverConError(volver, "Escribe el monto del aporte.");
  const fecha = texto(form, "fecha") || hoyChile();
  if (!fechaValida(fecha)) volverConError(volver, "Fecha no válida.");
  const signo = texto(form, "tipo") === "retiro" ? -1 : 1;

  try {
    await addContribution({ goal_id, monto: signo * Math.round(valor), fecha, nota: texto(form, "nota") || null });
    // Si con este aporte se completa el ahorro, la meta pasa a "lograda".
    const g = await getGoal(goal_id);
    if (g && g.estado === "activa" && g.contributions.reduce((s, c) => s + c.monto, 0) >= g.meta_ahorro) {
      await updateGoalFields(goal_id, { estado: "lograda" });
    }
  } catch (e) {
    volverConError(volver, `No se pudo guardar el aporte: ${(e as Error).message}`);
  }
  redirect(volver);
}

export async function eliminarAporte(form: FormData) {
  const id = texto(form, "id");
  const goal_id = texto(form, "goal_id");
  try {
    await deleteContribution(id);
  } catch (e) {
    volverConError(`/metas/${goal_id}`, `No se pudo eliminar: ${(e as Error).message}`);
  }
  redirect(`/metas/${goal_id}`);
}

/** Guarda en la meta el escenario del simulador (precio, pie, tasa y cuotas). */
export async function guardarSimulacion(form: FormData) {
  const goal_id = texto(form, "goal_id");
  const volver = `/metas/${goal_id}/credito`;
  const precio = monto(form, "precio");
  const pie = monto(form, "pie");
  const tasa = monto(form, "tasa");
  const n = Number(texto(form, "n"));
  if (!precio || !(precio > 0)) volverConError(volver, "Precio no válido.");
  if (pie === null || !(pie > 0) || pie >= precio) volverConError(volver, "El pie debe ser mayor que 0 y menor que el precio.");
  if (tasa === null || Number.isNaN(tasa) || tasa < 0) volverConError(volver, "Tasa no válida.");
  if (!(n >= 1 && n <= 120)) volverConError(volver, "Cuotas no válidas.");

  try {
    await updateGoalFields(goal_id, {
      precio_total: Math.round(precio),
      meta_ahorro: Math.round(pie),
      tasa_anual: tasa,
      n_cuotas: n,
      usa_credito: true,
    });
  } catch (e) {
    volverConError(volver, `No se pudo guardar: ${(e as Error).message}`);
  }
  redirect(`/metas/${goal_id}?aviso=simulacion`);
}
