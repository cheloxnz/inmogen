import { useUser } from '@clerk/clerk-react'
import { Check, Zap } from 'lucide-react'
import { createCheckout } from '../lib/api'
import toast from 'react-hot-toast'

const PLANS = [
  {
    id: 'starter',
    name: 'Starter',
    price: '$49',
    period: '/mes',
    credits: '30 creativos/mes',
    features: ['30 propiedades/mes', '6 formatos por propiedad', 'Tu marca en todos los creativos', 'Descarga en ZIP', 'Soporte por email'],
    cta: 'Empezar con Starter',
    highlighted: false,
  },
  {
    id: 'pro',
    name: 'Pro',
    price: '$99',
    period: '/mes',
    credits: '100 creativos/mes',
    features: ['100 propiedades/mes', '6 formatos por propiedad', 'Tu marca en todos los creativos', 'Descarga en ZIP', 'Descuento en InmoBot', 'Soporte prioritario'],
    cta: 'Empezar con Pro',
    highlighted: true,
  },
  {
    id: 'scale',
    name: 'Scale',
    price: '$199',
    period: '/mes',
    credits: 'Ilimitado',
    features: ['Propiedades ilimitadas', '6 formatos por propiedad', 'Tu marca en todos los creativos', 'Descarga en ZIP', 'Acceso Automatik Suite', 'Consultoría de marca ($150)'],
    cta: 'Empezar con Scale',
    highlighted: false,
  },
]

export default function Pricing() {
  const { user } = useUser()

  async function handleCheckout(planId) {
    if (!user) {
      toast.error('Iniciá sesión para suscribirte')
      return
    }
    try {
      const { checkout_url } = await createCheckout(user.id, planId)
      window.location.href = checkout_url
    } catch {
      toast.error('Error al crear sesión de pago')
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white py-16 px-8">
      <div className="max-w-5xl mx-auto text-center mb-12">
        <h1 className="text-4xl font-extrabold mb-4">Planes InmoGen</h1>
        <p className="text-gray-400 text-lg">Elegí el plan que mejor se adapta a tu volumen de propiedades.</p>
        <div className="inline-flex items-center gap-2 bg-yellow-400/10 border border-yellow-400/30 rounded-full px-4 py-1.5 text-yellow-400 text-sm mt-4">
          <Zap size={14} />
          Primeros 100 clientes → créditos dobles de por vida
        </div>
      </div>

      <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6">
        {PLANS.map(plan => (
          <div key={plan.id} className={`rounded-2xl p-6 flex flex-col ${
            plan.highlighted
              ? 'bg-yellow-400 text-gray-900 shadow-xl shadow-yellow-400/20'
              : 'bg-gray-900 border border-gray-800 text-white'
          }`}>
            <div className="mb-6">
              <p className={`font-bold text-sm mb-1 ${plan.highlighted ? 'text-gray-700' : 'text-gray-400'}`}>{plan.name}</p>
              <div className="flex items-end gap-1">
                <span className="text-4xl font-extrabold">{plan.price}</span>
                <span className={`text-sm mb-1.5 ${plan.highlighted ? 'text-gray-700' : 'text-gray-500'}`}>{plan.period}</span>
              </div>
              <p className={`text-sm font-medium mt-1 ${plan.highlighted ? 'text-gray-700' : 'text-yellow-400'}`}>{plan.credits}</p>
            </div>

            <ul className="space-y-2.5 flex-1 mb-6">
              {plan.features.map(f => (
                <li key={f} className="flex items-start gap-2 text-sm">
                  <Check size={15} className={`mt-0.5 flex-shrink-0 ${plan.highlighted ? 'text-gray-700' : 'text-green-400'}`} />
                  {f}
                </li>
              ))}
            </ul>

            <button
              onClick={() => handleCheckout(plan.id)}
              className={`w-full py-3 rounded-xl font-semibold transition-colors ${
                plan.highlighted
                  ? 'bg-gray-900 text-yellow-400 hover:bg-gray-800'
                  : 'bg-yellow-400 text-gray-900 hover:bg-yellow-300'
              }`}
            >
              {plan.cta}
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
