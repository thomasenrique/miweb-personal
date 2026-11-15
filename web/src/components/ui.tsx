import Link from "next/link";
import type { ReactNode } from "react";
import { formatCLP } from "@/lib/finanzas";
import type { EstadoCuenta } from "@/lib/types";

const PILL: Record<EstadoCuenta | "vencida", [string, string]> = {
  pagado: ["h-pill--ok", "Pagado"],
  pendiente: ["h-pill--warn", "Pendiente"],
  revisar: ["h-pill--accent", "Por revisar"],
  vencida: ["h-pill--bad", "Vencida"],
};

export function EstadoPill({ estado }: { estado: EstadoCuenta | "vencida" }) {
  const [clase, texto] = PILL[estado];
  return <span className={`h-pill ${clase}`}>{texto}</span>;
}

export function Monto({ valor }: { valor: number }) {
  return <span className="h-num">{formatCLP(valor)}</span>;
}

export function ErrorMsg({ error }: { error?: string | string[] }) {
  if (!error) return null;
  return <p className="h-error" role="alert">{Array.isArray(error) ? error[0] : error}</p>;
}

export function Encabezado({ titulo, volver, accion }: { titulo: string; volver?: string; accion?: ReactNode }) {
  return (
    <div className="h-row">
      <div className="h-row" style={{ justifyContent: "flex-start" }}>
        {volver && <Link className="h-btn h-btn--ghost" href={volver} aria-label="Volver">‹</Link>}
        <h1>{titulo}</h1>
      </div>
      {accion}
    </div>
  );
}

/** Mini gráfico de barras: se destaca la barra `destacar` (por defecto, la última). */
export function Barras({ datos, destacar }: { datos: { etiqueta: string; valor: number }[]; destacar?: number }) {
  const max = Math.max(1, ...datos.map((d) => d.valor));
  const marcada = destacar ?? datos.length - 1;
  return (
    <div className="h-bars" role="img" aria-label={datos.map((d) => `${d.etiqueta} ${formatCLP(d.valor)}`).join(", ")}>
      {datos.map((d, i) => (
        <div key={d.etiqueta + i} className={i === marcada ? "is-now" : undefined}>
          <span style={{ height: `${Math.round((d.valor / max) * 80)}%` }} />
          <small>{d.etiqueta}</small>
        </div>
      ))}
    </div>
  );
}
