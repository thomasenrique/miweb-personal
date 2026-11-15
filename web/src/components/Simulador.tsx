"use client";

import { useState } from "react";
import { formatCLP, parseMonto } from "@/lib/finanzas";
import { simularCredito } from "@/lib/metas";

const miles = (s: string) =>
  s.replace(/\D/g, "").replace(/^0+(?=\d)/, "").replace(/\B(?=(\d{3})+(?!\d))/g, ".");
const tasaTxt = (s: string) => s.replace(/[^\d,]/g, "").replace(/,(?=.*,)/g, "");
const num = (s: string) => {
  const n = parseMonto(s);
  return Number.isNaN(n) ? 0 : n;
};

type Props = {
  goalId: string;
  precio: number;
  pie: number;
  ahorrado: number;
  tasa: number;
  cuotas: number;
  guardar: (form: FormData) => Promise<void>;
};

export function Simulador({ goalId, precio, pie, ahorrado, tasa, cuotas, guardar }: Props) {
  const [vPrecio, setPrecio] = useState(miles(String(precio)));
  const [vPie, setPie] = useState(miles(String(pie)));
  const [vTasa, setTasa] = useState(String(tasa).replace(".", ","));
  const [n, setN] = useState(cuotas);
  const s = simularCredito(num(vPrecio), num(vPie), num(vTasa), n);
  const conAhorroHoy = simularCredito(num(vPrecio), ahorrado, num(vTasa), n);

  return (
    <form action={guardar} className="h-grid">
      <input type="hidden" name="goal_id" value={goalId} />
      <section className="h-card h-stack">
        <div className="h-field">
          <label htmlFor="precio">Precio</label>
          <input className="h-input h-num" id="precio" name="precio" inputMode="numeric" value={vPrecio} onChange={(e) => setPrecio(miles(e.target.value))} />
        </div>
        <div className="h-field">
          <label htmlFor="pie">Pie (tu ahorro)</label>
          <input className="h-input h-num" id="pie" name="pie" inputMode="numeric" value={vPie} onChange={(e) => setPie(miles(e.target.value))} />
        </div>
        <div className="h-field">
          <label htmlFor="tasa">Tasa anual %</label>
          <input className="h-input h-num" id="tasa" name="tasa" inputMode="decimal" value={vTasa} onChange={(e) => setTasa(tasaTxt(e.target.value))} />
        </div>
        <div className="h-field">
          <label htmlFor="n">Cuotas: <b>{n}</b></label>
          <input id="n" name="n" type="range" min={6} max={72} step={6} value={n} onChange={(e) => setN(Number(e.target.value))} style={{ accentColor: "var(--h-accent)" }} />
        </div>
      </section>

      <section className="h-stack">
        <div className="h-card h-card--accent" aria-live="polite">
          <div className="h-metric__label">Cuota mensual</div>
          <div className="h-metric__value">{formatCLP(s.cuota)}</div>
          <div className="h-muted">{n} cuotas · {vTasa || "0"}% anual</div>
        </div>
        <div className="h-card">
          <h3>Ahorro → crédito</h3>
          <div style={{ display: "flex", height: 14, borderRadius: 999, overflow: "hidden", margin: "12px 0" }}>
            <span style={{ width: `${s.pctPie}%`, background: "var(--h-accent)" }} />
            <span style={{ flex: 1, background: "var(--h-accent-soft)" }} />
          </div>
          <div className="h-muted">{s.pctPie}% pie · {100 - s.pctPie}% financiado</div>
          <ul className="h-list">
            <li><span className="h-grow">Financiado</span><span className="h-num">{formatCLP(s.financiado)}</span></li>
            <li><span className="h-grow">Total a pagar al banco</span><span className="h-num">{formatCLP(s.total)}</span></li>
            <li><span className="h-grow">Intereses</span><span className="h-num">{formatCLP(s.intereses)}</span></li>
          </ul>
          {ahorrado > 0 && ahorrado < num(vPie) && (
            <p className="h-muted" style={{ marginBottom: 0 }}>
              Si compraras hoy con lo ahorrado ({formatCLP(ahorrado)}), la cuota sería {formatCLP(conAhorroHoy.cuota)}.
            </p>
          )}
        </div>
        <button className="h-btn h-btn--primary">Guardar escenario</button>
        <p className="h-muted" style={{ margin: 0 }}>
          Estimación con cuota fija. El banco puede sumar seguros y gastos operacionales.
        </p>
      </section>
    </form>
  );
}
