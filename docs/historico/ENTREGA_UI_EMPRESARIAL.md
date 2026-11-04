# Entrega de interfaz ERP Comercial Perú · octubre de 2026

## Objetivo y alcance

Se integró una presentación sobria en azul acero y celeste desaturado, respetando las operaciones de negocio existentes (no se modificaron `src/core/operations.ts`, tipos, semillas, permisos ni claves de almacenamiento).

## Navegación

- **Inicio:** Dashboard ejecutivo.
- **Ciclo comercial:** 01 Cotizaciones → 02 Pedidos → 03 Ventas → 04 Comprobantes → 05 Cobros → Postventa.
- **Compras:** Órdenes y documentos (aún simulados).
- **Control de inventario:** Existencias, movimientos, transferencias, ajustes, Kardex y documentos.
- **Finanzas y reportes:** Resumen, cuentas por cobrar/pagar, caja, bancos, ingresos, egresos e informes.
- **Mantenimiento:** Clientes, Productos, Categorías, Proveedores y Almacenes.
- **Sistema:** Integraciones, infraestructura simulada, auditoría, configuración y cuenta.

Las secciones son plegables, la ruta actual se expande automáticamente y la búsqueda Ctrl+K sigue disponible. El bloque de espacio de demostración del sidebar se eliminó para simplificar la primera vista.

## Selección y paginación

- `RecordPicker.tsx`: tabla modal con búsqueda por código, nombre, documento y atributos; páginas de 10, 20 y 50 filas. Se muestra ficha compacta al seleccionar. Se usa para clientes, productos, almacenes, ventas, ítems de devolución, terceros, categorías, proveedores y referencias.
- `PaginatedTable.tsx`: paginación común de tablas ya existentes en Comercial, Finanzas, Proveedores, Compras, Auditoría y Reportes.
- En Inventario se mantiene `DataTable` que ya disponía de búsqueda, orden y paginación.
- Listas pequeñas (estados, segmento, tipo de movimiento) conservan `select`.
- Búsqueda y paginación son **en cliente**: muestran pocas filas DOM, pero todavía requieren leer los registros locales. Un sistema real de gran volumen precisará un backend paginado.

## Flujo operativo

En cada pestaña comercial aparece una guía con pasos, enlaces a la siguiente sección y explicación de la operación. Los botones existentes de *Aprobar cotización*, *Convertir a pedido* y *Facturar como venta* se preservan. El enlace siguiente no sustituye estas conversiones, que requieren seleccionar un registro y confirmar la acción correspondiente.

## Mantenimiento de proveedores

`SupplierMaintenance.tsx` permite registrar, editar y eliminar proveedores, validando RUC de 11 dígitos, sin permitir duplicados y protegiendo entidades referenciadas por productos u órdenes de compra. Guarda la información en el mismo almacenamiento local existente.

## Diseño

`styles/enterprise-theme.css` es la última hoja de estilo global importada desde `main.tsx`. Define tokens para ambos temas, normaliza colores antes morados en inventario, modales, tablas, tarjetas, navegación y botones. Se conservan semánticas de advertencias/errores y logos de proveedores de pago.

## Compatibilidad y límites

- Se mantienen rutas, tipos públicos, `localStorage` y reglas comerciales existentes.
- No se implementó backend, emisión SUNAT ni conexiones bancarias reales.
- Al comenzar desde un ZIP descargado, ejecuta `npm install`, `npm run dev`, `npm run build`, `npm test`.
- **Verificación en el entorno de edición:** comprobación de sintaxis de todos los `.ts`/`.tsx` y revisión de rutas/archivos. No fue posible instalar las dependencias ni ejecutar Vite/Vitest porque este entorno no resolvía `registry.npmjs.org`. Se recomienda ejecutar esos dos comandos de validación en el equipo con conexión antes de desplegar.
