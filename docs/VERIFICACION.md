# Verificación y alcance

**Pruebas implementadas:** `src/core/operations.test.ts`, con escenarios de stock, idempotencia de pedido, pago rechazado/aprobado, transferencia, ajuste a cero, devolución, anulación y descuentos.

**Comandos que debe ejecutar el equipo cuando disponga de conectividad con npm:**

```
npm install
npm run build
npm test
npm run dev
```

**Recorrido manual recomendado:** ingresar como admin, abrir Clientes, registrar uno nuevo, crear Producto, realizar Ajuste de stock, crear Pedido y facturarlo una vez, comprobar salida en Kardex, procesar un cobro aprobado/rechazado, registrar devolución, revisar Finanzas, exportar un reporte, recargar, cerrar sesión y restaurar datos. Repetir con cada uno de los otros roles.

**Resultados ejecutados en este entorno:** se compiló el núcleo empresarial con TypeScript estricto, se verificó la sintaxis de todos los archivos TS/TSX y se ejecutaron 8 pruebas de humo directas con Node (semilla, pedidos y stock, stock insuficiente, pagos, transferencias, devoluciones, ajustes y anulación): **8/8 correctas**.

**No ejecutados:** `npm run build`, `npm test` de Vitest ni pruebas de interfaz en navegador, porque este entorno no puede resolver `registry.npmjs.org` para instalar dependencias. Las pruebas automáticas están escritas pero necesitan npm.

**Limitación del entorno de generación:** el registro efectivo de compilación e instalación se documentará según la disponibilidad de npm; no debe inferirse que la existencia de los tests equivale a haberlos ejecutado.
