import type { Metadata } from "next";
import Link from "next/link";
import { Barras, Encabezado, Monto } from "@/components/ui";
import { getCards, getDebts, getProviders } from "@/lib/data";
import {
  aPagarEnPeriodo, cuotaDelPeriodo, cuotasPagadas, filtrarDeudasGrupo, proyeccion, resumenTarjeta,
  saldoRestante, terminada,
} from "@/lib/deudas";
import { addMeses, fechaCorta, formatCLP, hoyChile, mesCorto, periodoDe } from "@/lib/finanzas";
import type { DebtFull, Grupo } from "@/lib/types";

export const metadata: Metadata = { title: "Deudas" };

const GRUPOS: { valor: Grupo | "todo"; texto: string }[] = [
  { valor: "todo", texto: "Todo" },
  { valor: "hogar", texto: "Hogar" },
  { valor: "personal", texto: "Personal" },
];

const AVISOS: Record<string, string> = {
  "tarjeta-eliminada": "Tarjeta eliminada.",
  "tarjeta-desactivada": "La tarjeta tiene compras registradas, así que quedó desactivada en vez de eliminarse.",
};

function FilaDeuda({ d, hoy }: { d: DebtFull; hoy: string }) {
  const pagadas = cuotasPagadas(d, hoy);
  const fin = terminada(d, hoy);
  const kMes = cuotaDelPeriodo(d, periodoDe(hoy));
  const origen = d.tipo === "compra"
    ? `${d.card?.nombre ?? "Tarjeta"}${d.card?.ultimos4 ? ` ··${d.card.ultimos4}` : ""}`
    : d.institucion ?? "Crédito";
  return (
    <li>
      <Link href={`/deudas/${d.id}`} className="h-link-row" style={{ display: "contents" }}>
        <span className="h-grow">
          <b>{d.descripcion}</b>
          <br />
          <span className="h-muted">
            {origen} · {d.grupo === "hogar" ? "Hogar" : "Personal"}
            {d.n_cuotas === 1 ? " · 1 cuota" : ""}
          </span>
        </span>
        <span style={{ textAlign: "right" }}>
          <Monto valor={d.valor_cuota} />
          <br />
          <span className="h-muted">
            {d.saldada ? "saldada" : fin ? "pagada" : d.n_cuotas === 1 ? mesCorto(d.primer_mes_pago) : `cuota ${Math.min(d.n_cuotas, kMes ?? pagadas + 1)}/${d.n_cuotas}`}
          </span>
        </span>
      </Link>
    </li>
  );
}

