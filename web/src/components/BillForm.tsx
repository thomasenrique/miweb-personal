import { eliminarCuenta, guardarCuenta } from "@/app/actions";
import { ConfirmButton } from "@/components/ConfirmButton";
import { MoneyInput } from "@/components/MoneyInput";
import type { BillFull, ProviderFull } from "@/lib/types";

type Props = {
  providers: ProviderFull[];
  bill?: BillFull | null;
  /** Valores sugeridos para una cuenta nueva. */
  sugerido?: { provider_id?: string; periodo: string; fecha_pago: string };
};

export function BillForm({ providers, bill, sugerido }: Props) {
  const grupos = new Map<string, ProviderFull[]>();
  for (const p of providers.filter((p) => p.activo || p.id === bill?.provider_id)) {
    const k = `${p.category.icono} ${p.category.nombre}`;
    grupos.set(k, [...(grupos.get(k) ?? []), p]);
  }
  const provSel = bill?.provider_id ?? sugerido?.provider_id ?? "";
  const provObj = providers.find((p) => p.id === provSel);
  const esUSD = bill ? bill.moneda_original === "USD" : provObj?.moneda === "USD";

  return (
    <>
      <form action={guardarCuenta} className="h-card h-stack">
        {bill && <input type="hidden" name="id" value={bill.id} />}
        <input type="hidden" name="fuente" value={bill?.fuente ?? "manual"} />

        <div className="h-field">
          <label htmlFor="provider_id">Proveedor</label>
          <select className="h-input" id="provider_id" name="provider_id" defaultValue={provSel} required>
            <option value="" disabled>Elige un proveedor</option>
            {[...grupos].map(([cat, lista]) => (
              <optgroup key={cat} label={cat}>
                {lista.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
              </optgroup>
            ))}
          </select>
        </div>

        <div className="h-field">
          <label htmlFor="monto">Monto en pesos</label>
          <MoneyInput id="monto" name="monto" defaultValue={bill?.monto ?? (esUSD ? null : provObj?.monto_estimado)} placeholder="42.100" />
        </div>

        <details open={esUSD} className="h-card h-card--soft">
          <summary style={{ cursor: "pointer" }}>Cobro en dólares</summary>
          <div className="h-stack" style={{ marginTop: 12 }}>
            <div className="h-field">
              <label htmlFor="moneda_original">Moneda del cobro</label>
              <select className="h-input" id="moneda_original" name="moneda_original" defaultValue={esUSD ? "USD" : "CLP"}>
                <option value="CLP">Pesos (CLP)</option>
                <option value="USD">Dólares (USD)</option>
              </select>
            </div>
            <div className="h-field">
              <label htmlFor="monto_original">Monto en USD</label>
              <MoneyInput id="monto_original" name="monto_original" decimales defaultValue={bill?.monto_original} placeholder="20,00" />
            </div>
            <p className="h-muted" style={{ margin: 0 }}>
              Si dejas vacío el monto en pesos, se calcula con el dólar observado del día de pago.
            </p>
          </div>
        </details>

        <div className="h-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 160px), 1fr))" }}>
          <div className="h-field">
            <label htmlFor="fecha_pago">Fecha de pago</label>
            <input className="h-input" type="date" id="fecha_pago" name="fecha_pago" defaultValue={bill?.fecha_pago ?? sugerido?.fecha_pago} />
          </div>
          <div className="h-field">
            <label htmlFor="periodo">Mes que cubre</label>
            <input className="h-input" type="month" id="periodo" name="periodo" defaultValue={bill?.periodo ?? sugerido?.periodo} required />
          </div>
        </div>

        <div className="h-field">
          <label htmlFor="estado">Estado</label>
          <select className="h-input" id="estado" name="estado" defaultValue={bill?.estado ?? "pagado"}>
            <option value="pagado">Pagado</option>
            <option value="pendiente">Pendiente</option>
            <option value="revisar">Por revisar</option>
          </select>
        </div>

        <div className="h-field">
          <label htmlFor="notas">Notas</label>
          <input className="h-input" id="notas" name="notas" defaultValue={bill?.notas ?? ""} placeholder="N° de boleta, detalle…" />
        </div>

        <button className="h-btn h-btn--primary">{bill ? "Guardar cambios" : "Guardar cuenta"}</button>
      </form>

      {bill && (
        <form action={eliminarCuenta}>
          <input type="hidden" name="id" value={bill.id} />
          <input type="hidden" name="periodo" value={bill.periodo} />
          <ConfirmButton mensaje="¿Eliminar esta cuenta? No se puede deshacer.">Eliminar cuenta</ConfirmButton>
        </form>
      )}
    </>
  );
}
