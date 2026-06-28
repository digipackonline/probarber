import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  HelpCircle, BookOpen, MessageCircleQuestion, ChevronRight,
  Search, ArrowLeft, CheckCircle2, Clock, Users, Scissors,
  Building2, CreditCard, Calendar, Zap
} from 'lucide-react';
import { supabase } from '../lib/supabase';

interface HelpArticle {
  id: string;
  slug: string;
  category: string;
  title: string;
  content: string;
  order_index: number;
}

const categoryIcons: Record<string, React.ReactNode> = {
  'primeros_pasos': <Zap className="w-5 h-5" />,
  'faq': <MessageCircleQuestion className="w-5 h-5" />
};

const categoryNames: Record<string, string> = {
  'primeros_pasos': 'Primeros Pasos',
  'faq': 'Preguntas Frecuentes'
};

const quickLinks = [
  { title: 'Primeros pasos', slug: 'primeros-pasos', icon: <Zap className="w-5 h-5 text-amber-400" />, desc: 'Configura tu barbería paso a paso' },
  { title: 'Crear un servicio', slug: 'crear-servicio', icon: <Scissors className="w-5 h-5 text-amber-400" />, desc: 'Agrega los servicios que ofreces' },
  { title: 'Agregar un barbero', slug: 'agregar-barbero', icon: <Users className="w-5 h-5 text-amber-400" />, desc: 'Incorpora profesionales a tu equipo' },
  { title: 'Crear una sucursal', slug: 'crear-sucursal', icon: <Building2 className="w-5 h-5 text-amber-400" />, desc: 'Configura la ubicación de tu negocio' },
  { title: 'Registrar un cliente', slug: 'registrar-cliente', icon: <Users className="w-5 h-5 text-amber-400" />, desc: 'Agrega clientes manualmente' },
  { title: 'Crear un turno', slug: 'crear-turno', icon: <Calendar className="w-5 h-5 text-amber-400" />, desc: 'Agenda citas para tus clientes' },
  { title: 'Cobrar un servicio', slug: 'cobrar-servicio', icon: <CreditCard className="w-5 h-5 text-amber-400" />, desc: 'Registra pagos y controla tu caja' },
  { title: 'Cambiar de plan', slug: 'cambiar-plan', icon: <CheckCircle2 className="w-5 h-5 text-amber-400" />, desc: 'Actualiza tu suscripción' },
];

