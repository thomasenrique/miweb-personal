# 03 · Modelo de datos (Postgres / Supabase)

Montos en CLP como `integer` (sin decimales). Todas las tablas llevan `id uuid`, `user_id uuid` (RLS) y `created_at`.

```
categories 1──* providers 1──* bills *──1 inbound_emails
goals 1──* contributions
```

## categories
| Campo | Tipo | Nota |
|---|---|---|
| nombre | text | Luz, Agua, Gas, Internet… |
| grupo | enum | `hogar` · `personal` |
| icono | text | nombre de icono |
| color | text | token de color, ej. `cat-1` |

## providers
| Campo | Tipo | Nota |
|---|---|---|
| nombre | text | "Enel", "Aguas Andinas" |
| category_id | uuid → categories | |
| alias | text[] | nombres alternativos para emparejar correos |
| numero_cliente | text | opcional |
| dia_vencimiento | smallint | 1–31, día de vencimiento o de cobro |
| frecuencia | enum | `mensual` · `anual` |
| mes_cobro | smallint | 1–12, solo si es anual |
| moneda | enum | `CLP` · `USD` (moneda habitual del cobro) |
| monto_estimado | integer | CLP, para pendientes |
| activo | boolean | |

## bills
| Campo | Tipo | Nota |
|---|---|---|
| provider_id | uuid → providers | |
| monto | integer | CLP (lo que se suma en totales) |
| moneda_original | enum | `CLP` · `USD` |
| monto_original | numeric(12,2) | en la moneda original |
| tipo_cambio | numeric(10,2) | dólar usado; null si CLP |
| fecha_pago | date | null si pendiente |
| periodo | char(7) | `YYYY-MM` |
| fecha_vencimiento | date | |
| estado | enum | `pagado` · `pendiente` · `revisar` |
| fuente | enum | `email` · `manual` |
| inbound_email_id | uuid → inbound_emails | null si manual |
| comprobante_path | text | ruta del PDF en Storage |
| notas | text | |

Único: `(provider_id, periodo)` — una cuenta por proveedor y mes (editable si hay dos).

## inbound_emails
| Campo | Tipo | Nota |
|---|---|---|
| message_id | text unique | idempotencia |
| remitente | text | |
| asunto | text | |
| recibido_en | timestamptz | |
| raw | jsonb | payload de Postmark (sin adjuntos) |
| extraccion | jsonb | respuesta de Claude |
| estado | enum | `recibido` · `procesado` · `descartado` · `error` |
| error | text | |

## goals
| Campo | Tipo | Nota |
|---|---|---|
| nombre | text | "Auto nuevo" |
| icono | text | car, gamepad… |
| precio_total | integer | |
| meta_ahorro | integer | monto a ahorrar (pie; sin crédito = precio total) |
| fecha_inicio | date | desde cuándo cuenta el plan |
| aporte_mensual_plan | integer | |
| fecha_objetivo | date | opcional |
| usa_credito | boolean | |
| tasa_anual | numeric(5,2) | % |
| n_cuotas | smallint | |
| estado | enum | `activa` · `lograda` · `pausada` |

## contributions
| Campo | Tipo |
|---|---|
| goal_id | uuid → goals |
| monto | integer (negativo = retiro) |
| fecha | date |
| nota | text |

## Datos iniciales (seed)
| Grupo | Categoría | Proveedores de ejemplo (editables) |
|---|---|---|
| hogar | Luz | Enel |
| hogar | Agua | Aguas Andinas |
| hogar | Gas | Metrogas |
| hogar | Internet / teléfono | Movistar, Entel |
| hogar | Gastos comunes | Edificio |
| hogar | Arriendo o dividendo | — |
| personal | Suscripciones | Claude (USD), YouTube Premium, Spotify |
| personal | Otros | — |

Proveedores reales, montos y días de vencimiento se cargan en la primera pantalla de Ajustes (F1).

## Cálculos (en `lib/finanzas.ts`)
- **Total del mes por grupo** = Σ bills.monto del periodo, agrupado por categories.grupo
- **Costo mensual de suscripciones** = Σ mensuales + Σ anuales / 12
- **Ahorrado** = Σ contributions.monto
- **Progreso** = ahorrado / meta_ahorro
- **Meses restantes** = ⌈(meta_ahorro − ahorrado) / aporte_mensual_plan⌉
- **Cuota** (amortización francesa):
  `i = tasa_anual / 100 / 12`, `P = precio_total − pie`, `cuota = P · i / (1 − (1 + i)^−n)`; si `i = 0` → `P / n`
- **Total crédito** = cuota · n; **intereses** = total − P
