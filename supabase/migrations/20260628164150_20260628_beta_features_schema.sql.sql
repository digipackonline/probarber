-- Beta Features Schema for BarberPro
-- Created: 2026-06-28

-- ============================================
-- 1. FEEDBACK SYSTEM
-- ============================================

CREATE TABLE IF NOT EXISTS feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  type TEXT NOT NULL CHECK (type IN ('suggestion', 'bug', 'question', 'other')),
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  url TEXT,
  user_agent TEXT,
  metadata JSONB DEFAULT '{}',
  status TEXT DEFAULT 'new' CHECK (status IN ('new', 'in_progress', 'resolved', 'closed')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_feedback_tenant ON feedback(tenant_id);
CREATE INDEX idx_feedback_user ON feedback(user_id);
CREATE INDEX idx_feedback_status ON feedback(status);
CREATE INDEX idx_feedback_type ON feedback(type);

ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select_own_feedback" ON feedback FOR SELECT
  TO authenticated USING (tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid()));

CREATE POLICY "insert_feedback" ON feedback FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "admin_feedback" ON feedback FOR ALL
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'super_admin'
    )
  );

-- ============================================
-- 2. ACTIVITY LOGS
-- ============================================

CREATE TABLE IF NOT EXISTS activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id UUID,
  details JSONB DEFAULT '{}',
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_logs_tenant ON activity_logs(tenant_id);
CREATE INDEX idx_logs_user ON activity_logs(user_id);
CREATE INDEX idx_logs_action ON activity_logs(action);
CREATE INDEX idx_logs_created ON activity_logs(created_at DESC);
CREATE INDEX idx_logs_entity ON activity_logs(entity_type, entity_id);

ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select_own_tenant_logs" ON activity_logs FOR SELECT
  TO authenticated USING (tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid()));

CREATE POLICY "insert_logs" ON activity_logs FOR INSERT
  TO authenticated WITH CHECK (tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid()));

CREATE POLICY "admin_logs" ON activity_logs FOR ALL
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'super_admin'
    )
  );

-- ============================================
-- 3. USER ONBOARDING PROGRESS
-- ============================================

CREATE TABLE IF NOT EXISTS user_onboarding (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  steps_completed TEXT[] DEFAULT '{}',
  tour_completed BOOLEAN DEFAULT FALSE,
  tour_skipped BOOLEAN DEFAULT FALSE,
  current_step INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_onboarding_user ON user_onboarding(user_id);
CREATE INDEX idx_onboarding_tenant ON user_onboarding(tenant_id);

ALTER TABLE user_onboarding ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select_own_onboarding" ON user_onboarding FOR SELECT
  TO authenticated USING (user_id = auth.uid());

CREATE POLICY "insert_own_onboarding" ON user_onboarding FOR INSERT
  TO authenticated WITH CHECK (user_id = auth.uid());

CREATE POLICY "update_own_onboarding" ON user_onboarding FOR UPDATE
  TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- ============================================
-- 4. VERSION UPDATES
-- ============================================

CREATE TABLE IF NOT EXISTS version_updates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version TEXT NOT NULL UNIQUE,
  release_date DATE NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  features TEXT[] DEFAULT ARRAY[]::TEXT[],
  bug_fixes TEXT[] DEFAULT ARRAY[]::TEXT[],
  improvements TEXT[] DEFAULT ARRAY[]::TEXT[],
  is_major BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_seen_updates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  version TEXT NOT NULL REFERENCES version_updates(version),
  seen_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, version)
);

CREATE INDEX idx_seen_updates_user ON user_seen_updates(user_id);

ALTER TABLE user_seen_updates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select_own_seen" ON user_seen_updates FOR SELECT
  TO authenticated USING (user_id = auth.uid());

CREATE POLICY "insert_own_seen" ON user_seen_updates FOR INSERT
  TO authenticated WITH CHECK (user_id = auth.uid());

-- ============================================
-- 5. SERVICE HEALTH CHECKS
-- ============================================

