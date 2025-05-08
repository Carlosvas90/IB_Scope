# IB_Scope

## Descripción

IB_Scope es una aplicación Electron que contiene varias aplicaciones como Feedback Tracker, Dashboard/Home, Activity Scope, IdleTime y SpaceHeatMap. Este proyecto está en proceso de optimización y modularización para mejorar su mantenibilidad y rendimiento.

## Plan de Optimización

El proyecto sigue un plan de optimización que incluye:

1. **Refactorización de Componentes JavaScript**: Dividir archivos grandes en módulos más pequeños.
2. **Arquitectura de Microservicios Frontend**: Implementar un EventBus centralizado para la comunicación entre componentes.
3. **Implementación de API Bridge**: Separar la lógica de negocio del frontend, considerando la integración con Python.
4. **Arquitectura de Contenedores para Vistas**: Convertir componentes en Web Components y optimizar la carga de módulos.
5. **Testing y Prevención de Regresiones**: Crear pruebas unitarias y de integración.
6. **Integración de Python (Server-Side)**: Desarrollar microservicios en Python para análisis de datos.
7. **Monitoreo y Telemetría**: Implementar un sistema de métricas de rendimiento en tiempo real.
8. **Optimización de Recursos**: Comprimir assets estáticos y optimizar la carga de fuentes e iconos.
9. **Gestión de Estado Centralizada**: Implementar un store centralizado para manejar el estado de la aplicación.
10. **Sistema de Actualización de Componentes**: Crear un mecanismo para actualizar componentes individualmente.

## Estructura del Proyecto

- `src/`: Contiene el código fuente de la aplicación.
  - `main/`: Proceso principal de Electron.
  - `renderer/`: Código del lado del cliente.
    - `apps/`: Aplicaciones individuales.
    - `core/`: Módulos centrales y utilidades.
    - `js/`: Scripts globales.
    - `views/`: Vistas HTML.
    - `css/`: Estilos globales.
  - `preload/`: Scripts de preload.
- `config/`: Archivos de configuración.
- `assets/`: Recursos gráficos y multimedia.

## Instrucciones de Uso

1. Clona el repositorio.
2. Instala las dependencias con `npm install`.
3. Ejecuta la aplicación con `npm start`.

## Contribución

Las contribuciones son bienvenidas. Por favor, sigue el plan de optimización y asegúrate de que tu código esté bien documentado y probado.
