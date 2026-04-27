---
name: theme-tokens-guardian
description: Garantiza que la app consuma colores, espaciados y tipografía desde un único archivo de tokens; mantiene dark/light completos sin duplicaciones ni colores sueltos. Usar al editar o revisar CSS, temas, variables, tokens, o al crear nuevas herramientas/vistas con estilos.
---

# Theme-Tokens Guardian

**Fuente de verdad única:** `src/renderer/css/themes/variables.css`  
Solo este archivo define `:root` (tokens base) y el bloque `.dark-theme`. El resto de CSS debe consumir `var(--...)` desde ahí.

## Checklist obligatorio

### 1. Single source of truth
- Solo **1 archivo** con `:root` y bloque dark: `src/renderer/css/themes/variables.css`.
- Ningún otro CSS define colores/espaciados/tipografía como variables globales (no crear segundos `:root` ni duplicar tokens).
- Excepciones de hardcode: imágenes (url), sombras muy específicas, estados raros; en esos casos preferir igualmente tokens si ya existen.

### 2. Cero hardcode innecesario
- Detectar y reemplazar: `#fff`, `#000`, `#hex`, `rgb()`, `rgba()`, `hsl()` en CSS por `var(--token)` existente.
- Si no existe token adecuado, añadirlo en `variables.css` (paleta o semántico) y luego usarlo en el módulo.
- No dejar “colores sueltos” en componentes o layouts.

### 3. Tokens mínimos pero completos
- Mantener cantidad de tokens baja.
- Si hay muchas variantes (ej. 10 grises), reducir a 2–4 niveles y mapear el resto a esos niveles.
- Cada token semántico usado en la UI debe tener valor en **light** y **dark** (prefijo `--light-*` / `--dark-*` y variables activas que cambian con `.dark-theme`).

### 4. Compatibilidad claro/oscuro
- Para cada token relevante (fondos, textos, bordes, etc.): comprobar que exista en `:root` para light y en `.dark-theme` para dark.
- Patrón del proyecto: variables activas sin prefijo (ej. `--body-bg`) que apuntan a `--light-*` por defecto y a `--dark-*` dentro de `.dark-theme`.

### 5. Auditoría por módulo
Al crear o tocar una herramienta/vista nueva:
- Revisar su CSS y validar que use solo `var(--...)` de `variables.css`.
- No crear nuevas variables locales de tema; no duplicar reglas que ya dependen de tokens globales.

### 6. Autorreporte
Al finalizar cambios en temas o tokens, entregar un resumen breve:

```text
## Theme-Tokens Guardian — Resumen
- Colores hardcodeados encontrados: X (reemplazados / justificados)
- Tokens creados: X | Tokens eliminados: X
- Archivos tocados: [lista de rutas]
```

## Referencia rápida del proyecto

- **Tokens base:** paleta (`--Palette-*`, `--Color-*`), espaciado (`--spacing-*`), tipografía (`--font-*`), bordes (`--border-*`), sombras (`--shadow-*`), transiciones (`--transition-*`).
- **Semánticas:** prefijo `--light-*` / `--dark-*` y variables activas sin prefijo que el tema cambia (ej. `--body-bg`, `--text-color-one`, `--Fondo-paginas`).
- **Tema oscuro:** clase `.dark-theme` en un ancestro; dentro de ella se reasignan las variables activas a las `--dark-*`.

Cuando haya duda entre añadir un token nuevo o reutilizar uno existente, preferir reutilizar. Si hace falta uno nuevo, añadirlo en `variables.css` con contraparte light y dark.