CREATE TABLE IF NOT EXISTS service_health (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_name TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('operational', 'degraded', 'down', 'maintenance')),
  response_time_ms INTEGER,
  details JSONB DEFAULT '{}',
  checked_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_health_service ON service_health(service_name);
CREATE INDEX idx_health_checked ON service_health(checked_at DESC);

ALTER TABLE service_health ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_health" ON service_health FOR ALL
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'super_admin')
    )
  );

-- ============================================
-- 6. HELP CENTER ARTICLES
-- ============================================

CREATE TABLE IF NOT EXISTS help_articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  category TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  order_index INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_help_category ON help_articles(category);
CREATE INDEX idx_help_active ON help_articles(is_active);

ALTER TABLE help_articles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select_active_articles" ON help_articles FOR SELECT
  TO authenticated, anon USING (is_active = TRUE);

CREATE POLICY "admin_articles" ON help_articles FOR ALL
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'super_admin')
    )
  );

-- ============================================
-- 7. APP SETTINGS FOR BETA MODE
-- ============================================

-- Insert beta mode setting
INSERT INTO app_settings (key, value, description)
VALUES ('beta_mode', 'true', 'Enable beta mode banner and warnings')
ON CONFLICT (key) DO UPDATE SET value = 'true';

INSERT INTO app_settings (key, value, description)
VALUES ('app_version', '"2.0.0"', 'Current application version')
ON CONFLICT (key) DO UPDATE SET value = '"2.0.0"';

INSERT INTO app_settings (key, value, description)
VALUES ('show_changelog', 'true', 'Show changelog on new version')
ON CONFLICT (key) DO NOTHING;

-- ============================================
-- 8. SEED INITIAL VERSION
-- ============================================

INSERT INTO version_updates (version, release_date, title, description, features, bug_fixes, improvements, is_major) VALUES
('2.0.0', '2026-06-28', 'Lanzamiento Beta',
'BarberPro está listo para su lanzamiento Beta. Gracias por ser parte de esta etapa.', 
ARRAY['Sistema multi-idioma (Español, Portugués, Inglés)', 'Multi-moneda para 8 países', 'Centro de Ayuda integrado', 'Onboarding mejorado con progreso', 'Tour guiado para nuevos usuarios', 'Sistema de feedback integrado']::TEXT[],
ARRAY[]::TEXT[],
ARRAY['Mejoras en la experiencia de usuario', 'Estados vacíos más amigables', 'Logs de actividad del sistema']::TEXT[],
TRUE);

-- ============================================
-- 9. SEED HELP ARTICLES
-- ============================================

