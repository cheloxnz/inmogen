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
  { id: 'destacado',    label: 'Destacado',     emoji: '🏠', desc: 'Foto + precio + datos' },
  { id: 'infografia',   label: 'Infografía',    emoji: '📊', desc: 'Cards con m², amb., baños' },
  { id: 'hook_attack',  label: 'Hook Attack',   emoji: '⚡', desc: 'Titular que para el scroll' },
  { id: 'storytelling', label: 'Storytelling',  emoji: '✨', desc: 'Narrativa aspiracional' },
  { id: 'social_proof', label: 'Social Proof',  emoji: '⭐', desc: 'Confianza de la agencia' },
  { id: 'faq',          label: 'FAQ',           emoji: '❓', desc: 'Preguntas frecuentes' },
  { id: 'testimonial',  label: 'Testimonial',   emoji: '💬', desc: 'Cita de cliente' },
]

const FORMAT_OPTIONS = [
  { id: 'feed_1x1',    label: 'Feed 1:1',    sub: 'Instagram / FB' },
  { id: 'story_9x16',  label: 'Story 9:16',  sub: 'Stories / Reels' },
  { id: 'banner_16x9', label: 'Banner 16:9', sub: 'Facebook Ads' },
  { id: 'carousel_1',  label: 'Carrusel 1',  sub: 'Slide principal' },
  { id: 'carousel_2',  label: 'Carrusel 2',  sub: 'Slide detalle' },
  { id: 'whatsapp',    label: 'WhatsApp',    sub: 'Status' },
]

