# Verificación de la entrega

## Resultado

La versión recibida compilaba y sus pruebas originales pasaban. El principal impedimento para el caso del instituto era que la identidad y las operaciones vivían en cada navegador. Se mantuvieron las reglas comerciales y se añadió el servicio que comparten ambos participantes.

| Prueba ejecutada | Resultado observado |
| --- | --- |
| Compilación desde las fuentes con TypeScript y Vite | Compilación de producción correcta. El archivo ZIP lleva la interfaz compilada y el código fuente. |
| `npm test` | **87 pruebas**. Pasaron 78 de dominio e interfaz lógica con Vitest y 9 de servidor/adaptador con Node. |
| Dos sesiones independientes en Chromium | El repartidor inició la simulación y el monitor recibió puntos sin refrescar la página. Se pudo pasar de seguimiento a repetición y regresar. |
| Geolocalización emulada del navegador | El repartidor compartió dos lecturas desde A y B. El monitor vio ambas y conservó la entrega y su repetición al recargar. |
| Administración y conexión entre módulos | Una cuenta nueva de monitor ingresó desde otro contexto. Se importó la plantilla XLSX, el asistente confirmó un pedido existente y su despacho asignado apareció para esa cuenta. |
| Propuesta del asistente | Antes de confirmar aún no existía la entrega. Confirmar dos veces produjo un solo registro. Se rechazó la confirmación de otro usuario. |
| Autorización, persistencia y desconexiones | Se rechazaron accesos a envíos de terceros y de otra organización. Una cuenta desactivada perdió acceso. Puntos y sesión sobrevivieron al reinicio. La simulación recuperó los pasos transcurridos. |
| SQL objetivo | Se ejecutó el DDL con un motor PostgreSQL embebido (PGlite). Las pruebas verificaron RLS, cierre de asientos, rechazo de salidas sin stock, duplicados y saldos de cartera. |
| Fallos de servicios externos | Se probaron la pérdida de teselas y el adaptador de Gemini con respuestas controladas, errores y una intención fuera de los permisos. |

La prueba GPS utilizó la API del navegador con coordenadas emuladas. La recepción física dentro o fuera del instituto, la cartografía en línea de la red del aula y una llamada real con la clave Gemini de tu cuenta se verifican en tu instalación.

## Qué corregimos

- **Identidad.** El servidor verifica las contraseñas y entrega cookies de sesión. Los roles logísticos ven únicamente su espacio de trabajo. Las contraseñas del servidor se derivan con scrypt y sal individual.
- **Inventario.** Al normalizar datos antiguos, un producto desactivado podía aparecer activo otra vez. La normalización conserva su estado y mantiene archivados los productos retirados.
- **Fecha comercial.** Las operaciones usan el día civil de Lima. Una venta efectuada por la noche conserva la fecha local aunque UTC ya esté en el día siguiente.
- **Asistente.** La pantalla y la API arrancan juntas. El usuario ve el cambio propuesto, lo confirma y puede abrir el recorrido o el pedido resultante.
- **Persistencia visible.** La guía distingue qué queda en cada navegador, qué vive en el servidor y qué modelo corresponde al diseño empresarial.

## Cómo reproducirlo

Con Node 24 e Internet para instalar dependencias, ejecuta `npm ci`, `npm test` y `npm run build`. Para ejecutar solo los contratos del servidor usa `npm run test:api`. Las pruebas del servidor crean su propia base temporal. Para una comprobación manual recorre los pasos del README con una ventana normal y otra privada.

Para probar los datos del curso, importa `public/plantillas/ERP_Datos_Importacion.xlsx` desde **Datos maestros**. En **Pedidos**, copia el código de uno que siga pendiente, pide al asistente que lo confirme y comprueba el estado antes y después de pulsar **Aplicar cambio al pedido**. Después usa **Ver o asignar entrega** y elige quién reparte y quién recibe.

## Límites que afectan a la presentación

- Mantén en ejecución la PC que sirve el ERP. Los teléfonos deben poder llegar a esa misma instancia.
- Para caminar con GPS, usa HTTPS de confianza y deja la pantalla de reparto en primer plano. Si pierde señal, el monitor muestra la última lectura con su hora. Una ubicación de navegador puede tener un margen de error.
- La línea entre A y B mide una distancia directa. La aplicación registra el recorrido observado y una ruta ficticia para la práctica. Navegación giro a giro, tráfico y estimaciones por carretera quedarían a cargo de un servicio de enrutamiento.
- Los movimientos comerciales son demostrativos y se guardan por navegador. El modelo financiero PostgreSQL acompaña la arquitectura y se despliega por separado. La migración del negocio, los controles fiscales, una revisión de accesibilidad y los ensayos de carga pertenecen a la siguiente etapa.
