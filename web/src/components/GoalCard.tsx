import Link from "next/link";
import { AporteRapido } from "@/components/AporteRapido";
import { formatCLP } from "@/lib/finanzas";
import { periodoCorto, progreso, proyectar } from "@/lib/metas";
import type { GoalFull } from "@/lib/types";

export function textoProyeccion(g: GoalFull, hoy: string): string {
  const p = proyectar(g, hoy);
  if (p.lograda) return "Meta lograda";
  if (g.estado === "pausada") return "En pausa";
  if (p.mesesRestantes === null || !p.llegada) return "Define un aporte mensual para estimar cuándo llegas";
  return `A ${formatCLP(g.aporte_mensual_plan!)}/mes llegas en ${periodoCorto(p.llegada)} (${p.mesesRestantes} ${p.mesesRestantes === 1 ? "mes" : "meses"})`;
}

export function GoalCard({
  goal, hoy, compacta = false, volver = "/metas",
}: { goal: GoalFull; hoy: string; compacta?: boolean; volver?: string }) {
  const pct = Math.round(progreso(goal) * 100);
  const p = proyectar(goal, hoy);
  const color = p.lograda ? "var(--h-ok)" : undefined;
  return (
    <section className="h-card" style={goal.estado === "pausada" ? { opacity: 0.7 } : undefined}>
      <Link href={`/metas/${goal.id}`} className="h-link-row h-row" style={{ textDecoration: "none" }}>
        <span className="h-ico" aria-hidden="true">{goal.icono}</span>
        <span className="h-grow" style={{ flex: 1 }}>
          <b>{goal.nombre}</b>
          <br />
          <span className="h-muted">{goal.usa_credito ? "Pie + crédito" : "Solo ahorro"}</span>
        </span>
        <span className={`h-pill ${p.lograda ? "h-pill--ok" : "h-pill--accent"}`}>{pct}%</span>
      </Link>
      <div className={compacta ? undefined : "h-metric__value"} style={{ marginTop: 12, fontWeight: 700 }}>
        {formatCLP(p.ahorrado)}
      </div>
      <div className="h-muted">de {formatCLP(goal.meta_ahorro)}{goal.usa_credito ? " de pie" : ""}</div>
      <div className="h-progress" style={{ margin: "12px 0" }}>
        <span style={{ width: `${pct}%`, background: color }} />
      </div>
      <div className="h-muted">{textoProyeccion(goal, hoy)}</div>
      <AporteRapido goal={goal} volver={volver} />
      {!compacta && goal.usa_credito && (
        <div className="h-row" style={{ marginTop: 8, justifyContent: "flex-start" }}>
          <Link className="h-btn h-btn--ghost" href={`/metas/${goal.id}/credito`}>Ver crédito ›</Link>
        </div>
      )}
    </section>
  );
}
