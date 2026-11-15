export type Grupo = "hogar" | "personal";
export type Frecuencia = "mensual" | "anual";
export type Moneda = "CLP" | "USD";
export type EstadoCuenta = "pagado" | "pendiente" | "revisar";
export type FuenteCuenta = "email" | "manual";

export type Category = {
  id: string;
  nombre: string;
  icono: string;
  grupo: Grupo;
  es_suscripcion: boolean;
  orden: number;
};

export type Provider = {
  id: string;
  nombre: string;
  category_id: string;
  numero_cliente: string | null;
  dia_vencimiento: number | null;
  frecuencia: Frecuencia;
  mes_cobro: number | null;
  moneda: Moneda;
  monto_estimado: number | null;
  activo: boolean;
};

export type Bill = {
  id: string;
  provider_id: string;
  monto: number;
  moneda_original: Moneda;
  monto_original: number | null;
  tipo_cambio: number | null;
  fecha_pago: string | null;
  periodo: string;
  fecha_vencimiento: string | null;
  estado: EstadoCuenta;
  fuente: FuenteCuenta;
  notas: string | null;
};

export type EstadoMeta = "activa" | "lograda" | "pausada";

export type Goal = {
  id: string;
  nombre: string;
  icono: string;
  precio_total: number;
  /** Cuánto ahorrar antes de comprar (pie). Sin crédito = precio_total. */
  meta_ahorro: number;
  aporte_mensual_plan: number | null;
  fecha_inicio: string;
  fecha_objetivo: string | null;
  usa_credito: boolean;
  tasa_anual: number | null;
  n_cuotas: number | null;
  estado: EstadoMeta;
};

export type Contribution = {
  id: string;
  goal_id: string;
  monto: number;
  fecha: string;
  nota: string | null;
};

export type GoalFull = Goal & { contributions: Contribution[] };

/** Proveedor con su categoría ya resuelta. */
export type ProviderFull = Provider & { category: Category };
/** Cuenta con proveedor y categoría resueltos. */
export type BillFull = Bill & { provider: ProviderFull };
