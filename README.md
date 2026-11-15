# Mi vida — web personal

Web personal para organizar la vida. Uso individual, desktop y móvil, interfaz ligera.

## MVP
1. **Cuentas y gastos fijos** — todo lo recurrente, separado en **Hogar** (luz, agua, gas, internet, gastos comunes, arriendo/dividendo) y **Personal** (suscripciones como Claude, YouTube Premium, Spotify). Se registran solas al reenviar el comprobante a una dirección de correo. También registro manual, totales por grupo y categoría, y aviso de vencimientos dentro de la web.
2. **Metas de ahorro** — genérico (auto, Nintendo Switch, etc.). Ahorro de pie con aportes manuales + simulador de crédito para la parte financiada.
3. **Sistema de diseño propio** — cálido y amable, reutilizable en todos los proyectos personales.

## Estado
- F0 planificación: lista.
- **F1 base + cuentas manuales: construida en [`web/`](web/README.md)**, probada en modo demo. Falta conectar Supabase y publicar en Vercel.

## Documentos
| Archivo | Contenido |
|---|---|
| [docs/01-requisitos.md](docs/01-requisitos.md) | Historias de usuario y criterios de aceptación |
| [docs/02-arquitectura.md](docs/02-arquitectura.md) | Stack, flujo de correo, seguridad, costos |
| [docs/03-modelo-datos.md](docs/03-modelo-datos.md) | Tablas y relaciones |
| [docs/04-sistema-diseno.md](docs/04-sistema-diseno.md) | Sistema de diseño: tokens, componentes, copy |
| [docs/05-roadmap.md](docs/05-roadmap.md) | Fases de construcción |
| [design-system/tokens.css](design-system/tokens.css) | Variables CSS (fuente única de verdad) |
| [design-system/components.css](design-system/components.css) | Componentes base en CSS puro |
| [mockups/](mockups/) | Mockups HTML estáticos |

## Decisiones clave
- Next.js + Tailwind (con nuestros tokens) + Supabase, deploy en Vercel. Costo ≈ $0.
- Correo: reenvío a dirección de Postmark Inbound → webhook → extracción con Claude API.
- Moneda CLP (crédito del auto también en CLP). Suscripciones en USD se guardan en USD y se convierten a CLP con el dólar del día. Un solo usuario.
- Nombres: la web se llama **Mi vida** y el sistema de diseño **Hogar UI**.

## Pendiente para F1
- Cargar proveedores reales con monto estimado y día de vencimiento/cobro (se hace desde Ajustes en la app).
