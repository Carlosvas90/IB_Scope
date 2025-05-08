# src/preload

## Propósito

Esta carpeta contiene el script de preload de Electron. Su función es exponer APIs seguras y controladas desde el proceso principal (main) al renderer, utilizando `contextBridge` y evitando exponer Node.js directamente.

## Estructura

| Archivo/Carpeta | Propósito                                                               |
| --------------- | ----------------------------------------------------------------------- |
| `preload.js`    | Expone APIs seguras al renderer (IPC, archivos, configuración, router). |

## Buenas prácticas

- Solo exponer métodos estrictamente necesarios y seguros.
- Nunca exponer objetos de Node.js directamente al renderer.
- Usar listas blancas de canales para la comunicación directa.
- Documentar cada API expuesta y su uso previsto.

## Ejemplo de flujo

1. El renderer accede a una API expuesta, por ejemplo `window.api.getConfig()`.
2. El preload reenvía la petición al main process mediante IPC.
3. El main responde y el preload devuelve el resultado al renderer.

## Añadir una nueva API segura

1. Define el método en el objeto expuesto por `contextBridge.exposeInMainWorld`.
2. Usa siempre `ipcRenderer.invoke` o canales validados.
3. Documenta el propósito y uso del nuevo método.

## Seguridad

- No expongas nunca módulos de Node.js ni acceso directo a `fs`, `os`, etc.
- Usa siempre `contextIsolation: true` en la configuración de Electron.
- Mantén el preload lo más simple y seguro posible.

---

Mantén esta estructura para asegurar una comunicación segura entre el main process y el renderer.