export default async function DeudasPage({ searchParams }: PageProps<"/deudas">) {
  const sp = await searchParams;
  const grupo = (GRUPOS.find((g) => g.valor === sp.grupo)?.valor ?? "todo") as Grupo | "todo";
  const verTodas = sp.ver === "todas";
  const hoy = hoyChile();
  const actual = periodoDe(hoy);

  let cards, todas, providers;
  try {
    [cards, todas, providers] = await Promise.all([
      getCards().then((cs) => cs.filter((c) => c.tipo === "credito")),
      getDebts(),
      getProviders(),
    ]);
  } catch {
    return (
      <>
        <h1>Deudas</h1>
        <p className="h-error" role="alert">
          Falta crear las tablas de deudas en Supabase: ejecuta <code>supabase/migrations/0003_deudas.sql</code> en el SQL Editor.
        </p>
      </>
    );
  }

  const debts = filtrarDeudasGrupo(todas, grupo);
  const activas = debts.filter((d) => !terminada(d, hoy));
  const terminadas = debts.filter((d) => terminada(d, hoy));
  const restante = activas.reduce((s, d) => s + saldoRestante(d, hoy), 0);
  const esteMes = aPagarEnPeriodo(debts, actual);
  const proximoMes = aPagarEnPeriodo(debts, addMeses(actual, 1));
  const proy = proyeccion(debts, actual, 6);
  const compras = activas.filter((d) => d.tipo === "compra");
  const creditos = activas.filter((d) => d.tipo === "credito");
  const url = (g: string) => `/deudas${g !== "todo" ? `?grupo=${g}` : ""}`;

  return (
    <>
      <Encabezado titulo="Deudas" accion={<Link className="h-btn h-btn--primary" href="/deudas/nueva?tipo=compra">+ Compra</Link>} />
      {typeof sp.aviso === "string" && AVISOS[sp.aviso] && <p className="h-card h-card--soft" role="status">{AVISOS[sp.aviso]}</p>}

      <nav className="h-seg" aria-label="Filtrar deudas">
        {GRUPOS.map((g) => (
          <Link key={g.valor} href={url(g.valor)} aria-current={grupo === g.valor ? "page" : undefined}>{g.texto}</Link>
        ))}
      </nav>

      <div className="h-grid">
        <section className="h-card">
          <div className="h-metric__label">Deuda total restante</div>
          <div className="h-metric__value">{formatCLP(restante)}</div>
          <div className="h-muted">
            Este mes {formatCLP(esteMes)} · {mesCorto(addMeses(actual, 1))} {formatCLP(proximoMes)}
          </div>
          <div style={{ marginTop: 16 }}>
            <Barras datos={proy.map((p) => ({ etiqueta: mesCorto(p.periodo), valor: p.total }))} destacar={0} />
          </div>
          <p className="h-muted" style={{ margin: "4px 0 0" }}>Cuotas por mes, próximos 6 meses.</p>
        </section>

        <section className="h-card">
          <div className="h-row">
            <h3>Tarjetas</h3>
            <Link className="h-btn h-btn--ghost" href="/deudas/tarjeta/nueva">+ Tarjeta</Link>
          </div>
          {cards.length === 0 ? (
            <p className="h-muted">Agrega tu primera tarjeta con su cupo y días de facturación y pago.</p>
          ) : (
            <ul className="h-list">
              {cards.map((c) => {
                const r = resumenTarjeta(c, todas, hoy, providers);
                return (
                  <li key={c.id} style={c.activa ? { display: "block" } : { display: "block", opacity: 0.55 }}>
                    <Link href={`/deudas/tarjeta/${c.id}`} className="h-link-row" style={{ display: "block" }}>
                      <div className="h-row">
                        <span className="h-grow"><b>{c.nombre}</b> {c.ultimos4 && <span className="h-muted">··{c.ultimos4}</span>}</span>
                        <span className="h-pill h-pill--warn">paga {fechaCorta(r.proximoPago)}</span>
                      </div>
                      {r.pctUsado !== null && (
                        <div className="h-progress" style={{ margin: "8px 0 4px" }}><span style={{ width: `${r.pctUsado}%` }} /></div>
                      )}
                      <div className="h-muted">
                        Usado {formatCLP(r.usado)}{r.disponible !== null ? ` · disponible ${formatCLP(r.disponible)}` : ""}
                      </div>
                      <div className="h-muted">
                        Próximo pago: <b style={{ color: "var(--h-text)" }}>{formatCLP(r.montoProximo)}</b> · factura día {c.dia_facturacion}
                      </div>
                      {r.suscripcionesProximo > 0 && (
                        <div className="h-muted">
                          Cuotas {formatCLP(r.cuotasProximo)} + suscripciones {formatCLP(r.suscripcionesProximo)}
                        </div>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>

      <section className="h-card">
        <div className="h-row">
          <h3>Compras en cuotas</h3>
          <Link className="h-btn h-btn--ghost" href="/deudas/nueva?tipo=compra">+ Compra</Link>
        </div>
        {compras.length === 0 ? (
          <p className="h-muted">{cards.length ? "Sin compras en cuotas pendientes." : "Primero agrega una tarjeta."}</p>
        ) : (
          <ul className="h-list">{compras.map((d) => <FilaDeuda key={d.id} d={d} hoy={hoy} />)}</ul>
        )}
      </section>

      <section className="h-card">
        <div className="h-row">
          <h3>Otros créditos</h3>
          <Link className="h-btn h-btn--ghost" href="/deudas/nueva?tipo=credito">+ Crédito</Link>
        </div>
        {creditos.length === 0 ? (
          <p className="h-muted">Créditos de consumo, préstamos o el crédito del auto.</p>
        ) : (
          <ul className="h-list">{creditos.map((d) => <FilaDeuda key={d.id} d={d} hoy={hoy} />)}</ul>
        )}
      </section>

      {terminadas.length > 0 && (
        <section className="h-card h-card--soft">
          <div className="h-row">
            <h3>Pagadas ({terminadas.length})</h3>
            <Link className="h-btn h-btn--ghost" href={verTodas ? url(grupo) : `${url(grupo)}${grupo === "todo" ? "?" : "&"}ver=todas`}>
              {verTodas ? "Ocultar" : "Ver"}
            </Link>
          </div>
          {verTodas && <ul className="h-list">{terminadas.map((d) => <FilaDeuda key={d.id} d={d} hoy={hoy} />)}</ul>}
        </section>
      )}
    </>
  );
}