INSERT INTO help_articles (slug, category, title, content, order_index) VALUES
('primeros-pasos', 'primeros_pasos', 'Primeros pasos con BarberPro',
'# Primeros pasos

¡Bienvenido a BarberPro! Esta guía te ayudará a configurar tu barbería en unos minutos.

## Paso 1: Completa tu perfil
Ve a **Configuración** → **Perfil** y agrega:
- Foto de perfil
- Teléfono de contacto
- Zona horaria

## Paso 2: Configura tu barbería
Durante el onboarding completaste los datos básicos. Si necesitas modificarlos:
1. Ve a **Configuración**
2. Haz clic en **Editar datos de la barbería**

## Paso 3: Crea tus servicios
Los servicios son lo que ofreces en tu barbería. Ejemplos:
- Corte de cabello
- Afeitado clásico
- Arreglo de barba

Ve a **Servicios** → **Crear servicio**

## Paso 4: Agrega barberos
Los barberos son tus profesionales. Cada uno puede:
- Tener su propio calendario
- Ver sus citas
- Gestionar sus clientes

Ve a **Barberos** → **Agregar barbero**

## paso 5: ¡Empieza a recibir turnos!
Una vez configurado, tus clientes pueden:
- Agendar citas online
- Ver disponibilidad en tiempo real
- Recibir confirmaciones automáticas', 1),

('crear-servicio', 'primeros_pasos', 'Cómo crear el primer servicio',
'# Cómo crear un servicio

Los servicios son las categorías de trabajo que realizas en tu barbería.

## Pasos para crear un servicio

1. Ve a **Servicios** en el menú lateral
2. Haz clic en **+ Crear servicio**
3. Completa los datos:
   - **Nombre**: Ejemplo "Corte de cabello"
   - **Descripción**: Breve detalle del servicio
   - **Duración**: Tiempo estimado en minutos
   - **Precio**: Costo del servicio
   - **Categoría**: Para agrupar servicios similares

4. Haz clic en **Guardar**

## Tips
- Usa imágenes para servicios destacados
- Crea categorías para organizar mejor (Cortes, Barbas, Packages)
- Puedes asociar servicios específicos a barberos

## Precio variable
Si el precio varía según el barbero, déjalo en 0 y configura precios individuales.', 2),

('agregar-barbero', 'primeros_pasos', 'Cómo agregar un barbero',
'# Cómo agregar un barbero

Los barberos son los profesionales que trabajan en tu barbería.

## Pasos para agregar un barbero

1. Ve a **Barberos** en el menú lateral
2. Haz clic en **+ Agregar barbero**
3. Completa los datos:
   - **Nombre completo**
   - **Email** (para invitación)
   - **Teléfono**
   - **Foto de perfil** (opcional)

4. Configura sus horarios:
   - Días laborables
   - Horario de entrada y salida
   - Días de descanso

5. Asigna servicios:
   - Selecciona qué servicios ofrece
   - Puedes asignar precios especiales

## Invitación por email
El barbero recibirá un email con instrucciones para:
- Crear su cuenta
- Configurar su contraseña
- Acceder a su calendario

## Barbero sin acceso
Si prefieres que el barbero no tenga acceso al sistema:
- Omite el campo email
- Solo aparecerá en el calendario como recurso

## Barberos con múltiples sucursales
Puedes asignar un barbero a varias sucursales desde **Sucursales**.', 3),

('crear-sucursal', 'primeros_pasos', 'Cómo crear la primera sucursal',
'# Cómo crear una sucursal

Las sucursales son las ubicaciones físicas de tu barbería.

## Pasos para crear una sucursal

1. Ve a **Sucursales** en el menú lateral
2. Haz clic en **+ Nueva sucursal**
3. Completa los datos:
   - **Nombre**: Ejemplo "Sucursal Centro"
   - **Dirección**: Calle y número
   - **Ciudad**
   - **Teléfono de contacto**
   - **Email** (opcional)

4. Configura los horarios:
   - Horario de apertura
   - Horario de cierre
   - Días abiertos

5. Asigna barberos:
   - Selecciona qué barberos trabajan aquí
   - Define sus horarios específicos

## Sucursal principal
La primera sucursal se marca automáticamente como **Principal**.

## Múltiples sucursales
Si tienes varias barberías:
- Crea una sucursal por cada ubicación
- Cada una tiene su propia agenda
- Los clientes pueden elegir la sucursal al agendar

## Zona horaria
Configura la zona horaria correcta para:
- Mostrar horarios precisos
- Envío de recordatorios
- Reportes por fecha', 4),

('registrar-cliente', 'primeros_pasos', 'Cómo registrar un cliente',
'# Cómo registrar un cliente

Los clientes son los visitantes de tu barbería. Puedes registrarlos manualmente o dejar que se registren solos.

## Registro manual

1. Ve a **Clientes** en el menú lateral
2. Haz clic en **+ Nuevo cliente**
3. Completa los datos:
   - **Nombre completo**
   - **Teléfono** (recomendado)
   - **Email** (opcional, para recordatorios)
   - **Notas** (preferencias, alergias, etc.)
   - **Fecha de nacimiento** (para promociones)

4. Haz clic en **Guardar**

## Registro automático
Los clientes se registran automáticamente cuando:
- Agendan una cita online
- Completa el formulario de registro público

## Perfil del cliente
Al hacer clic en un cliente verás:
- Historial de citas
- Servicios realizados
- Total gastado
- Última visita
- Notas y preferencias

## Importar clientes
Si tienes una lista de clientes existentes:
1. Descarga la plantilla CSV
2. Completa los datos
3. Importa desde **Clientes** → **Importar**

## Programa de fidelidad
Activa el programa de fidelidad en **Configuración** → **Fidelidad** para recompensar a tus clientes frecuentes.', 5),

('crear-turno', 'primeros_pasos', 'Cómo crear el primer turno',
'# Cómo crear un turno

Los turnos son las citas o reservaciones de tus clientes.

## Pasos para crear un turno

### Desde la Agenda

1. Ve a **Agenda** en el menú lateral
2. Haz clic en el horario disponible o en **+ Nuevo turno**
3. Selecciona o busca un cliente
4. Configura el turno:
   - **Servicio**: Qué servicio realizarás
   - **Barbero**: Profesional asignado
   - **Sucursal**: Ubicación
   - **Fecha y hora**: Cuándo es la cita
   - **Duración**: Se configura automáticamente según el servicio

5. Haz clic en **Confirmar**

### Desde el calendario

1. Haz clic en un horario vacío
2. Se abrirá el modal de nuevo turno
3. Completa los datos del cliente si no existe

## Turnos online
Los clientes pueden agendar online cuando:
- Tienes la página de reservas activa
- Los barberos tienen horarios configurados
- Los servicios están publicados

## Estados del turno

- **Pendiente**: Turno creado, esperando confirmación
- **Confirmado**: Turno agendado y confirmado
- **En proceso**: El cliente está siendo atendido
- **Completado**: Servicio finalizado
- **Cancelado**: Turno cancelado
- **No show**: Cliente no asistió

## Recordatorios automáticos
Se envían automáticamente:
- 24 horas antes del turno
- 2 horas antes del turno

Configura los recordatorios en **Configuración** → **Notificaciones**.', 6),

('cobrar-servicio', 'primeros_pasos', 'Cómo cobrar un servicio',
'# Cómo cobrar un servicio

Registra los pagos de tus clientes para llevar un control preciso.

## Pasos para registrar un pago

1. Ve a **Pagos** en el menú lateral
2. Haz clic en **+ Nuevo pago**
3. Selecciona el cliente
4. Agrega los servicios realizados
5. El total se calcula automáticamente
6. Selecciona el método de pago:
   - Efectivo
   - Tarjeta de crédito
   - Tarjeta de débito
   - Transferencia
   - Wallet (Mercado Pago)

7. Si es necesario, agrega:
   - **Propina**: Cantidad adicional
   - **Descuento**: Código o porcentaje

8. Haz clic en **Registrar pago**

## Desde un turno existente

1. Ve a **Agenda**
2. Busca el turno completado
3. Haz clic en **Cobrar**
4. El sistema carga automáticamente los servicios del turno

## Facturación
Si necesitas emitir factura:
1. Registra el pago
2. Haz clic en **Generar factura**
3. Completa los datos fiscales
4. Descarga el comprobante

## Control de caja
En **Reportes** → **Caja** verás:
- Ingresos del día
- Métodos de pago utilizados
- Total de propinas
- Resumen por barbero

## Pagos con Mercado Pago
Si activaste Mercado Pago:
- Tus clientes pueden pagar online
- El pago se registra automáticamente
- Recibes notificaciones de cobro', 7),

('cambiar-plan', 'primeros_pasos', 'Cómo cambiar de plan',
'# Cómo cambiar de plan

BarberPro ofrece planes flexibles según tus necesidades.

## Ver planes disponibles

1. Ve a **Suscripción** en el menú
2. Verás tu plan actual y los disponibles

## Planes disponibles

### Plan Gratuito
- Hasta 50 turnos/mes
- 1 barbero
- Reportes básicos

### Plan Pro
- Turnos ilimitados
- Hasta 5 barberos
- WhatsApp integrado
- Marketing
- Programa de fidelidad

### Plan Premium
- Todo de Pro
- Barberos ilimitados
- Asistente IA
- Encuestas de satisfacción
- Sucursales ilimitadas

## Cambiar de plan

1. Ve a **Suscripción**
2. Haz clic en **Cambiar plan**
3. Selecciona el nuevo plan
4. Si es un upgrade:
   - Se cobra la diferencia prorrateada
   - Acceso inmediato a nuevas funciones

5. Si es downgrade:
   - Cambio al final del período actual
   - Sin reembolsos por días no usados

## Métodos de pago
- Mercado Pago (tarjeta, efectivo en puntos)
- Prueba gratuita de 14 días (sin tarjeta)

## Cancelar suscripción
Puedes cancelar en cualquier momento:
1. Ve a **Suscripción**
2. Haz clic en **Cancelar**
3. Tu cuenta pasa al plan gratuito
4. Los datos se conservan 90 días', 8),

('preguntas-frecuentes', 'faq', 'Preguntas frecuentes',
'# Preguntas frecuentes

## General

### ¿Cómo empiezo a usar BarberPro?
Registra tu barbería, completa el onboarding de 6 pasos y empieza a recibir turnos. Mira nuestra guía de **Primeros pasos**.

### ¿Puedo probar BarberPro gratis?
Sí, ofrecemos 14 días de prueba gratuita del Plan Pro. Sin tarjeta de crédito.

### ¿En qué idiomas está disponible?
Español, Portugués (Brasil) e Inglés. El sistema detecta automáticamente tu idioma.

---

## Pagos y Facturación

### ¿Qué métodos de pago aceptan?
Aceptamos Mercado Pago con tarjeta de crédito, débito, efectivo en puntos de pago y transferencia bancaria.

### ¿Puedo pagar año por adelantado?
Sí, ofrecemos 2 meses gratis en pagos anuales.

### ¿Cómo obtengo mi factura?
En **Pagos** → Selecciona el pago → **Generar factura**.

---

## Datos y Privacidad

### ¿Mis datos están seguros?
Sí, usamos Supabase con encriptación SSL, backups automáticos y Row Level Security.

### ¿Puedo exportar mis datos?
Sí, ve a **Configuración** → **Exportar datos**. Disponible en formato CSV y JSON.

### ¿Cómo elimino mi cuenta?
Ve a **Configuración** → **Cuenta** → **Eliminar cuenta**. Los datos se eliminan en 30 días.

---

## Soporte

### ¿Cómo contacto a soporte?
Email: soporte@barberpro.app
WhatsApp: Configurado en la app

### ¿Tienen capacitación?
Sí, ofrecemos onboarding gratuito. Agenda con nosotros.

### ¿Dónde reporto problemas?
Usa el botón **Reportar problema** en el menú o escribe a bugs@barberpro.app', 9);

-- ============================================
-- 10. TRIGGER FOR AUTO-CREATING ONBOARDING
-- ============================================

CREATE OR REPLACE FUNCTION create_user_onboarding()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_onboarding (user_id, tenant_id)
  VALUES (NEW.id, NULL)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_create_user_onboarding ON auth.users;
CREATE TRIGGER trigger_create_user_onboarding
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION create_user_onboarding();

-- ============================================
-- 11. FUNCTION TO LOG ACTIVITY
-- ============================================

CREATE OR REPLACE FUNCTION log_activity(
  p_tenant_id UUID,
  p_user_id UUID,
  p_action TEXT,
  p_entity_type TEXT DEFAULT NULL,
  p_entity_id UUID DEFAULT NULL,
  p_details JSONB DEFAULT '{}'
)
RETURNS UUID AS $$
DECLARE
  v_log_id UUID;
BEGIN
  INSERT INTO activity_logs (
    tenant_id, user_id, action, entity_type, entity_id, details
  ) VALUES (
    p_tenant_id, p_user_id, p_action, p_entity_type, p_entity_id, p_details
  ) RETURNING id INTO v_log_id;
  
  RETURN v_log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;