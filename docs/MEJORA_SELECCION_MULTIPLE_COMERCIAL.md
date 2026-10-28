# Selección múltiple de productos — ERP Comercial Perú

## Problema corregido

El buscador original (`RecordPicker`) elegía únicamente un producto por apertura. El ERP ya almacenaba varias líneas en una cotización o pedido, pero el usuario tenía que repetir el buscador, la cantidad y «Añadir producto» para cada artículo.

## Comportamiento nuevo

En **Cotizaciones**, **Pedidos** y las **Ventas directas** aparece un botón **«Seleccionar varios productos»**, además del editor original de un solo producto.

1. Abre el catálogo múltiple.
2. Busca por SKU, nombre, marca o categoría.
3. Marca tantas referencias como necesites; usa «Seleccionar todos los resultados del filtro» si corresponde.
4. Cambia de página; la selección se conserva entre páginas.
5. Ajusta cantidades por producto, cuando estén marcados.
6. Pulsa **«Agregar N al documento»**. Los artículos aparecen como líneas independientes.
7. En la tabla del documento puedes cambiar precios, cantidades, descuentos y eliminar líneas; los totales se recalculan.

No se añaden productos inactivos, no se duplican productos que ya estén en el documento y se exige cantidad entera > 0. Para una venta directa se comprueba además el stock del almacén de salida. Una cotización o un pedido pueden recibir cantidades superiores al stock porque no generan salida de inventario; el control obligatorio se hará en la venta.

## Archivos de esta mejora

- `src/features/commerce/ProductBatchPicker.tsx` — diálogo con buscador, selección en todas las páginas y cantidades.
- `src/features/commerce/productBatch.ts` — lógica pura de alta masiva y validaciones.
- `src/features/commerce/productBatch.test.ts` — seis pruebas Vitest específicas.
- `src/features/commerce/product-batch.css` — estilos independientes sin modificar módulos de compañeros.
- `src/features/commerce/DocumentBuilder.tsx` — botón y conexión con el constructor comercial compartido.

No se cambió `src/core/types.ts`, `State.version`, las migraciones ni las claves de almacenamiento.

## Ejecutar y validar en tu PC

Desde la carpeta que contiene `package.json`:

```bash
npm install
npm test
npm run build
npm run dev
```

Se espera que `npm test` termine sin pruebas fallidas y que `npm run build` termine con la compilación exitosa. Si no se cumple, conserva la salida de la terminal para identificar el error concreto. No se ejecutaron estos dos comandos con las dependencias instaladas en el entorno de entrega.

## Pruebas manuales sugeridas

1. Cotizaciones → «Seleccionar varios productos» → marca tres productos distintos → cantidad 1, 3 y 5 → agrega → verifica **3 líneas** y los totales.
2. Selecciona artículos de la página 1 y de la página 2; verifica que el contador y las selecciones se mantengan y que se agreguen juntos.
3. Busca «mouse», usa «Seleccionar todos los resultados del filtro» y comprueba que solo añade los productos filtrados.
4. Intenta seleccionar otra vez un producto que ya está en el documento: debe estar bloqueado con «Ya agregado al documento».
5. Introduce cantidad `0` o decimal `1.5` para un producto del lote y verifica que el diálogo muestre un mensaje claro sin guardar.
6. Modifica el precio y el descuento en la tabla; verifica subtotal, IGV 18 % y total.
7. Repite en Pedidos. En Venta directa, selecciona un producto sin stock o usa cantidad mayor al disponible y verifica el bloqueo.
