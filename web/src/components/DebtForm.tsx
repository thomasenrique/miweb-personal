import Link from "next/link";
import { guardarDeuda } from "@/app/deudas-actions";
import { MoneyInput } from "@/components/MoneyInput";
import { hoyChile } from "@/lib/finanzas";
import type { Card, Debt, TipoDeuda } from "@/lib/types";

const COLS = { gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 150px), 1fr))" };

export function DebtForm({ tipo, cards, debt }: { tipo: TipoDeuda; cards: Card[]; debt?: Debt | null }) {
  const compra = tipo === "compra";
  const tarjetas = cards.filter((c) => c.tipo === "credito" && (c.activa || c.id === debt?.card_id));

  if (compra && tarjetas.length === 0) {
    return (
      <section className="h-card h-stack">
        <p style={{ margin: 0 }}>Primero agrega una tarjeta con sus días de facturación y pago.</p>
        <Link className="h-btn h-btn--primary" href="/deudas/tarjeta/nueva">Agregar tarjeta</Link>
      </section>
    );
  }

  return (
    <form action={guardarDeuda} className="h-card h-stack">
      {debt && <input type="hidden" name="id" value={debt.id} />}
      <input type="hidden" name="tipo" value={tipo} />

      {compra ? (
        <div className="h-field">
          <label htmlFor="card_id">Tarjeta</label>
          <select className="h-input" id="card_id" name="card_id" defaultValue={debt?.card_id ?? tarjetas[0]?.id} required>
            {tarjetas.map((c) => (
              <option key={c.id} value={c.id}>{c.nombre}{c.ultimos4 ? ` ··${c.ultimos4}` : ""}</option>
            ))}
          </select>
        </div>
      ) : (
        <div className="h-field">
          <label htmlFor="institucion">Institución</label>
          <input className="h-input" id="institucion" name="institucion" defaultValue={debt?.institucion ?? ""} placeholder="BancoEstado" />
        </div>
      )}

      <div className="h-field">
        <label htmlFor="descripcion">{compra ? "¿Qué compraste?" : "Descripción"}</label>
        <input className="h-input" id="descripcion" name="descripcion" defaultValue={debt?.descripcion} placeholder={compra ? "Refrigerador" : "Crédito de consumo"} required />
      </div>

      <div className="h-grid" style={COLS}>
        <div className="h-field">
          <label htmlFor="fecha">{compra ? "Fecha de compra" : "Fecha del crédito"}</label>
          <input className="h-input" type="date" id="fecha" name="fecha" defaultValue={debt?.fecha ?? hoyChile()} required />
        </div>
        <div className="h-field">
          <label htmlFor="grupo">Grupo</label>
          <select className="h-input" id="grupo" name="grupo" defaultValue={debt?.grupo ?? (compra ? "hogar" : "personal")}>
            <option value="hogar">🏠 Hogar</option>
            <option value="personal">🙋 Personal</option>
          </select>
        </div>
      </div>

      <div className="h-grid" style={COLS}>
        <div className="h-field">
          <label htmlFor="monto_total">Monto total</label>
          <MoneyInput id="monto_total" name="monto_total" defaultValue={debt?.monto_total} placeholder="699.600" required />
        </div>
        <div className="h-field">
          <label htmlFor="n_cuotas">Cuotas</label>
          <input className="h-input h-num" type="number" min={1} max={360} id="n_cuotas" name="n_cuotas" defaultValue={debt?.n_cuotas ?? (compra ? 1 : 12)} required />
        </div>
      </div>

      <div className="h-field">
        <label htmlFor="valor_cuota">Valor cuota (lo que informa el banco)</label>
        <MoneyInput id="valor_cuota" name="valor_cuota" defaultValue={debt?.valor_cuota} placeholder="62.400" required={!compra} />
        {compra && <span className="h-muted" style={{ fontSize: "var(--h-fs-xs)" }}>Déjalo vacío si es sin interés.</span>}
      </div>

      <div className="h-grid" style={COLS}>
        <div className="h-field">
          <label htmlFor="primer_mes_pago">Mes de la primera cuota</label>
          <input className="h-input" type="month" id="primer_mes_pago" name="primer_mes_pago" defaultValue={debt?.primer_mes_pago ?? ""} required={!compra} />
          {compra && <span className="h-muted" style={{ fontSize: "var(--h-fs-xs)" }}>Vacío = se calcula con la facturación de la tarjeta.</span>}
        </div>
        {!compra && (
          <div className="h-field">
            <label htmlFor="dia_pago">Día de pago</label>
            <input className="h-input h-num" type="number" min={1} max={31} id="dia_pago" name="dia_pago" defaultValue={debt?.dia_pago ?? ""} placeholder="15" />
          </div>
        )}
      </div>

      <div className="h-field">
        <label htmlFor="notas">Notas</label>
        <input className="h-input" id="notas" name="notas" defaultValue={debt?.notas ?? ""} placeholder="Tienda, n° de operación…" />
      </div>

      {debt && <input type="hidden" name="saldada" value={debt.saldada ? "on" : ""} />}
      <button className="h-btn h-btn--primary">{debt ? "Guardar cambios" : compra ? "Guardar compra" : "Guardar crédito"}</button>
    </form>
  );
}
