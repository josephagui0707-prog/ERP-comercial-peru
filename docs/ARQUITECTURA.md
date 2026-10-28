# Arquitectura del prototipo y puntos de integración

```text
src/
  App.tsx                        Enrutador visual y carga diferida
  layout/navigation.ts            Registro único de menús
  layout/Sidebar.tsx              Sidebar, scroll propio, búsqueda
  core/permissions.ts             Visibilidad por rol (solo navegador)
  core/types.ts                   Entidades y tipos de negocio
  core/seed.ts                    Datos deterministas ficticios
  core/operations.ts              Reglas de negocio puras
  core/store.tsx                  Estado de negocio, sesión y estado de demo admin
  core/export.ts                  Reportes y comprobantes PDF/XLSX
  features/administration/
    model.ts                      Contratos de configuración/eventos/cloud
    storage.ts                    Persistencia validada del estado administrativo
  pages/Administration.tsx        Paneles administrativos de demo
  pages/Extensions.tsx            Integraciones opcionales y bases de compras
  pages/Commerce.tsx              Funcionalidad comercial actual
  pages/Inventory.tsx             Inventarios actuales
  pages/Finance.tsx               Finanzas actuales
  pages/Reports.tsx               Informes actuales
  components/ui.tsx               UI reutilizable existente
  styles.css                      Estilos compartidos originales
  styles/administration.css       Estilos añadidos de interfaz/administración
```

Los modelos empresariales conservan `version:2` y la clave `enterprisecloud_erp_v2`: los registros guardados en la versión anterior continúan disponibles. Los ajustes, servicios conceptuales y eventos de administración usan claves distintas; no modifican el tipo `State`.

## Contratos de negocio (sin cambios)

- `createSale(state, clientId, items, warehouseId, orderId?)`: registra venta y movimientos de inventario.
- `createSalePending(state, clientId, items, warehouseId, orderId?)`: venta sin numeración fiscal; descuenta stock. El comprobante se emite aparte.
- `issueVoucher(state, saleId, input)`: asigna serie y correlativo (boleta/factura) una sola vez y registra `fechaEmision`.
- `createOrder(state, clientId, items, quoteId?)`: no modifica existencias.
- `recordPayment(state, saleId, amount, method, result)`: reduce cuentas por cobrar únicamente cuando es `aprobado`.
- `returnItem(state, saleId, productId, qty, reason)`: exige comprobante emitido, valida cantidades, reintegra existencias y genera la nota de crédito (`BC01-…` / `FC01-…`).
- `refundCustomer(state, saleId, amount, method)`: reembolsa dinero al cliente como egreso de caja (`source: reembolso:<venta>`); el pendiente se calcula con `refundPendingOn`.
- `transfer(state, productId, from, to, qty)`: conservación del saldo total de inventario.
- `adjustStock(state, productId, warehouseId, target, reason)`: registra el saldo físico y movimiento.
- `totals(state)` / `dueOn(state, sale)`: origen de los indicadores financieros.

Los cambios de negocio pasan por `update(prev => businessOperation(prev, ...))`; se utilizan copias de estado de las operaciones puras. La validación de React **no** equivale a autorización ni transacciones seguras.

## Extensión empresarial a futuro

La solución productiva necesita API, base de datos con transacciones, inicio de sesión y autorización en servidor, auditores remotos y control de concurrencia. Una pasarela real debe verificar resultados mediante webhook firmado, referencia idempotente y secretos solo del servidor. El simulador de cobros actual permite seleccionar resultados manualmente para pruebas y nunca mueve dinero.
