# Mercado Pago Integration - Guía de Configuración

## Variables de Entorno Requeridas

Para que la integración con Mercado Pago funcione, necesitas configurar las siguientes variables de entorno en Supabase:

### Credenciales de Mercado Pago
| Variable | Descripción | Cómo obtenerla |
|----------|-------------|----------------|
| `MERCADO_PAGO_ACCESS_TOKEN` | Token de acceso (privado) | Mercado Pago Dashboard > Credenciales |
| `MERCADO_PAGO_PUBLIC_KEY` | Clave pública | Mercado Pago Dashboard > Credenciales |

### Credenciales de Email (Resend)
| Variable | Descripción |
|----------|-------------|
| `RESEND_API_KEY` | API key de Resend para envío de emails |
| `FROM_EMAIL` | Email remitente (ej: pagos@barberpro.com) |

### Seguridad del Cron
| Variable | Descripción |
|----------|-------------|
| `CRON_SECRET` | Secret para autenticar llamadas al cron job |

## Configuración en Mercado Pago

### 1. Crear Aplicación
1. Ir a [Mercado Pago Developers](https://www.mercadopago.com.ar/developers)
2. Crear una nueva aplicación
3. Seleccionar "Checkout Pro" como producto

### 2. Obtener Credenciales
1. En el dashboard de la aplicación, ir a "Credenciales"
2. Copiar:
   - Access Token (producción o sandbox)
   - Public Key

### 3. Configurar Webhooks
1. Ir a "Webhooks" en el dashboard
2. Agregar la URL: `https://<tu-proyecto>.supabase.co/functions/v1/mp-webhook`
3. Seleccionar eventos: `payments`

### 4. Configurar URL de Notificaciones
En la configuración de la aplicación, la URL de webhook ya estará configurada automáticamente en nuestras preferencias de checkout.

## Endpoints Disponibles

### Checkout (crear preferencia de pago)
```
POST /functions/v1/mp-checkout
Body: {
  "tenant_id": "uuid",
  "plan_slug": "pro" | "premium",
  "billing_cycle": "monthly" | "yearly",
  "success_url": "https://...", // opcional
  "failure_url": "https://...", // opcional
  "pending_url": "https://..."  // opcional
}
```

### Webhook (notificaciones de MP)
```
POST /functions/v1/mp-webhook
```
Recibe notificaciones de Mercado Pago y actualiza automáticamente:
- Estado de suscripción
- Genera facturas
- Registra transacciones
- Envía emails de confirmación/rechazo

### Gestión de Suscripciones
```
POST /functions/v1/mp-subscription?action=create   - Crear suscripción recurrente
POST /functions/v1/mp-subscription?action=cancel   - Cancelar suscripción
POST /functions/v1/mp-subscription?action=charge   - Cobro manual/reintento
GET  /functions/v1/mp-subscription?tenant_id=...  - Obtener estado
```

### Cron Job (automatización)
```
POST /functions/v1/payment-cron
Authorization: Bearer <CRON_SECRET>
```
Procesa:
- Reintentos de pagos fallidos (hasta 3 intentos)
- Expiración de trials (automático a plan free)
- Envío de emails de estado

## Flujo de Pago

### Pago Único (Checkout Pro)
1. Usuario selecciona plan → Frontend llama a `mp-checkout`
2. Función crea preferencia en Mercado Pago
3. Usuario es redirigido a Checkout Pro
4. Usuario completa pago
5. Mercado Pago notifica a `mp-webhook`
6. Webhook actualiza suscripción y envía email

### Suscripción Recurrente
1. Usuario guarda tarjeta (tokenización)
2. Frontend llama a `mp-subscription?action=create`
3. Función crea customer en MP y asocia tarjeta
4. Cada mes/ciclo, el cron dispara el cobro automático
5. Si falla, sistema reintenta hasta 3 veces con backoff

## Estados de Suscripción

| Estado | Descripción |
|--------|-------------|
| `trial` | Período de prueba activo (14 días) |
| `active` | Suscripción activa y al día |
| `past_due` | Pago fallido, en reintento |
| `canceled` | Cancelada por usuario o sistema |
| `expired` | Completamente desactivada |

## Emails Enviados

1. **Pago Exitoso**: Confirmación de cobro
2. **Pago Rechazado**: Notificación con acciones
3. **Trial Expirado**: Aviso de cambio a plan free
4. **Reintento Exitoso**: Cobro posterior exitoso

## Producción

Antes de ir a producción:

1. Usar credenciales de **producción** de Mercado Pago
2. Configurar dominio real en `FROM_EMAIL` (verificado en Resend)
3. Agregar `CRON_SECRET` seguro
4. Configurar cron job en Supabase o servicio externo (diario cada hora)
5. Verificar que HTTPS esté habilitado
