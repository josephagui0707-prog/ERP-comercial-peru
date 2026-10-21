# Verificación y alcance

<<<<<<< HEAD
## Ejecutar después de instalar dependencias

```bash
=======
**Pruebas implementadas:** `src/core/operations.test.ts`, con escenarios de stock, idempotencia de pedido, pago rechazado/aprobado, transferencia, ajuste a cero, devolución, anulación y descuentos.

**Comandos que debe ejecutar el equipo cuando disponga de conectividad con npm:**

```
>>>>>>> 3b30c95a162a4fe4845f447674da3e30baa74bb2
npm install
npm run build
npm test
npm run dev
```

<<<<<<< HEAD
Las pruebas existentes de negocio son `src/core/operations.test.ts` (stock, pedidos, pagos, devoluciones, transferencias y anulación); las reglas no fueron reescritas. La navegación tiene prueba específica `src/core/permissions.test.ts`.

## Recorrido recomendado

1. Ingresar con las cuentas de demostración y comprobar que un rol limitado no ve ni puede navegar directamente a páginas de otro rol.
2. Examinar menú lateral: búsqueda con `Ctrl+K`, secciones plegables, scroll oscuro independiente y cierre de sesión siempre visible.
3. Abrir Perfil y comprobar los permisos descritos.
4. Configuración: validar RUC de once dígitos, email y campos obligatorios; guardar, recargar y comprobar persistencia.
5. Infraestructura: detener/activar servicios y recargar; confirmar estados y eventos en Auditoría; restaurar escenario.
6. Auditoría: buscar/filtrar y descargar CSV; confirmar que los eventos de negocio anteriores siguen visibles.
7. Realizar venta/pago y verificar stock, kardex y reportes, sin modificar las operaciones existentes.
8. Cambiar tema, reducir tamaño de pantalla y probar el menú móvil. Probar con `prefers-reduced-motion: reduce`.
9. Restablecer registros demo **solo después** de confirmar que ya no necesitas tus cambios locales.

## Estado de validación del paquete

- Se verificó que los 23 archivos `.ts` y `.tsx` se pueden transpilar sintácticamente con TypeScript global, **sin errores de sintaxis**.
- Se ejecutaron 8 comprobaciones directas offline de semillas, permisos, ventas, cobros, transferencias, ajustes y almacenamiento de configuración; **8/8 correctas**. No sustituyen Vitest ni pruebas de interfaz.
- El intento de `npm ci` quedó incompleto: el entorno de generación no resuelve `registry.npmjs.org`. Por tanto, **no se pudo ejecutar un build Vite completo ni Vitest**, y no se declara que las pruebas de navegador estén aprobadas.
- El proyecto está preparado para realizar la verificación final en el equipo del usuario con conexión a npm.

## Advertencias

Roles solo visuales, log local modificable, sin API cloud real, sin validez SUNAT, sin garantías de transacciones concurrentes. Los datos ficticios y la pasarela no deben utilizarse en operaciones comerciales reales.
=======
**Recorrido manual recomendado:** ingresar como admin, abrir Clientes, registrar uno nuevo, crear Producto, realizar Ajuste de stock, crear Pedido y facturarlo una vez, comprobar salida en Kardex, procesar un cobro aprobado/rechazado, registrar devolución, revisar Finanzas, exportar un reporte, recargar, cerrar sesión y restaurar datos. Repetir con cada uno de los otros roles.

**Resultados ejecutados en este entorno:** se compiló el núcleo empresarial con TypeScript estricto, se verificó la sintaxis de todos los archivos TS/TSX y se ejecutaron 8 pruebas de humo directas con Node (semilla, pedidos y stock, stock insuficiente, pagos, transferencias, devoluciones, ajustes y anulación): **8/8 correctas**.

**No ejecutados:** `npm run build`, `npm test` de Vitest ni pruebas de interfaz en navegador, porque este entorno no puede resolver `registry.npmjs.org` para instalar dependencias. Las pruebas automáticas están escritas pero necesitan npm.

**Limitación del entorno de generación:** el registro efectivo de compilación e instalación se documentará según la disponibilidad de npm; no debe inferirse que la existencia de los tests equivale a haberlos ejecutado.
>>>>>>> 3b30c95a162a4fe4845f447674da3e30baa74bb2
