# Pruebas de Variables CSS

## 1. Pruebas de Variables Base

### Colores Base

- [ ] Verificar que `--light-white` y `--dark-white` tienen el contraste correcto
- [ ] Comprobar que `--light-gray-*` y `--dark-gray-*` tienen la escala correcta
- [ ] Validar que `--light-blue-*` y `--dark-blue-*` mantienen la consistencia
- [ ] Verificar que `--light-pink` y `--dark-pink` son visibles en ambos temas

### Variables Semánticas

- [ ] Comprobar que `--light-bg-main` y `--dark-bg-main` tienen el contraste adecuado
- [ ] Validar que `--light-text-primary` y `--dark-text-primary` son legibles
- [ ] Verificar que `--light-accent-blue` y `--dark-accent-blue` son consistentes
- [ ] Comprobar que los estados (`--status-*`) son distinguibles

## 2. Pruebas de Componentes

### Titlebar

- [ ] Verificar que el fondo usa `--bg-main` correctamente
- [ ] Comprobar que el borde inferior usa `--border-color`
- [ ] Validar que el texto usa `--text-primary`
- [ ] Verificar que los botones tienen el hover correcto

### Sidebar

- [ ] Comprobar que el borde derecho usa `--border-color`
- [ ] Validar que los iconos usan `--accent-blue`
- [ ] Verificar que el texto secundario es legible
- [ ] Comprobar que los hovers funcionan correctamente

### Navigation

- [ ] Verificar que los bordes redondeados son consistentes
- [ ] Comprobar que el texto principal y secundario son legibles
- [ ] Validar que los acentos son visibles
- [ ] Verificar que los hovers funcionan

### Components

- [ ] Comprobar que las tarjetas usan `--card-bg`
- [ ] Validar que los botones usan los colores de acento
- [ ] Verificar que los estados son visibles
- [ ] Comprobar que los hovers funcionan

## 3. Pruebas de Aplicaciones

### Feedback Tracker

- [ ] Verificar que la tabla usa los colores correctos
- [ ] Comprobar que los estados son distinguibles
- [ ] Validar que los modales usan `--card-bg`
- [ ] Verificar que los textos son legibles

## 4. Pruebas de Temas

### Tema Claro

- [ ] Verificar que todos los componentes son visibles
- [ ] Comprobar que el contraste es adecuado
- [ ] Validar que los acentos son visibles
- [ ] Verificar que los estados son distinguibles

### Tema Oscuro

- [ ] Verificar que todos los componentes son visibles
- [ ] Comprobar que el contraste es adecuado
- [ ] Validar que los acentos son visibles
- [ ] Verificar que los estados son distinguibles

## 5. Pruebas de Accesibilidad

### Contraste

- [ ] Verificar que el contraste texto/fondo cumple WCAG 2.1
- [ ] Comprobar que los estados tienen contraste suficiente
- [ ] Validar que los acentos son distinguibles

### Estados

- [ ] Verificar que los estados no dependen solo del color
- [ ] Comprobar que hay indicadores adicionales (iconos, texto)
- [ ] Validar que los estados son distinguibles en modo alto contraste

## 6. Pruebas de Rendimiento

### Carga

- [ ] Verificar que las variables se cargan correctamente
- [ ] Comprobar que no hay parpadeo al cambiar temas
- [ ] Validar que la transición entre temas es suave

### Memoria

- [ ] Verificar que no hay fugas de memoria
- [ ] Comprobar que las variables se liberan correctamente
- [ ] Validar que el rendimiento no se ve afectado

## Notas de Implementación

1. Ejecutar pruebas en ambos temas
2. Documentar cualquier problema encontrado
3. Priorizar problemas de accesibilidad
4. Mantener registro de cambios realizados
