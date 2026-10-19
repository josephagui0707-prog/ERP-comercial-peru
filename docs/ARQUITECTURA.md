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
