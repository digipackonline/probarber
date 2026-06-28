# Variables de Entorno - BarberPro

## Obligatorias para Producción

### Supabase (Configuradas automáticamente)
| Variable | Descripción | Ejemplo |
|----------|-------------|---------|
| `SUPABASE_URL` | URL del proyecto Supabase | `https://xxx.supabase.co` |
| `SUPABASE_ANON_KEY` | Clave pública anónima | `eyJhbGciOiJ...` |
| `SUPABASE_SERVICE_ROLE_KEY` | Clave de servicio (secreta) | `eyJhbGciOiJ...` |
| `SUPABASE_DB_URL` | URL de conexión a base de datos | `postgresql://...` |

**Frontend (.env):**
```env
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJ...
```

### Mercado Pago (Requeridas para pagos)
| Variable | Descripción | Cómo obtenerla |
|----------|-------------|----------------|
| `MERCADO_PAGO_ACCESS_TOKEN` | Token de acceso privado | Dashboard MP > Credenciales > Access Token |
| `MERCADO_PAGO_PUBLIC_KEY` | Clave pública | Dashboard MP > Credenciales > Public Key |

**Para producción:** Usar credenciales de PRODUCCIÓN
**Para testing:** Usar credenciales de SANDBOX

## Opcionales pero Recomendadas

### Email con Resend
| Variable | Descripción | Default |
|----------|-------------|---------|
| `RESEND_API_KEY` | API key de Resend para envío de emails | - (emails deshabilitados) |
| `FROM_EMAIL` | Email remitente | `pagos@barberpro.com` |

**Nota:** Si `RESEND_API_KEY` no está configurado, el sistema continuará funcionando pero no enviará emails.

### Seguridad del Cron
| Variable | Descripción | Default |
|----------|-------------|---------|
| `CRON_SECRET` | Secret para autenticar llamadas al cron | - (sin autenticación) |

**Recomendado:** Configurar un secret aleatorio para evitar llamadas no autorizadas.

## Configuración por Plataforma

### Vercel
1. Ir a Settings > Environment Variables
2. Agregar cada variable para Production, Preview y Development
3. Importante: NO commitiar `.env` al repositorio

### Supabase Edge Functions
Las variables se configuran automáticamente:
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_DB_URL`

**Variables adicionales a configurar:**
1. Ir a Project Settings > Edge Functions > Secrets
2. Agregar:
   - `MERCADO_PAGO_ACCESS_TOKEN`
   - `MERCADO_PAGO_PUBLIC_KEY`
   - `RESEND_API_KEY` (opcional)
   - `FROM_EMAIL` (opcional)
   - `CRON_SECRET` (opcional)

## Checklist de Producción

- [ ] `SUPABASE_URL` configurada
- [ ] `SUPABASE_ANON_KEY` configurada
- [ ] `MERCADO_PAGO_ACCESS_TOKEN` (producción) configurada
- [ ] `MERCADO_PAGO_PUBLIC_KEY` (producción) configurada
- [ ] Webhooks de Mercado Pago configurados
- [ ] `RESEND_API_KEY` configurada (emails)
- [ ] Dominio verificado en Resend (para emails)
- [ ] `CRON_SECRET` configurado
- [ ] SSL/HTTPS habilitado
- [ ] Dominio personalizado configurado

## Webhook de Mercado Pago

URL a configurar en el dashboard de Mercado Pago:
```
https://<tu-proyecto>.supabase.co/functions/v1/mp-webhook
```

## Cron Job (Reintentos automáticos)

Configurar un cron job en:
- Supabase Dashboard > Database > Cron
- O servicio externo (Vercel Cron, cron-job.org, etc.)

URL a llamar cada hora:
```
POST https://<tu-proyecto>.supabase.co/functions/v1/payment-cron
Authorization: Bearer <CRON_SECRET>
```
