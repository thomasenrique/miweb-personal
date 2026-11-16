// Lógica pura del "libre disponible": sueldo menos los compromisos del mes (probada con `node --test`).
import { aPagarEnPeriodo } from "./deudas.ts";
import { addMeses, calcularPendientes, cobraEnPeriodo } from "./finanzas.ts";
import { proyectar } from "./metas.ts";
import type { BillFull, DebtFull, GoalFull, ProviderFull } from "./types.ts";

export type Datos = {
  bills: BillFull[];
  providers: ProviderFull[];
  debts: DebtFull[];
  goals: GoalFull[];
  /** Monto esperado de los proveedores de monto variable (ver estimadosVariables). */
  estimados?: Map<string, number>;
};

export type Presupuesto = {
  sueldo: number;
  /** Cuentas registradas del mes (pagadas, pendientes o por revisar) + estimado de las que faltan. */
  cuentas: number;
  cuotas: number;
  metas: number;
  comprometido: number;
  libre: number;
  /** 0 a 1 (puede pasar de 1 si el mes no alcanza). */
  usado: number;
};

export function calcularPresupuesto(
  sueldo: number,
  datos: Datos,
  periodo: string,
  hoy: string,
): Presupuesto {
  const registradas = datos.bills.filter((b) => b.periodo === periodo).reduce((s, b) => s + b.monto, 0);
  const faltan = calcularPendientes(datos.providers, datos.bills, periodo, hoy, datos.estimados).reduce((s, p) => s + p.montoEstimado, 0);
  const cuentas = registradas + faltan;
  const cuotas = aPagarEnPeriodo(datos.debts, periodo);
  const metas = datos.goals
    .filter((g) => g.estado === "activa")
    .reduce((s, g) => s + (g.aporte_mensual_plan ?? 0), 0);
  const comprometido = cuentas + cuotas + metas;
  return {
    sueldo, cuentas, cuotas, metas, comprometido,
    libre: sueldo - comprometido,
    usado: sueldo > 0 ? comprometido / sueldo : 0,
  };
}

export type MesProyectado = {
  periodo: string;
  cuentas: number;
  cuotas: number;
  metas: number;
  libre: number;
  /** Suma del libre desde el mes actual hasta este (si se ahorra todo). */
  acumulado: number;
  /** Cambios que mueven el número: deudas que terminan, metas que se logran. */
  hitos: Hito[];
};

export type Hito = {
  tipo: "deuda" | "meta";
  nombre: string;
  icono: string;
  /** Plata que queda libre cada mes desde que se cumple (cuota o aporte que ya no se paga). */
  libera: number;
  /** Cuántas deudas con el mismo nombre terminan ese mes. */
  veces: number;
};

function agregarHito(hitos: Hito[], h: Omit<Hito, "veces">) {
  const igual = hitos.find((x) => x.tipo === h.tipo && x.nombre === h.nombre);
  if (igual) { igual.libera += h.libera; igual.veces++; }
  else hitos.push({ ...h, veces: 1 });
}

/**
 * Libre disponible del mes actual y los siguientes.
 * Mes actual: igual que calcularPresupuesto. Meses futuros: monto estimado de los proveedores
 * que cobran ese mes, cuotas vigentes y aporte a metas hasta que se completan.
 */
export function proyectarLibre(
  sueldo: number,
  datos: Datos,
  periodo: string,
  hoy: string,
  meses = 12,
): MesProyectado[] {
  const actual = calcularPresupuesto(sueldo, datos, periodo, hoy);
  const metas = datos.goals
    .filter((g) => g.estado === "activa" && g.aporte_mensual_plan)
    .map((g) => ({ g, plan: g.aporte_mensual_plan!, restante: proyectar(g, hoy).restante }));
  // Igual que la tarjeta de la meta: los aportes que faltan se cuentan desde el mes siguiente.
  const vigentes = datos.debts.filter((d) => !d.saldada);

  const out: MesProyectado[] = [{
    periodo, cuentas: actual.cuentas, cuotas: actual.cuotas, metas: actual.metas,
    libre: actual.libre, acumulado: actual.libre, hitos: [],
  }];
  for (let i = 1; i < meses; i++) {
    const p = addMeses(periodo, i);
    const anterior = addMeses(p, -1);
    const hitos: Hito[] = [];
    for (const d of vigentes) {
      if (addMeses(d.primer_mes_pago, d.n_cuotas - 1) === anterior) {
        agregarHito(hitos, { tipo: "deuda", nombre: d.descripcion, icono: "✅", libera: d.valor_cuota });
      }
    }
    const cuentas = datos.providers.filter((pr) => cobraEnPeriodo(pr, p)).reduce((s, pr) => s + (datos.estimados?.get(pr.id) ?? pr.monto_estimado ?? 0), 0);
    const cuotas = aPagarEnPeriodo(datos.debts, p);
    let aporte = 0;
    for (const m of metas) {
      if (m.restante <= 0) continue;
      const a = Math.min(m.plan, m.restante);
      m.restante -= a;
      aporte += a;
      if (m.restante === 0) agregarHito(hitos, { tipo: "meta", nombre: m.g.nombre, icono: m.g.icono || "🎯", libera: m.plan });
    }
    const libre = sueldo - cuentas - cuotas - aporte;
    out.push({ periodo: p, cuentas, cuotas, metas: aporte, libre, acumulado: out[i - 1].acumulado + libre, hitos });
  }
  return out;
}
