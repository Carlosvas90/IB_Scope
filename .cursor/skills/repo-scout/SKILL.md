---
name: repo-scout
description: "Arqueólogo del repo IB_Scope: genera mapa del proyecto, entry points, flujo de datos, dependencias, checklist Electron y hotspots. Usar con /scan-repo, /locate-feature <nombre>, /impact <archivo|carpeta>, o al planificar refactors o nuevas tools."
---

# Repo-Scout (IB_Scope)

Rol: encontrar rápido dónde vive cada cosa, cómo se conecta y qué se puede romper si se toca algo.

## Cuándo aplicar

- El usuario pide **/scan-repo**, **/locate-feature &lt;nombre&gt;** o **/impact &lt;archivo|carpeta&gt;**.
- Se va a hacer un **refactor grande** o **agregar una nueva tool/mini-app**: ejecutar primero y basar el plan en el mapa.

---

## 1. /scan-repo → Mapa completo

Generar un informe con las secciones siguientes. Usar el árbol del repo (list_dir, grep) y lectura mínima de archivos clave para rellenar cada bloque.

### 1.1 Mapa del proyecto (árbol resumido)

- Carpetas principales y para qué sirven.
- Dónde está Electron: **main** (`src/main/`), **renderer** (`src/renderer/`), **preload** (`src/preload/`).
- Dónde están las mini-apps/tools: `src/renderer/apps/*` (dashboard, feedback-tracker, activity-scope, etc.).
- Dónde están assets: `assets/`, `src/renderer/assets/`, CSS en `src/renderer/css/`, iconos/templates.

### 1.2 Puntos de entrada (entry points)

- Archivo que arranca Electron: `src/main/main.js`.
- Dónde se crea la ventana (createSplashWindow, createWindow en main.js).
- Dónde se registra IPC: handlers en `src/main/handlers/` y uso de `ipcMain` en main.js.
- Dónde se carga el HTML principal (loadFile/loadURL).
- Router/nav: `src/renderer/js/router.js`, `app-loader.js`, sidebar.

### 1.3 Flujo de datos

- De dónde se lee JSON (rutas, config, red): `config/`, servicios en main y renderer.
- Dónde se escribe JSON.
- Qué módulos escriben y cuáles solo leen.
- Formatos/versiones de JSON relevantes (config, permisos, etc.).

### 1.4 Dependencias y acoplamientos

- Módulos más importados / más “tocados”.
- Scripts shared o utilidades comunes: `src/renderer/core/`, `src/renderer/js/*.js`.
- Riesgos: cambios que afectan a muchos módulos.

### 1.5 Checklist de seguridad Electron

- `contextIsolation`, `nodeIntegration`, `preload` en BrowserWindow.
- Canales IPC existentes (listar desde main y preload).
- Cualquier acceso a `fs` desde renderer (bandera roja).

### 1.6 Lista de hotspots

- Carpetas/archivos grandes.
- Código duplicado.
- CSS/variables duplicadas (p. ej. themes).
- Rutas hardcodeadas.

Al final del informe, indicar: “Mapa generado por Repo-Scout. Usa /locate-feature o /impact para profundizar.”

---

## 2. /locate-feature &lt;nombre&gt;

Objetivo: “Dónde está X y qué toca.”

1. Buscar en el repo por nombre (carpetas, archivos, símbolos/strings relevantes).
2. Listar archivos/carpetas donde vive la feature.
3. Indicar qué otros módulos lo importan o lo referencian (dependientes).
4. Resumir en 1–2 frases el impacto: “Si tocas X, revisa Y y Z.”

---

## 3. /impact &lt;archivo|carpeta&gt;

Objetivo: “Qué se rompería si cambio esto.”

1. Identificar el archivo o carpeta (si es carpeta, considerar todos los módulos que exportan o son punto de entrada).
2. Buscar quién importa o referencia ese archivo/carpeta (grep de requires/imports y rutas).
3. Listar dependientes directos e indirectos (una capa más si es relevante).
4. Señalar riesgos: tests que podrían fallar, otras apps que dependen de esto, IPC o config compartida.
5. Resumir: “Cambios seguros: … / Riesgos: …”

---

## Regla de uso

Antes de refactor grande o agregar una nueva tool, ejecutar Repo-Scout (al menos /scan-repo o las secciones relevantes) y basar el plan en su mapa.
