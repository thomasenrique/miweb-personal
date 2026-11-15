import Link from "next/link";
import { GoalCard } from "@/components/GoalCard";
import { EstadoPill, Monto } from "@/components/ui";
import { getBills, getGoals, getProviders } from "@/lib/data";
import {
  calcularPendientes, formatCLP, hoyChile, periodoDe, textoVencimiento, totalPorGrupo, tituloPeriodo,
} from "@/lib/finanzas";

export default async function InicioPage() {
  const hoy = hoyChile();
  const mes = periodoDe(hoy);
  const [bills, providers, goals] = await Promise.all([getBills([mes]), getProviders(), getGoals().catch(() => [])]);
  const metas = goals.filter((g) => g.estado === "activa").slice(0, 3);
  const t = totalPorGrupo(bills);
  const pendientes = calcularPendientes(providers, bills, mes, hoy);
  const revisar = bills.filter((b) => b.estado === "revisar");

  return (
    <>
      <h1>Hola 👋</h1>

      <section className="h-card">
        <div className="h-metric__label">Pagado en {tituloPeriodo(mes, mes).toLowerCase()}</div>
        <div className="h-metric__value">{formatCLP(t.hogar + t.personal)}</div>
        <div className="h-row h-muted" style={{ marginTop: 4 }}>
          <span>🏠 Hogar {formatCLP(t.hogar)}</span>
          <span>🙋 Personal {formatCLP(t.personal)}</span>
        </div>
        <Link className="h-btn" href="/cuentas" style={{ marginTop: 12 }}>Ver cuentas</Link>
      </section>

      <div className="h-grid">
        <section className="h-card">
          <h3>Por pagar</h3>
          {pendientes.length === 0 ? (
            <p className="h-muted">Todo pagado este mes.</p>
          ) : (
            <ul className="h-list">
              {pendientes.slice(0, 4).map((p) => (
                <li key={p.provider.id}>
                  <Link href={`/cuentas/nueva?mes=${mes}&proveedor=${p.provider.id}`} className="h-link-row" style={{ display: "contents" }}>
                    <span className="h-ico" aria-hidden="true">{p.provider.category.icono}</span>
                    <span className="h-grow"><b>{p.provider.nombre}</b><br /><span className="h-muted">{textoVencimiento(p)}</span></span>
                    <Monto valor={p.montoEstimado} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        {revisar.length > 0 && (
          <section className="h-card">
            <h3>Por revisar</h3>
            <ul className="h-list">
              {revisar.map((b) => (
                <li key={b.id}>
                  <Link href={`/cuentas/${b.id}`} className="h-link-row" style={{ display: "contents" }}>
                    <span className="h-ico" aria-hidden="true">{b.provider.category.icono}</span>
                    <span className="h-grow"><b>{b.provider.nombre}</b></span>
                    <Monto valor={b.monto} />
                    <EstadoPill estado="revisar" />
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

      </div>

      <div className="h-row">
        <h2>Metas</h2>
        <Link className="h-btn h-btn--ghost" href="/metas">Ver todas ›</Link>
      </div>
      {metas.length === 0 ? (
        <section className="h-card h-card--soft">
          <p style={{ margin: 0 }}>Aún no tienes metas. <Link href="/metas/nueva">Crea la primera</Link>.</p>
        </section>
      ) : (
        <div className="h-grid">
          {metas.map((g) => <GoalCard key={g.id} goal={g} hoy={hoy} compacta />)}
        </div>
      )}
    </>
  );
}