export default function Generate() {
  const { user } = useUser()
  const userId = user?.id

  const [url, setUrl] = useState('')
  const [fmt, setFmt] = useState('feed_1x1')
  const [selectedTypes, setSelectedTypes] = useState(['destacado'])
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

  function toggleType(id) {
    setSelectedTypes(prev =>
      prev.includes(id)
        ? prev.length > 1 ? prev.filter(t => t !== id) : prev
        : [...prev, id]
    )
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!url.trim()) return toast.error('Ingresá una URL de propiedad')
    if (credits !== null && credits < 1) return toast.error('Sin créditos disponibles')

    setLoading(true)
    try {
      const userData = await getMe(userId)
      if (!userData.brand) {
        toast.error('Primero configurá tu marca en "Mi Marca"')
        return
      }
      const newJob = await startGeneration(userId, url.trim(), userData.brand, selectedTypes, fmt)
      setJob(newJob)
      setCredits(c => c - 1)
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Error al iniciar generación')
    } finally {
      setLoading(false)
    }
  }

  const isRunning = job && !['done', 'error'].includes(job.status)
  const total = selectedTypes.length

  return (
    <div className="p-8 max-w-3xl mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Generar Creativos</h1>
          <p className="text-gray-400 mt-1">Elegí el formato y los ángulos — 1 imagen por ángulo.</p>
        </div>
        {credits !== null && (
          <div className="bg-gray-900 border border-gray-800 rounded-xl px-4 py-2 text-center">
            <p className="text-2xl font-bold text-yellow-400">{credits}</p>
            <p className="text-xs text-gray-500">créditos</p>
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-7">

        {/* URL */}
        <div className="relative">
          <Link2 size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            type="url"
            value={url}
            onChange={e => setUrl(e.target.value)}
            placeholder="https://www.zonaprop.com.ar/propiedades/..."
            className="w-full bg-gray-900 border border-gray-700 rounded-xl pl-9 pr-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-yellow-400 transition-colors"
          />
        </div>

        {/* Formato (radio) */}
        <div>
          <p className="text-sm font-medium text-gray-300 mb-3">Formato de salida</p>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
            {FORMAT_OPTIONS.map(f => (
              <button
                key={f.id}
                type="button"
                onClick={() => setFmt(f.id)}
                className={`p-2.5 rounded-xl border text-center transition-all ${
                  fmt === f.id
                    ? 'border-yellow-400 bg-yellow-400/10'
                    : 'border-gray-700 bg-gray-900 hover:border-gray-500'
                }`}
              >
                <div className={`text-xs font-semibold ${fmt === f.id ? 'text-yellow-400' : 'text-white'}`}>{f.label}</div>
                <div className="text-xs text-gray-500 mt-0.5">{f.sub}</div>
                {fmt === f.id && <div className="w-1.5 h-1.5 rounded-full bg-yellow-400 mx-auto mt-1.5" />}
              </button>
            ))}
          </div>
        </div>

        {/* Ángulos creativos (checkboxes) */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium text-gray-300">
              Ángulos creativos <span className="text-yellow-400 ml-1">{selectedTypes.length} seleccionados</span>
            </p>
            <div className="flex gap-3">
              <button type="button" onClick={() => setSelectedTypes(CREATIVE_TYPES.map(t => t.id))}
                className="text-xs text-gray-500 hover:text-yellow-400 transition-colors">Todos</button>
              <button type="button" onClick={() => setSelectedTypes(['destacado'])}
                className="text-xs text-gray-500 hover:text-yellow-400 transition-colors">Solo destacado</button>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {CREATIVE_TYPES.map(t => {
              const active = selectedTypes.includes(t.id)
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => toggleType(t.id)}
                  className={`relative text-left p-3 rounded-xl border transition-all ${
                    active
                      ? 'border-yellow-400 bg-yellow-400/10'
                      : 'border-gray-700 bg-gray-900 hover:border-gray-500'
                  }`}
                >
                  {active && (
                    <div className="absolute top-2 right-2 w-4 h-4 rounded-full bg-yellow-400 flex items-center justify-center">
                      <svg width="9" height="7" viewBox="0 0 9 7" fill="none">
                        <path d="M1 3.5L3.5 6L8 1" stroke="#111" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                  )}
                  <div className="text-xl mb-1">{t.emoji}</div>
                  <div className={`text-xs font-semibold leading-tight ${active ? 'text-yellow-400' : 'text-white'}`}>{t.label}</div>
                  <div className="text-xs text-gray-500 mt-0.5 leading-tight">{t.desc}</div>
                </button>
              )
            })}
          </div>
          <p className="text-xs text-gray-600 mt-2">
            Se generará 1 imagen por ángulo en formato {FORMAT_OPTIONS.find(f => f.id === fmt)?.label} → {total} imagen{total !== 1 ? 's' : ''}
          </p>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={loading || isRunning}
          className="w-full py-3.5 bg-yellow-400 text-gray-900 font-semibold rounded-xl hover:bg-yellow-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {(loading || isRunning) && <Loader2 size={16} className="animate-spin" />}
          {isRunning ? 'Generando...' : `Generar ${total} imagen${total !== 1 ? 'es' : ''}`}
        </button>
      </form>

      {/* Job result */}
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
            <p className="text-red-400 text-sm bg-red-900/20 rounded-lg p-3">{job.error}</p>
          )}

          {job.creatives?.length > 0 && (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-5">
                {job.creatives.map((imgUrl, i) => {
                  const typeName = CREATIVE_TYPES.find(t => job.creatives_fmt?.[i]?.startsWith(t.id))
                  return (
                    <div key={i} className="relative rounded-xl overflow-hidden border border-gray-700 aspect-square group">
                      <img src={imgUrl} alt={`Creativo ${i + 1}`} className="w-full h-full object-cover" />
                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent px-2 py-2">
                        <p className="text-white text-xs font-medium">
                          {typeName ? `${typeName.emoji} ${typeName.label}` : `#${i + 1}`}
                        </p>
                      </div>
                    </div>
                  )
                })}
                {job.status !== 'done' && Array.from({ length: total - job.creatives.length }).map((_, i) => (
                  <div key={`ph-${i}`} className="rounded-xl aspect-square bg-gray-800 border border-gray-700 flex items-center justify-center">
                    <Loader2 size={22} className="text-gray-600 animate-spin" />
                  </div>
                ))}
              </div>

              {job.status === 'done' && job.zip_url && (
                <a
                  href={job.zip_url}
                  className="flex items-center justify-center gap-2 w-full py-3 bg-yellow-400 text-gray-900 font-semibold rounded-xl hover:bg-yellow-300 transition-colors"
                >
                  <Download size={18} />
                  Descargar ZIP ({job.creatives?.length} imágenes)
                </a>
              )}
            </>
          )}

          {['pending', 'scraping', 'generating'].includes(job.status) && (
            <div className="w-full bg-gray-800 rounded-full h-1.5 mt-3">
              <div
                className="bg-yellow-400 h-1.5 rounded-full transition-all duration-700"
                style={{ width: job.status === 'pending' ? '8%' : job.status === 'scraping' ? '35%' : '70%' }}
              />
            </div>
          )}
        </div>
      )}
    </div>
  )
}
