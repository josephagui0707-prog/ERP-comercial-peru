## Módulo 4 implementado

Consulta [docs/MODULO_4_INVENTARIO.md](docs/MODULO_4_INVENTARIO.md) para la guía de ejecución, estructura, funciones y validaciones de inventario.

# ERP Comercial Perú

**ERP demostrativo de una comercializadora peruana de tecnología y seguridad.** Incluye gestión comercial, inventarios, finanzas, compras (estructura base) y administración del entorno, todo con operaciones simuladas en **soles (PEN)**.

> **Importante:** es un prototipo académico sin backend. Las credenciales son públicas, el control de accesos se realiza solamente en React, el historial es local y la infraestructura cloud es una simulación. **No usar con información real ni para operaciones tributarias o bancarias.**

## Ejecutar en VS Code

Necesitas **Node.js 20.19+ o 22.12+**, npm y un navegador actualizado.

```bash
npm install
npm run dev
```

Abre la URL de Vite indicada en la terminal (normalmente `http://localhost:5173`). Para verificar:

```bash
npm run build
npm test
```

`package-lock.json` se conserva; puedes usar `npm ci` en lugar de `npm install` cuando tengas acceso al registro de npm. El proyecto incluye Bootstrap 5.3.6 CSS local, sin depender de un CDN de Bootstrap.

## Credenciales de ejemplo

| Cuenta de demostración | Contraseña | Acceso visual |
| --- | --- | --- |
| admin@enterprisecloud.demo | Admin123! | Todos los módulos |
| ventas@enterprisecloud.demo | Ventas123! | Comercial |
| almacen@enterprisecloud.demo | Almacen123! | Inventario |
| finanzas@enterprisecloud.demo | Finanzas123! | Finanzas y reportes |

Las cuentas se conservan con sus identificadores originales por compatibilidad con las sesiones previamente guardadas. **No son cuentas seguras.** El usuario se guarda en `sessionStorage` o `localStorage` según marque «Mantener sesión».

## Funcionalidades

### Áreas comerciales, inventario y finanzas — se conservan

- **Comercial:** clientes, cotizaciones, pedidos, ventas, comprobantes PDF sin validez SUNAT, pasarela simulada de cobros, pagos aprobados/rechazados y devoluciones.
- **Inventario:** productos, categorías, almacenes, existencias, kardex, transferencias y ajustes. Registros con referencias asociadas a operaciones.
- **Finanzas:** saldos de cuentas por cobrar, ingresos, egresos, caja/bancos conceptuales, gráficos, indicadores y siete informes descargables en PDF/Excel.
- **Integraciones opcionales:** Frankfurter para tipo de cambio de referencia USD/PEN y Nager.Date para feriados del Perú; no cambian importes del ERP.
- **Compras y documentos:** mantenimiento CRUD de proveedores, órdenes de compra de ejemplo y pantalla documental de base. La recepción física de compras, pagos a proveedores, facturas de compra y repositorio general de documentos todavía **no están implementados**.

### Administración y apariencia — actualización de la Persona 1

- **Identidad propia:** nombre «ERP Comercial Perú», nuevo logotipo con referencia visual peruana, favicon y marca coherente en login, navegación y cabeceras de exportación.
- **Navegación:** ciclo comercial visible en orden, submódulos maestros dentro de **Mantenimiento**, grupos plegables sin tarjetas redundantes, búsqueda y atajo `Ctrl + K`, colapso de secciones, menú móvil, estados activos y barra lateral con scroll oscuro independiente.
- **Carga e interacción:** páginas cargadas de forma diferida (`React.lazy`/`Suspense`), esqueletos mientras se importan, transiciones de entrada, microinteracciones y estados ocupados en simulación cloud; adaptación a `prefers-reduced-motion`.
- **Perfil:** datos del usuario, rol y matriz informativa de accesos.
- **Configuración:** edición validada de razón social, nombre comercial, RUC ficticio, contacto y ciudad; moneda y zona horaria Perú; restauración de datos de muestra con diálogo de confirmación. Los cambios permanecen en el navegador.
- **Registro de actividad:** combina movimientos de negocio existentes con nuevos eventos locales de inicio/cierre de sesión, cambios de configuración e infraestructura; búsqueda, filtros y exportación CSV.
- **Infraestructura simulada:** representación conceptual de aplicación, base de datos, archivos e identidad, activación/desactivación de estados ficticios, resumen, persistencia local y cronología de interacciones. **No hay despliegues ni métricas AWS reales.**
- **Tema claro/oscuro** persistente por navegador y componentes Bootstrap que respetan la identidad actual.

## Estructura para continuar el trabajo

