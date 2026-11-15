import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cambiarSaldada, eliminarDeuda } from "@/app/deudas-actions";
import { ConfirmButton } from "@/components/ConfirmButton";
import { Encabezado, ErrorMsg, Monto } from "@/components/ui";
import { getDebt } from "@/lib/data";
import { cuotasPagadas, interesTotal, saldoRestante, vencimientoCuota } from "@/lib/deudas";
import { fechaCorta, formatCLP, hoyChile } from "@/lib/finanzas";

export const metadata: Metadata = { title: "Deuda" };

export default async function DeudaPage({ params, searchParams }: PageProps<"/deudas/[id]">) {
  const [{ id }, { error }] = await Promise.all([params, searchParams]);
  const d = await getDebt(id);
  if (!d) notFound();
  const hoy = hoyChile();
  const pagadas = cuotasPagadas(d, hoy);
  const pct = Math.round((pagadas / d.n_cuotas) * 100);
  const interes = interesTotal(d);
  const origen = d.tipo === "compra"
    ? `${d.card?.nombre ?? "Tarjeta"}${d.card?.ultimos4 ? ` ··${d.card.ultimos4}` : ""}`
    : d.institucion ?? "Crédito";

  return (
    <>
      <Encabezado
        titulo={d.descripcion}
        volver="/deudas"
        accion={<Link className="h-btn h-btn--ghost" href={`/deudas/${id}/editar`}>Editar</Link>}
      />
      <ErrorMsg error={error} />

      <div className="h-grid">
        <section className="h-card">
          <div className="h-row">
            <span className="h-metric__label">Falta pagar</span>
            <span className={`h-pill ${pagadas >= d.n_cuotas ? "h-pill--ok" : "h-pill--accent"}`}>
              {d.saldada ? "Saldada" : `${pagadas}/${d.n_cuotas} cuotas`}
            </span>
          </div>
          <div className="h-metric__value">{formatCLP(saldoRestante(d, hoy))}</div>
          <div className="h-progress" style={{ margin: "12px 0" }}><span style={{ width: `${pct}%`, background: "var(--h-ok)" }} /></div>
          <ul className="h-list">
            <li><span className="h-grow">Origen</span><span>{origen} · {d.grupo === "hogar" ? "Hogar" : "Personal"}</span></li>
            <li><span className="h-grow">Fecha</span><span>{fechaCorta(d.fecha)} {d.fecha.slice(0, 4)}</span></li>
            <li><span className="h-grow">Monto</span><Monto valor={d.monto_total} /></li>
            <li><span className="h-grow">{d.n_cuotas} cuotas de</span><Monto valor={d.valor_cuota} /></li>
            <li>
              <span className="h-grow">Interés total</span>
              <span style={{ color: interes > 0 ? "var(--h-warn-text)" : undefined }}>{interes > 0 ? formatCLP(interes) : "Sin interés"}</span>
            </li>
          </ul>
          {d.notas && <p className="h-muted" style={{ marginBottom: 0 }}>{d.notas}</p>}
        </section>

        <section className="h-card">
          <h3>Calendario de cuotas</h3>
          <ul className="h-list">
            {Array.from({ length: d.n_cuotas }, (_, i) => i + 1).map((k) => {
              const venc = vencimientoCuota(d, k);
              const pagada = k <= pagadas;
              const proxima = k === pagadas + 1 && !d.saldada;
              return (
                <li key={k} style={pagada ? { opacity: 0.6 } : undefined}>
                  <span className="h-num" style={{ minWidth: 48 }}>{k}/{d.n_cuotas}</span>
                  <span className="h-grow">{fechaCorta(venc)} {venc.slice(0, 4)}</span>
                  <Monto valor={d.valor_cuota} />
                  <span className={`h-pill ${pagada ? "h-pill--ok" : proxima ? "h-pill--warn" : ""}`}>
                    {pagada ? "Pagada" : proxima ? "Próxima" : "—"}
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
      </div>

      <section className="h-card h-card--soft h-stack">
        <form action={cambiarSaldada}>
          <input type="hidden" name="id" value={d.id} />
          <input type="hidden" name="saldada" value={d.saldada ? "0" : "1"} />
          {d.saldada ? (
            <button className="h-btn">Reabrir deuda</button>
          ) : (
            <ConfirmButton tono="neutro" mensaje="¿Marcar como saldada? Todas las cuotas pendientes quedarán como pagadas (prepago).">
              Marcar como saldada (prepago)
            </ConfirmButton>
          )}
        </form>
        <form action={eliminarDeuda}>
          <input type="hidden" name="id" value={d.id} />
          <ConfirmButton mensaje={`¿Eliminar "${d.descripcion}"? No se puede deshacer.`}>Eliminar</ConfirmButton>
        </form>
      </section>
    </>
  );
}
