import React, { useEffect, useState } from 'react';
import { Plus, CreditCard, DollarSign, TrendingUp } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Card, Button, Modal, Select, PageHeader, StatCard, LoadingScreen } from '../components/ui';
import { useToast } from '../context/ToastContext';
import { PAYMENT_METHOD_CONFIG } from '../lib/constants';
import type { Database } from '../lib/database.types';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

type Payment = Database['public']['Tables']['payments']['Row'] & {
  clients: { full_name: string } | null;
  barbers: { full_name: string } | null;
  appointments: { services: { name: string } | null } | null;
};
type Appointment = { id: string; clients: { full_name: string } | null; services: { name: string; price: number } | null; barbers: { full_name: string } | null };

export default function PaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterDate, setFilterDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [modalOpen, setModalOpen] = useState(false);
  const [pendingAppts, setPendingAppts] = useState<Appointment[]>([]);
  const [form, setForm] = useState({ appointment_id: '', amount: '', method: 'cash', notes: '' });
  const [saving, setSaving] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [branches, setBranches] = useState<any[]>([]);
  const [selectedBranch, setSelectedBranch] = useState('');
  const toast = useToast();

  useEffect(() => { loadBranches(); }, []);
  useEffect(() => { loadPayments(); }, [filterDate, selectedBranch]);

  async function loadBranches() {
    const { data } = await supabase.from('branches').select('*').eq('is_active', true);
    setBranches(data ?? []);
    if (data && data.length > 0) setSelectedBranch(data[0].id);
  }

  async function loadPayments() {
    if (!selectedBranch) return;
    setLoading(true);
    const { data } = await supabase
      .from('payments')
      .select('*, clients(full_name), barbers(full_name), appointments(services(name))')
      .eq('branch_id', selectedBranch)
      .gte('paid_at', `${filterDate}T00:00:00`)
      .lte('paid_at', `${filterDate}T23:59:59`)
      .order('paid_at', { ascending: false });
    setPayments((data ?? []) as Payment[]);
    setLoading(false);
  }

  async function openPaymentModal() {
    if (!selectedBranch) {
      toast.error('Selecciona una sucursal primero');
      return;
    }
    const { data } = await supabase
      .from('appointments')
      .select('id, clients(full_name), services(name, price), barbers(full_name)')
      .eq('branch_id', selectedBranch)
      .eq('appointment_date', filterDate)
      .eq('status', 'completed')
      .order('start_time');
    setPendingAppts((data ?? []) as Appointment[]);
    setForm({ appointment_id: '', amount: '', method: 'cash', notes: '' });
    setFormErrors({});
    setModalOpen(true);
  }

  function validate(): boolean {
    const errors: Record<string, string> = {};
    if (!form.amount || Number(form.amount) <= 0) errors.amount = 'Ingresa un monto válido';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function save() {
    if (!validate() || !selectedBranch) return;
    setSaving(true);

    const { error } = await supabase.from('payments').insert({
      appointment_id: form.appointment_id || null,
      branch_id: selectedBranch,
      client_id: null,
      barber_id: null,
      amount: Number(form.amount),
      method: form.method as any,
      status: 'completed',
      notes: form.notes || null,
      paid_at: new Date().toISOString(),
    });

    setSaving(false);

    if (error) {
      toast.error('Error al registrar el pago');
    } else {
      toast.success('Pago registrado correctamente');
      setModalOpen(false);
      loadPayments();
    }
  }

  const totalDay = payments.filter(p => p.status === 'completed').reduce((s, p) => s + p.amount, 0);
  const byCash = payments.filter(p => p.method === 'cash' && p.status === 'completed').reduce((s, p) => s + p.amount, 0);
  const byCard = payments.filter(p => p.method === 'card' && p.status === 'completed').reduce((s, p) => s + p.amount, 0);
  const byTransfer = payments.filter(p => p.method === 'transfer' && p.status === 'completed').reduce((s, p) => s + p.amount, 0);

  const fmt = (n: number) => n.toLocaleString('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 });

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Pagos y Caja"
        subtitle="Control de ingresos y métodos de pago"
        action={<Button icon={<Plus className="w-4 h-4" />} onClick={openPaymentModal}>Registrar pago</Button>}
      />

      <div className="flex flex-wrap items-center gap-3">
        <label className="sr-only" htmlFor="branch-select">Sucursal</label>
        <select id="branch-select" value={selectedBranch} onChange={e => setSelectedBranch(e.target.value)}
          className="bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-amber-500">
          {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
        <label className="sr-only" htmlFor="date-select">Fecha</label>
        <input id="date-select" type="date" value={filterDate} onChange={e => setFilterDate(e.target.value)}
          className="bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-amber-500" />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total del día" value={fmt(totalDay)} icon={<DollarSign className="w-5 h-5" />} color="amber" />
        <StatCard title="Efectivo" value={fmt(byCash)} icon={<DollarSign className="w-5 h-5" />} color="green" />
        <StatCard title="Tarjeta" value={fmt(byCard)} icon={<CreditCard className="w-5 h-5" />} color="blue" />
        <StatCard title="Transferencia" value={fmt(byTransfer)} icon={<TrendingUp className="w-5 h-5" />} color="purple" />
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><div className="w-8 h-8 border-2 border-zinc-700 border-t-amber-500 rounded-full animate-spin" /></div>
      ) : (
        <Card className="overflow-hidden">
          <div className="px-6 py-4 border-b border-zinc-800">
            <h3 className="text-white font-semibold">Transacciones del {format(new Date(filterDate + 'T12:00:00'), "d 'de' MMMM", { locale: es })}</h3>
          </div>
          {payments.length === 0 ? (
            <div className="text-center py-12 text-zinc-600">Sin pagos registrados para este día</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full" role="table">
                <thead>
                  <tr className="border-b border-zinc-800">
                    <th scope="col" className="text-left text-xs font-medium text-zinc-500 px-6 py-3">Hora</th>
                    <th scope="col" className="text-left text-xs font-medium text-zinc-500 px-4 py-3">Cliente</th>
                    <th scope="col" className="text-left text-xs font-medium text-zinc-500 px-4 py-3 hidden sm:table-cell">Servicio</th>
                    <th scope="col" className="text-left text-xs font-medium text-zinc-500 px-4 py-3 hidden md:table-cell">Barbero</th>
                    <th scope="col" className="text-left text-xs font-medium text-zinc-500 px-4 py-3">Método</th>
                    <th scope="col" className="text-right text-xs font-medium text-zinc-500 px-6 py-3">Monto</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map(p => {
                    const method = PAYMENT_METHOD_CONFIG[p.method] ?? PAYMENT_METHOD_CONFIG.other;
                    return (
                      <tr key={p.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/20 transition-colors">
                        <td className="px-6 py-3.5 text-zinc-400 text-sm font-mono">{format(new Date(p.paid_at), 'HH:mm')}</td>
                        <td className="px-4 py-3.5 text-white text-sm">{p.clients?.full_name ?? '—'}</td>
                        <td className="px-4 py-3.5 text-zinc-400 text-sm hidden sm:table-cell">{p.appointments?.services?.name ?? '—'}</td>
                        <td className="px-4 py-3.5 text-zinc-400 text-sm hidden md:table-cell">{p.barbers?.full_name ?? '—'}</td>
                        <td className="px-4 py-3.5">
                          <span className={`px-2 py-0.5 rounded-md text-xs font-medium ${method.color}`}>{method.label}</span>
                        </td>
                        <td className="px-6 py-3.5 text-right text-amber-400 font-semibold">{fmt(p.amount)}</td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t border-zinc-700">
                    <td colSpan={5} className="px-6 py-3 text-zinc-400 text-sm font-medium">Total</td>
                    <td className="px-6 py-3 text-right text-amber-400 font-bold text-base">{fmt(totalDay)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </Card>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Registrar pago">
        <form onSubmit={e => { e.preventDefault(); save(); }} className="space-y-4">
          <Select label="Turno (opcional)" value={form.appointment_id} onChange={(e) => {
            const appt = pendingAppts.find(a => a.id === e.target.value);
            setForm(f => ({ ...f, appointment_id: e.target.value, amount: appt ? String(appt.services?.price ?? '') : f.amount }));
          }}>
            <option value="">Sin turno asociado</option>
            {pendingAppts.map(a => <option key={a.id} value={a.id}>{a.clients?.full_name} – {a.services?.name}</option>)}
          </Select>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="block text-zinc-400 text-sm">Monto *</label>
              <input type="number" min="0" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} placeholder="0" className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2.5 text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500 text-sm" />
              {formErrors.amount && <p className="text-red-400 text-xs">{formErrors.amount}</p>}
            </div>
            <Select label="Método de pago" value={form.method} onChange={e => setForm(f => ({ ...f, method: e.target.value }))}>
              <option value="cash">Efectivo</option>
              <option value="card">Tarjeta</option>
              <option value="transfer">Transferencia</option>
              <option value="mercadopago">Mercado Pago</option>
              <option value="other">Otro</option>
            </Select>
          </div>
          <div className="space-y-1.5">
            <label className="block text-zinc-400 text-sm">Notas</label>
            <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} placeholder="Notas opcionales..."
              className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2.5 text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500 text-sm resize-none" />
          </div>
          <div className="flex gap-3 pt-2">
            <Button variant="secondary" type="button" className="flex-1" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button type="submit" className="flex-1" loading={saving}>Registrar pago</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
