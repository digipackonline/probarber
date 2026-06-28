import React, { useState } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import {
  Scissors, LayoutDashboard, Calendar, Users, UserCheck, Briefcase,
  Building2, CreditCard, BarChart3, Megaphone, Star, Bell, Bot,
  LogOut, ChevronLeft, ChevronRight, Settings, Menu, X, Zap,
  MessageCircle, Crown, HelpCircle, Lightbulb, Activity
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTenant } from '../context/TenantContext';
import BetaBanner from './BetaBanner';
import WhatsNewModal from './WhatsNewModal';
import { GuidedTour, useTourStatus } from './GuidedTour';

interface NavItem {
  label: string;
  icon: React.ReactNode;
  to: string;
  roles: string[];
}

const navItems: NavItem[] = [
  { label: 'Dashboard', icon: <LayoutDashboard />, to: '/dashboard', roles: ['admin', 'barber'] },
  { label: 'Agenda', icon: <Calendar />, to: '/agenda', roles: ['admin', 'barber'] },
  { label: 'Clientes', icon: <Users />, to: '/clients', roles: ['admin', 'barber'] },
  { label: 'Barberos', icon: <UserCheck />, to: '/barbers', roles: ['admin'] },
  { label: 'Servicios', icon: <Briefcase />, to: '/services', roles: ['admin'] },
  { label: 'Sucursales', icon: <Building2 />, to: '/branches', roles: ['admin'] },
  { label: 'Pagos', icon: <CreditCard />, to: '/payments', roles: ['admin', 'barber'] },
  { label: 'Reportes', icon: <BarChart3 />, to: '/reports', roles: ['admin'] },
  { label: 'Marketing', icon: <Megaphone />, to: '/marketing', roles: ['admin'] },
  { label: 'Fidelización', icon: <Star />, to: '/loyalty', roles: ['admin'] },
  { label: 'WhatsApp', icon: <MessageCircle />, to: '/whatsapp', roles: ['admin'] },
  { label: 'Notificaciones', icon: <Bell />, to: '/notifications', roles: ['admin'] },
  { label: 'Asistente IA', icon: <Bot />, to: '/ai', roles: ['admin', 'barber'] },
  { label: 'Suscripción', icon: <Crown />, to: '/subscription', roles: ['admin'] },
  // Client routes
  { label: 'Mis Turnos', icon: <Calendar />, to: '/my-appointments', roles: ['client'] },
  { label: 'Mi Perfil', icon: <Settings />, to: '/profile', roles: ['client'] },
];

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const { profile, signOut } = useAuth();
  const { isOnTrial, trialDaysLeft, tenant } = useTenant();
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { needsTour, setNeedsTour } = useTourStatus();

  const role = profile?.role ?? 'client';
  const filtered = navItems.filter(n => n.roles.includes(role));

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className={`flex items-center gap-3 px-4 py-5 border-b border-zinc-800 ${collapsed ? 'justify-center' : ''}`}>
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center flex-shrink-0 shadow-lg shadow-amber-500/20">
          <Scissors className="w-5 h-5 text-zinc-900" />
        </div>
        {!collapsed && (
          <div>
            <div className="text-white font-bold text-lg leading-none">BarberPro</div>
            <div className="text-amber-500 text-xs font-medium mt-0.5">Gestión Premium</div>
          </div>
        )}
      </div>

      {/* Role badge */}
      {!collapsed && (
        <div className="px-4 py-3">
          <div className="bg-zinc-800/60 rounded-xl p-3 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-zinc-600 to-zinc-700 flex items-center justify-center text-sm font-bold text-amber-400 flex-shrink-0">
              {profile?.full_name?.[0]?.toUpperCase() ?? '?'}
            </div>
            <div className="min-w-0">
              <div className="text-white text-sm font-medium truncate">{profile?.full_name ?? 'Usuario'}</div>
              <div className="text-xs capitalize mt-0.5">
                <span className={`px-1.5 py-0.5 rounded-md text-xs font-medium ${
                  role === 'admin' ? 'bg-amber-500/20 text-amber-400' :
                  role === 'barber' ? 'bg-blue-500/20 text-blue-400' :
                  'bg-green-500/20 text-green-400'
                }`}>
                  {role === 'admin' ? 'Administrador' : role === 'barber' ? 'Barbero' : 'Cliente'}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 px-3 py-2 overflow-y-auto scrollbar-hide space-y-0.5">
        {filtered.map(item => (
          <NavLink key={item.to} to={item.to} onClick={() => setMobileOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group
              ${isActive
                ? 'bg-amber-500/15 text-amber-400 border border-amber-500/20'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-800/70'
              }
              ${collapsed ? 'justify-center' : ''}`
            }>
            {({ isActive }) => (
              <>
                <span className={`w-5 h-5 flex-shrink-0 transition-transform group-hover:scale-110 ${isActive ? '[&>svg]:stroke-amber-400' : '[&>svg]:stroke-current'}`}>
                  {item.icon}
                </span>
                {!collapsed && <span className="text-sm font-medium">{item.label}</span>}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Booking portal link */}
      {!collapsed && role === 'admin' && (
        <div className="px-3 pb-3">
          <NavLink to="/book" onClick={() => setMobileOpen(false)}
            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-zinc-800/60 text-zinc-400 hover:text-amber-400 hover:bg-zinc-800 transition-all text-sm border border-zinc-700/50">
            <Zap className="w-4 h-4" />
            <span>Portal de Reservas</span>
          </NavLink>
        </div>
      )}

      {/* Trial banner */}
      {!collapsed && isOnTrial && (
        <div className="px-3 pb-3">
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3">
            <div className="flex items-center gap-2 text-amber-400 text-sm font-medium mb-1">
              <Crown className="w-4 h-4" />
              <span>Período de prueba</span>
            </div>
            <p className="text-amber-400/70 text-xs">
              {trialDaysLeft > 0 ? `${trialDaysLeft} días restantes` : 'Finalizado'}
            </p>
            {trialDaysLeft > 0 && trialDaysLeft <= 3 && (
              <NavLink to="/subscription" onClick={() => setMobileOpen(false)}
                className="mt-2 inline-flex items-center gap-1 text-amber-400 hover:text-amber-300 text-xs font-medium transition-colors">
                Actualizar plan <Zap className="w-3 h-3" />
              </NavLink>
            )}
          </div>
        </div>
      )}

      {/* Bottom: help + feedback + logout */}
      <div className={`px-3 py-4 border-t border-zinc-800 space-y-1 ${collapsed ? 'flex flex-col items-center' : ''}`}>
        {role === 'admin' && (
          <NavLink to="/system-health" onClick={() => setMobileOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded-xl transition-all w-full ${collapsed ? 'justify-center' : ''} ${
                isActive ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50'
              }`
            }>
            <Activity className="w-5 h-5 flex-shrink-0" />
            {!collapsed && <span className="text-sm font-medium">Estado del sistema</span>}
          </NavLink>
        )}
        <NavLink to="/feedback" onClick={() => setMobileOpen(false)}
          className={({ isActive }) =>
            `flex items-center gap-3 px-3 py-2 rounded-xl transition-all w-full ${collapsed ? 'justify-center' : ''} ${
              isActive ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50'
            }`
          }>
          <Lightbulb className="w-5 h-5 flex-shrink-0" />
          {!collapsed && <span className="text-sm font-medium">Enviar sugerencia</span>}
        </NavLink>
        <NavLink to="/help" onClick={() => setMobileOpen(false)}
          className={({ isActive }) =>
            `flex items-center gap-3 px-3 py-2 rounded-xl transition-all w-full ${collapsed ? 'justify-center' : ''} ${
              isActive ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50'
            }`
          }>
          <HelpCircle className="w-5 h-5 flex-shrink-0" />
          {!collapsed && <span className="text-sm font-medium">Ayuda</span>}
        </NavLink>
        <button onClick={handleSignOut}
          className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-zinc-400 hover:text-red-400 hover:bg-red-500/10 transition-all w-full ${collapsed ? 'justify-center' : ''}`}>
          <LogOut className="w-5 h-5 flex-shrink-0" />
          {!collapsed && <span className="text-sm font-medium">Cerrar sesión</span>}
        </button>
      </div>
    </div>
  );

  return (
    <>
      <BetaBanner />
      <WhatsNewModal />
      {needsTour && (
        <GuidedTour
          onComplete={() => setNeedsTour(false)}
          onSkip={() => setNeedsTour(false)}
        />
      )}
      <div className="flex h-screen bg-zinc-950 overflow-hidden pt-8">
        {/* Desktop Sidebar */}
        <aside className={`hidden lg:flex flex-col bg-zinc-900 border-r border-zinc-800 transition-all duration-300 flex-shrink-0 relative
          ${collapsed ? 'w-[72px]' : 'w-64'}`}>
          <SidebarContent />
          {/* Collapse toggle */}
          <button onClick={() => setCollapsed(!collapsed)}
            className="absolute -right-3 top-[72px] w-6 h-6 bg-zinc-800 border border-zinc-700 rounded-full flex items-center justify-center text-zinc-400 hover:text-white hover:border-zinc-600 transition-all shadow-lg z-10">
            {collapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
          </button>
        </aside>

      {/* Mobile Sidebar Overlay */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <aside className="relative w-72 bg-zinc-900 border-r border-zinc-800 flex flex-col z-10">
            <SidebarContent />
            <button onClick={() => setMobileOpen(false)} className="absolute top-4 right-4 text-zinc-400 hover:text-white">
              <X className="w-5 h-5" />
            </button>
          </aside>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top bar (mobile) */}
        <header className="lg:hidden flex items-center justify-between px-4 py-3 bg-zinc-900 border-b border-zinc-800 flex-shrink-0">
          <button onClick={() => setMobileOpen(true)} className="text-zinc-400 hover:text-white transition-colors">
            <Menu className="w-6 h-6" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center">
              <Scissors className="w-4 h-4 text-zinc-900" />
            </div>
            <span className="text-white font-bold text-lg">BarberPro</span>
          </div>
          <div className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center text-amber-400 font-bold text-sm">
            {profile?.full_name?.[0]?.toUpperCase() ?? '?'}
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto bg-zinc-950">
          {children}
        </main>
      </div>
    </div>
    </>
  );
}
