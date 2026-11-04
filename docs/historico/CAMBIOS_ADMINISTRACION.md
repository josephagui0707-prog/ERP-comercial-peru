# Registro de cambios — administración, navegación y marca

**Alcance:** actualización orientada a Persona 1 del proyecto académico. Se conservan `core/operations.ts`, `core/seed.ts` y sus modelos de datos empresariales, así como las interacciones ya existentes de ventas, inventario y finanzas.

## Modificaciones

| Necesidad | Archivo | Resultado |
| --- | --- | --- |
| Identidad empresarial | `public/brand/*`, `index.html`, `src/pages/Login.tsx` | Logo nuevo, nombre e icono del navegador |
| Navegación mantenible | `src/layout/navigation.ts` | Grupos y etiquetas sin números de personas |
| Menú, scroll y atajos | `src/layout/Sidebar.tsx` y `src/styles/administration.css` | Scroll independiente con colores, buscador y Ctrl+K |
| Carga de rutas | `src/App.tsx` | React.lazy, Suspense y esqueleto de carga |
| Visibilidad de módulos | `src/core/permissions.ts` | Matriz por rol en archivo dedicado |
| Perfil/Configuración | `src/pages/Administration.tsx` | Datos del usuario, formularios validados y confirmación de reinicio |
| Eventos | `src/core/store.tsx`, `src/features/administration/` | Eventos locales de inicio/cierre y cambios de simulación |
| Cloud | `src/pages/Administration.tsx` | Componentes conceptuales activables, sin consumo real de AWS |
| Copias y reportes | `src/core/export.ts`, `src/pages/Reports.tsx` | Solo actualización de rótulos de marca |
| Reservado a compras | `src/pages/Extensions.tsx` | Textos de estado profesional; flujos mock preservados |

## Para conectar backend real en el futuro

1. Implementar un `AuthRepository` y autorización **en el servidor**; no confiar en los roles expuestos en React.
2. Sustituir LocalStorage por un repositorio remoto transaccional manteniendo los métodos públicos de los módulos.
3. Centralizar la auditoría en un servidor con fechas/actores verificados y políticas de retención.
4. Ejecutar toda operación cloud en un backend con credenciales seguras; **nunca** poner secretos en variables `VITE_`.
5. Implementar los procesos de compras del equipo correspondiente antes de tratar pedidos y cuentas por pagar como reales.

**Nota:** el centro cloud de esta entrega representa un *escenario de aprendizaje*. Su estado «Activo/Detenido» expresa exclusivamente una preferencia guardada en el navegador, no el estado de un servidor.
