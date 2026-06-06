import { useState, useEffect, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import { MapPin, Maximize2, BedDouble, Bath, Car, Phone, Globe, AtSign, ChevronLeft, ChevronRight, MessageCircle, Send, CheckCircle, Loader2, Zap } from 'lucide-react'
import { getPublicJob, submitLead } from '../lib/api'

function formatPrice(price, currency) {
  if (!price) return null
  const num = typeof price === 'string' ? price.replace(/\D/g, '') : price
  if (!num) return price
  return `${currency || 'USD'} ${Number(num).toLocaleString('es-AR')}`
}

function formatPhone(phone) {
  if (!phone) return null
  return phone.replace(/\D/g, '')
}

// ── Gallery ──────────────────────────────────────────────────────────────────
function Gallery({ photos, brand }) {
  const [current, setCurrent] = useState(0)
  const trackRef = useRef(null)

  function go(idx) {
    const next = Math.max(0, Math.min(photos.length - 1, idx))
    setCurrent(next)
    trackRef.current?.children[next]?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
  }

  return (
    <div className="relative w-full bg-black" style={{ height: '65vw', maxHeight: 480 }}>
      {/* Main photo */}
      <img
        src={photos[current]}
        alt=""
        className="w-full h-full object-cover"
      />
      {/* Gradient overlay bottom */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/20 pointer-events-none" />

      {/* Nav arrows */}
      {photos.length > 1 && (
        <>
          <button
            onClick={() => go(current - 1)}
            disabled={current === 0}
            className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center text-white disabled:opacity-30 transition-opacity"
          >
            <ChevronLeft size={18} />
          </button>
          <button
            onClick={() => go(current + 1)}
            disabled={current === photos.length - 1}
            className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center text-white disabled:opacity-30 transition-opacity"
          >
            <ChevronRight size={18} />
          </button>
        </>
      )}

      {/* Dots */}
      {photos.length > 1 && (
        <div className="absolute bottom-20 left-1/2 -translate-x-1/2 flex gap-1.5">
          {photos.slice(0, 8).map((_, i) => (
            <button
              key={i}
              onClick={() => go(i)}
              className={`rounded-full transition-all ${i === current ? 'w-4 h-1.5 bg-white' : 'w-1.5 h-1.5 bg-white/50'}`}
            />
          ))}
          {photos.length > 8 && <span className="text-white/50 text-xs self-center">+{photos.length - 8}</span>}
        </div>
      )}

      {/* Agency badge top-left */}
      {brand?.agency_name && (
        <div className="absolute top-4 left-4 flex items-center gap-2 bg-black/50 backdrop-blur-sm rounded-xl px-3 py-1.5">
          {brand.logo_url && (
            <img src={brand.logo_url} alt={brand.agency_name} className="h-5 object-contain" />
          )}
          <span className="text-white text-xs font-semibold">{brand.agency_name}</span>
        </div>
      )}

      {/* Counter top-right */}
      <div className="absolute top-4 right-4 bg-black/50 backdrop-blur-sm rounded-lg px-2.5 py-1 text-white text-xs font-medium">
        {current + 1} / {photos.length}
      </div>
    </div>
  )
}

// ── Feature chip ─────────────────────────────────────────────────────────────
function Chip({ icon, value, label }) {
  if (!value) return null
  return (
    <div className="flex flex-col items-center gap-1 bg-gray-50 rounded-2xl px-4 py-3 min-w-[72px]">
      <span className="text-gray-400">{icon}</span>
      <span className="text-gray-900 font-bold text-base leading-none">{value}</span>
      <span className="text-gray-400 text-xs">{label}</span>
    </div>
  )
}

// ── Contact form ──────────────────────────────────────────────────────────────
function ContactForm({ jobId, brand, propertyTitle, onSuccess }) {
  const [form, setForm] = useState({ name: '', phone: '', message: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const primary = brand?.primary_color || '#1A3C6E'

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.name.trim()) return setError('Ingresá tu nombre')
    if (!form.phone.trim()) return setError('Ingresá tu teléfono')
    setError('')
    setLoading(true)
    try {
      await submitLead(jobId, form)
      onSuccess()
    } catch {
      setError('Error al enviar. Intentá de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <input
        type="text"
        placeholder="Tu nombre *"
        value={form.name}
        onChange={e => set('name', e.target.value)}
        className="w-full border border-gray-200 rounded-xl px-4 py-3 text-gray-900 placeholder-gray-400 focus:outline-none focus:border-gray-400 text-sm"
      />
      <input
        type="tel"
        placeholder="Tu teléfono / WhatsApp *"
        value={form.phone}
        onChange={e => set('phone', e.target.value)}
        className="w-full border border-gray-200 rounded-xl px-4 py-3 text-gray-900 placeholder-gray-400 focus:outline-none focus:border-gray-400 text-sm"
      />
      <textarea
        placeholder="¿Alguna consulta? (opcional)"
        value={form.message}
        onChange={e => set('message', e.target.value)}
        rows={2}
        className="w-full border border-gray-200 rounded-xl px-4 py-3 text-gray-900 placeholder-gray-400 focus:outline-none focus:border-gray-400 text-sm resize-none"
      />
      {error && <p className="text-red-500 text-xs">{error}</p>}
      <button
        type="submit"
        disabled={loading}
        className="w-full py-3.5 rounded-xl font-semibold text-white flex items-center justify-center gap-2 transition-opacity disabled:opacity-60 text-sm"
        style={{ backgroundColor: primary }}
      >
        {loading ? <Loader2 size={16} className="animate-spin" /> : <Send size={15} />}
        {loading ? 'Enviando...' : 'Enviar consulta'}
      </button>
    </form>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function PropertyLanding() {
  const { jobId } = useParams()
  const [job, setJob] = useState(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [descExpanded, setDescExpanded] = useState(false)
  const [formSent, setFormSent] = useState(false)
  const formRef = useRef(null)

  useEffect(() => {
    getPublicJob(jobId)
      .then(setJob)
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false))
  }, [jobId])

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <Loader2 size={32} className="animate-spin text-gray-300" />
      </div>
    )
  }

  if (notFound || !job) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center text-center px-6">
        <p className="text-gray-400 text-lg mb-2">Propiedad no encontrada</p>
        <p className="text-gray-300 text-sm mb-6">El link puede haber expirado o ser incorrecto.</p>
        <Link to="/" className="text-sm text-gray-400 hover:text-gray-600 underline">Ir a InmoGen →</Link>
      </div>
    )
  }

  const pd = job.property_data || {}
  const brand = job.brand || {}
  const photos = pd.photos || []
  const primary = brand.primary_color || '#1A3C6E'
  const secondary = brand.secondary_color || '#F5A623'
  const phone = formatPhone(brand.phone)
  const whatsappMsg = encodeURIComponent(`Hola! Vi esta propiedad en InmoGen y me interesa recibir más información: ${pd.title || 'propiedad'}`)
  const whatsappUrl = phone ? `https://wa.me/${phone}?text=${whatsappMsg}` : null

  const desc = pd.description || ''
  const descShort = desc.length > 200 ? desc.slice(0, 200) + '…' : desc

  const instagramUrl = brand.instagram
    ? `https://instagram.com/${brand.instagram.replace('@', '')}`
    : null

  return (
    <div className="min-h-screen bg-white text-gray-900 pb-24">

      {/* Gallery */}
      {photos.length > 0 ? (
        <Gallery photos={photos} brand={brand} />
      ) : (
        <div className="w-full h-48 bg-gray-100 flex items-center justify-center">
          <span className="text-gray-300 text-4xl">🏠</span>
        </div>
      )}

      {/* Price + title */}
      <div className="px-5 pt-5 pb-4 border-b border-gray-100">
        {pd.price && (
          <p className="text-3xl font-extrabold text-gray-900 mb-1">
            {formatPrice(pd.price, pd.currency)}
          </p>
        )}
        {pd.title && (
          <p className="text-gray-600 text-sm leading-snug">{pd.title}</p>
        )}
        {pd.location && (
          <div className="flex items-center gap-1.5 mt-2 text-gray-400 text-sm">
            <MapPin size={13} />
            <span>{pd.location}</span>
          </div>
        )}
      </div>

      {/* Feature chips */}
      {(pd.rooms || pd.area_m2 || pd.bathrooms || pd.parking) && (
        <div className="px-5 py-4 border-b border-gray-100">
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            <Chip icon={<BedDouble size={16} />} value={pd.rooms} label="ambientes" />
            <Chip icon={<Maximize2 size={16} />} value={pd.area_m2 ? `${pd.area_m2}m²` : null} label="superficie" />
            <Chip icon={<Bath size={16} />} value={pd.bathrooms} label="baños" />
            <Chip icon={<Car size={16} />} value={pd.parking} label="cochera" />
          </div>
        </div>
      )}

      {/* Description */}
      {desc && (
        <div className="px-5 py-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900 mb-2 text-sm">Descripción</h3>
          <p className="text-gray-500 text-sm leading-relaxed">
            {descExpanded ? desc : descShort}
          </p>
          {desc.length > 200 && (
            <button
              onClick={() => setDescExpanded(e => !e)}
              className="text-sm font-medium mt-1"
              style={{ color: primary }}
            >
              {descExpanded ? 'Ver menos' : 'Ver más'}
            </button>
          )}
        </div>
      )}

      {/* Contact form */}
      <div className="px-5 py-5 border-b border-gray-100" ref={formRef}>
        <h3 className="font-bold text-gray-900 mb-1">Consultar por esta propiedad</h3>
        <p className="text-gray-400 text-xs mb-4">Te contactamos a la brevedad sin compromiso.</p>

        {formSent ? (
          <div className="flex flex-col items-center text-center py-6 gap-3">
            <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ backgroundColor: primary + '20' }}>
              <CheckCircle size={24} style={{ color: primary }} />
            </div>
            <p className="font-semibold text-gray-900">¡Consulta enviada!</p>
            <p className="text-gray-400 text-sm">La inmobiliaria te va a contactar a la brevedad.</p>
          </div>
        ) : (
          <ContactForm
            jobId={jobId}
            brand={brand}
            propertyTitle={pd.title}
            onSuccess={() => setFormSent(true)}
          />
        )}
      </div>

      {/* Agency info */}
      {brand.agency_name && (
        <div className="px-5 py-5">
          <div className="flex items-center gap-3 mb-3">
            {brand.logo_url && (
              <img src={brand.logo_url} alt={brand.agency_name} className="h-10 object-contain" />
            )}
            <div>
              <p className="font-bold text-gray-900 text-sm">{brand.agency_name}</p>
              {brand.phone && (
                <a href={`tel:${phone}`} className="text-gray-400 text-xs flex items-center gap-1 mt-0.5">
                  <Phone size={11} /> {brand.phone}
                </a>
              )}
            </div>
          </div>
          <div className="flex gap-3">
            {brand.website && (
              <a href={brand.website.startsWith('http') ? brand.website : `https://${brand.website}`}
                target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600">
                <Globe size={13} /> {brand.website.replace(/^https?:\/\//, '')}
              </a>
            )}
            {instagramUrl && (
              <a href={instagramUrl} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600">
                <AtSign size={13} /> {brand.instagram}
              </a>
            )}
          </div>
        </div>
      )}

      {/* Powered by InmoGen */}
      <div className="px-5 pb-4 text-center">
        <a href="https://inmogen-ia.com" target="_blank" rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-xs text-gray-300 hover:text-gray-400 transition-colors">
          <Zap size={11} className="text-yellow-400" />
          Creado con InmoGen
        </a>
      </div>

      {/* ── Sticky bottom CTA (mobile) ── */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-4 py-3 flex gap-3 z-50 shadow-lg">
        {whatsappUrl ? (
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl bg-[#25D366] text-white font-semibold text-sm"
          >
            <MessageCircle size={17} />
            WhatsApp
          </a>
        ) : (
          <div className="flex-1" />
        )}
        <button
          onClick={() => formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
          className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl font-semibold text-white text-sm"
          style={{ backgroundColor: primary }}
        >
          <Send size={15} />
          Consultar
        </button>
      </div>
    </div>
  )
}
