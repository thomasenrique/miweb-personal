import { formatCLP } from "@/lib/finanzas";
import { periodoCorto, type PuntoSerie } from "@/lib/metas";

const W = 320;
const H = 140;
const PAD = { t: 10, r: 8, b: 22, l: 8 };

/** Línea de ahorro planeado (punteada) vs real (sólida), con la meta como referencia. */
export function GraficoAhorro({ serie, meta }: { serie: PuntoSerie[]; meta: number }) {
  if (serie.length < 2) return <p className="h-muted">El gráfico aparece desde el segundo mes.</p>;
  const max = Math.max(meta, ...serie.map((p) => p.real ?? 0), ...serie.map((p) => p.plan ?? 0)) || 1;
  const x = (i: number) => PAD.l + (i / (serie.length - 1)) * (W - PAD.l - PAD.r);
  const y = (v: number) => PAD.t + (1 - v / max) * (H - PAD.t - PAD.b);
  const linea = (k: "plan" | "real") =>
    serie.flatMap((p, i) => (p[k] == null ? [] : [`${x(i).toFixed(1)},${y(p[k]!).toFixed(1)}`])).join(" ");
  const ultimoReal = serie.reduce((u, p, i) => (p.real != null ? i : u), -1);
  const ultimo = serie[ultimoReal];
  const resumen = ultimo ? `Ahorrado a ${periodoCorto(ultimo.periodo)}: ${formatCLP(ultimo.real ?? 0)}` : "";

  return (
    <figure style={{ margin: 0 }}>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label={`Ahorro planeado versus real. ${resumen}`}>
        <line x1={PAD.l} x2={W - PAD.r} y1={y(meta)} y2={y(meta)} stroke="var(--h-ok)" strokeDasharray="2 4" strokeWidth="1.5" />
        <polyline points={linea("plan")} fill="none" stroke="var(--h-border-strong)" strokeWidth="2" strokeDasharray="5 4" />
        <polyline points={linea("real")} fill="none" stroke="var(--h-accent)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        {ultimo && <circle cx={x(ultimoReal)} cy={y(ultimo.real ?? 0)} r="4.5" fill="var(--h-accent)" />}
        <text x={PAD.l} y={H - 6} fontSize="10" fill="var(--h-text-muted)">{periodoCorto(serie[0].periodo)}</text>
        <text x={W - PAD.r} y={H - 6} fontSize="10" fill="var(--h-text-muted)" textAnchor="end">{periodoCorto(serie.at(-1)!.periodo)}</text>
      </svg>
      <figcaption className="h-muted" style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
        <span><span style={{ color: "var(--h-accent)" }}>━</span> Real</span>
        <span><span style={{ color: "var(--h-border-strong)" }}>╍</span> Plan</span>
        <span><span style={{ color: "var(--h-ok)" }}>┈</span> Meta {formatCLP(meta)}</span>
      </figcaption>
    </figure>
  );
}
