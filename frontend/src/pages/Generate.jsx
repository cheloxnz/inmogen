import { useState, useEffect } from 'react'
import { useUser } from '@clerk/clerk-react'
import { Link2, Loader2, CheckCircle, XCircle, Download } from 'lucide-react'
import toast from 'react-hot-toast'
import { startGeneration, pollJob, getMe } from '../lib/api'

const STATUS_LABELS = {
  pending: 'En cola...',
  scraping: 'Extrayendo datos de la propiedad...',
  generating: 'Generando creativos...',
  done: '¡Creativos listos!',
  error: 'Error al generar',
}

const CREATIVE_TYPES = [
  { id: 'destacado',    label: 'Destacado',     emoji: '🏠', desc: 'Foto + precio + datos. El clásico que funciona.' },
  { id: 'infografia',   label: 'Infografía',    emoji: '📊', desc: 'Cards visuales con m², ambientes, baños y precio.' },
  { id: 'hook_attack',  label: 'Hook Attack',   emoji: '⚡', desc: 'Titular agresivo para parar el scroll.' },
  { id: 'storytelling', label: 'Storytelling',  emoji: '✨', desc: 'Narrativa aspiracional del estilo de vida.' },
  { id: 'social_proof', label: 'Social Proof',  emoji: '⭐', desc: 'Confianza y credibilidad de la agencia.' },
  { id: 'faq',          label: 'FAQ',           emoji: '❓', desc: 'Preguntas frecuentes respondidas visualmente.' },
  { id: 'testimonial',  label: 'Testimonial',   emoji: '💬', desc: 'Cita de cliente satisfecho con la propiedad.' },
]

const FORMAT_OPTIONS = [
  { id: 'feed_1x1',    label: 'Feed 1:1',       sub: 'Instagram / Facebook' },
  { id: 'story_9x16',  label: 'Story 9:16',     sub: 'Stories / Reels' },
  { id: 'banner_16x9', label: 'Banner 16:9',    sub: 'Facebook Ads' },
  { id: 'carousel_1',  label: 'Carrusel 1',     sub: 'Slide principal' },
  { id: 'carousel_2',  label: 'Carrusel 2',     sub: 'Slide detalle' },
  { id: 'whatsapp',    label: 'WhatsApp',        sub: 'Status' },
]

const ALL_FORMAT_IDS = FORMAT_OPTIONS.map(f => f.id)

