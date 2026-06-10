import { useState, useEffect } from 'react'
import { SignInButton, SignUpButton, useAuth } from '@clerk/clerk-react'
import { Navigate, useSearchParams } from 'react-router-dom'
import { Zap, Clock, Palette, Download, Image, RefreshCw, Sparkles, ChevronRight, Star, Check, Video, Sofa, Sun, Globe, Layers } from 'lucide-react'
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
    <div className="min-h-screen bg-gray-950 text-white">

      {/* Nav */}
      <nav className="flex items-center justify-between px-8 py-4 border-b border-gray-800 sticky top-0 z-40 bg-gray-950/90 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <Zap className="text-yellow-400" size={22} />
          <span className="font-bold text-xl">InmoGen</span>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => setShowPricing(true)} className="text-sm text-gray-400 hover:text-white transition-colors hidden sm:block">
            Precios
          </button>
          <SignInButton mode="modal">
            <button className="px-4 py-2 text-sm text-gray-300 hover:text-white transition-colors">
              Ingresar
            </button>
          </SignInButton>
          <SignUpButton mode="modal">
            <button className="px-4 py-2 bg-yellow-400 text-gray-900 text-sm font-semibold rounded-lg hover:bg-yellow-300 transition-colors">
              Empezar gratis
            </button>
          </SignUpButton>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-4xl mx-auto px-8 pt-20 pb-14 text-center">
        <div className="inline-flex items-center gap-2 bg-yellow-400/10 border border-yellow-400/30 rounded-full px-4 py-1.5 text-yellow-400 text-sm mb-6">
          <Zap size={13} />
          Primeros 100 clientes → créditos dobles de por vida
        </div>
        <h1 className="text-5xl sm:text-6xl font-extrabold leading-tight mb-6">
          Del link a los creativos<br />
          <span className="text-yellow-400">en 2 minutos.</span>
        </h1>
        <p className="text-xl text-gray-400 mb-10 max-w-2xl mx-auto leading-relaxed">
          Pegás la URL de cualquier propiedad en Zonaprop, Argenprop o Idealista
          y obtenés creativos listos para Meta Ads con la identidad visual de tu inmobiliaria.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <SignUpButton mode="modal">
            <button className="px-8 py-4 bg-yellow-400 text-gray-900 text-lg font-bold rounded-xl hover:bg-yellow-300 transition-colors shadow-lg shadow-yellow-400/20 flex items-center gap-2">
              Generar mis primeros creativos
              <ChevronRight size={20} />
            </button>
          </SignUpButton>
          <button onClick={() => setShowPricing(true)} className="text-gray-400 hover:text-white text-sm transition-colors underline underline-offset-4">
            Ver planes y precios
          </button>
        </div>
        <p className="text-gray-600 text-sm mt-4">3 creativos gratis · Sin tarjeta de crédito</p>
      </section>

      {/* How it works */}
      <section className="max-w-4xl mx-auto px-8 pb-20">
        <h2 className="text-center text-2xl font-bold mb-10 text-gray-300">Cómo funciona</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {[
            { step: '1', emoji: '🔗', title: 'Pegás el link', desc: 'Cualquier propiedad de Zonaprop, Argenprop o Idealista. El scraper extrae fotos, precio y datos automáticamente.' },
            { step: '2', emoji: '🎨', title: 'Elegís el ángulo', desc: 'Seleccionás fotos, el tipo de creativo (Hook, FAQ, Testimonial…) y escribís tu propio texto si querés.' },
            { step: '3', emoji: '📥', title: 'Descargás', desc: 'Imágenes listas en el formato que necesitás: 1:1, Story, Carrusel, Banner o WhatsApp Status.' },
          ].map(s => (
            <div key={s.step} className="bg-gray-900 border border-gray-800 rounded-2xl p-6 flex flex-col items-center text-center">
              <div className="w-8 h-8 rounded-full bg-yellow-400 text-gray-900 font-extrabold text-sm flex items-center justify-center mb-3">{s.step}</div>
              <div className="text-3xl mb-3">{s.emoji}</div>
              <h3 className="font-bold mb-2">{s.title}</h3>
              <p className="text-gray-400 text-sm leading-relaxed">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features grid */}
      <section className="max-w-5xl mx-auto px-8 pb-20">
        <h2 className="text-center text-2xl font-bold mb-3">Todo lo que incluye</h2>
        <p className="text-center text-gray-500 mb-10 text-sm">Sin apps de diseño. Sin contratar un editor. Sin perder tiempo.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {[
            {
              icon: <Clock className="text-yellow-400" size={22} />,
              title: 'Scraper automático',
              desc: 'Extrae fotos, precio, m², ambientes y ubicación de cualquier portal inmobiliario. Hasta 40 fotos por propiedad.',
            },
            {
              icon: <Image className="text-yellow-400" size={22} />,
              title: '7 tipos de creativo',
              desc: 'Destacado, Infografía, Hook Attack, Storytelling, Social Proof, FAQ y Testimonial. Cada uno con su propia lógica visual.',
            },
            {
              icon: <Palette className="text-yellow-400" size={22} />,
              title: 'Tu marca, siempre',
              desc: 'Logo, colores primario y secundario, teléfono, web e Instagram. Se aplica automáticamente a cada imagen.',
            },
            {
              icon: <Sparkles className="text-yellow-400" size={22} />,
              title: 'Textos personalizados',
              desc: 'En Hook Attack, Storytelling, Social Proof y Testimonial podés escribir tu propio copy. Los demás se generan solos.',
            },
            {
              icon: <RefreshCw className="text-yellow-400" size={22} />,
              title: 'Regenerar sin costo',
              desc: 'No te gustó cómo quedó un ángulo? Regeneralo con un click. No consume créditos.',
            },
            {
              icon: <Download className="text-yellow-400" size={22} />,
              title: '7 formatos de salida',
              desc: 'Feed 1:1, Story 9:16, Banner 16:9, Carrusel x2 y WhatsApp Status. Descarga individual o ZIP.',
            },
            {
              icon: <Star className="text-yellow-400" size={22} />,
              title: 'Paletas profesionales',
              desc: 'Elegí entre 6 combinaciones de color curadas para inmobiliarias, o configurá los tuyos con picker.',
            },
            {
              icon: <Zap className="text-yellow-400" size={22} />,
              title: 'Motor Gemini Imagen 3',
              desc: 'Conectá tu propia API Key de Google Gemini para fondos generados con IA. Gratis desde Google AI Studio.',
            },
            {
              icon: <Image className="text-yellow-400" size={22} />,
              title: 'Historial completo',
              desc: 'Todos tus jobs guardados con thumbnails. Volvé a descargar cualquier imagen cuando quieras.',
            },
            {
              icon: <Sparkles className="text-yellow-400" size={22} />,
              title: 'Mejora de fotos con IA',
              desc: 'Balance de blancos automático, HDR, nitidez y saturación. Una foto oscura o plana se convierte en imagen de revista.',
            },
            {
              icon: <Sofa className="text-yellow-400" size={22} />,
              title: 'Home Staging Virtual',
              desc: 'Amueblá una habitación vacía con IA en segundos. 5 estilos (moderno, escandinavo, minimalista…) y 6 tipos de ambiente.',
            },
            {
              icon: <Sun className="text-yellow-400" size={22} />,
              title: 'Reemplazo de cielo',
              desc: 'Cambiá un cielo gris por uno despejado, de atardecer, dorado o nublado. Ideal para exteriores y terrazas.',
            },
            {
              icon: <Video className="text-yellow-400" size={22} />,
              title: 'Video para Reels y Stories',
              desc: 'Generá un video MP4 con las fotos de la propiedad y transiciones cinematográficas. Listo para subir a Instagram en segundos.',
            },
            {
              icon: <Layers className="text-yellow-400" size={22} />,
              title: 'Todos los formatos de una',
              desc: 'Activá "Generar todos" y obtenés los 6 formatos al mismo tiempo: 1:1, Story, Banner, Carrusel x2 y WhatsApp. Un solo crédito.',
            },
            {
              icon: <Globe className="text-yellow-400" size={22} />,
              title: 'Extensión para Chrome',
              desc: 'Navegás por Zonaprop, Argenprop o Idealista y con un click enviás la propiedad a InmoGen. Sin copiar ni pegar.',
            },
          ].map(f => (
            <div key={f.title} className="bg-gray-900 border border-gray-800 rounded-2xl p-5 hover:border-gray-700 transition-colors">
              <div className="mb-3">{f.icon}</div>
              <h3 className="font-bold mb-2">{f.title}</h3>
              <p className="text-gray-400 text-sm leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Creative types showcase */}
      <section className="max-w-5xl mx-auto px-8 pb-20">
        <h2 className="text-center text-2xl font-bold mb-3">7 ángulos creativos incluidos</h2>
        <p className="text-center text-gray-500 mb-8 text-sm">Cada uno pensado para una etapa distinta del funnel de captación.</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
          {[
            { emoji: '🏠', name: 'Destacado', desc: 'Foto + precio + datos' },
            { emoji: '📊', name: 'Infografía', desc: 'Cards con características' },
            { emoji: '⚡', name: 'Hook Attack', desc: 'Titular que para el scroll' },
            { emoji: '✨', name: 'Storytelling', desc: 'Narrativa aspiracional' },
            { emoji: '⭐', name: 'Social Proof', desc: 'Confianza de la agencia' },
            { emoji: '❓', name: 'FAQ', desc: 'Preguntas frecuentes' },
            { emoji: '💬', name: 'Testimonial', desc: 'Cita del cliente' },
          ].map(t => (
            <div key={t.name} className="bg-gray-900 border border-gray-800 rounded-xl p-3 text-center hover:border-yellow-400/40 transition-colors">
              <div className="text-2xl mb-1.5">{t.emoji}</div>
              <p className="text-white text-xs font-semibold">{t.name}</p>
              <p className="text-gray-500 text-xs mt-0.5 leading-tight">{t.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Testimonials / social proof */}
      <section className="max-w-4xl mx-auto px-8 pb-20">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          {[
            { name: 'Martín R.', role: 'Agente en Palermo', text: 'Antes tardaba 2 horas en armar los creativos para cada propiedad. Ahora en 3 minutos ya los tengo listos para publicar.' },
            { name: 'Valentina S.', role: 'Directora en Recoleta', text: 'La calidad visual sorprende. Los clientes me preguntan quién hace el diseño y les digo que es IA. Se quedan sin palabras.' },
            { name: 'Diego M.', role: 'Broker en Córdoba', text: 'Lo mejor es que mantiene mi identidad de marca en todo. Logo, colores, teléfono. Súper consistente.' },
          ].map(t => (
            <div key={t.name} className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
              <div className="flex gap-0.5 mb-3">
                {[1,2,3,4,5].map(i => <Star key={i} size={13} className="text-yellow-400 fill-yellow-400" />)}
              </div>
              <p className="text-gray-300 text-sm leading-relaxed mb-4">"{t.text}"</p>
              <div>
                <p className="text-white font-semibold text-sm">{t.name}</p>
                <p className="text-gray-500 text-xs">{t.role}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* IA Tools highlight */}
      <section className="max-w-5xl mx-auto px-8 pb-20">
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 bg-purple-500/10 border border-purple-500/30 rounded-full px-4 py-1.5 text-purple-400 text-sm mb-4">
            <Sparkles size={13} />
            Herramientas de IA exclusivas
          </div>
          <h2 className="text-3xl font-bold mb-3">Transformá las fotos antes de generar</h2>
          <p className="text-gray-500 text-sm max-w-xl mx-auto">Mejorá, amueblá y renová cada imagen directamente en el selector de fotos. Sin salir de InmoGen.</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-8">
          {[
            {
              emoji: '✨',
              color: 'yellow',
              title: 'Auto-mejora',
              desc: 'Corrección de color, niveles, contraste y nitidez automáticos. Un click convierte una foto mediocre en imagen profesional.',
              tag: 'Gratis incluido',
            },
            {
              emoji: '🛋️',
              color: 'purple',
              title: 'Home Staging Virtual',
              desc: 'Usá tu API Key de Replicate para amueblar ambientes vacíos con IA. 30 combinaciones de estilo × ambiente.',
              tag: 'Requiere Replicate API',
            },
            {
              emoji: '☀️',
              color: 'blue',
              title: 'Reemplazo de cielo',
              desc: 'Cielo despejado, atardecer, dorado o nublado. Detección automática del cielo y reemplazo con gradiente realista.',
              tag: 'Gratis incluido',
            },
          ].map(item => (
            <div key={item.title} className="bg-gray-900 border border-gray-800 rounded-2xl p-6 hover:border-gray-700 transition-colors">
              <div className="text-4xl mb-4">{item.emoji}</div>
              <div className="inline-block text-xs px-2 py-0.5 rounded-full bg-gray-800 text-gray-400 mb-3">{item.tag}</div>
              <h3 className="font-bold text-lg mb-2">{item.title}</h3>
              <p className="text-gray-400 text-sm leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>

        {/* Replicate CTA */}
        <div className="bg-gradient-to-r from-purple-900/40 to-gray-900 border border-purple-500/30 rounded-2xl p-6 flex flex-col sm:flex-row items-center gap-5">
          <div className="flex-1">
            <p className="text-purple-400 text-xs font-semibold uppercase tracking-wide mb-1">Home Staging Virtual</p>
            <h3 className="text-white font-bold text-lg mb-1">Usá tu propia API Key de Replicate</h3>
            <p className="text-gray-400 text-sm">Conectás tu token en Configuración de Marca y cada foto de ambiente vacío se amuebla automáticamente con IA. El costo va a tu propia cuenta de Replicate.</p>
          </div>
          <a href="https://replicate.com/account/api-tokens" target="_blank" rel="noopener noreferrer"
            className="flex-shrink-0 px-5 py-2.5 bg-purple-500 hover:bg-purple-400 text-white text-sm font-semibold rounded-xl transition-colors">
            Obtener API Key →
          </a>
        </div>
      </section>

      {/* CTA final */}
      <section className="max-w-2xl mx-auto px-8 pb-24 text-center">
        <div className="bg-yellow-400 rounded-3xl p-10">
          <h2 className="text-3xl font-extrabold text-gray-900 mb-3">
            Empezá gratis hoy
          </h2>
          <p className="text-gray-700 mb-6">3 creativos gratis. Sin tarjeta. Sin compromiso.</p>
          <SignUpButton mode="modal">
            <button className="px-8 py-4 bg-gray-900 text-yellow-400 text-lg font-bold rounded-xl hover:bg-gray-800 transition-colors inline-flex items-center gap-2">
              Crear mi cuenta <ChevronRight size={20} />
            </button>
          </SignUpButton>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-800 px-8 py-6 text-center text-gray-600 text-xs">
        <div className="flex items-center justify-center gap-2 mb-2">
          <Zap size={14} className="text-yellow-400" />
          <span className="font-semibold text-gray-400">InmoGen</span>
        </div>
        <p>© 2026 InmoGen · <a href="mailto:hola@inmogen-ia.com" className="hover:text-gray-400 transition-colors">hola@inmogen-ia.com</a></p>
        <div className="flex items-center justify-center gap-4 mt-2">
          <a href="/terms" className="hover:text-gray-400 transition-colors">Términos y condiciones</a>
          <span>·</span>
          <a href="/privacy" className="hover:text-gray-400 transition-colors">Política de privacidad</a>
        </div>
      </footer>

      {/* Pricing modal */}
      {showPricing && <PricingModal onClose={() => setShowPricing(false)} />}
    </div>
  )
}
