"use server";

import { redirect } from "next/navigation";
import {
  deleteCard, deleteDebt, getCard, saveCard, saveDebt, setDebtSaldada, type CardInput, type DebtInput,
} from "@/lib/data";
import { primerMesPagoTarjeta } from "@/lib/deudas";
import { esPeriodo, hoyChile, parseMonto } from "@/lib/finanzas";
import type { Grupo, TipoDeuda } from "@/lib/types";

const texto = (f: FormData, k: string) => String(f.get(k) ?? "").trim();
const monto = (f: FormData, k: string) => {
  const t = texto(f, k);
  return t ? parseMonto(t) : null;
};
const dia = (f: FormData, k: string) => {
  const n = Number(texto(f, k));
  return Number.isInteger(n) && n >= 1 && n <= 31 ? n : null;
};

function volverConError(ruta: string, msg: string): never {
  redirect(`${ruta}${ruta.includes("?") ? "&" : "?"}error=${encodeURIComponent(msg)}`);
}

// ——— Tarjetas ———

export async function guardarTarjeta(form: FormData) {
  const id = texto(form, "id") || null;
  const volver = `/deudas/tarjeta/${id ?? "nueva"}`;

  const nombre = texto(form, "nombre");
  if (!nombre) volverConError(volver, "Ponle un nombre a la tarjeta, por ejemplo Visa BCI.");
  const ultimos4 = texto(form, "ultimos4") || null;
  if (ultimos4 && !/^\d{4}$/.test(ultimos4)) volverConError(volver, "Escribe solo los últimos 4 dígitos.");
  const cupo = monto(form, "cupo");
  if (cupo !== null && Number.isNaN(cupo)) volverConError(volver, "Cupo no válido.");
  const dia_facturacion = dia(form, "dia_facturacion");
  const dia_pago = dia(form, "dia_pago");
  if (!dia_facturacion || !dia_pago) volverConError(volver, "Los días de facturación y pago van del 1 al 31.");

  const input: CardInput = {
    nombre,
    ultimos4,
    cupo: cupo === null ? null : Math.round(cupo),
    dia_facturacion,
    dia_pago,
    activa: form.get("activa") === "on",
  };
  try {
    await saveCard(id, input);
  } catch (e) {
    volverConError(volver, `No se pudo guardar: ${(e as Error).message}`);
  }
  redirect("/deudas");
}

export async function eliminarTarjeta(form: FormData) {
  const id = texto(form, "id");
  let r: string;
  try {
    r = await deleteCard(id);
  } catch (e) {
    volverConError(`/deudas/tarjeta/${id}`, `No se pudo eliminar: ${(e as Error).message}`);
  }
  redirect(`/deudas?aviso=tarjeta-${r}`);
}

// ——— Compras en cuotas y créditos ———

export async function guardarDeuda(form: FormData) {
  const id = texto(form, "id") || null;
  const tipo = (texto(form, "tipo") === "credito" ? "credito" : "compra") as TipoDeuda;
  const volver = id ? `/deudas/${id}/editar` : `/deudas/nueva?tipo=${tipo}`;

  const descripcion = texto(form, "descripcion");
  if (!descripcion) volverConError(volver, tipo === "compra" ? "¿Qué compraste?" : "Describe el crédito.");

  const fecha = texto(form, "fecha") || hoyChile();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) volverConError(volver, "Fecha no válida.");

  const total = monto(form, "monto_total");
  if (!total || !(total > 0)) volverConError(volver, "Escribe el monto total.");
  const n = Number(texto(form, "n_cuotas"));
  if (!(Number.isInteger(n) && n >= 1 && n <= 360)) volverConError(volver, "Las cuotas van de 1 a 360.");

  const cuota = monto(form, "valor_cuota");
  if (cuota !== null && !(cuota > 0)) volverConError(volver, "Valor cuota no válido.");
  // Sin valor cuota = sin interés.
  const valor_cuota = Math.round(cuota ?? total / n);
  if (valor_cuota * n < total * 0.99) volverConError(volver, "El valor cuota × cuotas no puede ser menor que el monto total.");

  let card_id: string | null = null;
  let dia_pago: number | null = null;
  let institucion: string | null = null;
  let primer = texto(form, "primer_mes_pago");

  if (tipo === "compra") {
    card_id = texto(form, "card_id");
    const card = card_id ? await getCard(card_id) : null;
    if (!card) volverConError(volver, "Elige la tarjeta.");
    if (!esPeriodo(primer)) primer = primerMesPagoTarjeta(fecha, card.dia_facturacion, card.dia_pago);
  } else {
    institucion = texto(form, "institucion") || null;
    dia_pago = dia(form, "dia_pago");
    if (!esPeriodo(primer)) volverConError(volver, "Indica el mes de la primera cuota.");
  }

  const input: DebtInput = {
    tipo,
    card_id,
    descripcion,
    institucion,
    grupo: (texto(form, "grupo") === "hogar" ? "hogar" : "personal") as Grupo,
    fecha,
    monto_total: Math.round(total),
    n_cuotas: n,
    valor_cuota,
    primer_mes_pago: primer,
    dia_pago,
    saldada: form.get("saldada") === "on",
    notas: texto(form, "notas") || null,
  };

  let nuevoId: string;
  try {
    nuevoId = await saveDebt(id, input);
  } catch (e) {
    volverConError(volver, `No se pudo guardar: ${(e as Error).message}`);
  }
  redirect(`/deudas/${nuevoId}`);
}

export async function cambiarSaldada(form: FormData) {
  const id = texto(form, "id");
  try {
    await setDebtSaldada(id, texto(form, "saldada") === "1");
  } catch (e) {
    volverConError(`/deudas/${id}`, `No se pudo actualizar: ${(e as Error).message}`);
  }
  redirect(`/deudas/${id}`);
}

export async function eliminarDeuda(form: FormData) {
  const id = texto(form, "id");
  try {
    await deleteDebt(id);
  } catch (e) {
    volverConError(`/deudas/${id}`, `No se pudo eliminar: ${(e as Error).message}`);
  }
  redirect("/deudas");
}
