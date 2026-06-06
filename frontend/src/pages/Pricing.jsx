import { useState } from 'react'
import { useUser } from '@clerk/clerk-react'
import { Check, Zap, X, Image, Download, Palette, RefreshCw, FileImage, Star } from 'lucide-react'
import { createCheckout, createPackCheckout } from '../lib/api'
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
      '30 propiedades por mes',
      '7 formatos por propiedad (1:1, 9:16, 16:9, carrusel, WhatsApp)',
      'Tu marca: logo, colores y datos de contacto',
      'Regenerá ángulos sin gastar créditos',
      'Descarga individual o en ZIP',
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
      '100 propiedades por mes',
      '7 formatos por propiedad (1:1, 9:16, 16:9, carrusel, WhatsApp)',
      'Tu marca: logo, colores y datos de contacto',
      'Regenerá ángulos sin gastar créditos',
      'Descarga individual o en ZIP',
      'Soporte prioritario por WhatsApp',
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
      'Propiedades ilimitadas',
      '7 formatos por propiedad (1:1, 9:16, 16:9, carrusel, WhatsApp)',
      'Tu marca: logo, colores y datos de contacto',
      'Regenerá ángulos sin gastar créditos',
      'Descarga individual o en ZIP',
      'Soporte prioritario por WhatsApp',
      'Onboarding personalizado de marca ($150 valor)',
    ],
  },
]

const CREDIT_PACKS = [
  { id: 'pack_10',  credits: 10,  price: 9,  label: '10 creativos',  per: '$0.90/creativo',  popular: false },
  { id: 'pack_25',  credits: 25,  price: 19, label: '25 creativos',  per: '$0.76/creativo',  popular: false },
  { id: 'pack_50',  credits: 50,  price: 32, label: '50 creativos',  per: '$0.64/creativo',  popular: true  },
  { id: 'pack_100', credits: 100, price: 55, label: '100 creativos', per: '$0.55/creativo',  popular: false },
]

