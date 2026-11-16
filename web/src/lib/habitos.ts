// Lógica pura del módulo Hábitos (probada con `node --test`). Fechas como texto YYYY-MM-DD.
import type { Habit, HabitMark } from "./types.ts";

/** Días necesarios para que un día cuente como "completo" (estrella). */
export const MARCAS_DIA_COMPLETO = 3;

export const RANGOS = [
  { min: 30, nombre: "Bronce", icono: "🥉" },
  { min: 60, nombre: "Plata", icono: "🥈" },
  { min: 90, nombre: "Oro", icono: "🥇" },
] as const;

const aUTC = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
};
const aISO = (d: Date) => d.toISOString().slice(0, 10);

export function sumarDias(iso: string, n: number): string {
  const d = aUTC(iso);
  d.setUTCDate(d.getUTCDate() + n);
  return aISO(d);
}

/** 0 = lunes … 6 = domingo. */
export function diaSemana(iso: string): number {
  return (aUTC(iso).getUTCDay() + 6) % 7;
}

export function lunesDe(iso: string): string {
  return sumarDias(iso, -diaSemana(iso));
}

/** Número de semana ISO 8601. */
export function semanaISO(iso: string): number {
  const d = aUTC(iso);
  d.setUTCDate(d.getUTCDate() + 3 - diaSemana(iso)); // jueves de esa semana
  const enero1 = Date.UTC(d.getUTCFullYear(), 0, 1);
  return Math.ceil(((d.getTime() - enero1) / 864e5 + 1) / 7);
}

/** Primer y último día de un mes YYYY-MM. */
export function rangoMes(mes: string): { inicio: string; fin: string; dias: number } {
  const [y, m] = mes.split("-").map(Number);
  const dias = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return { inicio: `${mes}-01`, fin: `${mes}-${String(dias).padStart(2, "0")}`, dias };
}

export function mesValido(s: unknown): s is string {
  return typeof s === "string" && /^\d{4}-(0[1-9]|1[0-2])$/.test(s);
}

export function mesVecino(mes: string, delta: number): string {
  const [y, m] = mes.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return aISO(d).slice(0, 7);
}

/** fecha → ids de hábitos cumplidos ese día (sin repetir). */
export function marcasPorDia(marks: Pick<HabitMark, "habit_id" | "fecha">[]): Map<string, string[]> {
  const mapa = new Map<string, string[]>();
  for (const m of marks) {
    const ids = mapa.get(m.fecha) ?? [];
    if (!ids.includes(m.habit_id)) ids.push(m.habit_id);
    mapa.set(m.fecha, ids);
  }
  return mapa;
}

/** Semana lunes–domingo terminada (domingo antes de hoy) con al menos un hábito cada día. */
export function semanaCerrada(lunes: string, porDia: Map<string, string[]>, hoy: string): boolean {
  if (sumarDias(lunes, 6) >= hoy) return false;
  for (let i = 0; i < 7; i++) if (!porDia.get(sumarDias(lunes, i))?.length) return false;
  return true;
}

/** Días seguidos con al menos un hábito, contando hasta hoy (o hasta ayer si hoy aún no hay nada). */
export function racha(porDia: Map<string, string[]>, hoy: string): number {
  let d = porDia.get(hoy)?.length ? hoy : sumarDias(hoy, -1);
  let n = 0;
  while (porDia.get(d)?.length) {
    n++;
    d = sumarDias(d, -1);
  }
  return n;
}

export type ResumenMes = {
  total: number;
  diasCompletos: number;
  diasActivos: number;
  /** Días del mes ya transcurridos (incluye hoy). */
  diasTranscurridos: number;
  /** Domingos del mes que cierran una semana completa. */
  semanasCerradas: string[];
  porHabito: Record<string, number>;
};

export function resumenMes(mes: string, porDia: Map<string, string[]>, hoy: string): ResumenMes {
  const { inicio, fin, dias } = rangoMes(mes);
  const r: ResumenMes = { total: 0, diasCompletos: 0, diasActivos: 0, diasTranscurridos: 0, semanasCerradas: [], porHabito: {} };
  r.diasTranscurridos = hoy < inicio ? 0 : hoy > fin ? dias : Number(hoy.slice(8, 10));
  for (let i = 0; i < dias; i++) {
    const f = sumarDias(inicio, i);
    const ids = porDia.get(f) ?? [];
    r.total += ids.length;
    if (ids.length) r.diasActivos++;
    if (ids.length >= MARCAS_DIA_COMPLETO) r.diasCompletos++;
    for (const id of ids) r.porHabito[id] = (r.porHabito[id] ?? 0) + 1;
    if (diaSemana(f) === 6 && semanaCerrada(sumarDias(f, -6), porDia, hoy)) r.semanasCerradas.push(f);
  }
  return r;
}

/** Rango logrado y el siguiente por alcanzar según las marcas del mes. */
export function rangoDelMes(total: number) {
  const logrado = [...RANGOS].reverse().find((t) => total >= t.min) ?? null;
  const siguiente = RANGOS.find((t) => total < t.min) ?? null;
  return { logrado, siguiente, faltan: siguiente ? siguiente.min - total : 0 };
}

/** Lunes a domingo de la semana de `hoy`: si el hábito se cumplió cada día. */
export function semanaDeHabito(habitId: string, porDia: Map<string, string[]>, hoy: string): boolean[] {
  const lunes = lunesDe(hoy);
  return Array.from({ length: 7 }, (_, i) => porDia.get(sumarDias(lunes, i))?.includes(habitId) ?? false);
}

export function habitosActivos(habits: Habit[]): Habit[] {
  return habits.filter((h) => !h.archivado_at).sort((a, b) => a.orden - b.orden || a.nombre.localeCompare(b.nombre));
}

export const COLORES_HABITO = ["--h-cat-1", "--h-cat-2", "--h-cat-3", "--h-cat-4", "--h-cat-5", "--h-cat-6"] as const;
export const ICONOS_HABITO = [
  "svg:mancuerna", "🥊", "🧹", "📚", "🧘", "🏃", "🚴", "🏊", "⚽", "💧", "🥗", "😴",
  "🦷", "💊", "🧺", "🍳", "🪴", "🐶", "🎸", "✍️", "💻", "🇬🇧", "📵", "☀️",
] as const;
