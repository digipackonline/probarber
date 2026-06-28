# Informe Tecnico: Escalado Internacional BarberPro

**Fecha:** 2026-06-28  
**Version:** 2.0.0  
**Autor: CTO** BarberPro

---

## 1. Mejoras Realizadas

### 1.1 Sistema de Internacionalizacion (i18n)

**Implementacion completa de multi-idioma:**
- Tres idiomas soportados: Espanol (es), Portugues Brasil (pt-BR), Ingles (en)
- Deteccion automatica del idioma del navegador
- Persistencia de preferencia en localStorage
- Contexto React `I18nProvider` con hook `useI18n()`
- Funcion de traduccion `t(key, params)` con interpolacion de parametros
- Formateo localizado de monedas y fechas
- Archivos de traduccion completos en `src/lib/i18n/translations/`

**Componentes de UI:**
- `LanguageSelector` - Dropdown con selector de idioma
- `CurrencySelector` - Dropdown con selector de moneda
- `CountrySelector` - Dropdown con selector de pais
- `LocaleSettings` - Panel combinado para configuracion

### 1.2 Multi-Moneda Regional

**8 monedas soportadas:**
| Codigo | Nombre | Simbolo | Decimales |
|--------|--------|---------|-----------|
| ARS | Peso Argentino | $ | 2 |
| BRL | Real Brasileno | R$ | 2 |
| USD | Dolar Estadounidense | $ | 2 |
| MXN | Peso Mexicano | $ | 2 |
| CLP | Peso Chileno | $ | 0 |
| COP | Peso Colombiano | $ | 0 |
| PEN | Sol Peruano | S/ | 2 |
| UYU | Peso Uruguayo | $ | 2 |

**Funcionalidades:**
- Formateo automatico segun locale (`formatCurrency()`)
- Mapeo automatico pais → moneda
- Deteccion de pais por zona horaria

### 1.3 Deteccion Automatica de Region

**Metodos de deteccion:**
1. **Idioma:** `navigator.language` → mapeo a es/pt-BR/en
2. **Pais:** `Intl.DateTimeFormat().resolvedOptions().timeZone` → mapeo geografico

**Zonas horarias mapeadas:**
- `America/Argentina/*`, `America/Buenos_Aires` → AR
- `America/Sao_Paulo`, `America/Brasilia` → BR
- `America/Mexico*` → MX
- `America/Santiago` → CL
- `America/Bogota` → CO
- `America/Lima` → PE
- `America/Montevideo` → UY
- `America/New_York`, `Los_Angeles`, `Chicago` → US

### 1.4 Arquitectura de Proveedores de Pago

**Patron Strategy implementado:**
- Interfaz `PaymentProvider` con 11 metodos estandarizados
- `MercadoPagoProvider` completamente implementado
- Registro de proveedores por pais (`COUNTRY_PROVIDER_MAP`)
- Seleccion automatica del mejor proveedor (`getBestProvider()`)

**Metodos de la interfaz:**
```typescript
interface PaymentProvider {
  createCheckout(params: CheckoutParams): Promise<CheckoutResult>;
  createCustomer(params: CustomerParams): Promise<CustomerResult>;
  getCustomer(customerId: string): Promise<CustomerResult>;
  attachPaymentMethod(customerId: string, paymentMethodId: string): Promise<PaymentMethodResult>;
  createSubscription(params: SubscriptionParams): Promise<SubscriptionResult>;
  getSubscription(subscriptionId: string): Promise<SubscriptionResult>;
  cancelSubscription(subscriptionId: string): Promise<void>;
  chargeCustomer(params: ChargeParams): Promise<ChargeResult>;
  refund(chargeId: string, amount?: number): Promise<RefundResult>;
  verifyWebhookSignature(payload: string, signature: string): boolean;
  parseWebhookEvent(payload: string): Promise<WebhookEvent>;
}
```

### 1.5 Sistema de Feature Flags

**Arquitectura en 3 niveles:**
1. **Defaults:** Tabla `feature_flags` en DB
2. **Plan:** Mapa codigo duro plan → features (Free/Pro/Premium)
3. **Tenant:** Tabla `tenant_features` para overrides especificos

**Features disponibles:**
- `ai_assistant` - Asistente IA
- `whatsapp` - Integracion WhatsApp
- `marketing` - Herramientas de marketing
- `loyalty` - Programa de fidelidad
- `reports` - Reportes avanzados
- `surveys` - Encuestas
- `notifications` - Notificaciones

