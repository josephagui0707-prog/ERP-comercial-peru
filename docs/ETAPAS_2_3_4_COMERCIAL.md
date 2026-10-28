# ERP Comercial Perú — entrega de etapas 2, 3 y 4

## Alcance y protección de datos

- Se partió del ZIP `ERP_Comercial_Peru_Modulos_Originales_Con_Flujo_IA(1).zip` proporcionado por el usuario.
- `State.version` permanece **2**. `src/core/types.ts`, `src/core/seed.ts`, `src/core/store.tsx` y la clave `enterprisecloud_erp_v2` **no se modificaron**. Los datos de ventas, clientes, productos, pagos y compras existentes se leen igual que antes.
- No se modificaron páginas ni operaciones de Compras, Inventario, Finanzas, Administración o Usuarios. Clientes se movió de la pantalla antigua al archivo `Clients.tsx` con el formulario y sus reglas originales, porque compartía el archivo monolítico con Comercio.
- Se conserva el menú original y el asistente global del ZIP recibido. La integración de IA es opcional; no es un motor de reglas de negocio.
- No reinicies los datos de demostración al actualizar; no ejecutes «Restablecer datos». Por seguridad, conserva una copia de la carpeta o de los datos locales antes de cambiar de aplicación.

## Archivos modificados

- `src/pages/Commerce.tsx`: ahora es solo distribuidor de las siete rutas (seis comerciales + Clientes).
- `src/features/commerce/Quotes.tsx`: histórico, estados, aprobación/rechazo explícitos y conversión única a pedido.
- `src/features/commerce/Orders.tsx`: histórico, búsqueda, filtros y progresión confirmada de pedido.
- `src/features/commerce/Sales.tsx`: mantiene venta directa y venta vinculada, ahora exige estado «preparando» para pedidos.
- `src/features/commerce/Vouchers.tsx`: histórico de comprobantes simulados y enlace a cobro.
- `src/features/commerce/Payments.tsx`: registro de pago simulado sin modificar su contrato de datos.
- `src/features/commerce/Returns.tsx`: devolución con control de cantidades pendientes y reposición.
- `src/features/commerce/Clients.tsx`: código de formulario de Clientes extraído de la página anterior sin alterar sus reglas.
- `src/features/commerce/DocumentBuilder.tsx`: constructor único de líneas para Cotización, Pedido y Venta.
- `src/features/commerce/SalesHistory.tsx`, `Shared.tsx`: tablas, detalle, filtros y utilidades compartidas.
- `src/core/operations.ts`: validaciones de documentos, cambios de estado de cotización/pedido, ventas vinculadas, números correlativos y cálculo FIFO de devoluciones.
- `src/core/operations.test.ts`: pruebas del flujo, entradas inválidas y cuatro regresiones reportadas.
- `src/styles/enterprise-theme.css`: se agregan estilos específicos con prefijo `commerce-`.

## Reglas aplicadas ahora

1. Una cotización nueva se guarda en `borrador`. Requiere al menos una línea, cliente activo, producto activo, cantidad entera positiva, precio finito no negativo, descuento 0–100 % y total positivo.
2. Se puede **aprobar** o **rechazar** solo estando en borrador. Una rechazada no se convierte en pedido.
3. Un pedido generado desde cotización exige `aprobada`, conserva exactamente cliente, productos, cantidades, precios y descuentos; enlaza `quoteId` y `orderId`, y no se duplica.
4. Un pedido sigue `pendiente → confirmado → preparando → completado` al registrar venta. También puede cancelarse antes de la venta, previa confirmación.
5. La venta asociada requiere estado `preparando`, hereda y valida los datos del pedido, controla stock y actualiza inventario una sola vez.
6. El correlativo se obtiene como **máximo histórico de la serie + 1**, incluidas las anuladas. No se usa `length + 1`.
7. La devolución con varias líneas históricas del mismo producto a precios diferentes asigna importes por orden de líneas (FIFO), descontando las unidades devueltas previamente.
8. Para Cotización/Pedido/Venta se utiliza un único editor con búsqueda paginada, varios productos, suma de productos repetidos cuando precio y descuento coinciden, edición de cantidades, precios, descuentos, eliminación de líneas y desglose de IGV 18 % incluido.

**Límite de esta entrega:** la separación y las etapas 3–4 están implementadas. Los rediseños en profundidad de emisión tributaria, conciliación de reembolsos, cobros y postventa corresponden a las etapas posteriores; se mantuvieron las funciones esenciales de esos módulos para no dejar rutas vacías. Los documentos siguen siendo simulados, sin valor tributario real.

## Cómo instalar y ejecutar en Windows / VS Code

Abre una terminal en la carpeta que contiene `package.json`:

```bash
npm install
npm test
npm run build
npm run dev
```

Resultados esperados si las dependencias se instalan correctamente y no aparecen errores adicionales:

- `npm install`: termina con **código 0**; puede mostrar avisos de auditoría de paquetes, que no implican por sí solos fallo de instalación.
- `npm test`: Vitest informa `Test Files ... passed` y `Tests ... passed`. La suite `src/core/operations.test.ts` contiene **13 casos**.
- `npm run build`: ejecuta `tsc -b && vite build` y termina con `built in ...` y código 0.
- `npm run dev`: Vite muestra una dirección local, habitualmente `http://localhost:5173/` (puede variar si el puerto está ocupado).

**Estado de verificación en el entorno de entrega:** no se ejecutó `npm install`, Vite ni Vitest por falta de dependencias instaladas. Se validó la sintaxis TypeScript/TSX, se hizo typecheck del núcleo (`types.ts`, `seed.ts`, `operations.ts`), y se ejecutaron **12 pruebas aisladas equivalentes** en el núcleo antes de añadir el último test fiscal. Esto **no equivale** a un `npm test` completo. Si cualquiera de los comandos anteriores falla, conserva el mensaje completo y compártelo para corregirlo.

## Pruebas manuales recomendadas para la exposición

1. En **Cotizaciones**, selecciona un cliente, añade dos productos distintos, edita la cantidad, precio y descuento de una línea, verifica subtotal/IGV/total y guarda el borrador.
2. Abre el detalle de la cotización; apruébala y crea el pedido. Comprueba que el cliente, las líneas y el total coinciden exactamente. Intenta convertir otra vez: no debe permitirse.
3. Crea otra cotización y recházala: no debe aparecer el botón para generar pedido.
4. En **Pedidos**, comprueba que el nuevo pedido empieza en `pendiente`, que debes pulsar **Confirmar**, luego **Iniciar preparación**, y solo entonces **Registrar venta**.
5. Al registrar la venta desde el pedido, debe abrirse el módulo de Comprobantes. Confirma que el stock disminuyó y que el pedido está en `completado`.
6. En un documento nuevo intenta poner cantidad `1.5`, `0`, descuento `120` o dos líneas idénticas con precios distintos: debe mostrar un error en español.
7. Verifica que los registros anteriores siguen visibles, que Clientes, Compras, Inventario y Finanzas funcionan y que el rol Ventas no gana acceso a módulos restringidos.

## Qué presentar al profesor

«Separé cada módulo comercial, pero mantuve la navegación original. Cotización y Pedido ahora comparten un constructor con múltiples productos; el usuario puede cambiar cantidades, precios y descuentos antes de guardar. El ERP protege el ciclo mediante estados, conserva las referencias entre documentos y no permite vender un pedido sin confirmar y preparar. Las reglas importantes están en funciones de negocio y tienen pruebas, no solamente en los botones».
