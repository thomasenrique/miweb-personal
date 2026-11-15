# 01 · Requisitos

Usuario único: yo. Todas las pantallas funcionan en móvil (desde 360px) y desktop.

## A. Cuentas y gastos fijos

Registro **todo** lo que pago de forma recurrente, separado en dos grupos:

| Grupo | Categorías iniciales |
|---|---|
| **Hogar** | Luz, Agua, Gas, Internet / teléfono, Gastos comunes, Arriendo o dividendo |
| **Personal** | Suscripciones (Claude, YouTube Premium, Spotify, Netflix…), otros personales |

Cada proveedor pertenece a una categoría y cada categoría a un grupo. Puedo crear categorías y proveedores nuevos.

### A1. Registro automático por correo
**Como** dueño de casa, **quiero** reenviar el comprobante de pago a una dirección fija **para** que la cuenta quede registrada sin escribir nada.

Criterios:
- Reenvío un correo (con o sin PDF adjunto) a la dirección inbound → en menos de 1 minuto aparece en la web.
- Se extrae: proveedor, categoría, grupo (hogar/personal), monto y moneda (CLP o USD), fecha de pago, periodo (mes que cubre), n° de cliente/boleta si existe.
- Funciona igual para boletas de servicios y recibos de suscripciones (Claude, Spotify, YouTube…).
- Si falta un dato o la IA tiene confianza baja → la cuenta queda **"por revisar"** y la corrijo con un toque.
- Si reenvío el mismo correo dos veces, no se duplica.
- Correos de remitentes que no sean yo se descartan.
- Siempre puedo ver el correo original que originó la cuenta.

### A2. Registro manual
- Agregar, editar y eliminar una cuenta a mano (proveedor, monto, fecha, estado).
- Formulario en 1 pantalla, montos con formato `$42.100` mientras escribo.

### A3. Resumen mensual
- Total pagado del mes actual y comparación con el mes anterior.
- Filtro **Todo · Hogar · Personal**; el total muestra el desglose Hogar vs Personal.
- Total por categoría dentro de cada grupo.
- Gráfico de barras simple de los últimos 6 meses.
- Navegar entre meses.

### A4. Vencimientos (in-app)
- Cada proveedor tiene un día de vencimiento y monto estimado.
- Al abrir la web veo: cuentas pendientes del mes y cuántos días faltan.
- Una cuenta pasa a "pagada" cuando llega el comprobante o la marco a mano.
- Vencidas se destacan en ámbar/rojo.

### A5. Suscripciones
- Proveedor con frecuencia **mensual** o **anual** y día de cobro (ej. Spotify día 3, Claude día 12).
- Cobros en dólares (ej. Claude): se guarda el monto original en USD y su equivalente en CLP con el dólar del día del cobro. Puedo corregir el CLP con lo que salió en la tarjeta.
- Vista "Suscripciones": lista con costo mensual equivalente y total anual, para ver cuánto gasto en total.
- Las suscripciones anuales se muestran prorrateadas por mes en los totales (opción, por defecto apagado).

## B. Metas de ahorro (genérico)

### B1. Crear meta
- Nombre, icono, precio total, cuánto ahorrar como pie (monto o %), aporte mensual planeado, fecha objetivo opcional.
- Opcional: parte financiada con crédito (activa el simulador B4).
- Primer caso: **Auto nuevo**. Segundo: **Nintendo Switch** (sin crédito).

### B2. Aportes
- Registrar aporte: monto, fecha, nota. Editar/eliminar.
- Ver historial de aportes por meta.

### B3. Avance y proyección
- Barra de progreso: ahorrado / meta de pie.
- Fecha estimada para llegar, según aporte mensual planeado (y promedio real como referencia).
- Gráfico plan vs real en el tiempo.

### B4. Simulador de crédito
- Entradas: precio, pie (por defecto = meta de pie), tasa anual %, n° de cuotas.
- Salidas: monto financiado, cuota mensual, total pagado, total intereses.
- Fórmula: amortización francesa (ver docs/03).
- Caso de prueba: financiar $8.000.000 al 14,5% anual en 36 cuotas → cuota ≈ **$275.368**.
- Todo en pesos (CLP); sin UF.
- Puedo guardar el escenario en la meta.

## C. General
- Login con magic link a mi correo; sesión larga.
- Modo claro y oscuro automático.
- Carga rápida: páginas < 100 KB de JS en lo posible.
- Nav: barra inferior en móvil, lateral en desktop. Secciones: Inicio · Cuentas · Metas · Ajustes.

## Fuera del MVP
Notificaciones push/correo, multiusuario, conexión directa a bancos, presupuesto general, inversiones.

## D. Deudas (tarjetas y créditos)

### D1. Tarjetas de crédito
- Varias tarjetas: nombre, últimos 4 dígitos (nunca el número completo), cupo total, día de facturación y día de pago.
- Cupo usado = capital pendiente de sus compras en cuotas; disponible = cupo − usado.

### D2. Compras en cuotas
- Tarjeta, descripción, fecha, grupo Hogar/Personal, monto total, n° de cuotas (1 o más) y **valor cuota que informa el banco**. Sin valor cuota = sin interés (total / n).
- Interés total = valor cuota × n − monto total.
- Primera cuota según facturación: compra hasta el día de facturación entra en ese estado de cuenta; si el día de pago es menor o igual al de facturación, se paga al mes siguiente. Se puede cambiar el mes a mano.

### D3. Otros créditos
- Créditos de consumo, préstamos, crédito automotriz: institución, monto, n° de cuotas, valor cuota, mes de la primera cuota y día de pago.

### D4. Pagos y vistas
- Las cuotas se dan por pagadas solas cuando pasa su fecha de pago. Una deuda se puede marcar "saldada" (prepago).
- Resumen: deuda total restante, a pagar este mes, proyección de los próximos 6 meses, filtro Todo · Hogar · Personal.
- Detalle de cada deuda con su calendario de cuotas.
