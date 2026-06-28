import React, { useEffect, useState } from 'react';
import { Scissors, ChevronRight, Check, Calendar, Clock, MapPin, User, ArrowLeft } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { format, addDays } from 'date-fns';
import { es } from 'date-fns/locale';

type Step = 'branch' | 'service' | 'barber' | 'date' | 'time' | 'confirm' | 'done';

export default function BookingPage() {
  const [step, setStep] = useState<Step>('branch');
  const [branches, setBranches] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [barbers, setBarbers] = useState<any[]>([]);
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [selected, setSelected] = useState({
    branch: null as any,
    service: null as any,
    barber: null as any,
    date: '',
    time: '',
  });

  const [clientForm, setClientForm] = useState({ name: '', phone: '', email: '' });

  useEffect(() => { loadBranches(); }, []);

  async function loadBranches() {
    setLoading(true);
    const { data } = await supabase.from('branches').select('*').eq('is_active', true);
    setBranches(data ?? []);
    setLoading(false);
  }

  async function selectBranch(b: any) {
    setSelected(s => ({ ...s, branch: b }));
    setLoading(true);
    const { data } = await supabase.from('services').select('*').eq('is_active', true);
    setServices(data ?? []);
    setLoading(false);
    setStep('service');
  }

  async function selectService(sv: any) {
    setSelected(s => ({ ...s, service: sv }));
    setLoading(true);
    const { data: bsData } = await supabase.from('barber_services').select('barber_id').eq('service_id', sv.id);
    const barberIds = (bsData ?? []).map(x => x.barber_id);
    let q = supabase.from('barbers').select('*').eq('is_active', true);
    if (selected.branch) q = q.eq('branch_id', selected.branch.id);
    const { data } = await q;
    const filtered = barberIds.length > 0 ? (data ?? []).filter(b => barberIds.includes(b.id)) : (data ?? []);
    setBarbers(filtered.length > 0 ? filtered : (data ?? []));
    setLoading(false);
    setStep('barber');
  }

  async function selectBarber(b: any) {
    setSelected(s => ({ ...s, barber: b }));
    setStep('date');
  }

  async function selectDate(date: string) {
    setSelected(s => ({ ...s, date, time: '' }));
    setLoading(true);
    // Get existing appointments for this barber on this day
    const { data: existing } = await supabase.from('appointments')
      .select('start_time, end_time').eq('barber_id', selected.barber.id)
      .eq('appointment_date', date).neq('status', 'cancelled');

    // Get barber schedule for this day
    const dayOfWeek = new Date(date + 'T12:00:00').getDay();
    const { data: schedule } = await supabase.from('barber_schedules')
      .select('*').eq('barber_id', selected.barber.id).eq('day_of_week', dayOfWeek).maybeSingle();

    // Generate slots every 30 min from 9:00 to 19:30
    const startH = schedule ? parseInt(schedule.start_time.split(':')[0]) : 9;
    const endH = schedule ? parseInt(schedule.end_time.split(':')[0]) : 19;
    const duration = selected.service?.duration_minutes ?? 30;
    const slots: string[] = [];

    for (let h = startH; h < endH; h++) {
      for (let m = 0; m < 60; m += 30) {
        const slotStart = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
        const slotEndMin = h * 60 + m + duration;
        if (slotEndMin > endH * 60) break;
        const slotEnd = `${String(Math.floor(slotEndMin / 60)).padStart(2, '0')}:${String(slotEndMin % 60).padStart(2, '0')}`;

        // Check conflict
        const conflict = (existing ?? []).some(e => e.start_time < slotEnd && e.end_time > slotStart);
        if (!conflict) slots.push(slotStart);
      }
    }

    setAvailableSlots(slots);
    setLoading(false);
    setStep('time');
  }

  async function confirm() {
    if (!clientForm.name.trim() || !clientForm.phone.trim()) return;
    setSaving(true);

    // Create or find client
    let clientId: string;
    const { data: existingClient } = await supabase.from('clients').select('id').eq('phone', clientForm.phone).maybeSingle();
    if (existingClient) {
      clientId = existingClient.id;
    } else {
      const { data: newClient } = await supabase.from('clients').insert({
        full_name: clientForm.name, phone: clientForm.phone, email: clientForm.email || null,
        branch_id: selected.branch?.id ?? null
      }).select().single();
      clientId = newClient?.id ?? '';
    }

    if (!clientId) { setSaving(false); return; }

    const duration = selected.service?.duration_minutes ?? 30;
    const [h, m] = selected.time.split(':').map(Number);
    const endMin = h * 60 + m + duration;
    const end_time = `${String(Math.floor(endMin / 60)).padStart(2, '0')}:${String(endMin % 60).padStart(2, '0')}`;

    const { data: appt } = await supabase.from('appointments').insert({
      branch_id: selected.branch?.id ?? branches[0]?.id,
      barber_id: selected.barber.id,
      client_id: clientId,
      service_id: selected.service.id,
      appointment_date: selected.date,
      start_time: selected.time,
      end_time,
      status: 'confirmed',
      price: selected.service.price,
    }).select().single();

    // Trigger WhatsApp confirmation
    if (appt?.id) {
      const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
      const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
      try {
        await fetch(`${SUPABASE_URL}/functions/v1/whatsapp-automations`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${SUPABASE_ANON_KEY}` },
          body: JSON.stringify({ action: 'trigger', appointment_id: appt.id, type: 'confirmation' }),
        });
      } catch { /* silent fail */ }
    }

    setSaving(false);
    setStep('done');
  }

  const STEP_LABELS: Record<Step, string> = {
    branch: 'Sucursal', service: 'Servicio', barber: 'Barbero',
    date: 'Fecha', time: 'Horario', confirm: 'Confirmar', done: 'Listo'
  };
  const STEPS: Step[] = ['branch', 'service', 'barber', 'date', 'time', 'confirm', 'done'];
  const currentStepIdx = STEPS.indexOf(step);

  const next7Days = Array.from({ length: 14 }, (_, i) => addDays(new Date(), i + 1));

  return (
    <div className="min-h-screen bg-zinc-950" style={{ background: 'linear-gradient(135deg, #0a0a0a 0%, #111010 50%, #0d0c0a 100%)' }}>
      {/* Header */}
      <header className="border-b border-zinc-800/60 bg-zinc-900/80 backdrop-blur-md sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-lg shadow-amber-500/20">
              <Scissors className="w-5 h-5 text-zinc-900" />
            </div>
            <div>
              <div className="text-white font-bold">BarberPro</div>
              <div className="text-amber-500 text-xs">Reserva tu turno</div>
            </div>
          </div>
          {step !== 'done' && step !== 'branch' && (
            <button onClick={() => {
              const idx = STEPS.indexOf(step);
              setStep(STEPS[Math.max(0, idx - 1)]);
            }} className="flex items-center gap-1.5 text-zinc-400 hover:text-white text-sm transition-colors">
              <ArrowLeft className="w-4 h-4" /> Volver
            </button>
          )}
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-6 py-8">
        {/* Progress steps */}
        {step !== 'done' && (
          <div className="flex items-center justify-center gap-1 mb-8">
            {STEPS.slice(0, -1).map((s, i) => (
              <React.Fragment key={s}>
                <div className={`flex items-center gap-1 ${i <= currentStepIdx ? 'text-amber-400' : 'text-zinc-600'}`}>
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold border transition-all ${
                    i < currentStepIdx ? 'bg-amber-500 border-amber-500 text-zinc-900' :
                    i === currentStepIdx ? 'border-amber-500 text-amber-400' : 'border-zinc-700 text-zinc-600'
                  }`}>
                    {i < currentStepIdx ? <Check className="w-3 h-3" /> : i + 1}
                  </div>
                  <span className="text-xs hidden sm:inline">{STEP_LABELS[s]}</span>
                </div>
                {i < STEPS.length - 2 && <div className={`flex-1 h-px max-w-[40px] ${i < currentStepIdx ? 'bg-amber-500' : 'bg-zinc-800'}`} />}
              </React.Fragment>
            ))}
          </div>
        )}

        {loading && (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-2 border-zinc-700 border-t-amber-500 rounded-full animate-spin" />
          </div>
        )}

        {!loading && step === 'branch' && (
          <StepCard title="¿En qué sucursal?" subtitle="Selecciona la ubicación que prefieras">
            <div className="space-y-3">
              {branches.map(b => (
                <button key={b.id} onClick={() => selectBranch(b)}
                  className="w-full p-4 bg-zinc-800/60 hover:bg-zinc-800 border border-zinc-700 hover:border-amber-500/50 rounded-2xl text-left transition-all group">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-white font-semibold group-hover:text-amber-400 transition-colors">{b.name}</div>
                      {b.address && <div className="flex items-center gap-1 text-zinc-500 text-sm mt-1"><MapPin className="w-3.5 h-3.5" />{b.address}{b.city ? `, ${b.city}` : ''}</div>}
                    </div>
                    <ChevronRight className="w-5 h-5 text-zinc-600 group-hover:text-amber-400 transition-colors" />
                  </div>
                </button>
              ))}
            </div>
          </StepCard>
        )}

        {!loading && step === 'service' && (
          <StepCard title="¿Qué servicio deseas?" subtitle="Elige el servicio que necesitas">
            <div className="space-y-3">
              {services.map(sv => (
                <button key={sv.id} onClick={() => selectService(sv)}
                  className="w-full p-4 bg-zinc-800/60 hover:bg-zinc-800 border border-zinc-700 hover:border-amber-500/50 rounded-2xl text-left transition-all group">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-white font-semibold group-hover:text-amber-400 transition-colors">{sv.name}</div>
                      {sv.description && <div className="text-zinc-500 text-sm mt-0.5">{sv.description}</div>}
                      <div className="flex items-center gap-3 mt-2">
                        <span className="flex items-center gap-1 text-zinc-400 text-xs"><Clock className="w-3.5 h-3.5" />{sv.duration_minutes} min</span>
                        <span className="text-amber-400 font-semibold text-sm">${sv.price.toLocaleString('es-AR')}</span>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-zinc-600 group-hover:text-amber-400 transition-colors" />
                  </div>
                </button>
              ))}
            </div>
          </StepCard>
        )}

        {!loading && step === 'barber' && (
          <StepCard title="¿Con qué barbero?" subtitle="Elige tu barbero favorito">
            <div className="space-y-3">
              {barbers.map(b => (
                <button key={b.id} onClick={() => selectBarber(b)}
                  className="w-full p-4 bg-zinc-800/60 hover:bg-zinc-800 border border-zinc-700 hover:border-amber-500/50 rounded-2xl text-left transition-all group">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-zinc-700 to-zinc-800 border border-zinc-700 flex items-center justify-center text-amber-400 font-bold text-lg flex-shrink-0 overflow-hidden">
                      {b.photo_url ? <img src={b.photo_url} alt={b.full_name} className="w-full h-full object-cover" /> : b.full_name[0]}
                    </div>
                    <div className="flex-1">
                      <div className="text-white font-semibold group-hover:text-amber-400 transition-colors">{b.full_name}</div>
                      {b.specialty && <div className="text-zinc-500 text-sm">{b.specialty}</div>}
                    </div>
                    <ChevronRight className="w-5 h-5 text-zinc-600 group-hover:text-amber-400 transition-colors" />
                  </div>
                </button>
              ))}
            </div>
          </StepCard>
        )}

        {!loading && step === 'date' && (
          <StepCard title="¿Qué día?" subtitle="Selecciona la fecha para tu turno">
            <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
              {next7Days.map(d => {
                const dateStr = format(d, 'yyyy-MM-dd');
                const isSelected = selected.date === dateStr;
                return (
                  <button key={dateStr} onClick={() => selectDate(dateStr)}
                    className={`p-3 rounded-xl text-center transition-all border ${isSelected ? 'bg-amber-500/20 border-amber-500/40 text-amber-400' : 'bg-zinc-800/60 border-zinc-700 hover:border-amber-500/30 hover:bg-zinc-800'}`}>
                    <div className="text-xs text-zinc-500 capitalize">{format(d, 'EEE', { locale: es })}</div>
                    <div className={`text-xl font-bold mt-0.5 ${isSelected ? 'text-amber-400' : 'text-white'}`}>{format(d, 'd')}</div>
                    <div className="text-xs text-zinc-500">{format(d, 'MMM', { locale: es })}</div>
                  </button>
                );
              })}
            </div>
          </StepCard>
        )}

        {!loading && step === 'time' && (
          <StepCard title="¿A qué hora?" subtitle={`Horarios disponibles para ${selected.barber?.full_name}`}>
            {availableSlots.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-zinc-500 mb-3">No hay horarios disponibles para esta fecha.</div>
                <button onClick={() => setStep('date')} className="text-amber-400 hover:text-amber-300 text-sm underline">Elegir otra fecha</button>
              </div>
            ) : (
              <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
                {availableSlots.map(slot => (
                  <button key={slot} onClick={() => { setSelected(s => ({ ...s, time: slot })); setStep('confirm'); }}
                    className={`py-3 rounded-xl text-center font-mono text-sm transition-all border ${selected.time === slot ? 'bg-amber-500/20 border-amber-500/40 text-amber-400' : 'bg-zinc-800/60 border-zinc-700 hover:border-amber-500/30 hover:bg-zinc-800 text-zinc-300'}`}>
                    {slot}
                  </button>
                ))}
              </div>
            )}
          </StepCard>
        )}

        {!loading && step === 'confirm' && (
          <StepCard title="Confirma tu turno" subtitle="Ingresa tus datos para completar la reserva">
            {/* Summary */}
            <div className="bg-zinc-800/60 border border-zinc-700 rounded-2xl p-5 mb-6 space-y-3">
              <h4 className="text-zinc-400 text-xs font-medium uppercase tracking-wide mb-3">Resumen de tu turno</h4>
              <SummaryRow icon={<MapPin className="w-4 h-4" />} label={selected.branch?.name ?? ''} />
              <SummaryRow icon={<Scissors className="w-4 h-4" />} label={selected.service?.name ?? ''} sub={`$${selected.service?.price?.toLocaleString('es-AR')} · ${selected.service?.duration_minutes} min`} />
              <SummaryRow icon={<User className="w-4 h-4" />} label={selected.barber?.full_name ?? ''} sub="Barbero" />
              <SummaryRow icon={<Calendar className="w-4 h-4" />} label={format(new Date(selected.date + 'T12:00:00'), "EEEE d 'de' MMMM", { locale: es })} />
              <SummaryRow icon={<Clock className="w-4 h-4" />} label={selected.time} />
            </div>

            {/* Client form */}
            <div className="space-y-3">
              <div className="space-y-1.5">
                <label className="text-zinc-400 text-sm">Nombre completo *</label>
                <input value={clientForm.name} onChange={e => setClientForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="Tu nombre"
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500 text-sm" />
              </div>
              <div className="space-y-1.5">
                <label className="text-zinc-400 text-sm">Teléfono *</label>
                <input value={clientForm.phone} onChange={e => setClientForm(f => ({ ...f, phone: e.target.value }))}
                  placeholder="+54 11 ..."
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500 text-sm" />
              </div>
              <div className="space-y-1.5">
                <label className="text-zinc-400 text-sm">Email (opcional)</label>
                <input type="email" value={clientForm.email} onChange={e => setClientForm(f => ({ ...f, email: e.target.value }))}
                  placeholder="tu@email.com"
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500 text-sm" />
              </div>
            </div>

            <button onClick={confirm} disabled={saving || !clientForm.name.trim() || !clientForm.phone.trim()}
              className="w-full mt-6 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 disabled:opacity-50 text-zinc-900 font-bold py-4 rounded-2xl flex items-center justify-center gap-2 transition-all shadow-xl shadow-amber-500/25 text-base">
              {saving ? (
                <div className="w-5 h-5 border-2 border-zinc-900/30 border-t-zinc-900 rounded-full animate-spin" />
              ) : (
                <><Check className="w-5 h-5" /> Confirmar turno</>
              )}
            </button>
          </StepCard>
        )}

        {step === 'done' && (
          <div className="text-center py-8">
            <div className="w-20 h-20 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center mx-auto mb-6">
              <Check className="w-10 h-10 text-emerald-400" />
            </div>
            <h2 className="text-white text-3xl font-bold mb-2">¡Turno confirmado!</h2>
            <p className="text-zinc-400 mb-6">Tu reserva ha sido registrada exitosamente.</p>
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 max-w-sm mx-auto text-left space-y-3 mb-8">
              <SummaryRow icon={<Scissors className="w-4 h-4" />} label={selected.service?.name ?? ''} />
              <SummaryRow icon={<User className="w-4 h-4" />} label={selected.barber?.full_name ?? ''} />
              <SummaryRow icon={<Calendar className="w-4 h-4" />} label={format(new Date(selected.date + 'T12:00:00'), "EEEE d 'de' MMMM", { locale: es })} />
              <SummaryRow icon={<Clock className="w-4 h-4" />} label={selected.time} />
            </div>
            <button onClick={() => { setStep('branch'); setSelected({ branch: null, service: null, barber: null, date: '', time: '' }); setClientForm({ name: '', phone: '', email: '' }); }}
              className="bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-white font-medium px-8 py-3 rounded-2xl transition-all">
              Hacer otra reserva
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function StepCard({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-6">
        <h2 className="text-white text-2xl font-bold">{title}</h2>
        {subtitle && <p className="text-zinc-400 mt-1">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

function SummaryRow({ icon, label, sub }: { icon: React.ReactNode; label: string; sub?: string }) {
  return (
    <div className="flex items-center gap-3 text-sm">
      <span className="w-4 h-4 text-amber-400 flex-shrink-0">{icon}</span>
      <span className="text-zinc-300">{label}</span>
      {sub && <span className="text-zinc-600 text-xs">({sub})</span>}
    </div>
  );
}
