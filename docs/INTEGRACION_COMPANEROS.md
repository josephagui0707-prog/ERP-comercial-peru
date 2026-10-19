# Integración para integrantes 1 y 3

## Persona 1 — Estructura y cloud

Mantener `App.tsx` como fuente de grupos de navegación; los roles de demo están en `core/store.tsx`. Reemplazar el login local por un `AuthRepository` remoto manteniendo `user`, `login` y `logout`. **No basta** filtrar rutas en React: imponer autorización en el servidor. Extender `Extensions.tsx` para panel cloud real tras implementar credenciales de servidor, auditoría central y protección de recursos. Evitar secretos en variables `VITE_`.

## Persona 3 — Compras

Editar proveedores, compras y documentos dentro de pantallas independientes (o extraer gradualmente `Extensions.tsx`). Contratos propuestos:

1. `purchaseId`, `supplierId`, `warehouseId`, `items:Item[]`, `status`, `date`.
2. `receivePurchase(...)` valida orden, impide recepciones repetidas, registra un `Movement` positivo por línea y genera obligación por pagar solo tras la recepción/factura correspondiente.
3. `paySupplier(...)` valida el saldo, registra el egreso asociado y conserva referencia única del pago.
4. `supplierReturn(...)` registra salida de stock y ajuste en cuenta por pagar, con validación de cantidades.
5. Documento: `id`, `purchaseId|saleId`, `type`, `displayName`, `mime`, `createdAt`, `checksum`; jamás persistir archivos pesados indefinidamente en LocalStorage.

**Integrar exclusivamente vía `update(prev => businessOperation(prev,...))`** y funciones puras en `core/operations.ts`. Evitar cambios de contratos sin coordinarse con las personas 2, 4 y 5. Añadir pruebas de stock y saldo junto a las operaciones, sin mezclar estados de React.

## Flujo de Git sugerido

`feature/persona-1`, `feature/persona-3`, `feature/persona-2-4-5` → pull requests → resolver conflictos de contratos primero → pruebas → fusión. Todos deben usar `npm install` después de recibir cambios de dependencias.