```text
public/
  brand/                     Logo y favicon propios
  logos/                     Logos de los métodos de pago originales
src/
  App.tsx                    Composición de módulos y carga diferida
  layout/
    navigation.ts            ÚNICA fuente de grupos/menús
    Sidebar.tsx              Menú y búsqueda independientes
  core/
    permissions.ts           Reglas de visibilidad por rol (solo demo)
    store.tsx                Estado local compartido, sesión, datos de administración
    types.ts / seed.ts       Modelos y semillas existentes
    operations.ts            Reglas de negocio existentes (no modificadas)
    export.ts                PDF y Excel; rótulos de la nueva marca
  features/administration/
    model.ts                 Contratos de configuración, cloud y eventos
    storage.ts               Lectura/validación de datos mock persistidos
  pages/
    Administration.tsx       Perfil, ajustes, auditoría y cloud
    Commerce.tsx             Comercial; modificar aquí las tareas comerciales
    Inventory.tsx            Inventario; modificar aquí las tareas de almacén
    Finance.tsx              Finanzas
    Reports.tsx              Reportes
    Extensions.tsx           APIs y extensiones de compras/documentos
  components/ui.tsx          Elementos comunes existentes
  components/RecordPicker.tsx  Buscador modal paginado para entidades
  components/PaginatedTable.tsx Tablas de consulta con 10/20/50 filas
  components/WorkflowGuide.tsx  Ruta de cotización a cobro
  components/SupplierMaintenance.tsx CRUD local de proveedores
  styles.css                Diseño de módulos original
  styles/administration.css  Shell, logo, scrollbar y diseño administrativo
  styles/enterprise-theme.css Tokens y unificación azul acero/celeste
  vendor/bootstrap.min.css  Bootstrap local
```

**Regla para integrarse sin romper funciones:** mantener los contratos de `core/types.ts` y llamar a `update(prev => operacionPura(prev, ...))` para cambios de negocio. No modificar operaciones de otros módulos sin acordarlo en equipo. Para agregar módulos al menú, editar `src/layout/navigation.ts` y actualizar el sistema de permisos en `src/core/permissions.ts`. Para nuevas pantallas administrativas, editar `src/pages/Administration.tsx` y sus contratos independientes.

Ver `docs/ARQUITECTURA.md`, `docs/INTEGRACION_COMPANEROS.md`, `docs/VERIFICACION.md` y `docs/CAMBIOS_ADMINISTRACION.md`.

## Persistencia y precauciones

Los registros de negocio mantienen `enterprisecloud_erp_v2` versión 2: **no se borran automáticamente** al instalar estos cambios. Las claves nuevas `erp_pe_admin_settings_v1`, `erp_pe_cloud_demo_v1` y `erp_pe_events_demo_v1` están separadas para no alterar los datos de ventas, compras e inventario existentes. No hay migraciones de backend.

Hay 30 clientes, 40 productos, 4 almacenes, 50 ventas y 25 pedidos ficticios. Las cotizaciones y pedidos no reservan inventario: el stock se descuenta al concretar la venta. Una devolución puede exigir conciliación de cobros aparte; los datos financieros no representan contabilidad formal ni validez tributaria SUNAT. LocalStorage no garantiza transacciones multiusuario ni integridad de auditoría.

## Actualización: interfaz empresarial unificada (octubre 2026)

- **Sidebar por flujo:** Inicio → Ciclo comercial → Compras → Inventario → Finanzas → Mantenimiento → Sistema. Solo se expanden inicialmente Inicio y Ciclo comercial; la sección activa se abre automáticamente. Se eliminó el bloque duplicado «Espacio de demostración» del sidebar, pero se mantiene la indicación de demo en la cabecera.
- **Mantenimiento:** Clientes, Productos, Categorías, Proveedores y Almacenes tienen ubicaciones fijas dentro de su grupo. Proveedores ahora permite registro, edición y eliminación condicionada a ausencia de relaciones.
- **Modal de selección:** en Cotizaciones, Pedidos, Ventas, Cobros, Devoluciones y formularios de inventario se muestran registros principales con búsqueda textual y paginación de 10/20/50 filas. Después de elegir, se resumen los atributos relevantes. Los controles de listas cortas (estado, segmento, tipo de operación) siguen usando select.
- **Listados paginados:** tablas comerciales, finanzas, compras simuladas, auditoría, reportes e inventario. Los reportes exportan el conjunto completo de filas filtradas, independientemente de la página visible.
- **Guía operativa:** navegación paso a paso Cotización → Pedido → Venta → Comprobante → Cobro. Los enlaces respetan la visibilidad de las rutas por rol. Los botones ya existentes que convierten cotizaciones y pedidos siguen ejecutando la lógica original.
- **Tema:** azul acero / celeste desaturado en claro y oscuro, incluidas páginas de inventario antes moradas. Los estados de error/advertencia y los logotipos de pasarelas siguen teniendo semántica y reconocimiento propios.

**Alcance técnico:** paginación y búsqueda en el navegador sobre datos locales, apropiada para esta demo. Con cientos de miles de registros y uso multiusuario se necesitarán consultas paginadas y filtros en un backend con base de datos. El proyecto conserva simulación de pagos, comprobantes no SUNAT y roles visuales; no se añaden backend, autenticación real ni facturación electrónica.
