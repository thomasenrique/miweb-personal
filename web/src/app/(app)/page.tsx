import Link from "next/link";
import { GoalCard } from "@/components/GoalCard";
import { AlertaVencimientos, FilaPendiente, IngresarMontos } from "@/components/Pendientes";
import { EstadoPill, Monto } from "@/components/ui";
import { getBills, getDebts, getGoals, getProviders, getSueldo, registrarCargosAutomaticos } from "@/lib/data";
import { aPagarEnPeriodo, saldoRestante } from "@/lib/deudas";
import {
  addMeses, alertasVencimiento, calcularPendientes, cuentasPorPagar, estimadosVariables, formatCLP, hoyChile, mesCorto,
  periodoDe, totalPorGrupo, tituloPeriodo, ultimosPeriodos,
} from "@/lib/finanzas";
import { calcularPresupuesto, proyectarLibre, type MesProyectado } from "@/lib/presupuesto";

export default async function InicioPage({ searchParams }: PageProps<"/">) {
  const { aviso, vista, error } = await searchParams;
  const verLibre = vista === "libre";
  const hoy = hoyChile();
  const mes = periodoDe(hoy);
  await registrarCargosAutomaticos(mes, hoy).catch(() => {});
  const [bills, historial, providers, goals, deudas, sueldo] = await Promise.all([
    getBills([mes]),
    getBills(ultimosPeriodos(addMeses(mes, -1), 3)),
    getProviders(),
    getGoals().catch(() => []),
    getDebts().catch(() => []),
    getSueldo().catch(() => null),
  ]);
  const estimados = estimadosVariables(providers, historial, mes);
  const datos = { bills, providers, debts: deudas, goals, estimados };
  const pres = sueldo != null ? calcularPresupuesto(sueldo, datos, mes, hoy) : null;
  const futuro = sueldo != null ? proyectarLibre(sueldo, datos, mes, hoy, 12) : [];
  const metas = goals.filter((g) => g.estado === "activa").slice(0, 3);
  const t = totalPorGrupo(bills);
  const sinCuenta = calcularPendientes(providers, bills, mes, hoy, estimados);
  const faltaMonto = sinCuenta.filter((p) => p.provider.monto_variable);
  const pendientes = [...cuentasPorPagar(bills, mes, hoy), ...sinCuenta.filter((p) => !p.provider.monto_variable)]
    .sort((a, b) => (a.vencimiento ?? "9999").localeCompare(b.vencimiento ?? "9999"));
  const revisar = bills.filter((b) => b.estado === "revisar");

  return (
    <>
      <h1>Hola 👋</h1>

      {aviso === "pagada" && <p className="h-card h-card--soft" role="status">Cuenta registrada como pagada ✓</p>}
      {aviso === "aporte" && <p className="h-card h-card--soft" role="status">Aporte registrado ✓</p>}
      {aviso === "monto" && <p className="h-card h-card--soft" role="status">Monto guardado: quedó en Por pagar ✓</p>}
      {typeof error === "string" && <p className="h-alert" role="alert">{error}</p>}
      <AlertaVencimientos alertas={alertasVencimiento([...pendientes, ...faltaMonto])} />

      <nav className="h-seg" aria-label="Vista de inicio">
        <Link href="/" aria-current={verLibre ? undefined : "page"}>Este mes</Link>
        <Link href="/?vista=libre" aria-current={verLibre ? "page" : undefined}>Libre disponible</Link>
      </nav>

      {verLibre ? (
      <>
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

      {futuro.length > 0 && <HitosEnCamino futuro={futuro} mes={mes} />}

      {futuro.length > 0 && (
        <section className="h-card">
          <h3>Próximos 12 meses</h3>
          <p className="h-muted" style={{ margin: "0 0 8px" }}>
            Estimado con tus montos de cuentas, cuotas vigentes y aportes a metas. El acumulado es lo que juntarías si ahorras todo lo libre.
          </p>
          <div className="h-table-wrap">
            <table className="h-table h-proy">
              <thead>
                <tr><th>Mes</th><th>Libre del mes</th><th>Acumulado</th></tr>
              </thead>
              <tbody>
                {futuro.map((m, i) => {
                  const sube = i > 0 && m.hitos.length > 0 ? m.libre - futuro[i - 1].libre : 0;
                  const maxLibre = Math.max(...futuro.map((x) => x.libre), 1);
                  return (
                    <tr key={m.periodo} className={m.hitos.length ? "is-hito" : undefined}>
                      <td>
                        {etiquetaMes(m.periodo, mes)}
                        {m.hitos.length > 0 && (
                          <span className="h-proy__chips">
                            {m.hitos.map((h) => (
                              <span key={h.tipo + h.nombre} className={`h-chip h-chip--${h.tipo}`}>
                                {h.tipo === "meta" ? "🏆" : "✅"} {h.nombre}{h.veces > 1 ? ` ×${h.veces}` : ""}
                              </span>
                            ))}
                          </span>
                        )}
                      </td>
                      <td className={m.libre < 0 ? "is-neg" : undefined}>
                        {formatCLP(m.libre)}
                        {sube > 0 && <small className="h-proy__sube">▲ {formatCLP(sube)}</small>}
                        <span className="h-proy__bar" aria-hidden="true">
                          <span style={{ width: `${Math.max(0, (m.libre / maxLibre) * 100)}%` }} />
                        </span>
                      </td>
                      <td className={m.acumulado < 0 ? "is-neg" : undefined}><b>{formatCLP(m.acumulado)}</b></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}
      </>
      ) : (
      <>
      <IngresarMontos faltan={faltaMonto} mes={mes} volver="/" />

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
            <p className="h-muted">{faltaMonto.length ? "Nada más por pagar mientras no ingreses los montos." : "Todo pagado este mes."}</p>
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
      )}
    </>
  );
}

function etiquetaMes(periodo: string, mes: string) {
  return `${mesCorto(periodo)}${periodo.slice(0, 4) !== mes.slice(0, 4) ? ` ${periodo.slice(2, 4)}` : ""}`;
}

function cuandoEs(i: number) {
  return i === 1 ? "el próximo mes" : `en ${i} meses`;
}

/** Línea de tiempo de deudas que terminan y metas que se logran, con la plata que liberan. */
function HitosEnCamino({ futuro, mes }: { futuro: MesProyectado[]; mes: string }) {
  const hitos = futuro.flatMap((m, i) => m.hitos.map((h) => ({ ...h, i, periodo: m.periodo })));
  if (hitos.length === 0) return null;
  const ultimo = hitos[hitos.length - 1];
  const libreHoy = futuro[0].libre;
  // Una meta deja de pedir aporte el mes siguiente al que se logra.
  const final = futuro[Math.min(futuro.length - 1, ultimo.i + (hitos.some((h) => h.i === ultimo.i && h.tipo === "meta") ? 1 : 0))];
  const libreFinal = final.libre;
  const extra = libreFinal - libreHoy;
  return (
    <section className="h-card h-hitos">
      <h3>Hitos en camino 🎉</h3>
      <p className="h-muted" style={{ margin: "0 0 12px" }}>
        Cada deuda que terminas y cada meta que logras te deja más plata libre al mes.
      </p>
      <ol className="h-hitos__lista">
        {hitos.map((h, n) => (
          <li key={`${h.periodo}-${h.tipo}-${h.nombre}`} className={`h-hito h-hito--${h.tipo}${n === 0 ? " is-proximo" : ""}`}>
            <span className="h-hito__ico" aria-hidden="true">{h.tipo === "meta" ? h.icono : "✅"}</span>
            <div className="h-grow">
              {n === 0 && <span className="h-hito__tag">Próximo hito</span>}
              <div className="h-hito__titulo">
                {h.tipo === "meta" ? <>¡Logras <b>{h.nombre}</b>!</> : <>Terminas de pagar <b>{h.nombre}</b></>}
                {h.veces > 1 && <span className="h-muted"> ×{h.veces}</span>}
              </div>
              <div className="h-hito__cuando">{etiquetaMes(h.periodo, mes)} · {cuandoEs(h.i)}</div>
            </div>
            <span className={`h-pill ${h.tipo === "meta" ? "h-pill--accent" : "h-pill--ok"}`}>+{formatCLP(h.libera)}/mes</span>
          </li>
        ))}
      </ol>
      <div className="h-hitos__resumen">
        <div>
          <div className="h-metric__label">Tu libre hoy</div>
          <b>{formatCLP(libreHoy)}</b>
        </div>
        <span className="h-hitos__flecha" aria-hidden="true">→</span>
        <div>
          <div className="h-metric__label">En {etiquetaMes(final.periodo, mes)}</div>
          <b className="h-hitos__meta">{formatCLP(libreFinal)}</b>
        </div>
      </div>
      {extra > 0 && (
        <p className="h-muted" style={{ margin: "8px 0 0" }}>
          Al cumplir estos {hitos.length} hitos tendrás {formatCLP(extra)} más libres cada mes. ¡Sigue así!
        </p>
      )}
    </section>
  );
}
