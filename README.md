# IB_Scope

Aplicación de escritorio para gestión y seguimiento de procesos de Inbound.

## Estructura del Proyecto

```
IB_Scope/
├── src/
│   ├── main/                 # Proceso principal de Electron
│   │   ├── handlers/        # Manejadores IPC
│   │   ├── services/        # Servicios del proceso principal
│   │   └── main.js          # Punto de entrada del proceso principal
│   │
│   ├── renderer/            # Proceso de renderizado
│   │   ├── apps/           # Aplicaciones individuales
│   │   │   ├── dashboard/  # Panel de control principal
│   │   │   ├── feedback-tracker/  # Seguimiento de errores
│   │   │   ├── activity-scope/    # Alcance de actividad
│   │   │   ├── idle-time/         # Tiempo de inactividad
│   │   │   └── space-heatmap/     # Mapa de calor de espacio
│   │   │
│   │   ├── core/           # Componentes y utilidades compartidas
│   │   │   ├── controllers/  # Controladores reutilizables
│   │   │   ├── services/     # Servicios compartidos
│   │   │   └── utils/        # Utilidades comunes
│   │   │
│   │   ├── css/            # Estilos globales
│   │   ├── js/             # Scripts globales
│   │   └── views/          # Vistas compartidas
│   │
│   └── preload/            # Scripts de precarga
│
├── assets/                 # Recursos estáticos
│   ├── icons/             # Iconos de la aplicación
│   └── animations/        # Animaciones Lottie
│
└── config/                # Configuración de la aplicación
    └── apps/             # Configuración por aplicación
```

## Aplicaciones

### Dashboard

Panel de control principal que muestra métricas y resúmenes de todas las aplicaciones.

### Feedback Tracker

Sistema de seguimiento y gestión de errores de feedback, con:

- Tabla de errores con filtros
- Estadísticas en tiempo real
- Exportación a CSV
- Sistema de comentarios

### Activity Scope

Visualización y análisis del alcance de actividad.

### Idle Time

Monitoreo y análisis de tiempos de inactividad.

### Space Heatmap

Visualización de la distribución y uso del espacio.

## Tecnologías

- Electron
- HTML5/CSS3
- JavaScript (ES6+)
- Lottie para animaciones

## Desarrollo

```bash
# Instalar dependencias
npm install

# Iniciar en modo desarrollo
npm run dev

# Construir aplicación
npm run build
```

## Plan de Optimización

### 1. Modularización y Estructura ✅

- [x] Separación de procesos principal y renderizado
- [x] Estructura modular de aplicaciones
- [x] Sistema de rutas centralizado
- [x] Utilidades compartidas en core

### 2. Rendimiento

- [ ] Optimización de carga inicial
- [ ] Lazy loading de aplicaciones
- [ ] Caché de datos
- [ ] Compresión de assets

### 3. UI/UX

- [ ] Sistema de temas (claro/oscuro)
- [ ] Animaciones de transición
- [ ] Feedback visual mejorado
- [ ] Responsive design

### 4. Seguridad

- [ ] Validación de datos
- [ ] Sanitización de inputs
- [ ] Manejo seguro de archivos
- [ ] Protección contra inyección

### 5. Testing

- [ ] Tests unitarios
- [ ] Tests de integración
- [ ] Tests E2E
- [ ] Coverage reports

### 6. Documentación

- [x] README principal
- [x] Documentación por módulo
- [ ] Guías de desarrollo
- [ ] API documentation

### 7. CI/CD

- [ ] Pipeline de construcción
- [ ] Automatización de releases
- [ ] Control de versiones
- [ ] Monitoreo de errores

## Contribución

1. Fork el repositorio
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## Licencia

Este proyecto está bajo la Licencia MIT - ver el archivo [LICENSE.md](LICENSE.md) para más detalles.
