import Link from "next/link";
import { agregarAporte } from "@/app/metas-actions";
import { formatCLP } from "@/lib/finanzas";
import type { GoalFull } from "@/lib/types";

/** Botones para aportar sin abrir la meta: el aporte mensual del plan (y su mitad) o un monto distinto. */
export function AporteRapido({ goal, volver }: { goal: GoalFull; volver: string }) {
  if (goal.estado !== "activa") return null;
  const plan = goal.aporte_mensual_plan;
  const montos = plan ? [...new Set([Math.round(plan / 2), plan])].filter((m) => m > 0) : [];
  return (
    <div className="h-row" style={{ marginTop: 12, justifyContent: "flex-start", flexWrap: "wrap" }}>
      {montos.map((m) => (
        <form key={m} action={agregarAporte}>
          <input type="hidden" name="goal_id" value={goal.id} />
          <input type="hidden" name="monto" value={m} />
          <input type="hidden" name="volver" value={volver} />
          <button className="h-btn" aria-label={`Aportar ${formatCLP(m)} a ${goal.nombre}`}>+ {formatCLP(m)}</button>
        </form>
      ))}
      <Link className="h-btn h-btn--ghost" href={`/metas/${goal.id}#aporte`}>Otro monto</Link>
    </div>
  );
}
