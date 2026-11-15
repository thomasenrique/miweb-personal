# 02 · Arquitectura

## Stack
| Pieza | Elección | Por qué |
|---|---|---|
| Web | Next.js (App Router, TypeScript) | Front + API en un solo proyecto |
| Estilos | Tailwind CSS leyendo `design-system/tokens.css` | Ligero, tokens propios |
| Base de datos | Supabase (Postgres + Auth + Storage) | Gratis, auth por magic link, guarda PDFs |
| Hosting | Vercel (plan Hobby) | Gratis, deploy desde git |
| Correo entrante | Postmark Inbound | Dirección gratis `xxx@inbound.postmarkapp.com`, entrega JSON por webhook (100 correos/mes gratis) |
| Extracción | Claude API — `claude-haiku-5-5` | Lee texto y PDF, salida estructurada con tool use |
| Gráficos | Componentes SVG propios (o Chart.js si hace falta) | Pocas dependencias |

## Flujo del correo
```
Gmail (yo) ──reenvío──▶ xxx@inbound.postmarkapp.com
                                │ POST JSON (asunto, texto, html, adjuntos base64)
                                ▼
   https://<app>.vercel.app/api/inbound?token=<SECRETO>
      1. Verificar token y remitente ∈ ALLOWED_SENDERS
      2. Si message_id ya existe → 200 y fin (idempotente)
      3. Guardar inbound_emails (raw) + PDF en Supabase Storage
      4. Llamar a Claude con texto + PDF → tool "registrar_cuenta"
      5. Buscar proveedor (por nombre/RUT) o crear uno nuevo
      6. Insertar bill: estado "pagado" si confianza ≥ 0,8 y campos completos; si no, "revisar"
      7. Responder 200 (Postmark reintenta si hay error)
```
Tip: crear un filtro en Gmail que reenvíe automáticamente los correos de proveedores conocidos → cero clicks.

### Tool de extracción (borrador)
```json
{
  "name": "registrar_cuenta",
  "input_schema": {
    "type": "object",
    "properties": {
      "es_comprobante": {"type": "boolean"},
      "proveedor": {"type": "string"},
      "categoria": {"enum": ["luz","agua","gas","internet","telefono","gastos_comunes","arriendo_dividendo","suscripcion","otro"]},
      "grupo": {"enum": ["hogar","personal"]},
      "moneda": {"enum": ["CLP","USD"]},
      "monto": {"type": "number", "description": "En la moneda original"},
      "fecha_pago": {"type": "string", "format": "date"},
      "periodo": {"type": "string", "description": "YYYY-MM"},
      "numero_cliente": {"type": "string"},
      "confianza": {"type": "number"}
    },
    "required": ["es_comprobante","proveedor","grupo","moneda","monto","fecha_pago","confianza"]
  }
}
```

### Cobros en dólares
Si `moneda = USD`, el servidor consulta el dólar observado del día en `https://mindicador.cl/api/dolar/<dd-mm-yyyy>` (gratis, sin clave) y guarda `monto_clp = round(monto · dolar)`. Si la API falla, la cuenta queda "por revisar" con el monto USD.

## Seguridad
- Webhook protegido con token secreto largo en la URL + validación del remitente original (en reenvíos, revisar `From` y cabeceras).
- Row Level Security en todas las tablas: solo mi `user_id`.
- Claves (`ANTHROPIC_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `INBOUND_TOKEN`) solo en variables de entorno de Vercel, nunca en el repo.
- Los PDFs se guardan en bucket privado.
- El contenido del correo se trata como dato: el prompt de extracción no ejecuta instrucciones del correo.

## Variables de entorno
`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `ANTHROPIC_API_KEY`, `INBOUND_TOKEN`, `ALLOWED_SENDERS`.

## Costos estimados / mes
| Servicio | Costo |
|---|---|
| Vercel Hobby | $0 |
| Supabase Free | $0 (se pausa tras 7 días sin uso; la uso seguido) |
| Postmark Inbound | $0 hasta 100 correos |
| Claude Haiku | ~ US$0,01–0,05 (≈ 15 comprobantes) |

## Estructura de carpetas (futura)
```
app/            rutas: (inicio) cuentas/ metas/ ajustes/ api/inbound/
components/ui/  componentes del sistema de diseño
lib/            supabase, claude, formato CLP, finanzas (cuota)
design-system/  tokens.css, components.css  ← compartible con otros proyectos
docs/  mockups/
```
