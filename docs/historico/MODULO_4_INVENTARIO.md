# Módulo 4 · Inventario, productos y almacenes

## Inicio en Windows

Extrae todo el ZIP y ejecuta `INICIAR_ERP.bat`. Requiere Node.js con npm; el script instala las dependencias la primera vez y abre `http://localhost:5173/`. Mantén la consola abierta.

Acceso demo: `admin@enterprisecloud.demo` / `Admin123!` (sin signo de apertura).

También puedes usar `npm ci` y `npm run dev`. Validación: `npm test` y `npm run build`.

## Productos y porcentajes

- El ID es automático, inmutable y verificado contra IDs existentes. Los productos nuevos usan UUID completo con prefijo PRO. Los ID anteriores se conservan para no romper referencias. El campo interno `sku` queda por compatibilidad con el proyecto; Inventario muestra ID.
- Detalle muestra nombre, marca, modelo, características, categoría, proveedor, costo de compra, precio de reventa, ganancia bruta por unidad, margen bruto, existencias por almacén y estado.
- Ganancia bruta = reventa − compra. Margen bruto = ganancia / reventa × 100; con precio cero se indica que no aplica. No es ganancia neta ni cálculo tributario.
- El antiguo campo editable de stock mínimo se reemplaza visualmente por **Stock global actual**, de solo lectura: suma de las unidades de ese producto en todos los almacenes. No suma productos distintos dentro de cada ficha. El indicador general de unidades sí suma todos los productos y almacenes.
- Para que un porcentaje tenga una base estable, el **100% corresponde al mayor stock global observado desde esta actualización o la primera recepción**. Al migrar, se toma el stock global actual; una recepción superior al máximo lo actualiza. Una salida no reduce esa referencia. No hay referencia editable ni supuesto de capacidad del proveedor.
- Porcentaje = stock global / referencia × 100. Un producto nuevo sin entradas muestra 0%.

| Porcentaje | Estado / aviso |
| --- | --- |
| Mayor que 50% | Alto, verde |
| Mayor que 10% y hasta 50% | Medio · Reponer, amarillo |
| Mayor que 0% y hasta 10% | Crítico, rojo; indica que aún quedan pocas unidades |
| 0% | Agotado, rojo; pide reposición |

Ejemplo: entrada inicial de 100 → 100%; salida de 50 → 50%; salida de 40 → 10%; salida de 10 → 0%. Una transferencia no cambia el porcentaje global.

Los estados se calculan; no hay selector manual Activo/Inactivo en Productos. El campo interno active sigue disponible para compatibilidad comercial: los productos no archivados admiten entradas, incluso a cero; las salidas siguen exigiendo stock suficiente.

**Eliminar** solo se habilita con cero unidades en todos los almacenes. Realiza un archivo lógico: conserva el ID, los datos, las ventas y el Kardex. El producto se retira del catálogo operativo y no admite operaciones nuevas. La opción «Ver historial de productos archivados» permite consultarlo y abrir su detalle. No se borran sus ventas de los análisis.

## Almacenes

Formulario con código único (manual o autogenerado, inmutable una vez creado), nombre, tipo, dirección exacta, distrito, ciudad, departamento, ubigeo opcional, encargado seleccionado entre las cuentas demo, teléfono/extensión, correo y estado.

Tipos: central; sucursal/tienda; tránsito; merma/defectuoso; virtual/e-Commerce. Estados: Activo, Inactivo, En mantenimiento.

Solo almacenes activos admiten movimientos nuevos, incluidas ventas/devoluciones comerciales y transferencias. Desactivar conserva stock e historial. Los datos geográficos son campos estructurados de ingreso manual; no se consulta un servicio de ubigeo. El email es un dato de contacto: esta simulación no envía correos.

## Existencias, Kardex y Movimientos

- Existencias muestra ID, producto, almacén, cantidad, valor al costo y alerta global automática.
- Kardex distingue Stock inicial (antes Apertura), Entrada, Salida, Transferencia, Ajuste, Venta y Devolución. Las anulaciones aparecen como entrada por anulación.
- Movimientos incluye todas las ventas registradas en el ERP y los demás movimientos. El tipo general usa Entrada/Salida/Ajuste; el origen conserva Venta, Devolución, Transferencia, etc., para no perder precisión.
- Ambas tablas muestran ID de movimiento, fecha/hora, código y nombre del producto, almacén, cantidad/variación, stock resultante, cliente/proveedor, motivo/usuario y referencia.
- El motivo conserva el texto que se escribió. Las operaciones comerciales tienen sus motivos propios.
- El commit central captura la hora, el usuario y el saldo inmediatamente posterior de cada movimiento nuevo, incluyendo ventas y devoluciones que se crean fuera de Inventario. Una operación con varias líneas conserva un saldo por línea/movimiento, no un saldo final repetido.
- Los registros antiguos conservan sus datos. Para la semilla y el historial compatible se reconstruyen saldos solo cuando la secuencia completa concilia con el stock vigente; aparecen identificados como «Reconstruido del historial». Si no hay evidencia suficiente se muestra «No registrado». Las horas antiguas ausentes no se inventan.
- El stock resultante es histórico e inmutable: no cambia cuando se realizan movimientos posteriores.
- Registrar devolución manual exige cliente/proveedor y motivo. Para defectos se recomienda seleccionar un almacén de merma. No reembolsa dinero ni se vincula automáticamente a una venta; para devolución comercial vinculada se mantiene la función original del módulo Comercial.

Todas las tablas conservan un único buscador con selector de campo, orden por cabecera y paginación.

## Documentos y referencias

