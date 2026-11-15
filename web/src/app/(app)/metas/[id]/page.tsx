import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { agregarAporte, eliminarAporte } from "@/app/metas-actions";
import { ConfirmButton } from "@/components/ConfirmButton";
import { textoProyeccion } from "@/components/GoalCard";
import { GraficoAhorro } from "@/components/GraficoAhorro";
import { MoneyInput } from "@/components/MoneyInput";
import { Encabezado, ErrorMsg, Monto } from "@/components/ui";
import { getGoal } from "@/lib/data";
import { fechaCorta, formatCLP, hoyChile } from "@/lib/finanzas";
import { progreso, proyectar, serieAhorro, simularCredito } from "@/lib/metas";

export const metadata: Metadata = { title: "Meta" };

export default async function MetaPage({ params, searchParams }: PageProps<"/metas/[id]">) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const goal = await getGoal(id);
  if (!goal) notFound();
  const hoy = hoyChile();
  const p = proyectar(goal, hoy);
  const pct = Math.round(progreso(goal) * 100);
  const sim =
    goal.usa_credito && goal.tasa_anual != null && goal.n_cuotas
      ? simularCredito(goal.precio_total, goal.meta_ahorro, goal.tasa_anual, goal.n_cuotas)
      : null;

  return (
    <>
      <Encabezado
        titulo={`${goal.icono} ${goal.nombre}`}
        volver="/metas"
        accion={<Link className="h-btn h-btn--ghost" href={`/metas/${id}/editar`}>Editar</Link>}
      />
      <ErrorMsg error={sp.error} />
      {sp.aviso === "simulacion" && <p className="h-card h-card--soft" role="status">Escenario de crédito guardado en la meta.</p>}

      <div className="h-grid">
        <section className="h-card">
          <div className="h-row">
            <span className="h-metric__label">Ahorrado</span>
            <span className={`h-pill ${p.lograda ? "h-pill--ok" : "h-pill--accent"}`}>{p.lograda ? "Lograda" : `${pct}%`}</span>
          </div>
          <div className="h-metric__value">{formatCLP(p.ahorrado)}</div>
          <div className="h-muted">de {formatCLP(goal.meta_ahorro)}{goal.usa_credito ? " de pie" : ""} · faltan {formatCLP(p.restante)}</div>
          <div className="h-progress" style={{ margin: "12px 0" }}>
            <span style={{ width: `${pct}%`, background: p.lograda ? "var(--h-ok)" : undefined }} />
          </div>
          <p style={{ margin: 0 }}>{textoProyeccion(goal, hoy)}</p>
          {p.diferencia !== null && !p.lograda && (
            <p className="h-muted" style={{ margin: "4px 0 0" }}>
              {p.diferencia >= 0
                ? `Vas ${formatCLP(p.diferencia)} adelantado respecto al plan.`
                : `Vas ${formatCLP(-p.diferencia)} atrasado respecto al plan.`}{" "}
              Promedio real: {formatCLP(p.promedioMensual)}/mes.
            </p>
          )}
        </section>

        <section className="h-card">
          <h3>Plan vs real</h3>
          <GraficoAhorro serie={serieAhorro(goal, hoy)} meta={goal.meta_ahorro} />
        </section>
      </div>

      {goal.usa_credito && (
        <section className="h-card h-card--accent">
          <div className="h-row">
            <h3>Crédito</h3>
            <Link className="h-btn" href={`/metas/${id}/credito`}>Simular ›</Link>
          </div>
          {sim ? (
            <p style={{ margin: "8px 0 0" }}>
              Financias {formatCLP(sim.financiado)} en {goal.n_cuotas} cuotas de <b>{formatCLP(sim.cuota)}</b> al{" "}
              {String(goal.tasa_anual).replace(".", ",")}% anual. Pagas {formatCLP(sim.intereses)} en intereses.
            </p>
          ) : (
            <p className="h-muted" style={{ margin: "8px 0 0" }}>Abre el simulador para estimar la cuota.</p>
          )}
        </section>
      )}

      <div className="h-grid">
        <form id="aporte" action={agregarAporte} className="h-card h-stack">
          <h3>Registrar movimiento</h3>
          <input type="hidden" name="goal_id" value={id} />
          <div className="h-field">
            <label htmlFor="monto">Monto</label>
            <MoneyInput id="monto" name="monto" defaultValue={goal.aporte_mensual_plan} placeholder="380.000" required />
          </div>
          <div className="h-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 140px), 1fr))" }}>
            <div className="h-field">
              <label htmlFor="tipo">Tipo</label>
              <select className="h-input" id="tipo" name="tipo" defaultValue="aporte">
                <option value="aporte">Aporte</option>
                <option value="retiro">Retiro</option>
              </select>
            </div>
            <div className="h-field">
              <label htmlFor="fecha">Fecha</label>
              <input className="h-input" type="date" id="fecha" name="fecha" defaultValue={hoy} />
            </div>
          </div>
          <div className="h-field">
            <label htmlFor="nota">Nota</label>
            <input className="h-input" id="nota" name="nota" placeholder="Sueldo, bono…" />
          </div>
          <button className="h-btn h-btn--primary">Guardar</button>
        </form>

        <section className="h-card">
          <h3>Movimientos</h3>
          {goal.contributions.length === 0 ? (
            <p className="h-muted">Aún no hay aportes. Registra el primero.</p>
          ) : (
            <ul className="h-list">
              {goal.contributions.map((c) => (
                <li key={c.id}>
                  <span className="h-grow">
                    {fechaCorta(c.fecha)} {c.fecha.slice(0, 4)}
                    {c.nota && <span className="h-muted"> · {c.nota}</span>}
                  </span>
                  <span style={{ color: c.monto < 0 ? "var(--h-bad-text)" : undefined }}>
                    {c.monto > 0 ? "+" : ""}<Monto valor={c.monto} />
                  </span>
                  <form action={eliminarAporte}>
                    <input type="hidden" name="id" value={c.id} />
                    <input type="hidden" name="goal_id" value={id} />
                    <ConfirmButton mensaje={`¿Eliminar el movimiento de ${formatCLP(c.monto)} del ${fechaCorta(c.fecha)}?`}>
                      <span aria-label="Eliminar movimiento">✕</span>
                    </ConfirmButton>
                  </form>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}
