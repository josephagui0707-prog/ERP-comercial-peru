# Ajustes V3 · Dashboard, cotizaciones y modal de detalle

## Cambios principales

1. **Dashboard ejecutivo reforzado**
   - Nuevas tarjetas de resumen operativo.
   - Vista del flujo comercial.
   - Indicadores de cobranza y liquidez.
   - Alertas de inventario.
   - Ranking de clientes por facturación.
   - Actividad reciente del sistema.

2. **Cotizaciones / pedidos / ventas**
   - Corrección del alineado visual del campo **Cantidad**.
   - Botón **+ Añadir línea** alineado al flujo del formulario.
   - Resumen lateral más consistente con los datos seleccionados.

3. **Mini modal de detalle**
   - Reemplazado por una implementación más estable para despliegue en Render como sitio estático.
   - Se agrega encabezado más descriptivo y mensaje cuando no hay líneas de producto.

4. **Tablas comerciales**
   - Corrección de encabezados en cotizaciones.
   - Corrección de columna de acciones en cobros / pagos.

## Recomendación
Ejecutar `npm install`, `npm run dev` y luego probar manualmente:
- Ver detalle en cotizaciones, pedidos, ventas, cobros y devoluciones.
- Registro de nuevas líneas en cotizaciones / ventas.
- Navegación del dashboard y enlaces rápidos.
