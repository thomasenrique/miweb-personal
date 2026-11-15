# 04 · Sistema de diseño — "Hogar UI" (nombre provisorio)

Sistema propio para todos mis proyectos personales. Sensación: **cálido, amable, tranquilo**. Como una libreta bonita, no como un banco.

Archivos: [`design-system/tokens.css`](../design-system/tokens.css) (variables) y [`design-system/components.css`](../design-system/components.css) (componentes en CSS puro). Vitrina: [`mockups/componentes.html`](../mockups/componentes.html).

## Principios
1. **Ligero** — CSS puro + variables; sin librería de UI. Cualquier proyecto lo usa con 2 `<link>`.
2. **Calma** — fondo crema, un solo color de acento, mucho aire. El color fuerte se reserva para la acción principal y lo importante.
3. **Números primero** — montos grandes, legibles, con cifras tabulares.
4. **Pulgar primero** — objetivos táctiles ≥ 44px, nav inferior en móvil.
5. **Claro y oscuro** — todo color sale de un token que cambia solo.

## Color
| Token | Claro | Oscuro | Uso |
|---|---|---|---|
| `--h-bg` | #FBF7F2 crema | #1E1915 | Fondo de página |
| `--h-surface` | #FFFFFF | #29221D | Tarjetas |
| `--h-surface-2` | #F4EEE6 arena | #332A24 | Fondos suaves, iconos |
| `--h-text` | #2E2620 | #F4ECE4 | Texto principal |
| `--h-text-2` | #6F6359 | #C2B4A7 | Texto secundario |
| `--h-accent` | #D2603A terracota | #EE8A63 | Acción principal, progreso |
| `--h-ok` | #3E8E5E | #7CC79A | Pagado / logrado |
| `--h-warn` | #C98A1B | #E9B54F | Pendiente / por vencer |
| `--h-bad` | #C2453D | #EE8079 | Vencido / error |
| `--h-cat-1…6` | 6 tonos | — | Categorías en gráficos |

Regla: texto sobre fondo suave usa la variante `-text` del mismo color (`--h-ok-soft` + `--h-ok-text`).

## Tipografía
- Familia: **Nunito** (sans redondeada, Google Fonts), respaldo `system-ui`.
- Dos pesos: 400 y 700.
- Escala: 12 · 14 · 16 · 20 · 28 · 36 px. Montos destacados en 36px bold.

## Espacio, forma, profundidad
- Espacios base 4: 4 · 8 · 12 · 16 · 24 · 32 · 48.
- Radios: 8 (chico) · 12 (inputs, iconos) · 16 (tarjetas) · pill (botones, etiquetas).
- Una sola sombra muy suave para tarjetas. Sin degradados.
- Animación: 160ms, solo para hover/press y transiciones de estado.

## Componentes base
| Clase | Componente |
|---|---|
| `.h-card` (`--soft`, `--accent`) | Tarjeta |
| `.h-metric__label / __value` | Métrica (monto grande) |
| `.h-btn` (`--primary`, `--ghost`) | Botón. **Un solo primario por pantalla** |
| `.h-field` + `.h-input` | Campo de formulario |
| `.h-list` | Lista con filas separadas por línea |
| `.h-ico` | Icono en burbuja |
| `.h-pill--ok/warn/bad/accent` | Etiqueta de estado |
| `.h-seg` | Selector segmentado (Todo · Hogar · Personal) |
| `.h-alert` | Aviso (vencimientos) |
| `.h-progress` | Barra de progreso |
| `.h-bars` | Mini gráfico de barras |
| `.h-nav` | Navegación (inferior móvil / lateral ≥ 900px) |
| `.h-page`, `.h-grid`, `.h-row`, `.h-stack` | Layout |

Iconos: en mockups se usan emoji como marcador; en la app se usará un set de iconos de línea (ej. Lucide) con trazo 1.75.

## Voz y textos (español de Chile, cercano)
- Tú, no usted. Frases cortas.
- Botones con verbo: "Agregar cuenta", "Guardar aporte", "Simular crédito".
- Montos: `$42.100` (punto de miles, sin decimales). Fechas: `18 nov`, `ago 2027`.
- Estados: "Pagado", "Pendiente", "Vence en 3 días", "Vencido", "Por revisar".
- Vacíos invitan: "Reenvía tu primer comprobante a …" en vez de "No hay datos".
- Sin signos de exclamación en mensajes del sistema.

## Uso en otro proyecto
```html
<link rel="stylesheet" href="design-system/tokens.css">
<link rel="stylesheet" href="design-system/components.css">
```
En Next.js + Tailwind: mapear los tokens en `tailwind.config` (`colors.accent = 'var(--h-accent)'`, etc.).