**Implementacion en UI:**
```tsx
<FeatureFlagsProvider tenantId={tenantId} planSlug={planSlug}>
  <App />
</FeatureFlagsProvider>

// Uso:
const { isFeatureEnabled } = useFeatureFlags();
const canUseWhatsApp = isFeatureEnabled('whatsapp');
```

### 1.6 White-Label Branding

**Tabla `app_settings`:**
- `brandName` - Nombre de la marca
- `brandTagline` - Eslogan
- `brandLogo` - URL del logo
- `brandFavicon` - URL del favicon
- `brandPrimaryColor` - Color primario (#hex)
- `supportEmail` - Email de soporte
- `supportWhatsapp` - WhatsApp de soporte
- `socialFacebook/Instagram/Tiktok` - Redes sociales

**Cache inteligente:**
- TTL de 5 minutos
- Invalidacion automatica en actualizacion
- Hook `useApplyBranding()` aplica estilos en runtime

**Aplicacion dinamica:**
```typescript
applyBranding(config);
// Actualiza: document.title, meta theme-color, favicon, CSS vars
```

### 1.7 Base de Datos

**Nuevas tablas creadas:**
- `app_settings` - Configuracion global
- `languages` - Idiomas disponibles
- `translations` - Traducciones (preparado para DB)
- `countries` - Paises soportados
- `currencies` - Monedas soportadas
- `regional_pricing` - Precios por region
- `feature_flags` - Flags globales
- `tenant_features` - Flags por tenant
- `payment_providers` - Proveedores configurados
- `tenant_payment_config` - Config por tenant

**Extensiones a tablas existentes:**
- `tenants`: `country_code`, `currency_code`, `language_code`, campos de branding
- `profiles`: `preferred_language`, `preferred_country`, `preferred_currency`

---

## 2. Preparado para Futuras Integraciones

### 2.1 Proveedores de Pago Adicionales

**Listo para implementar:**
- **Stripe:** Crear `StripeProvider` implementando `PaymentProvider`
- **PayPal:** Crear `PayPalProvider` implementando `PaymentProvider`
- **PIX (Brasil):** Crear `PIXProvider` implementando `PaymentProvider`

**Pasos para agregar Stripe:**
```typescript
// src/lib/payments/stripe.ts
export class StripeProvider implements PaymentProvider {
  // Implementar todos los metodos de la interfaz
}

// Registro en src/lib/payments/index.ts
import { StripeProvider } from './stripe';

providers.set('stripe', new StripeProvider(apiKey));
COUNTRY_PROVIDER_MAP['US'] = ['stripe', 'paypal'];
```

### 2.2 Traducciones Dinamicas desde DB

**Infraestructura preparada:**
- Tabla `translations` con estructura `key`, `language_code`, `value`
- Tabla `languages` con estado `is_active`
- Solo requiere modificar `loadAppConfig()` para consultar DB

**Beneficio:** Traducciones editables desde panel admin sin redeploy

### 2.3 Multi-Tenant White-Label Completo

**Preparado para:**
- Cada tenant con su propia marca (logo, colores, dominio)
- URLs personalizadas: `barberia1.barberpro.app`, `barberia2.barberpro.app`
- Configuracion de payment provider por tenant

**Requiere:** Middleware de dominio + panel de configuracion admin

### 2.4 Feature Flags Dinamicos

**Implementacion actual:**
- Plan features hardcoded en `loadPlanFeatures()`

**Preparado para:**
- Migrar a tabla `plan_features` para configuracion dinamica
- Panel admin para gestionar features por plan

### 2.5 Localizacion Adicional

**Infraestructura extensible:**
- Agregar nuevo idioma: crear archivo en `translations/xx.json` + registro
- Agregar pais/moneda: insert en tablas + constantes
- Zona horaria: extender `detectCountryFromTimezone()`

---

## 3. Cambios que Requieren Configuracion Externa

### 3.1 Credenciales de Mercado Pago (Produccion)

**Variables de entorno requeridas:**
```env
VITE_MERCADO_PAGO_ACCESS_TOKEN=APP_USR-xxx
VITE_MERCADO_PAGO_PUBLIC_KEY=APP_USR-xxx
MERCADO_PAGO_ACCESS_TOKEN=APP_USR-xxx
MERCADO_PAGO_PUBLIC_KEY=APP_USR-xxx
```

**Acciones:**
1. Crear aplicacion en developers.mercadopago.com
2. Obtener credenciales de produccion
3. Configar webhook IPN en el dashboard
4. Habilitar Checkout Pro y Preapproval

### 3.2 Stripe (Futuro)

**Variables de entorno:**
```env
STRIPE_SECRET_KEY=sk_live_xxx
STRIPE_PUBLISHABLE_KEY=pk_live_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
```

**Acciones:**
1. Crear cuenta en dashboard.stripe.com
2. Configurar productos y precios
3. Configurar webhook endpoint
4. Habilitar Billing API

### 3.3 PayPal (Futuro)

**Variables de entorno:**
```env
PAYPAL_CLIENT_ID=xxx
PAYPAL_CLIENT_SECRET=xxx
PAYPAL_WEBHOOK_ID=xxx
```

### 3.4 Resend (Emails Transaccionales)

**Variables de entorno:**
```env
RESEND_API_KEY=re_xxx
EMAIL_FROM=noreply@barberpro.app
```

**Plantillas requeridas:**
- `welcome-email` - Bienvenida
- `payment-success` - Pago exitoso
- `payment-failed` - Pago rechazado
- `trial-expiring` - Trial por expirar
- `subscription-cancelled` - Suscripcion cancelada

### 3.5 Supabase

**Configuracion de RLS:**
- Todas las tablas tienen Row Level Security habilitado
- Politicas verificadas para multi-tenant

**Variables de entorno:**
```env
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=eyJxxx
SUPABASE_SERVICE_ROLE_KEY=eyJxxx
```

### 3.6 Dominio y SSL

**Para produccion:**
1. Configurar dominio personalizado
2. Certificados SSL (Vercel lo maneja automaticamente)
3. DNS records para subdominios white-label

---

## 4. Cambios en Bundle

**Antes (SaaS basico):** ~72 KB  
**Despues (i18n + providers):** ~100 KB  
**Incremento:** +28 KB (38%)

**Justificado por:**
- 3 archivos de traduccion completos (~15 KB)
- Sistema de pagos abstracto (~8 KB)
- Feature flags + config (~5 KB)

**Optimizaciones posibles:**
- Lazy loading de traduccion por idioma
- Compresion Brotli en Vercel (reduce ~30%)

---

## 5. Checklist de Produccion

- [x] Sistema i18n implementado
- [x] Multi-moneda con 8 monedas
- [x] Deteccion automatica de region
- [x] Interfaz PaymentProvider
- [x] MercadoPagoProvider funcional
- [x] Feature flags en 3 niveles
- [x] White-label branding con cache
- [x] Migracion de DB ejecutada
- [x] Build exitoso
- [ ] Migrar strings hardcoded a `t()`
- [ ] Configurar credenciales MP produccion
- [ ] Configurar Resend para emails
- [ ] Pruebas end-to-end en staging
- [ ] Auditoria WCAG AA final
- [ ] Prueba Lighthouse 90+

---

## 6. Archivos Clave

| Archivo | Proposito |
|---------|-----------|
| `src/lib/i18n/index.tsx` | Provider i18n principal |
| `src/lib/i18n/translations/*.json` | Traducciones ES/PT-BR/EN |
| `src/lib/payments/types.ts` | Interfaz PaymentProvider |
| `src/lib/payments/mercadopago.ts` | Implementacion MP |
| `src/lib/payments/index.ts` | Registro de providers |
| `src/lib/features.tsx` | Sistema de feature flags |
| `src/lib/config.ts` | Configuracion white-label |
| `src/components/LocaleSelector.tsx` | Selectores de idioma/moneda/pais |
| `supabase/migrations/*_internationalization_schema.sql` | Schema DB |

---

## 7. Recomendaciones

### Inmediato
1. Migrar strings hardcoded en LandingPage, PricingPage, OnboardingPage
2. Testing con usuarios en Brasil (PT-BR) y EEUU (EN)
3. Configurar webhook IPN en Mercado Pago produccion

### Corto Plazo
1. Implementar Stripe para mercado USA
2. Panel admin para gestionar feature flags
3. Panel de configuracion white-label para tenants

### Mediano Plazo
1. PIX para Brasil (requiere integracion con banco brasileno)
2. Traducciones dinamicas desde DB
3. Subdominios personalizados por tenant

---

**Fin del Informe Tecnico**
