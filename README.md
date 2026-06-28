# BarberPro

SaaS completo para la gestión de barberías y peluquerías. Control de citas, barberos, servicios, pagos, marketing, fidelización y más.

## Características

- **Agenda inteligente** — calendario semanal con drag-to-resize, estados de cita (confirmada, completada, cancelada, no-show)
- **Portal de reservas público** — tus clientes agendan sin registro, seleccionando barbero, servicio, fecha y hora
- **Gestión de barberos** — horarios, comisiones por servicio, días libres
- **Catálogo de servicios** — precios, duración, barberos asignados
- **Clientes y fidelización** — historial de visitas, puntos por compra, nivel VIP
- **Pagos** — múltiples métodos, propinas, descuentos con cupones
- **Marketing** — campañas por email/WhatsApp/SMS con segmentación de clientes
- **Promociones** — cupones con descuento por porcentaje o monto fijo
- **Reportes** — ingresos, servicios más vendidos, barberos top, tendencias
- **Notificaciones** — log completo de envíos de campañas
- **IA integrada** — asistente con sugerencias de horarios, análisis de ingresos, recordatorios
- **Multi-sucursal** — gestión de múltiples locales

## Tech Stack

- **Frontend:** React 18 + TypeScript + Vite + Tailwind CSS
- **Backend:** Supabase (Postgres, Auth, Edge Functions)
- **Icons:** Lucide React
- **Dates:** date-fns

## Instalación

```bash
npm install
npm run dev
```

## Variables de entorno

Crea un archivo `.env` en la raíz:

```env
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu-anon-key
```

## Estructura del proyecto

```
src/
  components/     — Layout, UI primitives (Button, Card, Modal, Input, Select, Badge)
  context/        — AuthContext (autenticación con Supabase)
  lib/            — Cliente Supabase + tipos de base de datos
  pages/          — Todas las vistas de la aplicación
supabase/
  migrations/     — Esquema completo de la base de datos
  functions/      — Edge functions (send-campaign)
```

## Deploy

El proyecto está configurado para deploy estático con Vite. Compila con:

```bash
npm run build
```

El output se genera en `dist/`.

## Licencia

MIT
