import type { Metadata } from "next";
import Link from "next/link";
import { Barras, EstadoPill, Monto } from "@/components/ui";
import { AlertaVencimientos, FilaPendiente } from "@/components/Pendientes";
import { getBills, getProviders, registrarCargosAutomaticos } from "@/lib/data";
import {
  addMeses, alertasVencimiento, calcularPendientes, esPeriodo, estimadosVariables, fechaCorta, filtrarGrupo, formatCLP, hoyChile,
  mesCorto, periodoDe, resumenSuscripciones, totalPorCategoria,
  totalPorGrupo, totalPorPeriodo, tituloPeriodo, ultimosPeriodos, variacion,
} from "@/lib/finanzas";
import type { Grupo } from "@/lib/types";

export const metadata: Metadata = { title: "Cuentas" };

const GRUPOS: { valor: Grupo | "todo"; texto: string }[] = [
  { valor: "todo", texto: "Todo" },
  { valor: "hogar", texto: "Hogar" },
  { valor: "personal", texto: "Personal" },
];

export default async function CuentasPage({ searchParams }: PageProps<"/cuentas">) {
  const sp = await searchParams;
  const hoy = hoyChile();
  const actual = periodoDe(hoy);
  const mes = esPeriodo(sp.mes as string) ? (sp.mes as string) : actual;
  const grupo = (GRUPOS.find((g) => g.valor === sp.grupo)?.valor ?? "todo") as Grupo | "todo";
  const url = (o: { mes?: string; grupo?: string }) =>
    `/cuentas?mes=${o.mes ?? mes}${(o.grupo ?? grupo) !== "todo" ? `&grupo=${o.grupo ?? grupo}` : ""}`;

  const periodos = ultimosPeriodos(mes, 6);
  await registrarCargosAutomaticos(actual, hoy).catch(() => {});
  const [todasCuentas, todosProv] = await Promise.all([getBills(periodos), getProviders()]);
  const cuentas = filtrarGrupo(todasCuentas, grupo);
  const delMes = cuentas.filter((b) => b.periodo === mes);
  const totales = totalPorPeriodo(cuentas, periodos);
  const total = totales[5];
  const cambio = variacion(total, totales[4]);
  const porGrupo = totalPorGrupo(todasCuentas.filter((b) => b.periodo === mes));
  const pendientes = mes <= actual ? calcularPendientes(filtrarGrupo(todosProv, grupo), cuentas, mes, hoy, estimadosVariables(todosProv, todasCuentas, mes)) : [];
  const faltan = pendientes.reduce((s, p) => s + p.montoEstimado, 0);
  const subs = resumenSuscripciones(todosProv);
  const subsPagadas = new Map(todasCuentas.filter((b) => b.periodo === mes).map((b) => [b.provider_id, b]));

  return (
    <>
      <div className="h-row">
        <Link className="h-btn h-btn--ghost" href={url({ mes: addMeses(mes, -1) })} aria-label="Mes anterior">‹</Link>
        <h1>{tituloPeriodo(mes, actual)}</h1>
        <Link className="h-btn h-btn--ghost" href={url({ mes: addMeses(mes, 1) })} aria-label="Mes siguiente">›</Link>
      </div>

      <nav className="h-seg" aria-label="Filtrar gastos">
        {GRUPOS.map((g) => (
          <Link key={g.valor} href={url({ grupo: g.valor })} aria-current={grupo === g.valor ? "page" : undefined}>
            {g.texto}
          </Link>
        ))}
      </nav>

      {sp.aviso === "pagada" && <p className="h-card h-card--soft" role="status">Cuenta registrada como pagada ✓</p>}
      <AlertaVencimientos alertas={alertasVencimiento(pendientes)} />

      <div className="h-grid">
        <section className="h-card">
          <div className="h-metric__label">Pagado {mes === actual ? "este mes" : `en ${mesCorto(mes)}`}</div>
          <div className="h-metric__value">{formatCLP(total)}</div>
          <div className="h-muted">
            {cambio !== null && `${cambio >= 0 ? "+" : ""}${cambio}% vs ${mesCorto(periodos[4])}`}
            {faltan > 0 && `${cambio !== null ? " · " : ""}faltan ~${formatCLP(faltan)}`}
          </div>
          {grupo === "todo" && porGrupo.hogar + porGrupo.personal > 0 && (
            <>
              <div style={{ display: "flex", height: 8, borderRadius: 999, overflow: "hidden", marginTop: 10 }}>
                <span style={{ width: `${(porGrupo.hogar / (porGrupo.hogar + porGrupo.personal)) * 100}%`, background: "var(--h-accent)" }} />
                <span style={{ flex: 1, background: "var(--h-cat-3)" }} />
              </div>
              <div className="h-row h-muted" style={{ marginTop: 4 }}>
                <span>● Hogar {formatCLP(porGrupo.hogar)}</span>
                <span style={{ color: "var(--h-cat-3)" }}>● Personal {formatCLP(porGrupo.personal)}</span>
              </div>
            </>
          )}
          <div style={{ marginTop: 16 }}>
            <Barras datos={periodos.map((p, i) => ({ etiqueta: mesCorto(p), valor: totales[i] }))} />
          </div>
        </section>

        <section className="h-card">
          <h3>Por categoría</h3>
          {totalPorCategoria(delMes).length === 0 ? (
            <p className="h-muted">Aún no hay pagos este mes.</p>
          ) : (
            <ul className="h-list">
              {totalPorCategoria(delMes).map((c) => (
                <li key={c.id}>
                  <span className="h-ico" aria-hidden="true">{c.icono}</span>
                  <span className="h-grow">{c.nombre}</span>
                  <Monto valor={c.total} />
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className="h-card">
        <div className="h-row">
          <h3>Cuentas del mes</h3>
          <Link className="h-btn h-btn--primary" href={`/cuentas/nueva?mes=${mes}`}>+ Agregar</Link>
        </div>
        {delMes.length === 0 && pendientes.length === 0 ? (
          <p className="h-muted">Agrega tu primera cuenta o crea tus proveedores en Ajustes.</p>
        ) : (
          <ul className="h-list">
            {delMes.map((b) => (
              <li key={b.id}>
                <Link href={`/cuentas/${b.id}`} className="h-link-row" style={{ display: "contents" }}>
                  <span className="h-ico" aria-hidden="true">{b.provider.category.icono}</span>
                  <span className="h-grow">
                    <b>{b.provider.nombre}</b>
                    <br />
                    <span className="h-muted">
                      {b.fecha_pago ? `Pagado ${fechaCorta(b.fecha_pago)}` : "Sin fecha"}
                      {b.fuente === "email" ? " · ✉ correo" : ""}
                      {b.moneda_original === "USD" && b.monto_original ? ` · US$${b.monto_original}` : ""}
                    </span>
                  </span>
                  <Monto valor={b.monto} />
                  <EstadoPill estado={b.estado} />
                </Link>
              </li>
            ))}
            {pendientes.map((p) => (
              <FilaPendiente key={`p-${p.provider.id}`} p={p} mes={mes} volver={url({})} conEstado />
            ))}
          </ul>
        )}
      </section>

      {grupo !== "hogar" && subs.subs.length > 0 && (
        <section className="h-card">
          <div className="h-row">
            <h3>Suscripciones</h3>
            <span className="h-muted">{formatCLP(subs.mensual)}/mes · {formatCLP(subs.anual)}/año</span>
          </div>
          <ul className="h-list">
            {subs.subs.map((s) => {
              const b = subsPagadas.get(s.id);
              return (
                <li key={s.id}>
                  <span className="h-ico" aria-hidden="true">{s.category.icono}</span>
                  <span className="h-grow">
                    <b>{s.nombre}</b>
                    <br />
                    <span className="h-muted">
                      {s.dia_vencimiento ? `Día ${s.dia_vencimiento} · ` : ""}
                      {s.frecuencia}{s.moneda === "USD" ? " · USD" : ""}
                    </span>
                  </span>
                  <Monto valor={b?.monto ?? s.monto_estimado ?? 0} />
                  {b ? <EstadoPill estado={b.estado} /> : <span className="h-pill">—</span>}
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </>
  );
}
