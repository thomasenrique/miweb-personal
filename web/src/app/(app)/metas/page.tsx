import type { Metadata } from "next";
import Link from "next/link";
import { GoalCard } from "@/components/GoalCard";
import { Encabezado } from "@/components/ui";
import { getGoals } from "@/lib/data";
import { hoyChile } from "@/lib/finanzas";

export const metadata: Metadata = { title: "Metas" };

export default async function MetasPage() {
  const hoy = hoyChile();
  let goals;
  try {
    goals = await getGoals();
  } catch {
    return (
      <>
        <h1>Metas</h1>
        <p className="h-error" role="alert">
          Falta crear las tablas de metas en Supabase: ejecuta <code>supabase/migrations/0002_metas.sql</code> en el SQL Editor.
        </p>
      </>
    );
  }
  return (
    <>
      <Encabezado
        titulo="Metas"
        accion={<Link className="h-btn h-btn--primary" href="/metas/nueva">+ Nueva meta</Link>}
      />
      {goals.length === 0 ? (
        <section className="h-card h-stack">
          <h3>Crea tu primera meta</h3>
          <p className="h-muted" style={{ margin: 0 }}>
            Un auto, una consola, un viaje. Define cuánto ahorrar y cuánto al mes, y ve cuándo llegas.
          </p>
          <Link className="h-btn h-btn--primary" href="/metas/nueva">Crear meta</Link>
        </section>
      ) : (
        <div className="h-grid">
          {goals.map((g) => <GoalCard key={g.id} goal={g} hoy={hoy} />)}
        </div>
      )}
    </>
  );
}
