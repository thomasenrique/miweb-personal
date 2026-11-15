import { eliminarMeta, guardarMeta } from "@/app/metas-actions";
import { ConfirmButton } from "@/components/ConfirmButton";
import { MoneyInput } from "@/components/MoneyInput";
import { hoyChile } from "@/lib/finanzas";
import type { Goal } from "@/lib/types";

const ICONOS = ["🚗", "🎮", "🏠", "✈️", "💻", "📱", "🛋️", "🚲", "🎓", "💍", "🎁", "🎯"];
const COLS = { gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 160px), 1fr))" };

export function GoalForm({ goal }: { goal?: Goal | null }) {
  return (
    <>
      <form action={guardarMeta} className="h-card h-stack">
        {goal && <input type="hidden" name="id" value={goal.id} />}

        <div className="h-grid" style={{ gridTemplateColumns: "88px 1fr" }}>
          <div className="h-field">
            <label htmlFor="icono">Icono</label>
            <select className="h-input" id="icono" name="icono" defaultValue={goal?.icono ?? "🎯"} style={{ fontSize: 20 }}>
              {ICONOS.map((i) => <option key={i} value={i}>{i}</option>)}
            </select>
          </div>
          <div className="h-field">
            <label htmlFor="nombre">Nombre</label>
            <input className="h-input" id="nombre" name="nombre" defaultValue={goal?.nombre} placeholder="Auto nuevo" required />
          </div>
        </div>

        <div className="h-grid" style={COLS}>
          <div className="h-field">
            <label htmlFor="precio_total">Precio total</label>
            <MoneyInput id="precio_total" name="precio_total" defaultValue={goal?.precio_total} placeholder="16.000.000" required />
          </div>
          <div className="h-field">
            <label htmlFor="aporte_mensual_plan">Aporte mensual planeado</label>
            <MoneyInput id="aporte_mensual_plan" name="aporte_mensual_plan" defaultValue={goal?.aporte_mensual_plan} placeholder="380.000" />
          </div>
        </div>

        <fieldset className="h-card h-card--soft h-stack h-credito" style={{ margin: 0 }}>
          <label className="h-row" style={{ justifyContent: "flex-start" }}>
            <input type="checkbox" name="usa_credito" defaultChecked={goal?.usa_credito ?? false} style={{ width: 20, height: 20, accentColor: "var(--h-accent)" }} />
            <b>Una parte con crédito</b>
          </label>
          <p className="h-muted h-credito-off" style={{ margin: 0 }}>Sin crédito: ahorras el precio completo.</p>
          <div className="h-stack h-credito-campos">
            <div className="h-field">
              <label htmlFor="meta_ahorro">Pie a ahorrar</label>
              <MoneyInput id="meta_ahorro" name="meta_ahorro" defaultValue={goal?.usa_credito ? goal.meta_ahorro : null} placeholder="8.000.000" />
            </div>
            <div className="h-grid" style={COLS}>
              <div className="h-field">
                <label htmlFor="tasa_anual">Tasa anual estimada %</label>
                <MoneyInput id="tasa_anual" name="tasa_anual" decimales defaultValue={goal?.tasa_anual} placeholder="14,5" />
              </div>
              <div className="h-field">
                <label htmlFor="n_cuotas">Cuotas</label>
                <input className="h-input h-num" type="number" min={1} max={120} id="n_cuotas" name="n_cuotas" defaultValue={goal?.n_cuotas ?? 36} />
              </div>
            </div>
          </div>
        </fieldset>

        <div className="h-grid" style={COLS}>
          <div className="h-field">
            <label htmlFor="fecha_inicio">Empiezo a ahorrar</label>
            <input className="h-input" type="date" id="fecha_inicio" name="fecha_inicio" defaultValue={goal?.fecha_inicio ?? hoyChile()} />
          </div>
          {goal && (
            <div className="h-field">
              <label htmlFor="estado">Estado</label>
              <select className="h-input" id="estado" name="estado" defaultValue={goal.estado}>
                <option value="activa">Activa</option>
                <option value="pausada">Pausada</option>
                <option value="lograda">Lograda</option>
              </select>
            </div>
          )}
        </div>

        <button className="h-btn h-btn--primary">{goal ? "Guardar cambios" : "Crear meta"}</button>
      </form>

      {goal && (
        <form action={eliminarMeta}>
          <input type="hidden" name="id" value={goal.id} />
          <ConfirmButton mensaje={`¿Eliminar la meta "${goal.nombre}" y todos sus aportes? No se puede deshacer.`}>
            Eliminar meta
          </ConfirmButton>
        </form>
      )}
    </>
  );
}
