# Datos maestros e importación XLSX

## Empezar

1. Extrae todo el ZIP y ejecuta `INICIAR_ERP.bat`, o usa `npm ci` y `npm run dev`.
2. Ingresa como administrador: `admin@enterprisecloud.demo` / `Admin123!`.
3. Abre **Mantenimiento → Datos maestros**. Los cinco catálogos están en tarjetas; Mantenimiento no es un acordeón.
4. Descarga el XLSX desde esa pantalla, o utiliza `public/plantillas/ERP_Datos_Importacion.xlsx`.
5. Selecciona **Importar datos XLSX**, revisa cada hoja y confirma. Hasta la confirmación no se escribe ningún registro.

Una instalación sin datos locales empieza vacía, conservando las cuentas de acceso. Los datos ya guardados en un navegador se respetan. Para empezar de cero, el administrador puede usar **Configuración → Vaciar registros**, que solicita confirmación. Esta acción elimina catálogos y operaciones; conserva cuentas y configuración. Mantén la misma dirección y puerto al abrir el sistema: localStorage pertenece al origen del navegador.

## Archivo preparado

Contiene 622 filas en 13 hojas de datos, más Instrucciones:

| Hoja | Filas | Resultado |
| --- | ---: | --- |
| Categorias | 8 | Categorías de productos |
| Proveedores | 12 | Proveedores ficticios |
| Almacenes | 4 | Ubicaciones de inventario |
| Clientes | 60 | Clientes ficticios |
| Productos | 64 | Productos con precio, costo y proveedor |
| StockInicial | 256 | Aperturas por producto y almacén |
| Compras | 24 | Borradores, ordenadas, recibidas y pagadas |
| Cotizaciones | 24 | Borradores y aprobadas |
| Pedidos | 24 | Pendientes, confirmados y preparando |
| Ventas | 96 | 48 ventas con dos productos cada una |
| Cobros | 32 | Pagos totales y parciales |
| Devoluciones | 6 | Reposición de stock y notas de crédito demo |
| Caja | 12 | Ingresos y egresos adicionales |

Todos los datos son ficticios, sin validez tributaria. Cotizaciones, pedidos y ventas del archivo son documentos independientes. Las ventas generan comprobantes y salidas de stock; compras recibidas generan entradas y cuentas por pagar; pagos de compras generan egresos. Las devoluciones no reembolsan efectivo automáticamente: se usa el flujo habitual de postventa. No se inventan adjuntos, transferencias, usuarios ni integraciones externas.

## Editar el archivo

- No cambies los nombres de hojas ni encabezados. Se permiten archivos parciales con solo las hojas necesarias.
- Conserva IDs, SKU, RUC, DNI y teléfonos como texto. Las referencias deben coincidir exactamente con el ID destino.
- Para documentos con varias líneas, repite su ID y los mismos valores de cliente/proveedor, almacén, fecha, estado y tipo; un producto por línea.
- Importes numéricos en soles y cantidades enteras. Fechas de Excel o texto `AAAA-MM-DD`, no futuras. Pega valores, no fórmulas.
- Revisa Instrucciones para los estados permitidos. Los documentos de compras recibidas son únicos por proveedor.
- La carga agrega registros y no actualiza los existentes. Reimportar el mismo archivo se bloquea por duplicados. Para completar información, usa los CRUDs.
- Stock inicial solo se admite una vez por producto/almacén sin historial. Para existencias ya operativas usa entradas o ajustes.
- Límite: 5 MB y 10 000 filas por archivo. Importación masiva disponible para administrador.

## Garantías y comprobación

La vista previa valida el archivo sin guardar; la confirmación vuelve a validar contra el estado actual. Si falla una fila, no se guarda ninguna. Si localStorage está lleno o bloqueado, se muestra el error y se conserva el estado anterior. Una escritura guarda todos los registros y sus movimientos, con auditoría de carga.

`npm test` comprueba el XLSX entregado, relaciones, stock y movimientos conciliados, totales e IGV, duplicados, referencias inválidas, importes/cantidades inválidos, cobros excesivos, devoluciones excesivas, fechas inválidas, fórmulas y cargas parciales. `npm run build` comprueba TypeScript y el paquete de producción.

Verificación en navegador: inicio vacío, vista previa, importación de 622 filas, persistencia tras recargar, bloqueo de duplicados, fallo simulado de cuota sin escritura parcial, navegación por los cinco CRUDs y módulos operativos, temas claro/oscuro y ancho móvil de 390 px. Sin errores de ejecución de la aplicación.