function PricingContent({ onClose }) {
  const { user } = useUser()
  const [tab, setTab] = useState('plans')
  const [loadingPlan, setLoadingPlan] = useState(null)
  const [loadingPack, setLoadingPack] = useState(null)

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

  async function handlePackCheckout(packId) {
    if (!user) return toast.error('Iniciá sesión para continuar')
    setLoadingPack(packId)
    try {
      const { checkout_url } = await createPackCheckout(user.id, packId)
      window.location.href = checkout_url
    } catch (err) {
      const msg = err?.response?.data?.detail || 'Error al crear sesión de pago'
      toast.error(msg)
    } finally {
      setLoadingPack(null)
    }
  }

  return (
    <div className="text-white">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 bg-yellow-400/10 border border-yellow-400/30 rounded-full px-4 py-1.5 text-yellow-400 text-sm mb-4">
          <Zap size={13} /> Primeros 100 clientes → créditos dobles de por vida
        </div>
        <h2 className="text-3xl font-extrabold mb-2">Planes InmoGen</h2>
        <p className="text-gray-400">Generá creativos inmobiliarios listos para Meta Ads, con tu marca.</p>
      </div>

      {/* Tabs */}
      <div className="flex justify-center mb-8">
        <div className="flex bg-gray-900 border border-gray-800 rounded-xl p-1 gap-1">
          <TabBtn active={tab === 'plans'} onClick={() => setTab('plans')}>📋 Planes mensuales</TabBtn>
          <TabBtn active={tab === 'credits'} onClick={() => setTab('credits')}>⚡ Comprar créditos</TabBtn>
        </div>
      </div>

      {/* Plans */}
      {tab === 'plans' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {PLANS.map(plan => (
            <div key={plan.id} className={`relative rounded-2xl p-6 flex flex-col ${
              plan.highlighted
                ? 'bg-yellow-400 text-gray-900 shadow-2xl shadow-yellow-400/25 scale-[1.02]'
                : 'bg-gray-900 border border-gray-800 text-white'
            }`}>
              {plan.badge && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gray-900 text-yellow-400 text-xs font-bold px-3 py-1 rounded-full border border-yellow-400/40 whitespace-nowrap">
                  {plan.badge}
                </div>
              )}
              <div className="mb-5">
                <p className={`font-bold text-sm mb-1 ${plan.highlighted ? 'text-gray-700' : 'text-gray-400'}`}>{plan.name}</p>
                <div className="flex items-end gap-1 mb-1">
                  <span className="text-4xl font-extrabold">${plan.price}</span>
                  <span className={`text-sm mb-1.5 ${plan.highlighted ? 'text-gray-700' : 'text-gray-500'}`}>/mes</span>
                </div>
                <p className={`text-sm font-semibold ${plan.highlighted ? 'text-gray-800' : 'text-yellow-400'}`}>{plan.creditsLabel}</p>
                {plan.credits < 9999 && (
                  <p className={`text-xs mt-0.5 ${plan.highlighted ? 'text-gray-600' : 'text-gray-500'}`}>
                    ≈ ${(plan.price / plan.credits).toFixed(2)} por creativo
                  </p>
                )}
              </div>
              <ul className="space-y-2.5 flex-1 mb-5">
                {plan.features.map((f, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <Check size={14} className={`mt-0.5 flex-shrink-0 ${plan.highlighted ? 'text-gray-700' : 'text-green-400'}`} />
                    <span className={plan.highlighted ? 'text-gray-800' : 'text-gray-300'}>{f}</span>
                  </li>
                ))}
              </ul>
              <button
                onClick={() => handleCheckout(plan.id)}
                disabled={loadingPlan === plan.id}
                className={`w-full py-3 rounded-xl font-semibold transition-colors disabled:opacity-60 ${
                  plan.highlighted ? 'bg-gray-900 text-yellow-400 hover:bg-gray-800' : 'bg-yellow-400 text-gray-900 hover:bg-yellow-300'
                }`}
              >
                {loadingPlan === plan.id ? 'Redirigiendo...' : plan.cta}
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Credits */}
      {tab === 'credits' && (
        <div className="max-w-xl mx-auto">
          <p className="text-center text-gray-400 mb-6 text-sm">
            Comprá créditos extra sin cambiar de plan. No vencen.
          </p>
          <div className="space-y-3">
            {CREDIT_PACKS.map(pack => (
              <div key={pack.id} className={`relative rounded-2xl border p-4 flex items-center gap-4 transition-all hover:border-yellow-400/50 ${
                pack.popular ? 'border-yellow-400/50 bg-yellow-400/5' : 'border-gray-800 bg-gray-900'
              }`}>
                {pack.popular && (
                  <div className="absolute -top-2.5 left-4 bg-yellow-400 text-gray-900 text-xs font-bold px-2.5 py-0.5 rounded-full">
                    Mejor valor
                  </div>
                )}
                <div className="w-10 h-10 rounded-xl bg-yellow-400/10 flex items-center justify-center flex-shrink-0">
                  <Zap size={16} className="text-yellow-400" />
                </div>
                <div className="flex-1">
                  <p className="font-bold text-white">{pack.label}</p>
                  <p className="text-gray-500 text-xs">{pack.per} · Sin vencimiento</p>
                </div>
                <div className="text-right mr-3">
                  <p className="text-xl font-extrabold text-white">${pack.price}</p>
                  <p className="text-xs text-gray-500">pago único</p>
                </div>
                <button
                  onClick={() => handlePackCheckout(pack.id)}
                  disabled={loadingPack === pack.id}
                  className="px-4 py-2 bg-yellow-400 text-gray-900 font-semibold rounded-xl hover:bg-yellow-300 transition-colors text-sm whitespace-nowrap disabled:opacity-60"
                >
                  {loadingPack === pack.id ? 'Redirigiendo...' : 'Comprar'}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* What counts */}
      <div className="mt-10 bg-gray-900 border border-gray-800 rounded-2xl p-5">
        <h3 className="font-semibold text-white mb-4 text-center text-sm">¿Qué es 1 crédito?</h3>
        <div className="grid grid-cols-4 gap-3 text-center">
          {[
            { e: '🏠', l: '1 propiedad', s: '= 1 crédito' },
            { e: '🎨', l: 'N ángulos', s: 'incluidos' },
            { e: '🔄', l: 'Regenerar', s: 'sin costo' },
            { e: '📥', l: 'Todos los formatos', s: 'incluidos' },
          ].map(item => (
            <div key={item.l}>
              <div className="text-xl mb-1">{item.e}</div>
              <p className="text-white text-xs font-semibold">{item.l}</p>
              <p className="text-gray-500 text-xs">{item.s}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Modal wrapper ─────────────────────────────────────────────────────────────
export function PricingModal({ onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 backdrop-blur-sm px-4 py-8">
      <div className="relative bg-gray-950 border border-gray-800 rounded-3xl w-full max-w-5xl p-8 my-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white transition-colors"
        >
          <X size={16} />
        </button>
        <PricingContent onClose={onClose} />
      </div>
    </div>
  )
}

// ── Standalone page (ruta /pricing) ─────────────────────────────────────────
export default function Pricing() {
  return (
    <div className="min-h-screen bg-gray-950 py-16 px-6">
      <div className="max-w-5xl mx-auto">
        <PricingContent />
      </div>
    </div>
  )
}

function TabBtn({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`px-5 py-2 rounded-lg text-sm font-medium transition-colors ${
        active ? 'bg-yellow-400 text-gray-900' : 'text-gray-400 hover:text-white'
      }`}
    >
      {children}
    </button>
  )
}
