import Link from "next/link";
import { marcarPagada } from "@/app/actions";
import { EstadoPill, Monto } from "@/components/ui";
import { textoVencimiento, type Alertas, type Pendiente } from "@/lib/finanzas";

/** Fila de una cuenta por pagar: abre el formulario, o se registra con un toque usando el monto estimado. */
export function FilaPendiente({
  p, mes, volver, conEstado = false,
}: { p: Pendiente; mes: string; volver: string; conEstado?: boolean }) {
  const vencida = p.dias !== null && p.dias < 0;
  const puedePagarRapido = p.montoEstimado > 0;
  return (
    <li>
      <Link
        href={`/cuentas/nueva?mes=${mes}&proveedor=${p.provider.id}`}
        className="h-link-row"
        style={{ display: "contents" }}
      >
        <span className="h-ico" aria-hidden="true">{p.provider.category.icono}</span>
        <span className="h-grow">
          <b>{p.provider.nombre}</b>
          <br />
          <span className="h-muted">{textoVencimiento(p)}{conEstado ? " · estimado" : ""}</span>
        </span>
        <Monto valor={p.montoEstimado} />
        {conEstado && <EstadoPill estado={vencida ? "vencida" : "pendiente"} />}
      </Link>
      {puedePagarRapido && (
        <form action={marcarPagada}>
          <input type="hidden" name="provider_id" value={p.provider.id} />
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