export default function HelpCenterPage() {
  const [articles, setArticles] = useState<HelpArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedArticle, setSelectedArticle] = useState<HelpArticle | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadArticles();
  }, []);

  async function loadArticles() {
    try {
      const { data, error } = await supabase
        .from('help_articles')
        .select('*')
        .eq('is_active', true)
        .order('order_index', { ascending: true });

      if (error) throw error;
      setArticles(data || []);
    } catch (err) {
      console.error('Error loading help articles:', err);
    } finally {
      setLoading(false);
    }
  }

  const filteredArticles = articles.filter(article =>
    article.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    article.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const articlesByCategory = articles.reduce((acc, article) => {
    if (!acc[article.category]) acc[article.category] = [];
    acc[article.category].push(article);
    return acc;
  }, {} as Record<string, HelpArticle[]>);

  // Render markdown-like content
  function renderContent(content: string) {
    return content.split('\n').map((line, i) => {
      // Headers
      if (line.startsWith('# ')) {
        return <h1 key={i} className="text-2xl font-bold text-white mt-6 mb-4">{line.slice(2)}</h1>;
      }
      if (line.startsWith('## ')) {
        return <h2 key={i} className="text-xl font-semibold text-white mt-5 mb-3">{line.slice(3)}</h2>;
      }
      if (line.startsWith('### ')) {
        return <h3 key={i} className="text-lg font-semibold text-white mt-4 mb-2">{line.slice(4)}</h3>;
      }

      // Lists
      if (line.startsWith('- ')) {
        return (
          <li key={i} className="text-zinc-300 ml-4 mb-1 list-disc">
            {renderInlineContent(line.slice(2))}
          </li>
        );
      }
      if (line.match(/^\d+\.\s/)) {
        const text = line.replace(/^\d+\.\s/, '');
        return (
          <li key={i} className="text-zinc-300 ml-4 mb-1 list-decimal">
            {renderInlineContent(text)}
          </li>
        );
      }

      // Empty line
      if (!line.trim()) {
        return <div key={i} className="h-2" />;
      }

      // Regular paragraph
      return (
        <p key={i} className="text-zinc-300 mb-2">
          {renderInlineContent(line)}
        </p>
      );
    });
  }

  function renderInlineContent(text: string) {
    // Bold text
    const parts = text.split(/\*\*([^*]+)\*\*/g);
    return parts.map((part, j) =>
      j % 2 === 1
        ? <strong key={j} className="font-semibold text-white">{part}</strong>
        : part
    );
  }

  if (selectedArticle) {
    return (
      <div className="min-h-screen bg-zinc-950">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <button
            onClick={() => setSelectedArticle(null)}
            className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Volver al Centro de Ayuda</span>
          </button>

          <article className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 md:p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                {categoryIcons[selectedArticle.category] || <HelpCircle className="w-5 h-5" />}
              </div>
              <div>
                <span className="text-xs text-zinc-500 uppercase tracking-wide">
                  {categoryNames[selectedArticle.category] || selectedArticle.category}
                </span>
                <h1 className="text-xl font-bold text-white">{selectedArticle.title}</h1>
              </div>
            </div>

            <div className="prose prose-invert max-w-none">
              {renderContent(selectedArticle.content)}
            </div>

            <div className="mt-8 pt-6 border-t border-zinc-800">
              <p className="text-zinc-400 text-sm mb-3">¿Te fue útil este artículo?</p>
              <div className="flex gap-3">
                <button className="px-4 py-2 bg-green-500/10 border border-green-500/20 text-green-400 rounded-lg hover:bg-green-500/20 transition-colors text-sm font-medium">
                  Sí, me ayudó
                </button>
                <button className="px-4 py-2 bg-zinc-800 border border-zinc-700 text-zinc-300 rounded-lg hover:bg-zinc-700 transition-colors text-sm font-medium">
                  No encontré lo que buscaba
                </button>
              </div>
            </div>
          </article>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 mb-4 shadow-lg shadow-amber-500/20">
            <HelpCircle className="w-8 h-8 text-zinc-900" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Centro de Ayuda</h1>
          <p className="text-zinc-400 max-w-lg mx-auto">
            Encuentra respuestas a tus preguntas y aprende a usar BarberPro al máximo.
          </p>
        </div>

        {/* Search */}
        <div className="max-w-2xl mx-auto mb-10">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
            <input
              type="text"
              placeholder="Buscar en la ayuda..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-12 pr-4 py-3.5 text-white placeholder:text-zinc-500 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/50 transition-all"
            />
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : searchQuery ? (
          /* Search Results */
          <div className="mb-10">
            <h2 className="text-lg font-semibold text-white mb-4">
              Resultados para "{searchQuery}"
            </h2>
            {filteredArticles.length === 0 ? (
              <div className="text-center py-12 text-zinc-400">
                <Search className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No encontramos resultados para tu búsqueda.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredArticles.map(article => (
                  <button
                    key={article.id}
                    onClick={() => setSelectedArticle(article)}
                    className="w-full flex items-center justify-between bg-zinc-900 border border-zinc-800 rounded-xl p-4 hover:border-zinc-700 transition-colors text-left"
                  >
                    <div>
                      <h3 className="text-white font-medium">{article.title}</h3>
                      <p className="text-zinc-500 text-sm mt-1">
                        {categoryNames[article.category] || article.category}
                      </p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-zinc-600" />
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <>
            {/* Quick Links */}
            <div className="mb-12">
              <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <Clock className="w-5 h-5 text-amber-400" />
                Guías rápidas
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {quickLinks.map(link => (
                  <button
                    key={link.slug}
                    onClick={() => {
                      const article = articles.find(a => a.slug === link.slug);
                      if (article) setSelectedArticle(article);
                    }}
                    className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 hover:border-amber-500/30 hover:bg-zinc-800/50 transition-all text-left group"
                  >
                    <div className="w-10 h-10 rounded-lg bg-zinc-800 flex items-center justify-center mb-3 group-hover:bg-amber-500/10 transition-colors">
                      {React.cloneElement(link.icon as React.ReactElement, {
                        className: 'w-5 h-5 text-amber-400'
                      })}
                    </div>
                    <h3 className="text-white font-medium mb-1">{link.title}</h3>
                    <p className="text-zinc-500 text-sm">{link.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Articles by Category */}
            {Object.entries(articlesByCategory).map(([category, categoryArticles]) => (
              <div key={category} className="mb-10">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                    {categoryIcons[category] || <BookOpen className="w-4 h-4" />}
                  </div>
                  <h2 className="text-lg font-semibold text-white">
                    {categoryNames[category] || category}
                  </h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {categoryArticles.map(article => (
                    <button
                      key={article.id}
                      onClick={() => setSelectedArticle(article)}
                      className="flex items-center justify-between bg-zinc-900 border border-zinc-800 rounded-xl p-4 hover:border-zinc-700 transition-colors text-left group"
                    >
                      <span className="text-zinc-200 font-medium">{article.title}</span>
                      <ChevronRight className="w-5 h-5 text-zinc-600 group-hover:text-amber-400 transition-colors" />
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </>
        )}

        {/* Contact Support */}
        <div className="mt-12 bg-gradient-to-br from-zinc-900 to-zinc-900/50 border border-zinc-800 rounded-2xl p-6 md:p-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h3 className="text-lg font-semibold text-white mb-1">¿No encuentras lo que buscas?</h3>
              <p className="text-zinc-400">Nuestro equipo de soporte está aquí para ayudarte.</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <Link
                to="/feedback?type=question"
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-zinc-800 border border-zinc-700 text-white rounded-xl hover:bg-zinc-700 transition-colors font-medium"
              >
                <MessageCircleQuestion className="w-4 h-4" />
                Hacer una pregunta
              </Link>
              <a
                href="mailto:soporte@barberpro.app"
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-amber-500 text-zinc-900 rounded-xl hover:bg-amber-400 transition-colors font-medium"
              >
                <HelpCircle className="w-4 h-4" />
                Contactar soporte
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
