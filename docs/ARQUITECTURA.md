<<<<<<< HEAD
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
- `createOrder(state, clientId, items, quoteId?)`: no modifica existencias.
- `recordPayment(state, saleId, amount, method, result)`: reduce cuentas por cobrar únicamente cuando es `aprobado`.
- `returnItem(state, saleId, productId, qty, reason)`: valida cantidades y reintegra existencias.
- `transfer(state, productId, from, to, qty)`: conservación del saldo total de inventario.
- `adjustStock(state, productId, warehouseId, target, reason)`: registra el saldo físico y movimiento.
- `totals(state)` / `dueOn(state, sale)`: origen de los indicadores financieros.

Los cambios de negocio pasan por `update(prev => businessOperation(prev, ...))`; se utilizan copias de estado de las operaciones puras. La validación de React **no** equivale a autorización ni transacciones seguras.

## Extensión empresarial a futuro

La solución productiva necesita API, base de datos con transacciones, inicio de sesión y autorización en servidor, auditores remotos y control de concurrencia. Una pasarela real debe verificar resultados mediante webhook firmado, referencia idempotente y secretos solo del servidor. El simulador de cobros actual permite seleccionar resultados manualmente para pruebas y nunca mueve dinero.
=======
# Arquitectura e integración

```
src/
  core/types.ts       Entidades, identificadores, cálculos puros
  core/seed.ts        Datos ficticios deterministas
  core/operations.ts  Reglas compartidas de negocio (funciones puras sobre clones)
  core/store.tsx      Adaptador local, sesion mock y autorización visual
  core/export.ts      Exportaciones PDF/XLSX
  pages/              Pantallas por contexto empresarial
  components/         Elementos reutilizables
  App.tsx             Navegación, visibilidad de módulos y shell
```

Persistencia bajo `enterprisecloud_erp_v2` con `version:2`; versión desconocida se reinicializa con seed. No hay migraciones automáticas. La política futura será versionar snapshots e implementar migradores. Los cambios pasan por `update(fn)`; `fn` puede llamar `createSale`, `recordPayment`, etc., que devuelven copias sin mutar el estado anterior. Al migrar, sustituir esta capa por repositorios HTTP y transacciones del servidor. La validación del frontend no equivale a autorización real.

## Entidades compartidas

`Client`, `Product`, `Warehouse`, `Inventory`, `Quote`, `Order`, `Sale`, `Payment`, `Return`, `Movement`, `Expense`, `Supplier`, `Purchase`, `Audit`, `State`. IDs de texto inmutables enlazan registros. `Item` persiste el precio acordado y descuento por línea.

## Contratos mínimos

- `createSale(state, clientId, items, warehouseId, orderId?)`: venta y movimientos de inventario, una sola vez.
- `createOrder(state, clientId, items, quoteId?)`: nunca modifica existencias.
- `recordPayment(state, saleId, amount, method, result)`: reduce cuentas por cobrar únicamente con `aprobado`.
- `returnItem(state, saleId, productId, qty, reason)`: límite de cantidad devuelta, reintegro físico.
- `transfer(state, productId, from, to, qty)`: saldo total invariante.
- `adjustStock(state, productId, warehouseId, target, reason)`: nuevo saldo físico y movimiento justificativo.
- `totals(state)` / `dueOn(state,sale)`: origen único de indicadores financieros.

## Implementación futura del servicio de pagos

Un backend seguro debería exponer interfaz `PaymentProvider`: `createIntent(saleId, amount, method)` y `verifyCallback(providerReference)`, con conciliación, idempotency key y secretos exclusivamente del lado del servidor. La UI actual permite seleccionar manualmente el resultado para pruebas; no comunica con Yape, Plin ni tarjetas.
>>>>>>> 3b30c95a162a4fe4845f447674da3e30baa74bb2
