# Corrección del flujo comercial — 28/10/2026

## Alcance

Seis módulos de flujo comercial: Cotizaciones, Pedidos, Ventas, Comprobantes, Cobros y Postventa/Devoluciones. Se preservaron las páginas de los compañeros. La clave `enterprisecloud_erp_v2` y `State.version: 2` siguen intactas. No hay migración ni borrado de datos antiguos.

## Errores concretos atendidos

1. Detalles de una cotización aparecían superpuestos/desplazados respecto al viewport. `RecordDetails` ahora utiliza un portal a `document.body`, bloqueo de scroll y cierre con Escape.
2. Venta antigua sin serie/correlativo mostraba `undefined`. Ahora se representa como `Pendiente de emisión`; no se intenta generar PDF sin comprobante.
3. Comprobantes duplicaba sin distinción la tabla de ventas. Ahora tiene cola de emisión, formulario para boleta/factura, correlativo monotónico por serie y PDF solo de documentos emitidos.
4. Venta nueva se facturaba automáticamente y permitía ir directamente al pago. Ahora la interfaz registra la venta y descontará inventario, pero deja el comprobante pendiente de emisión hasta la confirmación del operador; cobrar exige documento emitido.
5. La guía anterior era solo una barra navegable sin estados. Ahora muestra operaciones pendientes de cada etapa; las acciones reales deben ejecutarse desde el documento correspondiente.
6. Postventa no mostraba el efecto financiero de la devolución. Se añadió vista previa de unidades disponibles, importe calculado, saldo y posible reembolso pendiente de atención manual.
7. El formulario de cotizaciones y el pedido directo estaban siempre expuestos sobre los historiales. Ahora se abren voluntariamente, dejando la cola de trabajo como pantalla principal.
8. El selector decía «Buscar buscar producto». Se corrigió la etiqueta.
9. Desde Ventas hay una conexión contextual a Postventa. La emisión enlaza Cobros con el ID exacto.

## Reglas del núcleo

- `createSalePending` crea la venta sin numeración fiscal, conserva la validación del pedido y descuenta existencias.
- `issueVoucher` comprueba venta vigente, ausencia de comprobante, tipo de documento y requisitos de DNI/RUC; calcula el siguiente número usando el máximo histórico, incluidos comprobantes de ventas anuladas.
- `hasVoucher` distingue comprobantes válidos existentes de ventas antiguas con propiedades incompletas.
- `recordPayment` rechaza un cobro nuevo si la venta no tiene comprobante emitido. Los pagos históricos guardados permanecen sin cambios.
- `createSale` mantiene su interfaz y comportamiento anterior por compatibilidad con pruebas y datos antiguos; la interfaz nueva utiliza `createSalePending`.

## Cómo ejecutar en Windows / VS Code

Desde la carpeta que contiene `package.json`:

```bash
npm install
npm test
npm run build
npm run dev
```

El resultado esperado es que Vitest termine sin fallos y que el build concluya con `vite build`. Abrir la URL local indicada por Vite (habitualmente localhost:5173).

**Verificación realizada en el entorno de edición**: 62 archivos TS/TSX revisados sintácticamente; `tsc` del núcleo (`types.ts`, `operations.ts` y `seed.ts`) sin errores; 24 pruebas aisladas por evaluador compatible (13 de operations, 5 de vouchers y 6 de selección por lotes) sin fallos. Esto **NO es** una ejecución real de Vitest y NO es un build completo del navegador.

## Pruebas manuales que debes realizar antes de exponer

1. Entrar a Cotizaciones > «Ver detalle» de una fila de la página 2: la ventana debe abrir centrada y sin solaparse con la tabla; cerrar con Escape.
2. Ver una venta antigua cuyo comprobante antes decía `undefined`: ahora debe decir «Pendiente de emisión». Abrir Comprobantes y elegir esa venta.
3. Crear cotización con varios productos y cambiar cantidades/porcentaje; guardarla. Aprobarla y pulsar «Crear pedido»; verificar que cliente, líneas y total coinciden.
4. En el pedido seguir «Confirmar» y «Iniciar preparación». Solo entonces pulsar «Registrar venta». Verificar que el inventario baja al registrar venta.
5. La pantalla de Comprobantes debe mostrar la venta recién creada «Pendiente de emisión». Emitir boleta o factura de demostración, verificar serie, número y PDF.
6. Desde esa venta pulsar «Cobrar», registrar un pago parcial, comprobar saldo restante. Intentar cobrar más del saldo: debe bloquearse.
7. Desde Venta pulsar «Postventa», seleccionar un producto, introducir una unidad y verificar el importe y posible reembolso. Confirmar y revisar stock + movimientos.
8. Cambiar a rol de ventas/almacén/finanzas: verificar que los permisos siguen respetándose.
9. Revisar consola de Chrome (F12) en cada pantalla. Cualquier error real o aviso de React pendiente debe solucionarse antes de la presentación.

## Limitaciones conscientes

