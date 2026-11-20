# Chrono

PWA ligera y minimalista diseñada exclusivamente para móvil para el control de tiempo, registro de actividades y cálculo de rentabilidad por proyecto con costo pactado.

## Características

- **Diseño exclusivamente móvil**: Modo oscuro de alto contraste, cero emojis, cero efectos `:hover`, interacción táctil optimizada (`:active` haptic/scale feedback).
- **Precisión sin consumo de batería**: Cálculo estricto mediante deltas de timestamps (`Date.now()`). No requiere hilos activos en segundo plano; el tiempo transcurrido es exacto incluso si el navegador o la app se cierran.
- **Flujo de Cronómetro Rápido**:
  - Inicia con un solo toque.
  - Asignable a un proyecto y actividad en tiempo real o al pausar/detener.
  - Prevención de detención accidental: Botón de pausa único mientras corre; al pausar se habilitan "Continuar" y "Detener".
- **Rentabilidad en tiempo real**:
  - Cada proyecto tiene un costo total pactado.
  - La ganancia por hora se calcula dinámicamente: `Costo del Proyecto / Horas Totales Registradas`.
  - Cada actividad muestra cuánto ganaste según su duración proporcional.
- **Alertas por olvido**: Umbral configurable (30, 45, 60, 90, 120 min) con Web Audio API (síntesis de campana suave), vibración háptica (`navigator.vibrate`) y Notificaciones del Sistema.
- **Wake Lock**: Evita que la pantalla se apague mientras el temporizador está en pantalla activa.
- **Persistencia y Respaldo**: Almacenamiento local en IndexedDB, exportación/restauración de copias de seguridad en JSON y exportación de reportes a CSV.
- **PWA Offline**: Service Worker con soporte sin conexión e instalación en pantalla de inicio.

## Desarrollo Local

```bash
# Instalar dependencias
npm install

# Iniciar servidor de desarrollo
npm run dev

# Compilar para producción
npm run build
```

## Despliegue en GitHub Pages

Incluye workflow automatizado en `.github/workflows/deploy.yml` que compila y publica en GitHub Pages al hacer push a la rama `main`.
