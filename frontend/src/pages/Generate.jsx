import { useState, useEffect } from 'react'
import { useUser } from '@clerk/clerk-react'
import { Link2, Loader2, CheckCircle, XCircle, Download, Search, ChevronRight, X } from 'lucide-react'
import toast from 'react-hot-toast'
import { startGeneration, pollJob, getMe, scrapePreview } from '../lib/api'

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

// ── Step 1: URL input ─────────────────────────────────────────────────────────
function StepUrl({ url, setUrl, onScrape, loading }) {
  return (
    <form onSubmit={onScrape} className="space-y-4">
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
      <button
        type="submit"
        disabled={loading || !url.trim()}
        className="w-full py-3.5 bg-yellow-400 text-gray-900 font-semibold rounded-xl hover:bg-yellow-300 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
      >
        {loading ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
        {loading ? 'Analizando propiedad...' : 'Analizar propiedad'}
      </button>
    </form>
  )
}

// ── Step 2: Photo selector ────────────────────────────────────────────────────
function StepPhotos({ preview, selectedPhotos, setSelectedPhotos, onContinue, onBack }) {
  const photos = preview.photos || []
  const MAX = 7

  function toggle(url) {
    setSelectedPhotos(prev =>
      prev.includes(url)
        ? prev.filter(u => u !== url)
        : prev.length < MAX ? [...prev, url] : prev
    )
  }

  return (
    <div className="space-y-5">
      {/* Property summary */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
        <p className="text-white font-semibold text-sm leading-snug">{preview.title}</p>
        <div className="flex gap-3 mt-1.5 text-xs text-gray-400 flex-wrap">
          {preview.price && <span className="text-yellow-400 font-semibold">
            {preview.currency === 'USD' ? `USD ${preview.price}` : `$ ${preview.price}`}
          </span>}
          {preview.location && <span>📍 {preview.location}</span>}
          {preview.area_m2 && <span>{Math.round(preview.area_m2)} m²</span>}
          {preview.rooms && <span>{preview.rooms} amb.</span>}
        </div>
      </div>

      {/* Photo grid */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-medium text-gray-300">
            Elegí las fotos <span className="text-yellow-400">({selectedPhotos.length}/{MAX} máx.)</span>
          </p>
          <div className="flex gap-3">
            <button type="button" onClick={() => setSelectedPhotos(photos.slice(0, MAX))}
              className="text-xs text-gray-500 hover:text-yellow-400 transition-colors">
              Primeras {Math.min(MAX, photos.length)}
            </button>
            <button type="button" onClick={() => setSelectedPhotos([])}
              className="text-xs text-gray-500 hover:text-yellow-400 transition-colors">
              Ninguna
            </button>
          </div>
        </div>

        {photos.length === 0 ? (
          <p className="text-gray-500 text-sm">No se encontraron fotos en el listing.</p>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-96 overflow-y-auto pr-1">
            {photos.map((url, i) => {
              const active = selectedPhotos.includes(url)
              const order = active ? selectedPhotos.indexOf(url) + 1 : null
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => toggle(url)}
                  className={`relative aspect-square rounded-lg overflow-hidden border-2 transition-all ${
                    active ? 'border-yellow-400' : 'border-transparent hover:border-gray-500'
                  }`}
                >
                  <img src={url} alt="" className="w-full h-full object-cover" loading="lazy" />
                  {active && (
                    <div className="absolute inset-0 bg-yellow-400/20" />
                  )}
                  {active && order && (
                    <div className="absolute top-1 left-1 w-5 h-5 rounded-full bg-yellow-400 text-gray-900 text-xs font-bold flex items-center justify-center">
                      {order}
                    </div>
                  )}
                  {!active && selectedPhotos.length >= MAX && (
                    <div className="absolute inset-0 bg-black/50" />
                  )}
                </button>
              )
            })}
          </div>
        )}
        <p className="text-xs text-gray-600 mt-2">
          El orden de selección importa — la foto 1 se usa primero en los creativos.
        </p>
      </div>

      <div className="flex gap-3">
        <button type="button" onClick={onBack}
          className="px-4 py-3 border border-gray-700 text-gray-400 rounded-xl hover:border-gray-500 transition-colors text-sm">
          Cambiar URL
        </button>
        <button
          type="button"
          onClick={onContinue}
          disabled={selectedPhotos.length === 0}
          className="flex-1 py-3 bg-yellow-400 text-gray-900 font-semibold rounded-xl hover:bg-yellow-300 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
        >
          Continuar <ChevronRight size={16} />
        </button>
      </div>
    </div>
  )
}

// ── Step 3: Format + angles ───────────────────────────────────────────────────
function StepConfig({ fmt, setFmt, selectedTypes, setSelectedTypes, selectedPhotos, customTexts, setCustomTexts, onGenerate, loading, isRunning, onBack }) {
  function toggleType(id) {
    setSelectedTypes(prev =>
      prev.includes(id)
        ? prev.length > 1 ? prev.filter(t => t !== id) : prev
        : [...prev, id]
    )
  }

  const total = selectedTypes.length

  return (
    <div className="space-y-6">
      {/* Selected photos summary */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs text-gray-500">{selectedPhotos.length} fotos seleccionadas:</span>
        <div className="flex gap-1">
          {selectedPhotos.slice(0, 5).map((url, i) => (
            <img key={i} src={url} alt="" className="w-8 h-8 rounded-md object-cover border border-gray-700" />
          ))}
          {selectedPhotos.length > 5 && (
            <div className="w-8 h-8 rounded-md bg-gray-800 border border-gray-700 flex items-center justify-center text-xs text-gray-400">
              +{selectedPhotos.length - 5}
            </div>
          )}
        </div>
      </div>

      {/* Formato */}
      <div>
        <p className="text-sm font-medium text-gray-300 mb-3">Formato de salida</p>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
          {FORMAT_OPTIONS.map(f => (
            <button key={f.id} type="button" onClick={() => setFmt(f.id)}
              className={`p-2.5 rounded-xl border text-center transition-all ${
                fmt === f.id ? 'border-yellow-400 bg-yellow-400/10' : 'border-gray-700 bg-gray-900 hover:border-gray-500'
              }`}>
              <div className={`text-xs font-semibold ${fmt === f.id ? 'text-yellow-400' : 'text-white'}`}>{f.label}</div>
              <div className="text-xs text-gray-500 mt-0.5">{f.sub}</div>
              {fmt === f.id && <div className="w-1.5 h-1.5 rounded-full bg-yellow-400 mx-auto mt-1.5" />}
            </button>
          ))}
        </div>
      </div>

      {/* Ángulos */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-medium text-gray-300">
            Ángulos creativos <span className="text-yellow-400 ml-1">{selectedTypes.length} sel.</span>
          </p>
          <div className="flex gap-3">
            <button type="button" onClick={() => setSelectedTypes(CREATIVE_TYPES.map(t => t.id))}
              className="text-xs text-gray-500 hover:text-yellow-400 transition-colors">Todos</button>
            <button type="button" onClick={() => setSelectedTypes(['destacado'])}
              className="text-xs text-gray-500 hover:text-yellow-400 transition-colors">Solo dest.</button>
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {CREATIVE_TYPES.map(t => {
            const active = selectedTypes.includes(t.id)
            return (
              <button key={t.id} type="button" onClick={() => toggleType(t.id)}
                className={`relative text-left p-3 rounded-xl border transition-all ${
                  active ? 'border-yellow-400 bg-yellow-400/10' : 'border-gray-700 bg-gray-900 hover:border-gray-500'
                }`}>
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
          {FORMAT_OPTIONS.find(f => f.id === fmt)?.label} · {total} imagen{total !== 1 ? 'es' : ''} a generar
        </p>
      </div>

      {/* Textos personalizados — solo se muestran si el tipo está seleccionado */}
      {(selectedTypes.includes('hook_attack') || selectedTypes.includes('storytelling')) && (
        <div className="space-y-3">
          <p className="text-sm font-medium text-gray-300">Textos personalizados <span className="text-gray-500 font-normal">(opcional)</span></p>
          {selectedTypes.includes('hook_attack') && (
            <div>
              <label className="text-xs text-gray-500 mb-1 block">⚡ Hook Attack — titular</label>
              <input
                type="text"
                value={customTexts.hook}
                onChange={e => setCustomTexts(p => ({ ...p, hook: e.target.value }))}
                placeholder="Ej: ¿Listo para tu próximo hogar?"
                className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-2.5 text-white placeholder-gray-600 text-sm focus:outline-none focus:border-yellow-400 transition-colors"
              />
            </div>
          )}
          {selectedTypes.includes('storytelling') && (
            <div>
              <label className="text-xs text-gray-500 mb-1 block">✨ Storytelling — frase narrativa</label>
              <input
                type="text"
                value={customTexts.narrative}
                onChange={e => setCustomTexts(p => ({ ...p, narrative: e.target.value }))}
                placeholder="Ej: El lugar donde tu historia comienza."
                className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-2.5 text-white placeholder-gray-600 text-sm focus:outline-none focus:border-yellow-400 transition-colors"
              />
            </div>
          )}
        </div>
      )}

      <div className="flex gap-3">
        <button type="button" onClick={onBack}
          className="px-4 py-3 border border-gray-700 text-gray-400 rounded-xl hover:border-gray-500 transition-colors text-sm">
          Volver
        </button>
        <button
          type="button"
          onClick={onGenerate}
          disabled={loading || isRunning}
          className="flex-1 py-3.5 bg-yellow-400 text-gray-900 font-semibold rounded-xl hover:bg-yellow-300 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {(loading || isRunning) && <Loader2 size={16} className="animate-spin" />}
          {isRunning ? 'Generando...' : `Generar ${total} imagen${total !== 1 ? 'es' : ''}`}
        </button>
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
export default function Generate() {
  const { user } = useUser()
  const userId = user?.id

  const [step, setStep] = useState(1) // 1=url, 2=photos, 3=config
  const [url, setUrl] = useState('')
  const [preview, setPreview] = useState(null)
  const [selectedPhotos, setSelectedPhotos] = useState([])
  const [fmt, setFmt] = useState('feed_1x1')
  const [selectedTypes, setSelectedTypes] = useState(['destacado'])
  const [customTexts, setCustomTexts] = useState({ hook: '', narrative: '' })
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

  async function handleScrape(e) {
    e.preventDefault()
    if (!url.trim()) return toast.error('Ingresá una URL de propiedad')
    setLoading(true)
    try {
      const data = await scrapePreview(userId, url.trim())
      setPreview(data)
      setSelectedPhotos((data.photos || []).slice(0, 7))
      setStep(2)
    } catch (err) {
      toast.error(err.response?.data?.detail || 'No se pudo procesar la URL')
    } finally {
      setLoading(false)
    }
  }

  async function handleGenerate() {
    if (credits !== null && credits < 1) return toast.error('Sin créditos disponibles')
    setLoading(true)
    try {
      const userData = await getMe(userId)
      if (!userData.brand) {
        toast.error('Primero configurá tu marca en "Mi Marca"')
        return
      }
      const ct = { hook: customTexts.hook.trim(), narrative: customTexts.narrative.trim() }
      const newJob = await startGeneration(userId, url.trim(), userData.brand, selectedTypes, fmt, selectedPhotos, ct)
      setJob(newJob)
      setCredits(c => c - 1)
      setStep(3)
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Error al iniciar generación')
    } finally {
      setLoading(false)
    }
  }

  const isRunning = job && !['done', 'error'].includes(job.status)
  const total = selectedTypes.length

  // Step indicators
  const steps = ['URL', 'Fotos', 'Generar']

  return (
    <div className="p-8 max-w-3xl mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Generar Creativos</h1>
          <p className="text-gray-400 mt-1">1 imagen por ángulo, con tus fotos elegidas.</p>
        </div>
        {credits !== null && (
          <div className="bg-gray-900 border border-gray-800 rounded-xl px-4 py-2 text-center">
            <p className="text-2xl font-bold text-yellow-400">{credits}</p>
            <p className="text-xs text-gray-500">créditos</p>
          </div>
        )}
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-2 mb-8">
        {steps.map((label, i) => {
          const n = i + 1
          const done = step > n
          const active = step === n
          return (
            <div key={n} className="flex items-center gap-2">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                done ? 'bg-green-500 text-white' : active ? 'bg-yellow-400 text-gray-900' : 'bg-gray-800 text-gray-500'
              }`}>
                {done ? '✓' : n}
              </div>
              <span className={`text-xs ${active ? 'text-white' : 'text-gray-500'}`}>{label}</span>
              {i < steps.length - 1 && <div className="w-8 h-px bg-gray-700 mx-1" />}
            </div>
          )
        })}
      </div>

      {/* Steps */}
      {step === 1 && (
        <StepUrl url={url} setUrl={setUrl} onScrape={handleScrape} loading={loading} />
      )}

      {step === 2 && preview && (
        <StepPhotos
          preview={preview}
          selectedPhotos={selectedPhotos}
          setSelectedPhotos={setSelectedPhotos}
          onContinue={() => setStep(3)}
          onBack={() => setStep(1)}
        />
      )}

      {step === 3 && (
        <>
          <StepConfig
            fmt={fmt} setFmt={setFmt}
            selectedTypes={selectedTypes} setSelectedTypes={setSelectedTypes}
            selectedPhotos={selectedPhotos}
            customTexts={customTexts} setCustomTexts={setCustomTexts}
            onGenerate={handleGenerate}
            loading={loading}
            isRunning={isRunning}
            onBack={() => setStep(2)}
          />

          {/* Job result */}
          {job && (
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 mt-6">
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
                        <div key={i} className="relative rounded-xl overflow-hidden border border-gray-700 aspect-square">
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
                    <a href={job.zip_url}
                      className="flex items-center justify-center gap-2 w-full py-3 bg-yellow-400 text-gray-900 font-semibold rounded-xl hover:bg-yellow-300 transition-colors">
                      <Download size={18} />
                      Descargar ZIP ({job.creatives?.length} imágenes)
                    </a>
                  )}
                </>
              )}

              {['pending', 'scraping', 'generating'].includes(job.status) && (
                <div className="w-full bg-gray-800 rounded-full h-1.5 mt-3">
                  <div className="bg-yellow-400 h-1.5 rounded-full transition-all duration-700"
                    style={{ width: job.status === 'pending' ? '8%' : job.status === 'scraping' ? '35%' : '70%' }} />
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}
