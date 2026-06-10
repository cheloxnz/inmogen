import { useState, useEffect } from 'react'
import { SignInButton, SignUpButton, useAuth } from '@clerk/clerk-react'
import { Navigate, useSearchParams } from 'react-router-dom'
import { Zap, Clock, Palette, Download, Image, RefreshCw, Sparkles, ChevronRight, Star, Video, Sofa, Sun, Globe, Layers, ArrowRight, Check, Play, Shield, Users, TrendingUp } from 'lucide-react'
import { PricingModal } from './Pricing'

export default function Home() {
  const { isSignedIn } = useAuth()
  const [showPricing, setShowPricing] = useState(false)
  const [searchParams] = useSearchParams()

  useEffect(() => {
    const ref = searchParams.get('ref')
    if (ref) localStorage.setItem('inmogen_ref', ref)
  }, [searchParams])

  if (isSignedIn) return <Navigate to="/dashboard" replace />

  return (
    <div className="min-h-screen bg-[#0A0F1E] text-white overflow-x-hidden">

      {/* Nav */}
      <nav className="flex items-center justify-between px-6 lg:px-12 py-4 border-b border-white/5 sticky top-0 z-40 bg-[#0A0F1E]/90 backdrop-blur-md">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-blue-500 flex items-center justify-center">
            <Zap size={16} className="text-white" fill="white" />
          </div>
          <span className="font-bold text-lg tracking-tight">InmoGen</span>
        </div>
        <div className="hidden md:flex items-center gap-8 text-sm text-gray-400">
          <button onClick={() => setShowPricing(true)} className="hover:text-white transition-colors">Precios</button>
          <a href="#features" className="hover:text-white transition-colors">Features</a>
          <a href="#como-funciona" className="hover:text-white transition-colors">Cómo funciona</a>
        </div>
        <div className="flex items-center gap-2">
          <SignInButton mode="modal">
            <button className="px-4 py-2 text-sm text-gray-300 hover:text-white transition-colors">
              Ingresar
            </button>
          </SignInButton>
          <SignUpButton mode="modal">
            <button className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold rounded-lg transition-all shadow-lg shadow-blue-500/20">
              Empezar gratis
            </button>
          </SignUpButton>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative max-w-6xl mx-auto px-6 lg:px-12 pt-24 pb-20 text-center">
        {/* Glow background */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-blue-600/20 rounded-full blur-[120px] pointer-events-none" />

        <div className="relative">
          <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/25 rounded-full px-4 py-1.5 text-blue-400 text-sm mb-8 font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
            Primeros 100 clientes → créditos dobles de por vida
          </div>

          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold leading-[1.08] mb-6 tracking-tight">
            Del link a los creativos<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400">
              en 2 minutos.
            </span>
          </h1>

          <p className="text-lg sm:text-xl text-gray-400 mb-10 max-w-2xl mx-auto leading-relaxed">
            Pegás la URL de cualquier propiedad en Zonaprop, Argenprop o Idealista
            y obtenés creativos listos para Meta Ads con la identidad visual de tu inmobiliaria.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-6">
            <SignUpButton mode="modal">
              <button className="w-full sm:w-auto px-8 py-4 bg-blue-600 hover:bg-blue-500 text-white text-base font-bold rounded-xl transition-all shadow-xl shadow-blue-500/25 flex items-center justify-center gap-2 group">
                Generar mis primeros creativos
                <ArrowRight size={18} className="group-hover:translate-x-0.5 transition-transform" />
              </button>
            </SignUpButton>
            <button onClick={() => setShowPricing(true)}
              className="w-full sm:w-auto px-8 py-4 bg-white/5 hover:bg-white/10 border border-white/10 text-white text-base font-medium rounded-xl transition-all">
              Ver planes →
            </button>
          </div>

          <p className="text-gray-600 text-sm flex items-center justify-center gap-4">
            <span className="flex items-center gap-1.5"><Check size={13} className="text-blue-400" /> 3 creativos gratis</span>
            <span className="flex items-center gap-1.5"><Check size={13} className="text-blue-400" /> Sin tarjeta de crédito</span>
            <span className="flex items-center gap-1.5"><Check size={13} className="text-blue-400" /> Listo en 2 minutos</span>
          </p>
        </div>
      </section>

      {/* Social proof bar */}
      <section className="border-y border-white/5 py-5 mb-20">
        <div className="max-w-4xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-center gap-8 text-sm text-gray-500">
          <div className="flex items-center gap-2">
            <Users size={15} className="text-blue-400" />
            <span><strong className="text-white">+500</strong> inmobiliarias activas</span>
          </div>
          <div className="hidden sm:block w-px h-4 bg-white/10" />
          <div className="flex items-center gap-2">
            <Image size={15} className="text-blue-400" />
            <span><strong className="text-white">+12.000</strong> creativos generados</span>
          </div>
          <div className="hidden sm:block w-px h-4 bg-white/10" />
          <div className="flex items-center gap-2">
            <TrendingUp size={15} className="text-blue-400" />
            <span>Portales: <strong className="text-white">Zonaprop · Argenprop · Idealista</strong></span>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="como-funciona" className="max-w-5xl mx-auto px-6 lg:px-12 pb-24">
        <div className="text-center mb-14">
          <p className="text-blue-400 text-sm font-semibold uppercase tracking-widest mb-3">Flujo de trabajo</p>
          <h2 className="text-3xl sm:text-4xl font-bold">Cómo funciona</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-px bg-white/5 rounded-2xl overflow-hidden border border-white/5">
          {[
            { step: '01', emoji: '🔗', title: 'Pegás el link', desc: 'Cualquier propiedad de Zonaprop, Argenprop o Idealista. El scraper extrae fotos, precio, m² y ubicación en segundos.' },
            { step: '02', emoji: '🎨', title: 'Elegís el ángulo', desc: 'Seleccionás fotos, el tipo de creativo y opcionalmente mejorás las imágenes con IA antes de generar.' },
            { step: '03', emoji: '📥', title: 'Descargás', desc: 'Imágenes y video listos en todos los formatos: 1:1, Story, Carrusel, Banner y WhatsApp Status.' },
          ].map((s, i) => (
            <div key={s.step} className="bg-[#0D1424] p-8 flex flex-col">
              <span className="text-5xl font-black text-white/5 mb-4 leading-none">{s.step}</span>
              <div className="text-3xl mb-4">{s.emoji}</div>
              <h3 className="font-bold text-lg mb-2">{s.title}</h3>
              <p className="text-gray-400 text-sm leading-relaxed">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features grid */}
      <section id="features" className="max-w-6xl mx-auto px-6 lg:px-12 pb-24">
        <div className="text-center mb-14">
          <p className="text-blue-400 text-sm font-semibold uppercase tracking-widest mb-3">Todo incluido</p>
          <h2 className="text-3xl sm:text-4xl font-bold mb-3">Sin apps de diseño. Sin editor.</h2>
          <p className="text-gray-500 text-sm max-w-lg mx-auto">Todo lo que necesitás para generar creativos inmobiliarios profesionales en un solo lugar.</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[
            { icon: <Clock size={20} />, title: 'Scraper automático', desc: 'Extrae fotos, precio, m², ambientes y ubicación de cualquier portal. Sin copiar ni pegar nada.', badge: null },
            { icon: <Image size={20} />, title: '7 tipos de creativo', desc: 'Destacado, Infografía, Hook, Storytelling, Social Proof, FAQ y Testimonial. Cada uno con lógica visual propia.', badge: null },
            { icon: <Palette size={20} />, title: 'Tu marca siempre presente', desc: 'Logo, colores, teléfono, web e Instagram. Se aplica automáticamente a cada imagen generada.', badge: null },
            { icon: <Sparkles size={20} />, title: 'Mejora de fotos con IA', desc: 'Balance de blancos, HDR, nitidez y saturación automáticos. Una foto oscura se convierte en imagen de revista.', badge: 'IA' },
            { icon: <Sofa size={20} />, title: 'Home Staging Virtual', desc: 'Amueblá ambientes vacíos con IA en segundos. 5 estilos × 6 tipos de ambiente. Powered by Replicate.', badge: 'IA' },
            { icon: <Sun size={20} />, title: 'Reemplazo de cielo', desc: 'Cambiá un cielo gris por uno despejado, atardecer, dorado o nublado. Ideal para exteriores y terrazas.', badge: 'IA' },
            { icon: <Video size={20} />, title: 'Video para Reels y Stories', desc: 'Generá un MP4 con las fotos y transiciones cinematográficas. Listo para subir a Instagram.', badge: 'Nuevo' },
            { icon: <Layers size={20} />, title: 'Todos los formatos de una', desc: '6 formatos al mismo tiempo: 1:1, Story, Banner, Carrusel x2 y WhatsApp Status. Un solo crédito.', badge: null },
            { icon: <Globe size={20} />, title: 'Extensión para Chrome', desc: 'Navegás por Zonaprop o Argenprop y con un click enviás la propiedad a InmoGen. Sin copiar URLs.', badge: 'Nuevo' },
            { icon: <RefreshCw size={20} />, title: 'Regenerar sin costo', desc: '¿No te gustó un ángulo? Regeneralo con un click. No consume créditos extra.', badge: null },
            { icon: <Download size={20} />, title: 'Descarga individual o ZIP', desc: 'Descargá cada formato por separado o todos juntos en un ZIP. Resolución óptima para Meta Ads.', badge: null },
            { icon: <Zap size={20} />, title: 'Motor Gemini Imagen 3', desc: 'Conectá tu API Key de Google para fondos generados con IA de calidad profesional. Gratis en AI Studio.', badge: null },
          ].map(f => (
            <div key={f.title} className="group bg-[#0D1424] border border-white/5 hover:border-blue-500/30 rounded-2xl p-5 transition-all hover:bg-[#0F1730]">
              <div className="flex items-start justify-between mb-3">
                <div className="w-9 h-9 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-400 group-hover:bg-blue-500/20 transition-colors">
                  {f.icon}
                </div>
                {f.badge && (
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${f.badge === 'IA' ? 'bg-purple-500/15 text-purple-400 border border-purple-500/20' : 'bg-blue-500/15 text-blue-400 border border-blue-500/20'}`}>
                    {f.badge}
                  </span>
                )}
              </div>
              <h3 className="font-semibold mb-1.5 text-sm">{f.title}</h3>
              <p className="text-gray-500 text-xs leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Creative types */}
      <section className="max-w-5xl mx-auto px-6 lg:px-12 pb-24">
        <div className="text-center mb-10">
          <p className="text-blue-400 text-sm font-semibold uppercase tracking-widest mb-3">Creativos</p>
          <h2 className="text-3xl sm:text-4xl font-bold mb-3">7 ángulos creativos incluidos</h2>
          <p className="text-gray-500 text-sm">Cada uno pensado para una etapa distinta del funnel de captación.</p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
          {[
            { emoji: '🏠', name: 'Destacado', desc: 'Foto + precio' },
            { emoji: '📊', name: 'Infografía', desc: 'Datos visuales' },
            { emoji: '⚡', name: 'Hook Attack', desc: 'Para el scroll' },
            { emoji: '✨', name: 'Storytelling', desc: 'Narrativa IA' },
            { emoji: '⭐', name: 'Social Proof', desc: 'Confianza' },
            { emoji: '❓', name: 'FAQ', desc: 'Preguntas' },
            { emoji: '💬', name: 'Testimonial', desc: 'Cita cliente' },
          ].map(t => (
            <div key={t.name} className="bg-[#0D1424] border border-white/5 hover:border-blue-500/30 rounded-xl p-3 text-center transition-all group cursor-default">
              <div className="text-2xl mb-2">{t.emoji}</div>
              <p className="text-white text-xs font-semibold">{t.name}</p>
              <p className="text-gray-600 text-[10px] mt-0.5 group-hover:text-gray-400 transition-colors">{t.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* AI Tools highlight */}
      <section className="max-w-5xl mx-auto px-6 lg:px-12 pb-24">
        <div className="relative bg-gradient-to-br from-[#0D1424] to-[#0A1628] border border-white/5 rounded-3xl p-8 lg:p-12 overflow-hidden">
          {/* Glow */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-purple-600/10 rounded-full blur-[80px] pointer-events-none" />
          <div className="relative">
            <div className="inline-flex items-center gap-2 bg-purple-500/10 border border-purple-500/25 rounded-full px-3 py-1 text-purple-400 text-xs font-semibold uppercase tracking-wide mb-6">
              <Sparkles size={11} />
              Herramientas de IA exclusivas
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold mb-3">Transformá las fotos antes de generar</h2>
            <p className="text-gray-400 text-sm mb-8 max-w-lg">Mejorá, amueblá y renová cada imagen directamente en el selector de fotos. Sin salir de InmoGen.</p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
              {[
                { emoji: '✨', tag: 'Gratis incluido', tagColor: 'blue', title: 'Auto-mejora', desc: 'Corrección de color, niveles, contraste y nitidez automáticos en un click.' },
                { emoji: '🛋️', tag: 'Requiere Replicate', tagColor: 'purple', title: 'Home Staging', desc: 'Amueblá ambientes vacíos con IA. 30 combinaciones de estilo × tipo de habitación.' },
                { emoji: '☀️', tag: 'Gratis incluido', tagColor: 'blue', title: 'Reemplazo de cielo', desc: 'Despejado, atardecer, dorado o nublado. Detección automática del cielo.' },
              ].map(item => (
                <div key={item.title} className="bg-white/3 border border-white/8 rounded-2xl p-5">
                  <div className="text-3xl mb-3">{item.emoji}</div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full mb-3 inline-block ${item.tagColor === 'purple' ? 'bg-purple-500/15 text-purple-400 border border-purple-500/20' : 'bg-blue-500/15 text-blue-400 border border-blue-500/20'}`}>
                    {item.tag}
                  </span>
                  <h3 className="font-bold mb-1.5 text-sm">{item.title}</h3>
                  <p className="text-gray-500 text-xs leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>

            {/* Replicate banner */}
            <div className="flex flex-col sm:flex-row items-center gap-4 bg-purple-900/20 border border-purple-500/20 rounded-xl p-4">
              <div className="flex-1">
                <p className="text-white font-semibold text-sm mb-0.5">Usá tu propia API Key de Replicate</p>
                <p className="text-gray-400 text-xs">Conectás tu token en Configuración de Marca y cada ambiente vacío se amuebla automáticamente. El costo va a tu cuenta de Replicate.</p>
              </div>
              <a href="https://replicate.com/account/api-tokens" target="_blank" rel="noopener noreferrer"
                className="flex-shrink-0 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold rounded-lg transition-colors whitespace-nowrap">
                Obtener API Key →
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="max-w-5xl mx-auto px-6 lg:px-12 pb-24">
        <div className="text-center mb-10">
          <p className="text-blue-400 text-sm font-semibold uppercase tracking-widest mb-3">Testimonios</p>
          <h2 className="text-3xl font-bold">Lo que dicen nuestros usuarios</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { name: 'Martín R.', role: 'Agente en Palermo', text: 'Antes tardaba 2 horas en armar los creativos para cada propiedad. Ahora en 3 minutos ya los tengo listos para publicar.' },
            { name: 'Valentina S.', role: 'Directora en Recoleta', text: 'La calidad visual sorprende. Los clientes me preguntan quién hace el diseño y les digo que es IA. Se quedan sin palabras.' },
            { name: 'Diego M.', role: 'Broker en Córdoba', text: 'Lo mejor es que mantiene mi identidad de marca en todo. Logo, colores, teléfono. Súper consistente en cada propiedad.' },
          ].map(t => (
            <div key={t.name} className="bg-[#0D1424] border border-white/5 rounded-2xl p-6">
              <div className="flex gap-0.5 mb-4">
                {[1,2,3,4,5].map(i => <Star key={i} size={12} className="text-yellow-400 fill-yellow-400" />)}
              </div>
              <p className="text-gray-300 text-sm leading-relaxed mb-5">"{t.text}"</p>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400 text-xs font-bold">
                  {t.name[0]}
                </div>
                <div>
                  <p className="text-white font-semibold text-sm">{t.name}</p>
                  <p className="text-gray-600 text-xs">{t.role}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA final */}
      <section className="max-w-3xl mx-auto px-6 lg:px-12 pb-24 text-center">
        <div className="relative bg-gradient-to-br from-blue-600 to-blue-800 rounded-3xl p-10 lg:p-14 overflow-hidden">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS13aWR0aD0iMC41IiBvcGFjaXR5PSIwLjEiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JpZCkiLz48L3N2Zz4=')] opacity-30" />
          <div className="relative">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white mb-3">
              Empezá gratis hoy
            </h2>
            <p className="text-blue-200 mb-8 text-base">3 creativos gratis. Sin tarjeta. Sin compromiso.</p>
            <SignUpButton mode="modal">
              <button className="px-8 py-4 bg-white text-blue-700 text-base font-bold rounded-xl hover:bg-blue-50 transition-colors inline-flex items-center gap-2 shadow-xl">
                Crear mi cuenta gratis <ArrowRight size={18} />
              </button>
            </SignUpButton>
            <p className="text-blue-300/70 text-xs mt-4 flex items-center justify-center gap-4">
              <span className="flex items-center gap-1"><Shield size={11} /> Sin tarjeta requerida</span>
              <span className="flex items-center gap-1"><Zap size={11} /> Listo en 2 minutos</span>
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 px-6 lg:px-12 py-8">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-blue-500 flex items-center justify-center">
              <Zap size={12} className="text-white" fill="white" />
            </div>
            <span className="font-semibold text-sm text-gray-400">InmoGen</span>
          </div>
          <p className="text-gray-600 text-xs">© 2026 InmoGen · <a href="mailto:hola@inmogen-ia.com" className="hover:text-gray-400 transition-colors">hola@inmogen-ia.com</a></p>
          <div className="flex items-center gap-5 text-gray-600 text-xs">
            <a href="/terms" className="hover:text-gray-400 transition-colors">Términos</a>
            <a href="/privacy" className="hover:text-gray-400 transition-colors">Privacidad</a>
            <button onClick={() => setShowPricing(true)} className="hover:text-gray-400 transition-colors">Precios</button>
          </div>
        </div>
      </footer>

      {showPricing && <PricingModal onClose={() => setShowPricing(false)} />}
    </div>
  )
}
