import { useState } from 'react'
import { useUser } from '@clerk/clerk-react'
import { Check, Zap, Image, Download, Palette, RefreshCw, FileImage, Star } from 'lucide-react'
import { createCheckout } from '../lib/api'
import toast from 'react-hot-toast'

const PLANS = [
  {
    id: 'starter',
    name: 'Starter',
    price: 49,
    credits: 30,
    creditsLabel: '30 creativos/mes',
    cta: 'Empezar con Starter',
    highlighted: false,
    features: [
      { icon: Image,      text: '30 propiedades por mes' },
      { icon: FileImage,  text: '7 formatos por propiedad (1:1, 9:16, 16:9, carrusel, WhatsApp)' },
      { icon: Palette,    text: 'Tu marca: logo, colores y datos de contacto' },
      { icon: RefreshCw,  text: 'Regenerá ángulos sin gastar créditos' },
      { icon: Download,   text: 'Descarga individual o en ZIP' },
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 99,
    credits: 100,
    creditsLabel: '100 creativos/mes',
    cta: 'Empezar con Pro',
    highlighted: true,
    badge: 'Más popular',
    features: [
      { icon: Image,      text: '100 propiedades por mes' },
      { icon: FileImage,  text: '7 formatos por propiedad (1:1, 9:16, 16:9, carrusel, WhatsApp)' },
      { icon: Palette,    text: 'Tu marca: logo, colores y datos de contacto' },
      { icon: RefreshCw,  text: 'Regenerá ángulos sin gastar créditos' },
      { icon: Download,   text: 'Descarga individual o en ZIP' },
      { icon: Star,       text: 'Soporte prioritario por WhatsApp' },
    ],
  },
  {
    id: 'scale',
    name: 'Scale',
    price: 199,
    credits: 9999,
    creditsLabel: 'Ilimitado',
    cta: 'Empezar con Scale',
    highlighted: false,
    features: [
      { icon: Image,      text: 'Propiedades ilimitadas' },
      { icon: FileImage,  text: '7 formatos por propiedad (1:1, 9:16, 16:9, carrusel, WhatsApp)' },
      { icon: Palette,    text: 'Tu marca: logo, colores y datos de contacto' },
      { icon: RefreshCw,  text: 'Regenerá ángulos sin gastar créditos' },
      { icon: Download,   text: 'Descarga individual o en ZIP' },
      { icon: Star,       text: 'Soporte prioritario por WhatsApp' },
      { icon: Star,       text: 'Onboarding personalizado de marca ($150 valor)' },
    ],
  },
]

// Paquetes de créditos extra (top-up sin suscripción)
const CREDIT_PACKS = [
  { id: 'pack_10',  credits: 10,  price: 9,  label: '10 creativos',  per: '$0.90/creativo',  popular: false },
  { id: 'pack_25',  credits: 25,  price: 19, label: '25 creativos',  per: '$0.76/creativo',  popular: false },
  { id: 'pack_50',  credits: 50,  price: 32, label: '50 creativos',  per: '$0.64/creativo',  popular: true  },
  { id: 'pack_100', credits: 100, price: 55, label: '100 creativos', per: '$0.55/creativo',  popular: false },
]

export default function Pricing() {
  const { user } = useUser()
  const [tab, setTab] = useState('plans') // 'plans' | 'credits'
  const [loadingPlan, setLoadingPlan] = useState(null)

  async function handleCheckout(planId) {
    if (!user) return toast.error('Iniciá sesión para continuar')
    setLoadingPlan(planId)
    try {
      const { checkout_url } = await createCheckout(user.id, planId)
      window.location.href = checkout_url
    } catch {
      toast.error('Error al crear sesión de pago')
    } finally {
      setLoadingPlan(null)
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white py-16 px-6">
      <div className="max-w-5xl mx-auto">

        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-4xl font-extrabold mb-3">Planes InmoGen</h1>
          <p className="text-gray-400 text-lg mb-4">
            Generá creativos inmobiliarios listos para Meta Ads, con tu marca.
          </p>
          <div className="inline-flex items-center gap-2 bg-yellow-400/10 border border-yellow-400/30 rounded-full px-4 py-1.5 text-yellow-400 text-sm">
            <Zap size={13} />
            Primeros 100 clientes → créditos dobles de por vida
          </div>
        </div>

        {/* Tabs */}
        <div className="flex justify-center mb-10">
          <div className="flex bg-gray-900 border border-gray-800 rounded-xl p-1 gap-1">
            <TabBtn active={tab === 'plans'} onClick={() => setTab('plans')}>
              📋 Planes mensuales
            </TabBtn>
            <TabBtn active={tab === 'credits'} onClick={() => setTab('credits')}>
              ⚡ Comprar créditos
            </TabBtn>
          </div>
        </div>

        {/* ── PLANS TAB ─────────────────────────────────────────────── */}
        {tab === 'plans' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {PLANS.map(plan => (
              <div key={plan.id} className={`relative rounded-2xl p-6 flex flex-col transition-all ${
                plan.highlighted
                  ? 'bg-yellow-400 text-gray-900 shadow-2xl shadow-yellow-400/25 scale-[1.02]'
                  : 'bg-gray-900 border border-gray-800 text-white hover:border-gray-700'
              }`}>
                {plan.badge && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gray-900 text-yellow-400 text-xs font-bold px-3 py-1 rounded-full border border-yellow-400/40">
                    {plan.badge}
                  </div>
                )}

                {/* Price block */}
                <div className="mb-6">
                  <p className={`font-bold text-sm mb-2 ${plan.highlighted ? 'text-gray-700' : 'text-gray-400'}`}>
                    {plan.name}
                  </p>
                  <div className="flex items-end gap-1 mb-1">
                    <span className="text-4xl font-extrabold">${plan.price}</span>
                    <span className={`text-sm mb-1.5 ${plan.highlighted ? 'text-gray-700' : 'text-gray-500'}`}>/mes</span>
                  </div>
                  <p className={`text-sm font-semibold ${plan.highlighted ? 'text-gray-800' : 'text-yellow-400'}`}>
                    {plan.creditsLabel}
                  </p>
                  {plan.credits < 9999 && (
                    <p className={`text-xs mt-0.5 ${plan.highlighted ? 'text-gray-600' : 'text-gray-500'}`}>
                      ≈ ${(plan.price / plan.credits).toFixed(2)} por creativo
                    </p>
                  )}
                </div>

                {/* Features */}
                <ul className="space-y-2.5 flex-1 mb-6">
                  {plan.features.map((f, i) => (
                    <li key={i} className="flex items-start gap-2.5 text-sm">
                      <Check size={14} className={`mt-0.5 flex-shrink-0 ${plan.highlighted ? 'text-gray-700' : 'text-green-400'}`} />
                      <span className={plan.highlighted ? 'text-gray-800' : 'text-gray-300'}>{f.text}</span>
                    </li>
                  ))}
                </ul>

                <button
                  onClick={() => handleCheckout(plan.id)}
                  disabled={loadingPlan === plan.id}
                  className={`w-full py-3 rounded-xl font-semibold transition-colors disabled:opacity-60 ${
                    plan.highlighted
                      ? 'bg-gray-900 text-yellow-400 hover:bg-gray-800'
                      : 'bg-yellow-400 text-gray-900 hover:bg-yellow-300'
                  }`}
                >
                  {loadingPlan === plan.id ? 'Redirigiendo...' : plan.cta}
                </button>
              </div>
            ))}
          </div>
        )}

        {/* ── CREDITS TAB ───────────────────────────────────────────── */}
        {tab === 'credits' && (
          <div className="max-w-2xl mx-auto">
            <div className="text-center mb-8">
              <p className="text-gray-400">
                ¿Necesitás más creativos sin cambiar de plan? Comprá un paquete de créditos extra, sin vencimiento.
              </p>
            </div>

            <div className="space-y-3">
              {CREDIT_PACKS.map(pack => (
                <div key={pack.id} className={`relative rounded-2xl border p-5 flex items-center gap-5 transition-all hover:border-yellow-400/50 ${
                  pack.popular
                    ? 'border-yellow-400/50 bg-yellow-400/5'
                    : 'border-gray-800 bg-gray-900'
                }`}>
                  {pack.popular && (
                    <div className="absolute -top-3 left-5 bg-yellow-400 text-gray-900 text-xs font-bold px-3 py-0.5 rounded-full">
                      Mejor valor
                    </div>
                  )}

                  {/* Credits display */}
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-yellow-400/10 flex items-center justify-center">
                        <Zap size={18} className="text-yellow-400" />
                      </div>
                      <div>
                        <p className="font-bold text-white text-lg">{pack.label}</p>
                        <p className="text-gray-500 text-xs">{pack.per} · Sin vencimiento</p>
                      </div>
                    </div>
                  </div>

                  {/* Price + CTA */}
                  <div className="flex items-center gap-4 flex-shrink-0">
                    <div className="text-right">
                      <p className="text-2xl font-extrabold text-white">${pack.price}</p>
                      <p className="text-xs text-gray-500">pago único</p>
                    </div>
                    <button
                      onClick={() => toast('Próximamente — contactanos por WhatsApp', { icon: '⚡' })}
                      className="px-5 py-2.5 bg-yellow-400 text-gray-900 font-semibold rounded-xl hover:bg-yellow-300 transition-colors text-sm whitespace-nowrap"
                    >
                      Comprar
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <p className="text-center text-gray-600 text-xs mt-6">
              Los créditos extra se suman a tu saldo actual y no tienen fecha de vencimiento.<br />
              Para comprar, escribinos a{' '}
              <a href="mailto:hola@inmogen-ia.com" className="text-yellow-400 hover:underline">hola@inmogen-ia.com</a>
            </p>
          </div>
        )}

        {/* What counts as 1 creative */}
        <div className="mt-14 max-w-2xl mx-auto bg-gray-900 border border-gray-800 rounded-2xl p-6">
          <h3 className="font-semibold text-white mb-4 text-center">¿Qué es un creativo?</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { emoji: '🏠', label: '1 propiedad', sub: '= 1 crédito' },
              { emoji: '🎨', label: 'N ángulos', sub: 'incluidos (hook, faq…)' },
              { emoji: '🔄', label: 'Regenerar', sub: 'sin costo extra' },
              { emoji: '📥', label: 'Todos los formatos', sub: 'en 1 crédito' },
            ].map(item => (
              <div key={item.label} className="text-center">
                <div className="text-2xl mb-1">{item.emoji}</div>
                <p className="text-white text-sm font-semibold">{item.label}</p>
                <p className="text-gray-500 text-xs">{item.sub}</p>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  )
}

function TabBtn({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`px-5 py-2 rounded-lg text-sm font-medium transition-colors ${
        active
          ? 'bg-yellow-400 text-gray-900'
          : 'text-gray-400 hover:text-white'
      }`}
    >
      {children}
    </button>
  )
}
