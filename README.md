# ERP Comercial Perú · Rutas y entregas

Proyecto de clase en React y TypeScript. Conserva el flujo comercial, las compras, el inventario, las finanzas, los reportes y la plantilla Excel. Añade cuentas compartidas, seguimiento GPS entre dos dispositivos, simulación y repetición. El ZIP mejorado incluye el código editable y las instrucciones de instalación. No incluye un `dist` antiguo: se debe generar una nueva compilación después de instalar las dependencias.

## Abrir en VS Code

1. Extrae el ZIP completo y abre en VS Code la carpeta que contiene `package.json`.
2. Instala **Node.js 24 o posterior**. En la terminal de VS Code ejecuta:

```bash
npm ci
npm run dev
```

3. Abre [http://localhost:5173](http://localhost:5173). Mantén abierta la terminal. La primera ejecución crea el archivo SQLite de cuentas y entregas. En Windows también puedes iniciar con **`INICIAR_ERP.bat`** (instala dependencias si hacen falta).
4. Para comprobar pruebas y crear un despliegue local, ejecuta `npm test` y `npm run build`. Después de compilar, `npm start` sirve los archivos nuevos de `dist`.
5. En el aula, si ya tenías un estado vacío guardado en este navegador, entra como administrador a **Datos maestros → Restaurar escenario**. Si era una instalación nueva, los mocks se cargan al iniciar la organización AULA.

[Consulta la guía completa de mejoras, límites y ejemplos del asistente](MEJORAS_REALIZADAS.md).

## Demostración en dos minutos

| Paso | Persona 1 · Repartidor | Persona 2 · Monitor |
| --- | --- | --- |
| Entrar | En una ventana normal, elige **Repartidor** y pulsa **Iniciar sesión**. | En una ventana privada u otro navegador, elige **Monitor** e inicia sesión. |
| Salir | En **Rutas y entregas**, selecciona una entrega de ejemplo y pulsa **Iniciar simulación**, o crea una con coordenadas A/B nuevas. | Selecciona esa misma entrega. El vehículo y la hora cambian a medida que llegan posiciones. |
| Llegar | Al finalizar los puntos de la simulación se marca la llegada a B. | Pulsa **Reproducir recorrido**. Prueba la velocidad, pausa y arrastra la barra a un punto anterior. |
| Repetir la práctica | **Nueva entrega → Simulación** permite asignar otra y seleccionar puntos A/B reales. Para dos coordenadas personalizadas, la línea es ilustrativa y recta, no una ruta calculada por calles. | La nueva entrega aparece al quedar asignada a tu cuenta. |

Dos pestañas del mismo perfil comparten la cookie de sesión. Utiliza perfiles de navegador independientes para representar a las dos personas. Las ventanas privadas del mismo navegador también pueden compartir sesión entre sí.

## GPS real desde el celular

1. Sirve **una sola instancia** del ERP. Ambos dispositivos deben abrir la misma dirección. Utiliza una dirección HTTPS con un certificado de confianza en el teléfono.
2. En **Nueva entrega → GPS real**, elige al repartidor y al monitor. Configura A y B para tu instituto. Puedes tocar el mapa, escribir latitud y longitud o usar la ubicación del dispositivo para el punto seleccionado. Los dos lugares que ofrece inicialmente el formulario son ejemplos.
3. La cuenta del repartidor pulsa **Iniciar y compartir mi GPS**, concede el permiso y mantiene esa pantalla abierta. El monitor recibe posiciones y puede ver su hora y precisión. La línea continua une lecturas recibidas. La discontinua une A y B como referencia.
4. **Pausar mi GPS** detiene el envío. **Reanudar mi GPS** vuelve a solicitar lecturas. Al salir de la pantalla se libera el observador. Si se corta la red, el monitor conserva la última posición y la marca como antigua tras 45 segundos.
5. Al llegar, el repartidor pulsa **Confirmar llegada**. Se exige una lectura de menos de dos minutos, con precisión de hasta 100 m y a menos de 150 m de B. Usa **Cancelar entrega** si termina en otro lugar. Los puntos ya guardados quedan disponibles para repetición.

### HTTPS en la red del instituto

Ejemplo para una PC con IP de red **192.168.1.20**. Sustituye la IP por la de tu equipo. Un administrador de la red también puede proporcionar una dirección HTTPS con un certificado ya aceptado por ambos celulares.

1. Instala `mkcert` en la PC y ejecuta los siguientes comandos en la carpeta del ERP.

```sh
mkcert -install
mkdir certs
mkcert -cert-file certs/aula.pem -key-file certs/aula-key.pem localhost 127.0.0.1 192.168.1.20
```

2. Copia `.env.example` a `.env`. Configura estas cuatro líneas.

```dotenv
HOST=0.0.0.0
TLS_CERT_FILE=certs/aula.pem
TLS_KEY_FILE=certs/aula-key.pem
APP_ORIGIN=https://192.168.1.20:5173
```

3. Con un certificado de aula, instala **solo el certificado público** `rootCA.pem` de `mkcert -CAROOT` en los dispositivos de prueba y activa su confianza según el sistema. La clave `rootCA-key.pem` permanece privada en la PC. Autoriza el puerto 5173 en el perfil de red privada del cortafuegos.
4. Reinicia con `npm start`. En **ambos** dispositivos abre **https://192.168.1.20:5173**. El teléfono debe alcanzar la PC por esa red durante todo el recorrido. Para una ruta fuera del Wi-Fi del instituto, publica la instancia de prueba detrás de una dirección HTTPS accesible desde datos móviles.
5. Para practicar en una sola PC, `localhost` admite la geolocalización del navegador. El modo simulado funciona aunque el equipo carezca de GPS. La web necesita permanecer en primer plano para una captura fiable.

Los permisos se solicitan al repartidor cuando decide compartir. El mapa usa Leaflet y cartografía OpenStreetMap sin clave. Las calles requieren Internet. Si falta conectividad con el proveedor de mapas, la simulación incluye un plano ilustrativo local y el modo GPS conserva marcadores y traza. [Geolocalización en MDN](https://developer.mozilla.org/en-US/docs/Web/API/Geolocation/watchPosition) · [mkcert](https://github.com/FiloSottile/mkcert) · [Política de mapas OSM](https://operations.osmfoundation.org/policies/tiles/)

## Cuentas y asignación

Organización inicial **AULA**. Las credenciales siguientes se crean únicamente en modo de demostración.

| Perfil | Correo | Contraseña |
| --- | --- | --- |
| Administración | admin@enterprisecloud.demo | Admin123! |
| Repartidor | repartidor@enterprisecloud.demo | Ruta1234! |
| Monitor | monitor@enterprisecloud.demo | Mapa1234! |
| Comercial | ventas@enterprisecloud.demo | Ventas123! |
| Inventario | almacen@enterprisecloud.demo | Almacen123! |
| Finanzas | finanzas@enterprisecloud.demo | Finanzas123! |

Para tus propias cuentas, entra como administrador y abre **Sistema → Usuarios y roles → Nuevo usuario**. Crea una cuenta de cada rol logístico y selecciónalas en la entrega. El monitor ve las entregas que tiene asignadas. Administración puede supervisar la organización y el comercial puede consultar los despachos que coordinó. Un repartidor comparte GPS únicamente en su propia entrega.

Desde **Pedidos**, pulsa **Ver o asignar entrega**. El coordinador puede crear el despacho o abrir el existente. La referencia se conserva en el servidor aunque el monitor use otro equipo. Llegar a B registra un evento logístico. La venta, el comprobante y el cobro continúan por su propio flujo.

## Asistente y analítica

| Escribe | Qué ocurre |
| --- | --- |
| «Crea una entrega simulada» | Prepara una propuesta con dos participantes. Al confirmar se crea una entrega. Si hay varias personas posibles, pide identificar sus nombres o abre el formulario. |
| «Ver mis rutas» | Consulta los conteos del servidor y abre las entregas visibles para tu perfil. |
| «Confirma el pedido PED-…» | Usa el ID completo de un pedido pendiente de este navegador. Revisa el cambio y confírmalo. «Prepara el pedido PED-…» avanza uno confirmado. |
| «Consultar saldos» o «Consultar stock» | Devuelve indicadores de los módulos que tu perfil puede consultar. |
| «Cotiza 2 EC-0001 para CLI-001» | Consulta el producto y el cliente existentes y propone una cotización para confirmar. |
| «Registrar cliente: Comercial Aurora SAC \| 20123456789 \| ventas@aurora.pe» | Prepara un cliente nuevo tras revisar DNI/RUC y duplicados. Confirma antes de guardar. |
| «Registrar producto: Mouse óptico \| MOU-100 \| 45 \| 25 \| Periféricos» | Propone crear un producto con precio y costo; inventario inicial cero. |

Los comandos anteriores funcionan sin proveedor externo. Para preguntas abiertas, añade `GEMINI_API_KEY` y, si corresponde, `GEMINI_MODEL` a `.env` y reinicia Node. El servidor envía la pregunta, el rol y conteos permitidos. Las posiciones y las fichas de clientes quedan fuera del contexto automático. La clave permanece en el servidor. El servicio externo depende del modelo y de la cuota de tu cuenta.

En **Dashboard ejecutivo**, los perfiles con acceso a reportes pueden abrir el cálculo de las ventas y el flujo de caja estimados para el mes. Se muestran los tres meses de base y se indica cuándo faltan registros.

## Qué se comparte

| Datos | Dónde se guardan | Alcance |
| --- | --- | --- |
| Cuentas, sesiones, entregas, posiciones, propuestas y auditoría de acceso | `data/aula.sqlite` en la PC que sirve el ERP | Compartidos entre los dispositivos conectados a la misma instancia. |
| Catálogos, compras, ventas, inventario, finanzas, adjuntos y configuración del prototipo | Almacenamiento del navegador, por organización y origen | Para recuperar el trabajo anterior usa el mismo navegador, dirección y puerto. La organización AULA utiliza la clave comercial histórica. |
| Preferencia de tema | Navegador | Sigue al sistema hasta que el usuario elige manualmente un tema. |

Las cuentas personalizadas de la versión anterior se recrean desde **Usuarios y roles**. Las contraseñas antiguas guardadas por el navegador no se importan en el servidor. Una instalación nueva puede cargar `public/plantillas/ERP_Datos_Importacion.xlsx` en **Datos maestros**. Para respaldar la base de aula, detén Node limpiamente y copia la carpeta `data` completa. Para recuperar ese respaldo, restaura la carpeta con el servicio detenido.

## Documentación técnica

- [Arquitectura en cinco capas, flujo de datos y guía de evolución](docs/ARQUITECTURA.md)
- [Esquema ejecutable de Inventario y Finanzas para PostgreSQL](database/postgresql.sql)
- [Pruebas, límites de la entrega y verificación en clase](docs/VERIFICACION.md)
- [Importación de la plantilla Excel](LEEME_IMPORTACION.md)

Las notas recibidas con el proyecto se conservan en `docs/historico`. Este README y [MEJORAS_REALIZADAS.md](MEJORAS_REALIZADAS.md) describen la versión mejorada. La compilación del frontend debe ejecutarse localmente tras `npm ci`.
