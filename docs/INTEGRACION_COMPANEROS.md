<<<<<<< HEAD
# Integración por responsabilidad del equipo

La distribución **Persona 1/2/3/4/5 es exclusivamente organizativa**: no se debe mostrar en la web profesional.

## Persona 1 — Administración y cloud

**Simulador completado:** marca propia, layout modular, menú con scroll corregido, atajo de búsqueda, login y sesión demo, perfil, ajustes validados, actividades locales exportables e infraestructura conceptual interactiva. Archivos propios: `src/layout/`, `src/pages/Administration.tsx`, `src/features/administration/`, `src/styles/administration.css`.

**Para producción, aún fuera de alcance:** autenticación y autorización server-side, auditoría inalterable, cloud en proveedor real. Los usuarios, claves y permisos de interfaz son simulados. No incluir claves privadas en `VITE_`.

## Persona 2 — Comercial

Mantener `src/pages/Commerce.tsx` y las reglas de `core/operations.ts`, sin cambiar contratos compartidos ni esquema `State` unilateralmente.

## Persona 3 — Compras (pendiente)

Trabajar sobre los puntos de extensión de `src/pages/Extensions.tsx`, extrayendo gradualmente a páginas propias. Funciones futuras propuestas:

1. `purchaseId`, `supplierId`, `warehouseId`, `items: Item[]`, `status`, `date`.
2. `receivePurchase(...)` debe validar orden, evitar doble recepción, registrar movimiento positivo y crear obligación al confirmar factura/recepción.
3. `paySupplier(...)` debe impedir pagos excedidos y guardar referencia de pago.
4. `supplierReturn(...)` debe registrar salida de inventario y ajustar saldos correspondientes.
5. Documentos deben guardar metadatos y referenciar almacenamiento externo; no blobs indefinidos en LocalStorage.

## Persona 4 — Inventario

Mantener contratos en `Inventory.tsx`, `core/operations.ts` y `core/types.ts`. Probar cantidades y trazabilidad antes de cambios compartidos.

## Persona 5 — Finanzas/reportes

Trabajar con `Finance.tsx`, `Reports.tsx` y exportaciones. La deuda a proveedores sigue pendiente de la Persona 3, no debe presentarse como contabilidad confirmada.

## Integración transversal

Para añadir opciones al menú editar `src/layout/navigation.ts`; para habilitar acceso por rol ajustar `src/core/permissions.ts`. Para lógica nueva usar funciones puras sobre estado, invocadas mediante `update(prev => operacion(prev, ...))`. Añadir pruebas del nuevo flujo y evitar cambiar funcionalidades de otros responsables sin consenso. Comprobar `npm run build` y `npm test` antes de fusionar ramas.
=======
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
>>>>>>> 3b30c95a162a4fe4845f447674da3e30baa74bb2
