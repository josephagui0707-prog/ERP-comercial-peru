# ERP Comercial Perú · Versión mejorada para la exposición

## Qué cambió realmente

Esta versión modifica los archivos del proyecto React + TypeScript y el servidor Node; no es un rediseño de capturas.

### 1. Escenario de demostración con datos

- Una organización de prueba **AULA** sin registros comerciales previos recibe automáticamente **30 clientes, 40 productos, 4 almacenes, 160 saldos de inventario, 10 proveedores, 12 compras, 14 cotizaciones, 25 pedidos, 50 ventas** y pagos de ejemplo.
- Incluye precios expresados en PEN, categorías, SKU, existencia por almacén e historial inicial de movimientos.
- Si el navegador ya contiene datos comerciales **no vacíos**, no se reemplazan.
- El administrador puede abrir **Dashboard ejecutivo → Restaurar datos de práctica** o **Datos maestros → Restaurar escenario** para recuperar el conjunto completo. **Precaución:** este botón sustituye todos los registros comerciales de ese navegador y pide confirmación.
- Otros perfiles y organizaciones conservan las reglas existentes de permisos y datos.

### 2. Proceso comercial más claro

El acceso directo a **Nueva cotización** abre el formulario en lugar de dejar al usuario ante una tabla vacía. La guía de inicio resume el recorrido:

**Clientes/productos → cotización aprobada → pedido confirmado/preparado → venta → entrega → comprobante/cobro.**

Conserva el diseño de documentos relacionados del ERP y las restricciones originales de inventario, devoluciones, compras y cobranzas. Los comprobantes son **académicos/simulados**: no sustituyen la emisión a SUNAT.

### 3. Asistente que opera sobre registros reales

El asistente ya no depende exclusivamente de respuestas vagas o de una API externa para lo frecuente. Interpreta órdenes locales, consulta el estado real del navegador, respeta permisos y ofrece **confirmación antes de modificar documentos**. Ejemplos que se pueden copiar:

```text
ayuda
ventas de hoy
ventas del mes
productos con poco stock
stock de EC-0001
cuántos pedidos tengo
cotizaciones abiertas
consultar saldos
crear una cotización
cotiza 2 EC-0001 para CLI-001
registrar cliente: Comercial Aurora SAC | 20123456789 | ventas@aurora.pe
registrar producto: Mouse óptico | MOU-100 | 45 | 25 | Periféricos
crea una entrega simulada
ver mis rutas
```

Las consultas de datos y las propuestas de cliente/producto/cotización se ejecutan localmente, sin pagar una API. Las preguntas abiertas pueden usar Gemini **solo si se configura la clave en el servidor**. El asistente no debe confundirse con una IA infalible: si una solicitud no coincide con un comando verificado, responde con una guía y no inventa resultados. La creación de un producto por el asistente empieza con **stock cero**: debe registrarse una entrada para venderlo.

### 4. Logística y trazabilidad A / B

- **Nueva entrega** permite indicar **nombre y coordenadas de A y B**, elegir puntos haciendo clic en el mapa o utilizar la geolocalización del equipo.
- Puedes relacionar la entrega con un pedido real, asignar repartidor y monitor, y elegir **GPS real o simulación**.
- En simulaciones con A/B personalizados, el movimiento se calcula **sobre la recta entre los puntos**. Es una ilustración académica, **no un cálculo de ruta por las calles ni un navegador GPS**.
- Cuando se usa el escenario de recorrido antiguo sin cambiar A/B, se conserva la traza demostrativa anterior.
- El panel muestra total de entregas, por iniciar, en camino, finalizadas, un acceso a los últimos despachos, historial y repetición.
- El GPS real requiere **HTTPS o localhost**, permisos de ubicación y que los dispositivos puedan acceder al mismo servidor.

### 5. Interfaz y tema oscuro

Se ajustó la paleta profesional de azul petróleo, la jerarquía del dashboard, tablas, encabezados, botones, formularios y ventanas, el contraste de textos en tema oscuro y la presentación del chat. Además, se agregaron indicadores y accesos directos útiles para orientar la demostración.

## Arquitectura y alcance sin una base de datos comercial

- **Frontend:** React 19, TypeScript, Vite.
- **Datos comerciales:** almacenamiento local del navegador (`localStorage`), separados por organización. **No necesitas instalar PostgreSQL ni MySQL.**
- **Servidor Node:** necesita Node.js 24 o superior y mantiene un archivo SQLite pequeño (`data/aula.sqlite`) **solo para cuentas/sesiones, entregas, posiciones y auditoría compartida**. Es importante aclararlo al profesor: **sí hay persistencia SQLite en logística, pero no hay un servidor de base de datos para el negocio**.
- **Advertencia multipuesto:** clientes, catálogo, cotizaciones, ventas y pagos guardados en el navegador **no se sincronizan** entre PCs o perfiles de navegador. Las rutas y cuentas sí se comparten mediante la misma instancia del servidor. Para una empresa real habría que implementar un backend comercial compartido.

## Cómo iniciar el ZIP en Windows

1. Descomprime el archivo y abre la carpeta `ERP-Comercial-Peru` en **VS Code**.
2. Instala **Node.js 24 o posterior** y ten acceso a Internet la primera vez para instalar librerías.
3. En la terminal de esa carpeta escribe:

```powershell
npm ci
npm run dev
```

4. Abre `http://localhost:5173` en Chrome o Edge. O ejecuta **`INICIAR_ERP.bat`**: comprueba Node, instala las dependencias si faltan e inicia el modo desarrollo.
5. Accede como administrador del aula: `admin@enterprisecloud.demo` / `Admin123!`. También existen `ventas@enterprisecloud.demo` / `Ventas123!` y `repartidor@enterprisecloud.demo` / `Ruta1234!`.
6. Si habías abierto un navegador con el ERP completamente vacío, entra a **Datos maestros → Restaurar escenario** (administrador) y confirma para cargar los registros.

Para compilar la aplicación después de instalar dependencias: `npm run build`; para servir esa compilación: `npm start`. **No se incluye una compilación antigua** en este ZIP, porque mostraría una versión distinta del código nuevo.

## Pruebas y límites de verificación

- Ejecutadas **10 pruebas de integración del servidor** (`node --test server/test/*.test.mjs`): pasaron las 10, incluida la prueba adicional de una simulación personalizada entre A y B.
- Se revisó la **sintaxis** de los archivos TypeScript/TSX con el compilador TypeScript disponible en el entorno.
- Se agregó un archivo de pruebas de intenciones locales (`src/core/assistant-local.test.ts`) que debes ejecutar después de `npm ci` con `npm test`.
- **No fue posible ejecutar aquí la compilación integral `npm run build` ni abrir el nuevo frontend instalado**, porque este entorno no pudo conectarse al registro de npm para obtener dependencias. Esta limitación no es una aprobación de build: comprueba `npm run build` en tu PC antes de exponer.

**Práctica sugerida:** después de iniciar sesión, revisa el dashboard con datos, crea una cotización desde el botón, confirma una acción en el bot, entra a **Rutas → Nueva entrega**, define una salida A y un destino B, inicia simulación y reproduce el recorrido.