En el formulario de movimiento, «Subir guía u orden» reemplaza el texto libre de referencia externa. Permite adjuntar guías de productos, órdenes de devolución, órdenes del encargado general u otros documentos.

- Formatos: PDF, PNG y JPG; se verifica su firma básica.
- Máximo 5 archivos por operación, 1 MB por archivo y 3 MB de adjuntos acumulados.
- Los archivos y metadatos se guardan junto con el movimiento de forma atómica. Si falla la lectura, validación o persistencia, no se confirma el stock.
- La selección abre una vista previa de imágenes o PDF antes de adjuntar. Aceptar archivo incorpora la selección al formulario; confirmar la operación guarda definitivamente. Cancelar selección conserva los adjuntos previamente aceptados.
- Cancelar el formulario no guarda documentos. Los terceros creados al vuelo sí son registros independientes y permanecen disponibles.
- Cada movimiento recibe su referencia automática. Transferencias mantienen dos movimientos bajo la misma referencia. Documentos guardan sus IDs de movimientos y referencia.
- Al pulsar Referencia se abre el detalle de operaciones y archivos relacionados.
- «Documentos de inventario» permite buscar y descargar archivos, subir documentos independientes o asociarlos a una referencia existente. Convive con la sección de documentos previa del ERP, sin sustituirla.
- El botón Eliminar pide confirmación. Quita el archivo y sus vínculos a movimientos; conserva la referencia, las cantidades y el historial de stock. Registra usuario, nombre del archivo y referencia en auditoría. Cancelar no realiza cambios.

Los bytes se guardan en localStorage codificados en base64; el límite evita agotar rápidamente la cuota del navegador. Si aun así se llena o bloquea, el formulario muestra un error y conserva la operación pendiente. No existe un repositorio de auditoría certificado ni almacenamiento compartido.

## Estructura

| Archivo | Responsabilidad |
| --- | --- |
| `src/pages/Inventory.tsx` | Nueve vistas, alertas, tablas, detalles y archivo de productos |
| `src/features/inventory/Forms.tsx` | Formularios, detalle de producto, adjuntos y referencias |
| `src/features/inventory/service.ts` | Operaciones y validaciones de catálogos/stock |
| `src/features/inventory/model.ts` | Porcentajes, migración y captura transversal del Kardex |
| `src/features/inventory/documents.ts` | Validación, lectura, cuota y descarga de archivos |
| `src/features/inventory/DataTable.tsx` | Buscador único, orden y paginación |
| `src/features/inventory/Modal.tsx` | Dialog nativo con gestión de foco |
| `src/features/inventory/ThirdPartyPicker.tsx` | Búsqueda y alta rápida de terceros |
| `src/core/store.tsx` | Commit compartido, persistencia y validación de movimientos |
| `src/core/types.ts` | Tipos compatibles con datos anteriores |
| `src/styles/inventory.css` | Interfaz responsive y estados visuales |

## Persistencia y continuidad

Se conserva `enterprisecloud_erp_v2`, con propiedades nuevas opcionales y migración sin reiniciar datos. Las cuentas, el script de inicio, el buscador único y las demás secciones del ERP se mantienen. Usa el mismo navegador y origen (`localhost:5173`) para conservar el acceso a tus datos. No se sincronizan equipos ni pestañas concurrentes. Al borrar el almacenamiento del navegador o restablecer la demo se pierden también los adjuntos.

## Verificación

29 pruebas automatizadas: reglas originales, niveles 50/10/0, migración y conservación de datos, saldos por venta, devolución comercial, bloqueo de almacenes, archivo lógico, unicidad, referencias y cuotas de adjuntos. Compilación TypeScript/Vite. Vite puede advertir del tamaño del bundle de exportación existente; no bloquea el build.

Prueba en Chromium realizada: alta de producto, ficha completa, entrada de 100 unidades con guía adjunta, recarga con persistencia, salidas hasta 50%, 10% y 0%, avisos automáticos, descarga del documento y archivo lógico con consulta del historial. Sin errores de ejecución del navegador en ese flujo. Interfaz revisada en escritorio y pantalla móvil.


## Actualización sobre ERP ENTREGA

- Documentos: eliminar con confirmación y registro de auditoría. Se liberan los bytes del archivo en localStorage y se limpian sus IDs en los movimientos, sin borrar movimientos, ventas, cantidades o referencias.
- Adjuntos: vista previa obligatoria antes de aceptar en todos los formularios que suben guías u órdenes. PDF y PNG/JPG; el formulario no confirma mientras hay una selección pendiente de revisión.
- Clientes: todos los botones Agregar nuevo cliente del selector compartido de Inventario navegan a `/clientes`. Se conserva el alta rápida de proveedores. El perfil almacén tiene acceso a Clientes para permitir esta redirección.
- Al volver a Inventario, abre la misma operación (entrada/salida/devolución) para recuperar el borrador con cantidad, motivo y adjuntos ya aceptados. Esta recuperación funciona durante la navegación de la aplicación; recargar o cerrar la página descarta el borrador, sin afectar los registros confirmados.
- Los documentos eliminados no se pueden recuperar desde esta demo. La confirmación identifica el archivo antes de borrarlo.

Verificación: compilación correcta y 31 pruebas automatizadas aprobadas.

Prueba en navegador: vista previa de imagen y PDF, cancelar/aceptar selección, guardar y recargar, cancelar/confirmar eliminación, auditoría, redirección desde Existencias/Kardex/Movimientos con perfil almacén y recuperación del borrador. Sin errores de ejecución en el flujo probado.

Los PDF se dibujan con PDF.js dentro de la aplicación, con navegación por páginas y sin depender del visor del navegador. El script de inicio detecta la dependencia nueva y la instala si falta, incluso cuando ya existe node_modules.
