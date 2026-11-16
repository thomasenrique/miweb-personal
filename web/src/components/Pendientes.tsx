import Link from "next/link";
import { ingresarMonto, marcarPagada } from "@/app/actions";
import { MoneyInput } from "@/components/MoneyInput";
import { EstadoPill, Monto } from "@/components/ui";
import { formatCLP, textoVencimiento, type Alertas, type Pendiente } from "@/lib/finanzas";

/**
 * Fila de una cuenta por pagar: abre el formulario, o se registra con un toque.
 * Si ya hay cuenta pendiente se paga con su monto real; si no, con el estimado (salvo monto variable).
 */
export function FilaPendiente({
  p, mes, volver, conEstado = false,
}: { p: Pendiente; mes: string; volver: string; conEstado?: boolean }) {
  const vencida = p.dias !== null && p.dias < 0;
  const puedePagarRapido = p.bill ? true : p.montoEstimado > 0 && !p.provider.monto_variable;
  return (
    <li>
      <Link
        href={p.bill ? `/cuentas/${p.bill.id}` : `/cuentas/nueva?mes=${mes}&proveedor=${p.provider.id}`}
        className="h-link-row"
        style={{ display: "contents" }}
      >
        <span className="h-ico" aria-hidden="true">{p.provider.category.icono}</span>
        <span className="h-grow">
          <b>{p.provider.nombre}</b>
          <br />
          <span className="h-muted">{textoVencimiento(p)}{conEstado && !p.bill ? " · estimado" : ""}</span>
        </span>
        <Monto valor={p.montoEstimado} />
        {conEstado && <EstadoPill estado={vencida ? "vencida" : "pendiente"} />}
      </Link>
      {puedePagarRapido && (
        <form action={marcarPagada}>
          <input type="hidden" name="provider_id" value={p.provider.id} />
          {p.bill && <input type="hidden" name="bill_id" value={p.bill.id} />}
          <input type="hidden" name="periodo" value={mes} />
          <input type="hidden" name="volver" value={volver} />
          <button className="h-btn" aria-label={`Marcar ${p.provider.nombre} como pagada`}>✓ Pagada</button>
        </form>
      )}
    </li>
  );
}

/** Aviso con lo vencido y lo que vence en los próximos 7 días. No se muestra si no hay nada. */
export function AlertaVencimientos({ alertas }: { alertas: Alertas }) {
  const { vencidas, proximas } = alertas;
  if (vencidas.length + proximas.length === 0) return null;
  const linea = (lista: Pendiente[]) =>
    lista.map((p) => `${p.provider.nombre} (${textoVencimiento(p).toLowerCase()})`).join(" · ");
  return (
    <div className="h-alert" role="status" style={{ flexDirection: "column", gap: 4 }}>
      {vencidas.length > 0 && (
        <span>🚨 <b>{vencidas.length} {vencidas.length === 1 ? "vencida" : "vencidas"}:</b> {linea(vencidas)}</span>
      )}
      {proximas.length > 0 && (
        <span>⏰ <b>Vencen esta semana:</b> {linea(proximas)}</span>
      )}
    </div>
  );
}

/** Cuentas de monto variable sin monto este mes: se piden una por una hasta que se ingresan. */
export function IngresarMontos({ faltan, mes, volver }: { faltan: Pendiente[]; mes: string; volver: string }) {
  if (faltan.length === 0) return null;
  return (
    <section className="h-card">
      <h3>Ingresa el monto de este mes</h3>
      <p className="h-muted" style={{ margin: "0 0 8px" }}>
        Estas cuentas cambian cada mes. Cuando te llegue la boleta, escribe el monto: queda en Por pagar.
      </p>
      <ul className="h-list">
        {faltan.map((p) => (
          <li key={p.provider.id} style={{ flexWrap: "wrap" }}>
            <span className="h-ico" aria-hidden="true">{p.provider.category.icono}</span>
            <span className="h-grow" style={{ minWidth: "min(100%, 180px)" }}>
              <b>{p.provider.nombre}</b>
              <br />
              <span className="h-muted">
                {textoVencimiento(p)}{p.montoEstimado > 0 ? ` · aprox. ${formatCLP(p.montoEstimado)}` : ""}
              </span>
            </span>
            <form action={ingresarMonto} className="h-row" style={{ gap: 8, flexWrap: "nowrap", marginLeft: "auto" }}>
              <input type="hidden" name="provider_id" value={p.provider.id} />
              <input type="hidden" name="periodo" value={mes} />
              <input type="hidden" name="volver" value={volver} />
              <span style={{ width: 130 }}>
                <MoneyInput id={`monto-${p.provider.id}`} name="monto" etiqueta={`Monto de ${p.provider.nombre}`} placeholder={p.montoEstimado > 0 ? formatCLP(p.montoEstimado).slice(1) : "42.100"} required />
              </span>
              <button className="h-btn h-btn--primary" aria-label={`Guardar monto de ${p.provider.nombre}`}>Guardar</button>
            </form>
          </li>
        ))}
      </ul>
    </section>
  );
}
