# Dashboard y administración de usuarios

## Uso
- Dashboard: segunda fila reducida a pedidos en curso y alertas de stock.
- Evolución de ventas: elegir año y agrupación mensual (12 períodos), trimestral (4) o semestral (2). Solo suma ventas vigentes del año; meses sin operaciones muestran cero. Los demás indicadores mantienen su alcance global.
- Ventas por categoría sustituye Flujo comercial. Muestra una dona con las 3 categorías principales y agrupa el resto como Otras categorías, con leyenda compacta de porcentajes. Se calcula con líneas de ventas vigentes, después de descuentos.
- Ranking de clientes: barras relativas al mayor comprador, sin importes, porcentajes ni saldos individuales. Es una ocultación visual en esta tarjeta, no un control de confidencialidad sobre los registros comerciales.
- Actividad reciente: todos los documentos comerciales, ordenados por fecha; filtro desde/hasta y tipo, scroll interno y estado vacío.
- Sistema > Usuarios y roles: crear, editar nombre/correo/teléfono/rol, cambiar contraseña y activar/desactivar. El formulario se abre en un modal con cierre, Escape y foco contenido. Al guardar una edición, el mismo modal muestra una confirmación con los cambios; volver a editar conserva los valores. No se guarda hasta confirmar. Contraseña vacía al editar conserva la anterior.
- Iniciar sesión con el correo y contraseña creados. Las cuentas persisten en localStorage del mismo origen y navegador. No se comparten con otras computadoras o dominios.
- Solo administrador accede a Usuarios y roles. No puede desactivarse ni quitarse su propio rol. Se rechazan correos duplicados, contraseñas menores a 8 caracteres y eliminación del último administrador activo.
- Cambios de usuarios se registran en Auditoría. La auditoría permite filtros por fecha, tipo y texto y exporta los resultados filtrados a CSV.
- Laboratorio cloud está dentro de Integraciones como pestaña exclusiva del administrador. La ruta anterior /cloud redirige a esta pestaña. Conserva su propósito académico y no controla servicios reales. El sidebar ya no incluye buscador de módulos.
- Configuración mantiene los datos de la empresa y restablecimiento confirmado de operaciones; restablecer operaciones no elimina las cuentas.

## Instalación y Render
1. Descomprimir, abrir terminal en la carpeta del proyecto.
2. `npm ci`
3. `npm run dev`
4. Producción: `npm run build`; directorio de publicación `dist`.
5. Render Static Site: rewrite `/*` hacia `/index.html` para permitir rutas directas.

Acceso inicial: admin@enterprisecloud.demo / Admin123!
Los accesos impresos en login son los iniciales; si se modifican en Usuarios, utilizar las credenciales actualizadas.

## Alcance y validación
Demo sin backend. Las contraseñas son ficticias y se guardan localmente; no usar credenciales reales. Los permisos del navegador no constituyen seguridad de producción.
Los datos comerciales existentes se conservan; no se cambia la clave ni versión de su almacenamiento.
`npm test`: 36 pruebas aprobadas. `npm run build`: compilación correcta; permanece la advertencia de tamaño de chunks del exportador.

La comprobación visual en navegador no pudo ejecutarse en este entorno; no se presenta como validada.

Compras ahora es funcional. Consulta COMPRAS_FUNCIONALES.md para creación, recepción, documentos y pagos.
