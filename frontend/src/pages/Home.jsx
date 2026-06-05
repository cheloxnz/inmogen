import { SignInButton, SignUpButton, useAuth } from '@clerk/clerk-react'
import { Navigate } from 'react-router-dom'
import { Zap, Clock, Palette, Download } from 'lucide-react'

export default function Home() {
  const { isSignedIn } = useAuth()
  if (isSignedIn) return <Navigate to="/dashboard" replace />

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Nav */}
      <nav className="flex items-center justify-between px-8 py-4 border-b border-gray-800">
        <div className="flex items-center gap-2">
          <Zap className="text-yellow-400" size={24} />
          <span className="font-bold text-xl">InmoGen</span>
        </div>
        <div className="flex gap-3">
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
      <section className="max-w-4xl mx-auto px-8 pt-24 pb-16 text-center">
        <div className="inline-flex items-center gap-2 bg-yellow-400/10 border border-yellow-400/30 rounded-full px-4 py-1.5 text-yellow-400 text-sm mb-6">
          <Zap size={14} />
          Primeros 100 clientes → créditos dobles de por vida
        </div>
        <h1 className="text-5xl font-extrabold leading-tight mb-6">
          Del link a los creativos<br />
          <span className="text-yellow-400">en 2 minutos.</span>
        </h1>
        <p className="text-xl text-gray-400 mb-10 max-w-2xl mx-auto">
          Pegás la URL de cualquier propiedad en Zonaprop, Idealista o Fotocasa
          y obtenés 6 creativos listos para Meta Ads con la identidad visual de tu inmobiliaria.
        </p>
        <SignUpButton mode="modal">
          <button className="px-8 py-4 bg-yellow-400 text-gray-900 text-lg font-bold rounded-xl hover:bg-yellow-300 transition-colors shadow-lg shadow-yellow-400/20">
            Generar mis primeros creativos →
          </button>
        </SignUpButton>
        <p className="text-gray-500 text-sm mt-3">3 creativos gratis · Sin tarjeta de crédito</p>
      </section>

      {/* Features */}
      <section className="max-w-5xl mx-auto px-8 pb-24 grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { icon: <Clock className="text-yellow-400" size={28} />, title: 'Ahorrá 20hs/semana', desc: 'Cero copy-paste. El scraper extrae fotos, precio y datos automáticamente.' },
          { icon: <Palette className="text-yellow-400" size={28} />, title: 'Tu marca, siempre', desc: 'Configurás logo, colores y tipografía una vez. Todos los creativos con tu identidad.' },
          { icon: <Download className="text-yellow-400" size={28} />, title: '6 formatos listos', desc: 'Feed, Story, Carrusel, Banner, WhatsApp Status y Thumbnail. En ZIP al instante.' },
        ].map((f) => (
          <div key={f.title} className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
            {f.icon}
            <h3 className="font-bold text-lg mt-3 mb-2">{f.title}</h3>
            <p className="text-gray-400 text-sm">{f.desc}</p>
          </div>
        ))}
      </section>
    </div>
  )
}
