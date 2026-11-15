# 05 · Roadmap

Cada fase termina con algo usable en el celular.

## F0 · Planificación ✅ (esta etapa)
Docs, sistema de diseño (tokens + componentes CSS), mockups HTML.
Salida: revisión de mockups y respuestas a preguntas abiertas.

## F1 · Base + cuentas manuales 🟡 (código listo; falta conectar Supabase y deploy)
- Proyecto Next.js + Tailwind conectado a `tokens.css`.
- Supabase: tablas, RLS, login magic link.
- Componentes UI: botón, tarjeta, fila, pill, métrica, input, nav.
- Cuentas: CRUD manual, proveedores con día de vencimiento, resumen mensual, pendientes.
- Grupos Hogar / Personal y vista de suscripciones (mensual/anual, USD → CLP).
- Deploy en Vercel.

## F2 · Registro por correo
- Cuenta Postmark + dirección inbound + webhook `/api/inbound`.
- Extracción con Claude (tool `registrar_cuenta`), guardado de PDF.
- Bandeja "por revisar" y vista del correo original.
- Filtros de Gmail para reenvío automático.
- Prueba con 5 comprobantes reales (uno por proveedor).

## F3 · Metas de ahorro
- CRUD metas y aportes.
- Barra de progreso, fecha estimada, gráfico plan vs real.
- Simulador de crédito guardable en la meta.
- Cargar meta "Auto nuevo" y "Nintendo Switch".

## F4 · Pulido
- PWA instalable (icono en el celular).
- Gráfico por categoría y comparación entre meses.
- Exportar CSV.
- Empaquetar `design-system/` para reutilizar en otros proyectos.

## Ideas futuras
Notificaciones push, presupuesto mensual, otros módulos de vida (salud, tareas, viajes).
