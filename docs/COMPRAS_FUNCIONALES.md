# Compras y abastecimiento (demo local)

## Recorrido
1. Como administrador, entra en Compras > Órdenes de compra > Nueva orden.
2. Selecciona proveedor, almacén activo y productos. Agrega cantidades enteras y costos unitarios finales en soles, incluyendo IGV. Puedes retirar líneas y volver a agregarlas antes de guardar.
3. Guarda el borrador. Editar no cambia existencias ni genera cuentas por pagar.
4. Pulsa Ordenar y confirma. La orden queda bloqueada para edición.
5. Pulsa Recibir e ingresa una referencia ficticia del documento del proveedor. Al confirmar, todos los productos ingresan al almacén seleccionado, se registran movimientos y se genera el saldo pendiente del proveedor.
6. En Finanzas > Cuentas por pagar, usa Registrar pago y confirma. Se registra el pago total como egreso y la compra deja de aparecer pendiente.
7. En Compras > Documentos, consulta recepciones y descarga un resumen TXT desde Detalle. No es un comprobante tributario ni un repositorio de adjuntos.

## Reglas
- La recepción es total; no hay recepciones parciales, pagos parciales, devoluciones de compra ni cambios de costos promedio en esta versión.
- No se realizan pagos reales ni se envían órdenes al proveedor.
- Solo borradores se editan. Borradores y órdenes sin recibir se pueden cancelar; compras recibidas no se cancelan.
- Las órdenes antiguas de ejemplo no traen productos ni almacén. Completar permite capturarlos y recalcular el importe; vuelven a borrador para confirmar nuevamente. No se inventan movimientos para esos importes históricos.
- Los estados, recepciones y pagos se auditan y persisten en el estado comercial existente de localStorage.
- Se bloquean cantidades fraccionarias o negativas, costos inválidos, productos repetidos, almacenes inactivos, recepción repetida, documentos repetidos del mismo proveedor y pagos duplicados.
- La recepción no modifica los costos maestros de productos. El pago sí aparece en egresos y en el libro financiero.

## Dashboard
La distribución por categoría vuelve a ser una dona. La leyenda usa cuatro filas como máximo: las tres categorías de mayor importe y Otras categorías; incluye porcentaje y color único por grupo.

## Verificación
41 pruebas automáticas aprobadas, incluidas 5 del flujo de compras. Compilación TypeScript y Vite verificada. No se completó la comprobación visual en navegador en este entorno.
