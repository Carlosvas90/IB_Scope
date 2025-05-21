# Sistema de Pruebas Visuales

Este directorio contiene el sistema de pruebas visuales para la aplicación, diseñado para mantener la consistencia visual y detectar cambios no deseados en la interfaz de usuario.

## Estructura del Sistema

```
tests/visual/
├── baseline/           # Líneas base de referencia
├── screenshots/        # Capturas actuales
├── regression.spec.js  # Pruebas de regresión
├── components.spec.js  # Pruebas de componentes
├── theme.spec.js       # Pruebas de temas
└── run-tests.js        # Script de ejecución
```

## Tipos de Pruebas

### 1. Pruebas Visuales Básicas

- Verificación de componentes individuales
- Pruebas de temas (claro/oscuro)
- Validación de interacciones (hover, estados)

### 2. Pruebas de Regresión Visual

- Comparación con líneas base establecidas
- Detección de cambios no deseados
- Validación de consistencia visual

## Comandos Disponibles

```bash
# Ejecutar pruebas visuales básicas
npm run test:visual

# Ejecutar pruebas de regresión
npm run test:regression

# Actualizar líneas base (usar cuando los cambios son intencionales)
npm run test:update-baseline
```

## Líneas Base

Las líneas base se almacenan en el directorio `baseline/` y incluyen:

- Capturas del tema claro
- Capturas del tema oscuro
- Capturas de componentes individuales

## Flujo de Trabajo

1. **Primera Ejecución**:

   - Se crean las líneas base iniciales
   - Se establecen los puntos de referencia

2. **Ejecuciones Posteriores**:

   - Se comparan las nuevas capturas con las líneas base
   - Se detectan cambios no deseados
   - Se validan las modificaciones intencionales

3. **Actualización de Líneas Base**:
   - Cuando se realizan cambios intencionales en el diseño
   - Cuando se modifica la estructura de componentes
   - Cuando se actualiza el sistema de temas

## Beneficios

- Detección temprana de cambios visuales no deseados
- Mantenimiento de la consistencia del diseño
- Validación automática de cambios en los temas
- Aseguramiento de la calidad visual de la aplicación

## Notas Importantes

1. **Antes de Actualizar Líneas Base**:

   - Asegurarse de que los cambios son intencionales
   - Verificar que los cambios son consistentes
   - Documentar los cambios realizados

2. **Al Ejecutar Pruebas**:

   - Verificar que el entorno es consistente
   - Asegurar que no hay cambios en curso
   - Revisar los resultados detalladamente

3. **En Caso de Fallos**:
   - Revisar las diferencias detectadas
   - Verificar si los cambios son intencionales
   - Actualizar las líneas base si es necesario

## Mantenimiento

- Revisar periódicamente las líneas base
- Actualizar las pruebas cuando se agregan nuevos componentes
- Mantener la documentación actualizada
- Verificar la consistencia de las pruebas
