import Link from "next/link";
import { GoalCard } from "@/components/GoalCard";
import { EstadoPill, Monto } from "@/components/ui";
import { getBills, getDebts, getGoals, getProviders, getSueldo } from "@/lib/data";
import { aPagarEnPeriodo, saldoRestante } from "@/lib/deudas";
import {
  calcularPendientes, formatCLP, hoyChile, periodoDe, textoVencimiento, totalPorGrupo, tituloPeriodo,
} from "@/lib/finanzas";
import { calcularPresupuesto } from "@/lib/presupuesto";

export default async function InicioPage() {
  const hoy = hoyChile();
  const mes = periodoDe(hoy);
  const [bills, providers, goals, deudas, sueldo] = await Promise.all([
    getBills([mes]),
    getProviders(),
    getGoals().catch(() => []),
    getDebts().catch(() => []),
    getSueldo().catch(() => null),
  ]);
  const pres = sueldo != null ? calcularPresupuesto(sueldo, { bills, providers, debts: deudas, goals }, mes, hoy) : null;
  const metas = goals.filter((g) => g.estado === "activa").slice(0, 3);
  const t = totalPorGrupo(bills);
  const pendientes = calcularPendientes(providers, bills, mes, hoy);
  const revisar = bills.filter((b) => b.estado === "revisar");

  return (
    <>
      <h1>Hola 👋</h1>

      {pres ? (
        <section className="h-card">
          <div className="h-metric__label">Libre disponible en {tituloPeriodo(mes, mes).toLowerCase()}</div>
          <div className="h-metric__value" style={pres.libre < 0 ? { color: "var(--h-bad-text)" } : undefined}>
            {formatCLP(pres.libre)}
          </div>
          <div className="h-progress" style={{ marginTop: 8 }} role="img" aria-label={`${Math.round(pres.usado * 100)}% del sueldo comprometido`}>
            <span style={{ width: `${Math.min(100, pres.usado * 100)}%`, ...(pres.libre < 0 ? { background: "var(--h-bad)" } : {}) }} />
          </div>
          <div className="h-muted" style={{ marginTop: 4 }}>{Math.round(pres.usado * 100)}% del sueldo comprometido</div>
          <ul className="h-list" style={{ marginTop: 8 }}>
            <li><span className="h-grow">💼 Sueldo líquido</span><Monto valor={pres.sueldo} /></li>
            <li><span className="h-grow">🧾 Cuentas del mes</span><span className="h-num">−{formatCLP(pres.cuentas)}</span></li>
            <li><span className="h-grow">💳 Cuotas de deudas</span><span className="h-num">−{formatCLP(pres.cuotas)}</span></li>
            <li><span className="h-grow">🎯 Aporte a metas</span><span className="h-num">−{formatCLP(pres.metas)}</span></li>
          </ul>
          <Link className="h-btn h-btn--ghost" href="/ajustes#sueldo" style={{ marginTop: 8 }}>Editar sueldo</Link>
        </section>
      ) : (
        <section className="h-card h-card--soft">
          <p style={{ margin: 0 }}>
            Ingresa tu sueldo para ver cuánto te queda libre cada mes. <Link href="/ajustes#sueldo">Agregar sueldo</Link>.
          </p>
        </section>
      )}

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

        {deudas.length > 0 && (
          <section className="h-card">
            <div className="h-row">
              <h3>Deudas</h3>
              <Link className="h-btn h-btn--ghost" href="/deudas">Ver ›</Link>
            </div>
            <div className="h-metric__label">Cuotas a pagar este mes</div>
            <div className="h-metric__value">{formatCLP(aPagarEnPeriodo(deudas, mes))}</div>
            <div className="h-muted">
              Deuda restante {formatCLP(deudas.reduce((s, d) => s + saldoRestante(d, hoy), 0))}
            </div>
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