- Comprobantes, pagos y devoluciones son simulados, sin integración real con SUNAT ni entidades bancarias.
- No se efectúan reembolsos monetarios automáticamente. La pantalla avisa si un reembolso puede estar pendiente.
- Este archivo no certifica aún la compilación completa de Vite ni las pruebas visuales, que requieren instalar dependencias en tu computadora.
- No usar «Restablecer datos» si quieres conservar las operaciones guardadas en el navegador.

---

## Segunda revisión (28/10/2026) — lógica ERP del flujo comercial

Flujo objetivo: **Cotización → Pedido → Venta (sale stock) → Comprobante → Cobro → Postventa (nota de crédito → reembolso)**. Cada etapa solo avanza desde la anterior y deja un documento enlazado.

### Errores corregidos

| # | Problema | Corrección |
|---|----------|-----------|
| 1 | Si se anulaba una venta que venía de un pedido, el pedido volvía a «confirmado» pero **ya no se podía vender de nuevo** («ya tiene una venta vinculada»): la validación contaba también ventas anuladas. | `createSale` solo considera ventas **vigentes** (prueba de regresión). |
| 2 | Se podía devolver mercadería de una venta **sin comprobante**; después el comprobante salía por el total original, sin reflejar la devolución. | `returnItem` exige comprobante emitido. La pantalla Postventa solo lista ventas con comprobante y explica qué hacer si falta. |
| 3 | Una devolución sobre un comprobante no generaba **nota de crédito** (documento obligatorio en un ERP peruano). | Cada devolución genera `BC01-########` (boleta) o `FC01-########` (factura), correlativa y visible en el historial. |
| 4 | El «reembolso pendiente» solo se avisaba en pantalla y **no había forma de saldarlo**. | Nuevo `refundCustomer` y panel «Reembolsos pendientes»: registra un egreso de caja vinculado a la venta. `totals().profit` no lo cuenta dos veces. |
| 5 | El PDF mostraba la fecha de la **venta** como fecha de emisión. | `Sale.fechaEmision` (opcional, compatible con datos antiguos); el PDF usa `fechaEmision \|\| date`. |
| 6 | `issueVoucher` aceptaba un DNI/RUC con formato inválido cuando el tipo de documento no era obligatorio. | Valida el formato según el tipo declarado (DNI 8 dígitos, RUC 11) y exige número si el tipo no es «Sin documento». |
| 7 | El almacén de salida se inicializaba fijo en `ALM-01`, aunque estuviera inactivo (el desplegable mostraba otro). | Se inicializa con el primer almacén activo. |
| 8 | Anular una venta con comprobante no advertía que el número queda anulado. | El mensaje de confirmación lo indica. |
| 9 | Abrir `/comprobantes?sale=X` con una venta ya emitida no mostraba nada. | Aviso con el número y acceso directo al cobro. |
| 10 | «Pedidos» y «Órdenes de compra» usaban el mismo icono de carrito (mezcla venta/compra). | Pedidos usa `PackageCheck`. |
| 11 | `ARQUITECTURA.md`, `INTEGRACION_COMPANEROS.md` y `VERIFICACION.md` tenían **marcadores de conflicto de Git** sin resolver. | Resueltos conservando la versión vigente. |

### Verificación realizada

- 24 pruebas de negocio (13 de `operations.test.ts`, 5 de `commerce-vouchers.test.ts`, 6 nuevas en `commerce-flow.test.ts`) ejecutadas con `tsx` y un adaptador mínimo de `vitest`: **24/24 correctas**. La prueba de re-venta falla si se revierte la corrección #1.
- `tsc --strict` del núcleo (`types.ts`, `operations.ts`, `seed.ts`): sin errores.
- Sintaxis de los 64 archivos TS/TSX comprobada con esbuild: sin errores.
- **No ejecutado** (el entorno no tiene acceso a npm): Vitest real, `npm run build` y pruebas en navegador. Hazlos localmente (`npm install`, `npm test`, `npm run build`) y repite el recorrido manual de arriba, añadiendo:
  10. Registrar venta → emitir comprobante → cobrar → devolver 1 unidad: debe aparecer la nota de crédito y, si la venta estaba pagada, el panel de reembolsos.
  11. Anular una venta creada desde un pedido y volver a venderla desde Pedidos.

### Pendientes recomendados (no aplicados: cambian el alcance o requieren decisión del equipo)

- **Vigencia de cotizaciones** (fecha de validez y estado «vencida»).
- **Reserva de stock** al confirmar un pedido (hoy el stock solo baja al vender).
- **Permisos por rol**: el rol Finanzas no puede ver Cobros; en un ERP tesorería suele registrar cobros y quien vende no debería cobrar (segregación de funciones).
- Cancelar un pedido deja la cotización en «convertida»; podría liberarse para re-cotizar.
- `comprobanteEmitido` y `hasVoucher()` son dos fuentes de verdad; unificar cuando se migre el estado.
- Condición de pago (contado/crédito) y fecha de vencimiento para que Cuentas por cobrar tenga antigüedad real.
