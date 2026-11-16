import Link from "next/link";
import { GoalCard } from "@/components/GoalCard";
import { AlertaVencimientos, FilaPendiente } from "@/components/Pendientes";
import { EstadoPill, Monto } from "@/components/ui";
import { getBills, getDebts, getGoals, getProviders, getSueldo, registrarCargosAutomaticos } from "@/lib/data";
import { aPagarEnPeriodo, saldoRestante } from "@/lib/deudas";
import {
  alertasVencimiento, calcularPendientes, formatCLP, hoyChile, mesCorto, periodoDe, totalPorGrupo, tituloPeriodo,
} from "@/lib/finanzas";
import { calcularPresupuesto, proyectarLibre } from "@/lib/presupuesto";

export default async function InicioPage({ searchParams }: PageProps<"/">) {
  const { aviso } = await searchParams;
  const hoy = hoyChile();
  const mes = periodoDe(hoy);
  await registrarCargosAutomaticos(mes, hoy).catch(() => {});
  const [bills, providers, goals, deudas, sueldo] = await Promise.all([
    getBills([mes]),
    getProviders(),
    getGoals().catch(() => []),
    getDebts().catch(() => []),
    getSueldo().catch(() => null),
  ]);
  const datos = { bills, providers, debts: deudas, goals };
  const pres = sueldo != null ? calcularPresupuesto(sueldo, datos, mes, hoy) : null;
  const futuro = sueldo != null ? proyectarLibre(sueldo, datos, mes, hoy, 12) : [];
  const metas = goals.filter((g) => g.estado === "activa").slice(0, 3);
  const t = totalPorGrupo(bills);
  const pendientes = calcularPendientes(providers, bills, mes, hoy);
  const revisar = bills.filter((b) => b.estado === "revisar");

  return (
    <>
      <h1>Hola 👋</h1>

      {aviso === "pagada" && <p className="h-card h-card--soft" role="status">Cuenta registrada como pagada ✓</p>}
      {aviso === "aporte" && <p className="h-card h-card--soft" role="status">Aporte registrado ✓</p>}
      <AlertaVencimientos alertas={alertasVencimiento(pendientes)} />

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

      {futuro.length > 0 && (
        <section className="h-card">
          <h3>Próximos 12 meses</h3>
          <p className="h-muted" style={{ margin: "0 0 8px" }}>
            Estimado con tus montos de cuentas, cuotas vigentes y aportes a metas. El acumulado es lo que juntarías si ahorras todo lo libre.
          </p>
          <div className="h-table-wrap">
            <table className="h-table">
              <thead>
                <tr><th>Mes</th><th>Libre del mes</th><th>Acumulado</th></tr>
              </thead>
              <tbody>
                {futuro.map((m) => (
                  <tr key={m.periodo}>
                    <td>
                      {mesCorto(m.periodo)}{m.periodo.slice(0, 4) !== mes.slice(0, 4) ? ` ${m.periodo.slice(2, 4)}` : ""}
                      {m.notas.length > 0 && <small>{m.notas.join(" · ")}</small>}
                    </td>
                    <td className={m.libre < 0 ? "is-neg" : undefined}>{formatCLP(m.libre)}</td>
                    <td className={m.acumulado < 0 ? "is-neg" : undefined}><b>{formatCLP(m.acumulado)}</b></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
                <FilaPendiente key={p.provider.id} p={p} mes={mes} volver="/" />
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
          {metas.map((g) => <GoalCard key={g.id} goal={g} hoy={hoy} compacta volver="/" />)}
        </div>
      )}
    </>
  );
}
