"use server";

import { revalidatePath } from "next/cache";
import { archiveHabit, saveHabit, setHabitMark } from "@/lib/data";
import { hoyChile } from "@/lib/finanzas";
import { COLORES_HABITO, ICONOS_HABITO } from "@/lib/habitos";

const texto = (f: FormData, k: string) => String(f.get(k) ?? "").trim();

/** Crea o edita un hábito. Devuelve un mensaje de error, o null si salió bien. */
export async function guardarHabito(form: FormData): Promise<string | null> {
  const id = texto(form, "id") || null;
  const nombre = texto(form, "nombre");
  if (!nombre) return "Ponle un nombre al hábito.";
  if (nombre.length > 24) return "El nombre puede tener hasta 24 letras.";
  const icono = texto(form, "icono");
  const color = texto(form, "color");
  const meta = Number(texto(form, "meta_semanal") || 0);
  try {
    await saveHabit(id, {
      nombre,
      icono: (ICONOS_HABITO as readonly string[]).includes(icono) ? icono : "✔",
      color: (COLORES_HABITO as readonly string[]).includes(color) ? color : "--h-cat-1",
      meta_semanal: Number.isInteger(meta) && meta >= 0 && meta <= 7 ? meta : 0,
    });
  } catch (e) {
    return `No se pudo guardar: ${(e as Error).message}`;
  }
  revalidatePath("/habitos");
  return null;
}

export async function archivarHabito(id: string): Promise<string | null> {
  try {
    await archiveHabit(id);
  } catch (e) {
    return `No se pudo archivar: ${(e as Error).message}`;
  }
  revalidatePath("/habitos");
  return null;
}

/** Marca o desmarca un hábito en un día. No se pueden marcar días futuros. */
export async function marcarHabito(habit_id: string, fecha: string, hecho: boolean): Promise<string | null> {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha) || fecha > hoyChile()) return "Solo puedes marcar hoy o días pasados.";
  try {
    await setHabitMark(habit_id, fecha, hecho);
  } catch (e) {
    return `No se pudo guardar: ${(e as Error).message}`;
  }
  revalidatePath("/habitos");
  return null;
}
