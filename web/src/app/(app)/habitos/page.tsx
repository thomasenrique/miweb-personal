import type { Metadata } from "next";
import { Barlow_Condensed, Caveat } from "next/font/google";
import { cookies } from "next/headers";
import { HabitosVista, type Estilo } from "@/components/HabitosVista";
import { getHabitMarks, getHabits } from "@/lib/data";
import { hoyChile } from "@/lib/finanzas";
import { mesValido, rangoMes, sumarDias } from "@/lib/habitos";
import "./habitos.css";

export const metadata: Metadata = { title: "Hábitos" };

const condensada = Barlow_Condensed({ subsets: ["latin"], weight: ["600", "700", "800"], variable: "--hb-cond" });
const manuscrita = Caveat({ subsets: ["latin"], weight: ["600", "700"], variable: "--hb-hand" });

export default async function HabitosPage({ searchParams }: PageProps<"/habitos">) {
  const { mes: q } = await searchParams;
  const hoy = hoyChile();
  const mesHoy = hoy.slice(0, 7);
  const mes = mesValido(q) && q <= mesHoy ? q : mesHoy;
  const { inicio, fin } = rangoMes(mes);
  // Semana anterior al mes (para cerrar la primera semana) y un año hacia atrás (para la racha).
  const desdeMes = sumarDias(inicio, -6);
  const desdeRacha = sumarDias(hoy, -370);
  const desde = desdeMes < desdeRacha ? desdeMes : desdeRacha;
  const hasta = fin > hoy ? fin : hoy;

  let habits, marks;
  try {
    [habits, marks] = await Promise.all([getHabits(), getHabitMarks(desde, hasta)]);
  } catch {
    return (
      <>
        <h1>Hábitos</h1>
        <p className="h-error" role="alert">
          Falta crear las tablas de hábitos en Supabase: ejecuta <code>supabase/migrations/0005_habitos.sql</code> en el SQL Editor.
        </p>
      </>
    );
  }

  const estilo: Estilo = (await cookies()).get("habitos-estilo")?.value === "cuaderno" ? "cuaderno" : "bitacora";

  return (
    <div className={`${condensada.variable} ${manuscrita.variable}`}>
      <HabitosVista habits={habits} marks={marks} mes={mes} hoy={hoy} estiloInicial={estilo} />
    </div>
  );
}
