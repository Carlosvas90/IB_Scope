# src/main

## Propósito

Esta carpeta contiene el proceso principal (main process) de la aplicación Electron. Aquí se gestiona la creación de ventanas, la configuración global, la comunicación con el sistema de archivos y la exposición de APIs seguras al renderer mediante IPC.

## Estructura

| Archivo/Carpeta    | Propósito                                                                |
| ------------------ | ------------------------------------------------------------------------ |
| `main.js`          | Inicializa la app, crea la ventana principal y carga handlers/servicios. |
| `handlers/`        | Manejadores de eventos IPC. Cada archivo expone eventos de una función.  |
| └─ `config.js`     | IPC para configuración global (leer/guardar config, tema, autorefresh).  |
| └─ `files.js`      | IPC para archivos (leer/guardar JSON, exportar CSV).                     |
| `services/`        | Lógica de negocio reutilizable del main process.                         |
| └─ `config.js`     | Lógica para cargar, guardar y validar la configuración global.           |
| └─ `fileSystem.js` | Lógica para leer/escribir archivos y exportar CSV.                       |

## Buenas prácticas

- Toda la lógica debe estar modularizada en servicios y handlers.
- No debe haber lógica de negocio ni de apps específicas en `main.js`.
- Los handlers solo deben registrar eventos y delegar la lógica a los servicios.
- Si se requiere lógica auxiliar, crear utilidades en una carpeta `utils/` (solo si es necesario).

## Ejemplo de flujo

1. El renderer solicita una acción (leer config, guardar archivo, etc.) usando `window.api`.
2. El handler correspondiente recibe el evento IPC y delega la lógica al servicio adecuado.
3. El servicio ejecuta la lógica y responde al renderer.

## Añadir un nuevo handler

1. Crea un archivo en `handlers/` (ej: `notificaciones.js`).
2. Registra los eventos IPC necesarios y delega la lógica a un servicio.
3. Importa el handler en `main.js`.

## Seguridad

- No expongas funciones peligrosas ni acceso directo a Node.js al renderer.
- Usa siempre `contextIsolation` y `preload.js` para exponer solo APIs seguras.

---

Mantén esta estructura para asegurar un main process limpio, seguro y fácil de mantener.