export default function Generate() {
  const { user } = useUser()
  const userId = user?.id

  const [url, setUrl] = useState('')
  const [creativeType, setCreativeType] = useState('destacado')
  const [selectedFormats, setSelectedFormats] = useState(ALL_FORMAT_IDS)
  const [job, setJob] = useState(null)
  const [loading, setLoading] = useState(false)
  const [credits, setCredits] = useState(null)

  useEffect(() => {
    if (userId) getMe(userId).then(u => setCredits(u.credits))
  }, [userId])

  useEffect(() => {
    if (!job || job.status === 'done' || job.status === 'error') return
    const interval = setInterval(async () => {
      const updated = await pollJob(userId, job.id)
      setJob(updated)
    }, 2500)
    return () => clearInterval(interval)
  }, [job, userId])

  function toggleFormat(id) {
    setSelectedFormats(prev =>
      prev.includes(id)
        ? prev.length > 1 ? prev.filter(f => f !== id) : prev
        : [...prev, id]
    )
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!url.trim()) return toast.error('Ingresá una URL de propiedad')
    if (credits !== null && credits < 1) return toast.error('Sin créditos disponibles')
    if (selectedFormats.length === 0) return toast.error('Seleccioná al menos un formato')

    setLoading(true)
    try {
      const userData = await getMe(userId)
      if (!userData.brand) {
        toast.error('Primero configurá tu marca en "Mi Marca"')
        return
      }
      const newJob = await startGeneration(userId, url.trim(), userData.brand, creativeType, selectedFormats)
      setJob(newJob)
      setCredits(c => c - 1)
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Error al iniciar generación')
    } finally {
      setLoading(false)
    }
  }

  const isRunning = job && !['done', 'error'].includes(job.status)
  const totalFormats = selectedFormats.length

  return (
    <div className="p-8 max-w-3xl mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Generar Creativos</h1>
          <p className="text-gray-400 mt-1">Pegá el link, elegí el ángulo y obtenés los formatos listos.</p>
        </div>
        {credits !== null && (
          <div className="bg-gray-900 border border-gray-800 rounded-xl px-4 py-2 text-center">
            <p className="text-2xl font-bold text-yellow-400">{credits}</p>
            <p className="text-xs text-gray-500">créditos</p>
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">

        {/* URL input */}
        <div className="flex gap-3">
          <div className="flex-1 relative">
            <Link2 size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              type="url"
              value={url}
              onChange={e => setUrl(e.target.value)}
              placeholder="https://www.zonaprop.com.ar/propiedades/..."
              className="w-full bg-gray-900 border border-gray-700 rounded-xl pl-9 pr-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-yellow-400 transition-colors"
            />
          </div>
        </div>

        {/* Tipo de creativo */}
        <div>
          <p className="text-sm font-medium text-gray-300 mb-3">Ángulo creativo</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
            {CREATIVE_TYPES.map(type => (
              <button
                key={type.id}
                type="button"
                onClick={() => setCreativeType(type.id)}
                className={`relative text-left p-3 rounded-xl border transition-all ${
                  creativeType === type.id
                    ? 'border-yellow-400 bg-yellow-400/10'
                    : 'border-gray-700 bg-gray-900 hover:border-gray-500'
                }`}
              >
                <div className="text-xl mb-1">{type.emoji}</div>
                <div className={`text-sm font-semibold ${creativeType === type.id ? 'text-yellow-400' : 'text-white'}`}>
                  {type.label}
                </div>
                <div className="text-xs text-gray-500 mt-0.5 leading-tight">{type.desc}</div>
                {creativeType === type.id && (
                  <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-yellow-400" />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Selección de formatos */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium text-gray-300">Formatos ({selectedFormats.length}/{FORMAT_OPTIONS.length})</p>
            <div className="flex gap-3">
              <button type="button" onClick={() => setSelectedFormats(ALL_FORMAT_IDS)} className="text-xs text-gray-500 hover:text-yellow-400 transition-colors">
                Todos
              </button>
              <button type="button" onClick={() => setSelectedFormats([ALL_FORMAT_IDS[0]])} className="text-xs text-gray-500 hover:text-yellow-400 transition-colors">
                Solo feed
              </button>
            </div>
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
            {FORMAT_OPTIONS.map(fmt => {
              const active = selectedFormats.includes(fmt.id)
              return (
                <button
                  key={fmt.id}
                  type="button"
                  onClick={() => toggleFormat(fmt.id)}
                  className={`p-2.5 rounded-xl border text-center transition-all ${
                    active
                      ? 'border-yellow-400 bg-yellow-400/10'
                      : 'border-gray-700 bg-gray-900 hover:border-gray-500'
                  }`}
                >
                  <div className={`text-xs font-semibold ${active ? 'text-yellow-400' : 'text-white'}`}>{fmt.label}</div>
                  <div className="text-xs text-gray-500 mt-0.5">{fmt.sub}</div>
                </button>
              )
            })}
          </div>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={loading || isRunning}
          className="w-full px-6 py-3.5 bg-yellow-400 text-gray-900 font-semibold rounded-xl hover:bg-yellow-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {loading || isRunning ? <Loader2 size={16} className="animate-spin" /> : null}
          {isRunning ? 'Generando...' : `Generar ${totalFormats} creativo${totalFormats !== 1 ? 's' : ''}`}
        </button>
      </form>

      {/* Job status */}
      {job && (
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 mt-8">
          <div className="flex items-center gap-3 mb-4">
            {job.status === 'done' ? (
              <CheckCircle className="text-green-400" size={22} />
            ) : job.status === 'error' ? (
              <XCircle className="text-red-400" size={22} />
            ) : (
              <Loader2 className="text-yellow-400 animate-spin" size={22} />
            )}
            <span className="text-white font-medium">{STATUS_LABELS[job.status]}</span>
          </div>

          {job.status === 'error' && (
            <p className="text-red-400 text-sm">{job.error}</p>
          )}

          {job.creatives?.length > 0 && (
            <>
              <div className="grid grid-cols-3 gap-3 mb-5">
                {job.creatives.map((imgUrl, i) => (
                  <div key={i} className="relative rounded-lg overflow-hidden border border-gray-700 aspect-square">
                    <img src={imgUrl} alt={`Creativo ${i + 1}`} className="w-full h-full object-cover" />
                    <div className="absolute bottom-1 right-1 bg-black/60 text-white text-xs px-1.5 py-0.5 rounded">
                      {i + 1}/{job.creatives_fmt?.length || totalFormats}
                    </div>
                  </div>
                ))}
                {job.status !== 'done' && Array.from({ length: totalFormats - job.creatives.length }).map((_, i) => (
                  <div key={`ph-${i}`} className="rounded-lg aspect-square bg-gray-800 border border-gray-700 flex items-center justify-center">
                    <Loader2 size={20} className="text-gray-600 animate-spin" />
                  </div>
                ))}
              </div>
              {job.status === 'done' && job.zip_url && (
                <a
                  href={job.zip_url}
                  className="flex items-center justify-center gap-2 w-full py-3 bg-yellow-400 text-gray-900 font-semibold rounded-xl hover:bg-yellow-300 transition-colors"
                >
                  <Download size={18} />
                  Descargar ZIP ({job.creatives?.length} creativos)
                </a>
              )}
            </>
          )}

          {['pending', 'scraping', 'generating'].includes(job.status) && (
            <div className="w-full bg-gray-800 rounded-full h-2 mt-2">
              <div
                className="bg-yellow-400 h-2 rounded-full transition-all duration-700"
                style={{ width: job.status === 'pending' ? '10%' : job.status === 'scraping' ? '40%' : '75%' }}
              />
            </div>
          )}
        </div>
      )}
    </div>
  )
}
