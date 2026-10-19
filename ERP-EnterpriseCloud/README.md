# ERP EnterpriseCloud — demostración académica

**Empresa simulada:** comercializadora peruana de equipos tecnológicos y seguridad. **Moneda:** PEN. **Tecnología:** React, TypeScript estricto, Vite, React Router, Recharts, jsPDF, xlsx y LocalStorage. Todo corre en el navegador; **NO** es apto para producción, contiene cuentas de prueba públicas y no usa autenticación segura.

## Instalación y ejecución en VS Code

Requisitos: Node.js 20.19+ o 22.12+ (preferible Node.js 22 LTS actualizado), npm y navegador moderno.

```bash
npm install
npm run dev
```

Abrir la dirección indicada por Vite (normalmente `http://localhost:5173`). Para compilar y ejecutar pruebas:

```bash
npm run build
npm test
```

`package-lock.json` ya está regenerado: puedes usar `npm install` o `npm ci`.

## Accesos ficticios

| Correo | Contraseña | Acceso |
|---|---|---|
| admin@enterprisecloud.demo | Admin123! | Todos los módulos |
| ventas@enterprisecloud.demo | Ventas123! | Comercial |
| almacen@enterprisecloud.demo | Almacen123! | Inventario |
| finanzas@enterprisecloud.demo | Finanzas123! | Finanzas y reportes |

Los usuarios son inventados. El login compara credenciales de demostración en memoria, persiste solo el correo en `sessionStorage` o `localStorage`. Cualquiera con acceso al navegador puede inspeccionarlo y alterarlo: **no es una barrera de seguridad**. La futura implementación deberá usar un backend, autorización en servidor y autenticación estándar.

## Módulos terminados en modo demo

- **Persona 2:** clientes (crear, editar y activar/desactivar), cotizaciones (crear/aprobar/convertir), pedidos (crear/convertir/cancelar), ventas multiartículo (stock, descuentos, anulación condicionada), comprobantes PDF sin validez tributaria, cobros simulados aprobados/rechazados/cancelados, devoluciones vinculadas a venta.
- **Persona 4:** productos, categorías predefinidas, almacenes, stock por ubicación, kardex, movimientos, transferencias y ajustes; registro por referencia para rastreo.
- **Persona 5:** cuentas por cobrar calculadas, libro financiero con ingresos y egresos, resumen ejecutivo, gráficos, exportaciones de 7 reportes en PDF/Excel y vista previa. Los bancos y caja representan el libro compartido, no cuentas bancarias reales.
- **Simulador de pagos:** selección de venta y resultado; solo los pagos aprobados alteran el saldo; no hay datos sensibles ni servicios reales. Estados seleccionables intencionalmente para permitir demostración.
- **APIs opcionales:** Frankfurter (USD/PEN) y Nager.Date (feriados PE), con timeout 6,5 s y mensajes de error; no alteran saldos del ERP.

## Módulos base pendientes de compañeros

- **Persona 1:** layout, menú, login demostrativo, configuración básica, registro de eventos y vista cloud simulada disponibles. **Pendiente:** autenticación, autorización, auditoría confiable y cloud reales.
- **Persona 3:** proveedores mock, órdenes de compra mock y pantalla documental de extensión disponibles. **Pendiente:** CRUD de proveedores, compras completas, recepción, facturas, devoluciones a proveedores, pagos de compra, almacenamiento documental y cuentas por pagar confirmadas. Ninguna orden mock incrementa stock ni registra deuda.

## Precauciones y limitaciones

- LocalStorage no ofrece transacciones multiusuario, seguridad, bloqueo, garantías ACID ni control de concurrencia. No utilizar con datos reales.
- Los 30 clientes, 40 productos, 4 almacenes, 50 ventas y 25 pedidos son inventados, con operaciones relacionadas. Los comprobantes PDF son **simulados sin validez SUNAT**.
- Hay casos contables simplificados: devoluciones descuentan el saldo de una venta y reincorporan inventario, pero **no registran reembolsos bancarios automáticos**; las devoluciones de ventas ya totalmente pagadas requieren conciliación manual futura. Utilidad estimada = ventas netas − costo registrado − egresos manuales (sin impuestos ni valoración de existencias devueltas). No usar como contabilidad formal.
- Las cotizaciones y pedidos se almacenan localmente, no reservan inventario; solo al confirmar una venta se descuenta existencias.
- Los botones desactivados temporalmente (mientras una API carga o no hay exportaciones) indican indisponibilidad, no pantallas decorativas.

## Documentación adicional

Consulta `docs/ARQUITECTURA.md`, `docs/INTEGRACION_COMPANEROS.md` y `docs/VERIFICACION.md`.


## Interfaz Bootstrap y animaciones (actualización)

- Incluye **Bootstrap 5.3.6** como CSS local (`src/vendor/bootstrap.min.css`), sin CDN, sin claves y sin instalación de paquetes adicionales. Se conserva el CSS corporativo en `src/styles.css` para adaptar Bootstrap a la identidad visual del ERP.
- Tarjetas, tablas, botones y avisos integran clases Bootstrap; entradas y selectores conservan los estilos de la marca.
- Animaciones de entrada para páginas y tarjetas, hover en navegación y botones, gráficos animados y transición de ventana modal. Se respeta `prefers-reduced-motion`.
- **Pasarela y cobros:** la confirmación nativa se reemplazó por un diálogo React accesible, con venta, monto, método, resultado y confirmación. No maneja dinero ni claves reales.
- No se añadieron dependencias JavaScript para Bootstrap. Los componentes interactivos usan React para mantener consistencia de estados.

**Nota de pruebas:** el entorno de edición no permite consultar npmjs.org; ejecutar `npm install`, `npm run build` y `npm test` en el equipo local para validar también el bundle final.

## Renovación visual Bootstrap Enterprise (octubre de 2026)

Esta edición utiliza Bootstrap 5.3.6 (incluido localmente en `src/vendor/bootstrap.min.css`) como base de componentes y tokens, con personalización específica de un ERP mediante `src/styles.css`. Todos los módulos comparten tarjetas, tablas, campos, botones, navegación y estados de Bootstrap; no se copian plantillas de blog o tiendas.

- Interfaz oscura de inicio; botón de luna/sol en la barra superior para alternar entre modo oscuro y claro.
- La preferencia se conserva en `localStorage` bajo `erp-theme`.
- Menú de módulos con buscador, secciones plegables e indicador de ruta activa.
- Tablas responsivas, formularios Bootstrap, alertas, etiquetas, tarjetas y ventana de pagos simulados.
- Animaciones breves con desactivación automática cuando el sistema solicita movimiento reducido.
- Los roles y reglas empresariales se mantienen; panel cloud y módulos de compras siguen siendo puntos de extensión académicos.

**Seguridad:** el login y la pasarela son simulaciones locales. No introducir datos bancarios reales. No se usa Bootstrap JS externo: los controles interactivos se implementan con estado de React para evitar comportamientos incompatibles con React Router.
