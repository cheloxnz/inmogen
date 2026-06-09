import { useState, useEffect } from 'react'
import { useUser } from '@clerk/clerk-react'
import { Link } from 'react-router-dom'
import { Link2, Loader2, CheckCircle, XCircle, Download, Search, ChevronRight, RefreshCw, Share2, Zap, Sparkles, Sun, Sofa } from 'lucide-react'

async function downloadImage(url, filename) {
  try {
    const res = await fetch(url)
    const blob = await res.blob()
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = filename
    a.click()
  } catch {
    window.open(url, '_blank')
  }
}
import toast from 'react-hot-toast'
import { startGeneration, pollJob, getMe, scrapePreview, regenerateSlot, enhancePhoto, replaceSky, stagePhoto, generateVideoFromJob } from '../lib/api'

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
  { id: 'hook_attack',  label: 'Hook Attack',   emoji: '⚡', desc: 'Titular que para el scroll', textLabel: 'Titular', textPlaceholder: '¿Todavía pagando alquiler?' },
  { id: 'storytelling', label: 'Storytelling',  emoji: '✨', desc: 'Narrativa aspiracional',     textLabel: 'Frase narrativa', textPlaceholder: 'El lugar donde todo empieza.' },
  { id: 'social_proof', label: 'Social Proof',  emoji: '⭐', desc: 'Confianza de la agencia',   textLabel: 'Prueba social', textPlaceholder: 'Más de 200 familias nos eligen' },
  { id: 'faq',          label: 'FAQ',           emoji: '❓', desc: 'Preguntas frecuentes' },
  { id: 'testimonial',  label: 'Testimonial',   emoji: '💬', desc: 'Cita de cliente',           textLabel: 'Cita del cliente', textPlaceholder: '"Encontré exactamente lo que buscaba"' },
]

const TYPE_MAP = Object.fromEntries(CREATIVE_TYPES.map(t => [t.id, t]))

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

// ── Staging Modal ─────────────────────────────────────────────────────────────
const STAGING_STYLES = [
  { id: 'modern',         label: 'Moderno',       emoji: '🏙️' },
  { id: 'scandinavian',   label: 'Escandinavo',   emoji: '🌿' },
  { id: 'classic',        label: 'Clásico',       emoji: '🏛️' },
  { id: 'industrial',     label: 'Industrial',    emoji: '🔩' },
  { id: 'mediterranean',  label: 'Mediterráneo',  emoji: '🌊' },
]
const ROOM_TYPES = [
  { id: 'living_room', label: 'Living' },
  { id: 'bedroom',     label: 'Dormitorio' },
  { id: 'kitchen',     label: 'Cocina' },
  { id: 'bathroom',    label: 'Baño' },
  { id: 'dining',      label: 'Comedor' },
  { id: 'office',      label: 'Oficina' },
]
const SKY_STYLES = [
  { id: 'clear',   label: 'Azul despejado',  emoji: '☀️' },
  { id: 'golden',  label: 'Hora dorada',     emoji: '🌅' },
  { id: 'sunset',  label: 'Atardecer',       emoji: '🌇' },
  { id: 'cloudy',  label: 'Nublado suave',   emoji: '⛅' },
]

function StagingModal({ photoUrl, userId, replicateKey = '', onResult, onClose }) {
  const [style, setStyle] = useState('modern')
  const [room, setRoom] = useState('living_room')
  const [loading, setLoading] = useState(false)

  async function handleStage() {
    setLoading(true)
    try {
      const res = await stagePhoto(userId, photoUrl, room, style, replicateKey)
      toast.success('Staging aplicado')
      onResult(res.url)
    } catch (e) {
      const msg = e?.response?.data?.detail || e.message || 'Error en el staging'
      if (msg.includes('REPLICATE_API_TOKEN')) {
        toast.error('Staging requiere configurar REPLICATE_API_TOKEN en el servidor')
      } else {
        toast.error(msg)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div className="bg-gray-900 border border-gray-700 rounded-2xl p-5 w-full max-w-sm space-y-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="text-white font-semibold text-sm flex items-center gap-2">
            <Sofa size={16} className="text-yellow-400" /> Home Staging Virtual
          </h3>
          <button onClick={onClose} className="text-gray-500 hover:text-white text-lg leading-none">×</button>
        </div>

        <div>
          <p className="text-xs text-gray-400 mb-2">Estilo de decoración</p>
          <div className="grid grid-cols-3 gap-1.5">
            {STAGING_STYLES.map(s => (
              <button key={s.id} type="button" onClick={() => setStyle(s.id)}
                className={`py-1.5 px-2 rounded-lg text-xs border transition-all ${
                  style === s.id
                    ? 'border-yellow-400 bg-yellow-400/10 text-yellow-400'
                    : 'border-gray-700 text-gray-400 hover:border-gray-500'
                }`}>
                {s.emoji} {s.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="text-xs text-gray-400 mb-2">Tipo de habitación</p>
          <div className="grid grid-cols-3 gap-1.5">
            {ROOM_TYPES.map(r => (
              <button key={r.id} type="button" onClick={() => setRoom(r.id)}
                className={`py-1.5 px-2 rounded-lg text-xs border transition-all ${
                  room === r.id
                    ? 'border-yellow-400 bg-yellow-400/10 text-yellow-400'
                    : 'border-gray-700 text-gray-400 hover:border-gray-500'
                }`}>
                {r.label}
              </button>
            ))}
          </div>
        </div>

        <button
          type="button"
          onClick={handleStage}
          disabled={loading}
          className="w-full py-2.5 bg-yellow-400 text-gray-900 font-semibold rounded-xl hover:bg-yellow-300 transition-colors disabled:opacity-50 flex items-center justify-center gap-2 text-sm"
        >
          {loading ? <><Loader2 size={14} className="animate-spin" /> Generando staging (~40s)...</> : <><Sofa size={14} /> Aplicar Staging</>}
        </button>
        <p className="text-xs text-gray-600 text-center">Requiere REPLICATE_API_TOKEN en el servidor</p>
      </div>
    </div>
  )
}

function SkyModal({ photoUrl, userId, onResult, onClose }) {
  const [style, setStyle] = useState('clear')
  const [loading, setLoading] = useState(false)

  async function handleSky() {
    setLoading(true)
    try {
      const res = await replaceSky(userId, photoUrl, style)
      toast.success('Cielo reemplazado')
      onResult(res.url)
    } catch (e) {
      toast.error(e?.response?.data?.detail || 'Error al reemplazar el cielo')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div className="bg-gray-900 border border-gray-700 rounded-2xl p-5 w-full max-w-xs space-y-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="text-white font-semibold text-sm flex items-center gap-2">
            <Sun size={16} className="text-yellow-400" /> Reemplazar Cielo
          </h3>
          <button onClick={onClose} className="text-gray-500 hover:text-white text-lg leading-none">×</button>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {SKY_STYLES.map(s => (
            <button key={s.id} type="button" onClick={() => setStyle(s.id)}
              className={`py-2 px-3 rounded-lg text-xs border transition-all ${
                style === s.id
                  ? 'border-yellow-400 bg-yellow-400/10 text-yellow-400'
                  : 'border-gray-700 text-gray-400 hover:border-gray-500'
              }`}>
              {s.emoji} {s.label}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={handleSky}
          disabled={loading}
          className="w-full py-2.5 bg-yellow-400 text-gray-900 font-semibold rounded-xl hover:bg-yellow-300 transition-colors disabled:opacity-50 flex items-center justify-center gap-2 text-sm"
        >
          {loading ? <><Loader2 size={14} className="animate-spin" /> Procesando...</> : <><Sun size={14} /> Aplicar</>}
        </button>
      </div>
    </div>
  )
}

// ── Step 2: Photo selector ────────────────────────────────────────────────────
function StepPhotos({ preview, selectedPhotos, setSelectedPhotos, onContinue, onBack, userId, brand }) {
  const photos = preview.photos || []
  const floorPlans = preview.floor_plans || []
  const MAX = 7

  // photoOverrides: { originalUrl → processedUrl }
  const [photoOverrides, setPhotoOverrides] = useState({})
  // processingPhotos: { url → 'enhancing' | true }
  const [processingPhotos, setProcessingPhotos] = useState({})
  // Staging modal state
  const [stagingModal, setStagingModal] = useState(null) // url or null
  const [skyModal, setSkyModal] = useState(null)         // url or null

  // Resuelve la URL real de una foto (original o procesada)
  function resolveUrl(orig) { return photoOverrides[orig] || orig }

  function toggle(origUrl) {
    const resolved = resolveUrl(origUrl)
    setSelectedPhotos(prev =>
      prev.includes(resolved)
        ? prev.filter(u => u !== resolved)
        : prev.length < MAX ? [...prev, resolved] : prev
    )
  }

  function isSelected(origUrl) {
    return selectedPhotos.includes(resolveUrl(origUrl))
  }

  function selectionOrder(origUrl) {
    const idx = selectedPhotos.indexOf(resolveUrl(origUrl))
    return idx >= 0 ? idx + 1 : null
  }

  async function handleEnhance(e, origUrl) {
    e.stopPropagation()
    if (processingPhotos[origUrl]) return
    setProcessingPhotos(p => ({ ...p, [origUrl]: 'enhancing' }))
    try {
      const res = await enhancePhoto(userId, resolveUrl(origUrl))
      setPhotoOverrides(o => ({ ...o, [origUrl]: res.url }))
      // Si la foto estaba seleccionada, actualizar su URL en la lista
      const oldResolved = photoOverrides[origUrl] || origUrl
      setSelectedPhotos(prev => prev.map(u => u === oldResolved ? res.url : u))
      toast.success('Foto mejorada')
    } catch {
      toast.error('Error al mejorar la foto')
    } finally {
      setProcessingPhotos(p => { const c = { ...p }; delete c[origUrl]; return c })
    }
  }

  function handleProcessResult(origUrl, newUrl) {
    const oldResolved = photoOverrides[origUrl] || origUrl
    setPhotoOverrides(o => ({ ...o, [origUrl]: newUrl }))
    setSelectedPhotos(prev => prev.map(u => u === oldResolved ? newUrl : u))
    setStagingModal(null)
    setSkyModal(null)
  }

  const hasEnhancement = (url) => !!photoOverrides[url]

  // Primeras N fotos para selección rápida (usando URLs resueltas)
  function selectFirst() {
    const resolved = photos.slice(0, MAX).map(resolveUrl)
    setSelectedPhotos(resolved)
  }

  return (
    <div className="space-y-5">
      {/* Modals */}
      {stagingModal && (
        <StagingModal
          photoUrl={resolveUrl(stagingModal)}
          userId={userId}
          replicateKey={brand?.replicate_api_key || ''}
          onResult={handleProcessResult.bind(null, stagingModal)}
          onClose={() => setStagingModal(null)}
        />
      )}
      {skyModal && (
        <SkyModal
          photoUrl={resolveUrl(skyModal)}
          userId={userId}
          onResult={handleProcessResult.bind(null, skyModal)}
          onClose={() => setSkyModal(null)}
        />
      )}

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

      {/* Leyenda de herramientas */}
      <div className="flex gap-3 flex-wrap">
        <div className="flex items-center gap-1.5 text-xs text-gray-500">
          <Sparkles size={12} className="text-yellow-400" />
          <span>Mejorar — balance de blancos, HDR, nitidez</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-gray-500">
          <Sofa size={12} className="text-yellow-400" />
          <span>Staging — amuebla con IA (Replicate)</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-gray-500">
          <Sun size={12} className="text-yellow-400" />
          <span>Cielo — reemplaza el cielo</span>
        </div>
      </div>

      {/* Photo grid */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-medium text-gray-300">
            Elegí las fotos <span className="text-yellow-400">({selectedPhotos.length}/{MAX} máx.)</span>
          </p>
          <div className="flex gap-3">
            <button type="button" onClick={selectFirst}
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
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-[480px] overflow-y-auto pr-1">
            {photos.map((origUrl, i) => {
              const displayUrl = resolveUrl(origUrl)
              const active = isSelected(origUrl)
              const order = selectionOrder(origUrl)
              const isProcessing = !!processingPhotos[origUrl]
              const wasEnhanced = hasEnhancement(origUrl)

              return (
                <div
                  key={i}
                  className={`relative aspect-square rounded-lg overflow-hidden border-2 transition-all group cursor-pointer ${
                    active ? 'border-yellow-400' : 'border-transparent hover:border-gray-500'
                  }`}
                  onClick={() => toggle(origUrl)}
                >
                  {/* Foto */}
                  <img
                    src={displayUrl}
                    alt=""
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />

                  {/* Overlay seleccionada */}
                  {active && <div className="absolute inset-0 bg-yellow-400/15 pointer-events-none" />}

                  {/* Número de orden */}
                  {active && order && (
                    <div className="absolute top-1 left-1 w-5 h-5 rounded-full bg-yellow-400 text-gray-900 text-xs font-bold flex items-center justify-center pointer-events-none z-10">
                      {order}
                    </div>
                  )}

                  {/* Indicador "mejorada" */}
                  {wasEnhanced && (
                    <div className="absolute bottom-1 left-1 bg-yellow-400 text-gray-900 text-[9px] font-bold px-1 rounded pointer-events-none z-10">
                      IA
                    </div>
                  )}

                  {/* Límite alcanzado */}
                  {!active && selectedPhotos.length >= MAX && (
                    <div className="absolute inset-0 bg-black/50 pointer-events-none" />
                  )}

                  {/* Spinner de procesamiento */}
                  {isProcessing && (
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-20">
                      <Loader2 size={18} className="animate-spin text-yellow-400" />
                    </div>
                  )}

                  {/* Botones de herramientas — aparecen al hover */}
                  {!isProcessing && (
                    <div className="absolute bottom-0 left-0 right-0 flex justify-around bg-black/80 py-1 opacity-0 group-hover:opacity-100 transition-opacity z-20">
                      {/* Mejorar */}
                      <button
                        type="button"
                        title="Mejorar foto (HDR, balance blancos, nitidez)"
                        onClick={(e) => handleEnhance(e, origUrl)}
                        className="text-yellow-400 hover:text-yellow-300 transition-colors p-0.5"
                      >
                        <Sparkles size={13} />
                      </button>
                      {/* Staging */}
                      <button
                        type="button"
                        title="Home Staging Virtual (Replicate AI)"
                        onClick={(e) => { e.stopPropagation(); setStagingModal(origUrl) }}
                        className="text-yellow-400 hover:text-yellow-300 transition-colors p-0.5"
                      >
                        <Sofa size={13} />
                      </button>
                      {/* Cielo */}
                      <button
                        type="button"
                        title="Reemplazar cielo"
                        onClick={(e) => { e.stopPropagation(); setSkyModal(origUrl) }}
                        className="text-yellow-400 hover:text-yellow-300 transition-colors p-0.5"
                      >
                        <Sun size={13} />
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
        <p className="text-xs text-gray-600 mt-2">
          Hover sobre cada foto para mejorarla con IA antes de usarla en los creativos.
        </p>
      </div>

      {/* Planos de planta */}
      {floorPlans.length > 0 && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <p className="text-sm font-medium text-gray-300 mb-3 flex items-center gap-2">
            <span>📐</span> Planos de planta detectados
            <span className="text-xs text-gray-500 font-normal">({floorPlans.length})</span>
          </p>
          <div className="flex gap-2 flex-wrap">
            {floorPlans.map((url, i) => (
              <a
                key={i}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="group relative w-20 h-20 rounded-lg overflow-hidden border border-gray-700 hover:border-yellow-400 transition-all"
                title="Ver plano completo"
              >
                <img src={url} alt={`Plano ${i+1}`} className="w-full h-full object-cover" loading="lazy" />
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <Download size={14} className="text-white" />
                </div>
              </a>
            ))}
          </div>
          <p className="text-xs text-gray-600 mt-2">Click en un plano para verlo a tamaño completo o descargarlo.</p>
        </div>
      )}

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

// ── Step 3: Format + slots ────────────────────────────────────────────────────
function SlotRow({ slot, index, onChange, onRemove, error }) {
  const typeDef = TYPE_MAP[slot.type]
  return (
    <div className={`bg-gray-900 border rounded-xl p-3 space-y-2 ${error ? 'border-red-500' : 'border-gray-800'}`}>
      <div className="flex items-center gap-2">
        <span className="text-base">{typeDef?.emoji}</span>
        <select
          value={slot.type}
          onChange={e => onChange(index, 'type', e.target.value)}
          className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-white text-sm focus:outline-none focus:border-yellow-400"
        >
          {CREATIVE_TYPES.map(t => (
            <option key={t.id} value={t.id}>{t.emoji} {t.label}</option>
          ))}
        </select>
        <button type="button" onClick={() => onRemove(index)}
          className="w-7 h-7 flex items-center justify-center text-gray-600 hover:text-red-400 transition-colors rounded-lg hover:bg-gray-800 flex-shrink-0">
          ×
        </button>
      </div>
      {typeDef?.textLabel && (
        <div>
          <input
            type="text"
            value={slot.text}
            onChange={e => onChange(index, 'text', e.target.value)}
            placeholder={typeDef.textPlaceholder}
            className={`w-full bg-gray-800 border rounded-lg px-3 py-1.5 text-white placeholder-gray-600 text-sm focus:outline-none transition-colors ${
              error ? 'border-red-500 focus:border-red-400' : 'border-gray-700 focus:border-yellow-400'
            }`}
          />
          {error && <p className="text-red-400 text-xs mt-1">{error}</p>}
        </div>
      )}
    </div>
  )
}

function StepConfig({ fmt, setFmt, slots, setSlots, selectedPhotos, onGenerate, loading, isRunning, onBack, slotErrors, brand }) {
  function addSlot() {
    setSlots(prev => [...prev, { type: 'destacado', text: '' }])
  }
  function removeSlot(i) {
    setSlots(prev => prev.length > 1 ? prev.filter((_, idx) => idx !== i) : prev)
  }
  function changeSlot(i, field, val) {
    setSlots(prev => prev.map((s, idx) => idx === i ? { ...s, [field]: val } : s))
  }

  return (
    <div className="space-y-6">
      {/* Fotos seleccionadas */}
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
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-medium text-gray-300">Formato de salida</p>
          <button
            type="button"
            onClick={() => setFmt(fmt === 'all' ? 'feed_1x1' : 'all')}
            className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-all ${
              fmt === 'all'
                ? 'border-yellow-400 bg-yellow-400/10 text-yellow-400'
                : 'border-gray-700 text-gray-400 hover:border-gray-500'
            }`}
          >
            <Zap size={11} />
            {fmt === 'all' ? '✓ Todos los formatos' : 'Generar todos'}
          </button>
        </div>
        <div className={`grid grid-cols-3 sm:grid-cols-6 gap-2 transition-opacity ${fmt === 'all' ? 'opacity-40 pointer-events-none' : ''}`}>
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
        {fmt === 'all' && (
          <p className="text-xs text-yellow-400/70 mt-2">
            Se generarán {FORMAT_OPTIONS.length} versiones por ángulo — 1 crédito total
          </p>
        )}
      </div>

      {/* Slots */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-medium text-gray-300">
            Ángulos creativos <span className="text-yellow-400 ml-1">{slots.length} imagen{slots.length !== 1 ? 'es' : ''}</span>
          </p>
          <button type="button" onClick={addSlot}
            className="text-xs text-yellow-400 hover:text-yellow-300 transition-colors font-medium">
            + Agregar ángulo
          </button>
        </div>
        <div className="space-y-2">
          {slots.map((slot, i) => (
            <SlotRow
              key={i}
              slot={slot}
              index={i}
              onChange={changeSlot}
              onRemove={removeSlot}
              error={slotErrors?.[i]}
            />
          ))}
        </div>
        <p className="text-xs text-gray-600 mt-2">
          {FORMAT_OPTIONS.find(f => f.id === fmt)?.label} · {slots.length} imagen{slots.length !== 1 ? 'es' : ''} a generar
        </p>
      </div>

      {/* Preview mockup */}
      {selectedPhotos.length > 0 && brand && (
        <BrandPreview photo={selectedPhotos[0]} brand={brand} />
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
          {isRunning ? 'Generando...' : `Generar ${slots.length} imagen${slots.length !== 1 ? 'es' : ''}`}
        </button>
      </div>
    </div>
  )
}

// ── Brand preview mockup ─────────────────────────────────────────────────────
function BrandPreview({ photo, brand }) {

  if (!brand) return null

  return (
    <div className="rounded-xl border border-gray-800 overflow-hidden">
      <p className="text-xs text-gray-500 px-3 py-2 bg-gray-900 border-b border-gray-800">Vista previa aproximada</p>
      <div className="relative aspect-square overflow-hidden max-h-48">
        <img src={photo} alt="" className="w-full h-full object-cover" style={{ filter: 'brightness(0.75)' }} />
        {/* Overlay de marca */}
        <div className="absolute inset-0 flex flex-col justify-between p-3">
          <div className="flex justify-end">
            {brand.logo_url && (
              <img src={brand.logo_url} alt="logo" className="h-6 object-contain" />
            )}
          </div>
          <div className="rounded-lg p-2" style={{ backgroundColor: brand.primary_color + 'CC' }}>
            <div className="h-2 rounded mb-1.5" style={{ backgroundColor: brand.secondary_color, width: '40%' }} />
            <div className="h-1.5 rounded bg-white/40 mb-1 w-3/4" />
            <div className="h-1.5 rounded bg-white/30 w-1/2" />
            <p className="text-xs mt-1.5 font-semibold truncate" style={{ color: brand.text_color }}>
              {brand.agency_name}
            </p>
            {brand.phone && <p className="text-xs opacity-70 truncate" style={{ color: brand.text_color }}>{brand.phone}</p>}
          </div>
        </div>
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
  const [slots, setSlots] = useState([{ type: 'destacado', text: '' }])
  const [slotErrors, setSlotErrors] = useState({})
  const [job, setJob] = useState(null)
  const [regenerating, setRegenerating] = useState({})
  const [addingMore, setAddingMore] = useState(false)
  const [loading, setLoading] = useState(false)
  const [generatingVideo, setGeneratingVideo] = useState(false)
  const [videoModal, setVideoModal] = useState(false)
  const [credits, setCredits] = useState(null)
  const [brand, setBrand] = useState(null)

  useEffect(() => {
    if (userId) getMe(userId).then(u => { setCredits(u.credits); if (u.brand) setBrand(u.brand) })
    // Pedir permiso de notificaciones al cargar
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission()
    }
  }, [userId])

  useEffect(() => {
    if (!job || job.status === 'done' || job.status === 'error') return
    const interval = setInterval(async () => {
      try {
        const updated = await pollJob(userId, job.id)
        setJob(updated)
      } catch {
        // silenciar errores de red durante el polling
      }
    }, 3000)
    return () => clearInterval(interval)
  }, [job, userId])

  // Cuando el job termina: persistir URLs + notificación
  useEffect(() => {
    if (job?.status !== 'done') return
    setSlots(prev => prev.map((slot, i) => ({
      ...slot,
      url: job.creatives?.[i] || slot.url || null,
      entry: job.creatives_fmt?.[i] || slot.entry || null,
    })))
    // Restaurar título del tab
    document.title = 'InmoGen'
    // Toast persistente
    toast.success('¡Creativos listos! Podés descargarlos.', { duration: 6000, icon: '🎨' })
    // Notificación del navegador
    if (Notification.permission === 'granted') {
      new Notification('InmoGen — ¡Creativos listos!', {
        body: 'Tus imágenes ya están generadas y listas para descargar.',
        icon: '/favicon.ico',
      })
    }
  }, [job?.status])

  // Cambiar título del tab mientras genera
  useEffect(() => {
    if (!job) return
    if (job.status === 'scraping') document.title = '⏳ Analizando propiedad… — InmoGen'
    else if (job.status === 'generating') document.title = '🎨 Generando creativos… — InmoGen'
    else if (job.status === 'error') document.title = '❌ Error — InmoGen'
  }, [job?.status])

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
      toast.error(err.response?.data?.detail || 'No se pudo procesar la URL', { duration: 5000 })
    } finally {
      setLoading(false)
    }
  }

  async function handleGenerate() {
    // Validar slots con texto requerido
    const errors = {}
    slots.forEach((slot, i) => {
      const typeDef = TYPE_MAP[slot.type]
      if (typeDef?.textLabel && !slot.text.trim()) {
        errors[i] = `El texto de ${typeDef.label} es requerido`
      }
    })
    if (Object.keys(errors).length > 0) {
      setSlotErrors(errors)
      return toast.error('Completá los textos requeridos o eliminá esos ángulos')
    }
    setSlotErrors({})

    if (credits !== null && credits < 1) return toast.error('Sin créditos disponibles')
    setLoading(true)
    try {
      const userData = await getMe(userId)
      if (!userData.brand?.agency_name) {
        toast.error('Primero configurá tu marca en "Mi Marca"', { duration: 4000 })
        return
      }
      const creativeSlots = slots.map(s => ({ type: s.type, custom_text: s.text.trim() }))
      const newJob = await startGeneration(userId, url.trim(), userData.brand, creativeSlots, fmt, selectedPhotos)
      setJob(newJob)
      setCredits(c => c - 1)
      setStep(3)
    } catch (err) {
      const msg = err.response?.data?.detail || 'Error al iniciar generación'
      toast.error(msg, { duration: 5000 })
    } finally {
      setLoading(false)
    }
  }

  async function handleGenerateMore() {
    const newSlots = slots.map((s, i) => ({ ...s, i })).filter(s => !s.url)
    if (newSlots.length === 0) return

    const errors = {}
    newSlots.forEach(slot => {
      const typeDef = TYPE_MAP[slot.type]
      if (typeDef?.textLabel && !slot.text.trim()) errors[slot.i] = `El texto de ${typeDef.label} es requerido`
    })
    if (Object.keys(errors).length > 0) {
      setSlotErrors(errors)
      return toast.error('Completá los textos requeridos o eliminá esos ángulos')
    }
    setSlotErrors({})
    setAddingMore(true)
    try {
      for (const slot of newSlots) {
        setRegenerating(r => ({ ...r, [slot.i]: true }))
        const result = await regenerateSlot(userId, job.id, slot.i, slot.type, slot.text.trim(), fmt)
        const newUrl = result.url + '?t=' + Date.now()
        setSlots(prev => prev.map((s, idx) => idx === slot.i ? { ...s, url: newUrl, entry: result.entry } : s))
        setJob(prev => {
          const creatives = [...(prev.creatives || [])]
          const creatives_fmt = [...(prev.creatives_fmt || [])]
          creatives[slot.i] = newUrl
          creatives_fmt[slot.i] = result.entry
          return { ...prev, creatives, creatives_fmt }
        })
        setRegenerating(r => ({ ...r, [slot.i]: false }))
      }
    } catch {
      toast.error('Error al generar los nuevos ángulos')
    } finally {
      setAddingMore(false)
    }
  }

  async function handleRegenerate(i) {
    if (!job?.id) return
    const entry = job.creatives_fmt?.[i] || ''
    const ct = CREATIVE_TYPES.find(t => entry.includes(t.id))?.id || 'destacado'
    const slotText = slots[i]?.text || ''
    const fmtId = fmt
    setRegenerating(r => ({ ...r, [i]: true }))
    try {
      const result = await regenerateSlot(userId, job.id, i, ct, slotText, fmtId)
      setJob(prev => {
        const creatives = [...(prev.creatives || [])]
        const creatives_fmt = [...(prev.creatives_fmt || [])]
        creatives[i] = result.url + '?t=' + Date.now()
        creatives_fmt[i] = result.entry
        return { ...prev, creatives, creatives_fmt }
      })
    } catch {
      toast.error('Error al regenerar')
    } finally {
      setRegenerating(r => ({ ...r, [i]: false }))
    }
  }

  const isRunning = job && !['done', 'error'].includes(job.status)

  async function handleGenerateVideo(videoFmt, videoStyle, videoDuration) {
    if (!job?.id || generatingVideo) return
    setGeneratingVideo(true)
    setVideoModal(false)
    const toastId = toast.loading('Generando video... puede tardar 1-2 min')
    try {
      const blob = await generateVideoFromJob(userId, job.id, videoFmt, videoStyle, videoDuration)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `inmogen_${job.id.slice(0, 8)}_${videoFmt}_${videoStyle}.mp4`
      a.click()
      URL.revokeObjectURL(url)
      toast.success('¡Video listo! Descargando...', { id: toastId })
    } catch (e) {
      toast.error(e?.response?.data?.detail || 'Error generando el video', { id: toastId })
    } finally {
      setGeneratingVideo(false)
    }
  }
  const total = slots.length

  // Step indicators
  const steps = ['URL', 'Fotos', 'Generar']

  // ── Video Modal ──────────────────────────────────────────────────────────
  function VideoModal() {
    const [vFmt, setVFmt] = useState('story_9x16')
    const [vStyle, setVStyle] = useState('cinematic')
    const [vDur, setVDur] = useState(4)
    const vFormats = [
      { id: 'story_9x16',  label: 'Story 9:16',  sub: 'Reels / Stories' },
      { id: 'feed_1x1',    label: 'Feed 1:1',     sub: 'Instagram / FB' },
      { id: 'banner_16x9', label: 'Banner 16:9',  sub: 'Facebook Ads' },
    ]
    const vStyles = [
      { id: 'cinematic', label: 'Cinematic',  desc: 'Fade suave entre fotos' },
      { id: 'slideshow', label: 'Slideshow',  desc: 'Dissolve lento y elegante' },
    ]
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={() => setVideoModal(false)}>
        <div className="bg-gray-900 border border-gray-700 rounded-2xl p-5 w-full max-w-sm space-y-4" onClick={e => e.stopPropagation()}>
          <div className="flex items-center justify-between">
            <h3 className="text-white font-semibold text-sm flex items-center gap-2">
              <Zap size={16} className="text-purple-400" /> Generar Video Inmobiliario
            </h3>
            <button onClick={() => setVideoModal(false)} className="text-gray-500 hover:text-white text-lg">×</button>
          </div>
          <div>
            <p className="text-xs text-gray-400 mb-2">Formato</p>
            <div className="grid grid-cols-3 gap-2">
              {vFormats.map(f => (
                <button key={f.id} type="button" onClick={() => setVFmt(f.id)}
                  className={`p-2 rounded-lg border text-center transition-all ${vFmt === f.id ? 'border-purple-400 bg-purple-400/10 text-purple-400' : 'border-gray-700 text-gray-400 hover:border-gray-500'}`}>
                  <div className="text-xs font-semibold">{f.label}</div>
                  <div className="text-[10px] text-gray-500">{f.sub}</div>
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs text-gray-400 mb-2">Estilo</p>
            <div className="grid grid-cols-2 gap-2">
              {vStyles.map(s => (
                <button key={s.id} type="button" onClick={() => setVStyle(s.id)}
                  className={`p-2.5 rounded-lg border text-left transition-all ${vStyle === s.id ? 'border-purple-400 bg-purple-400/10' : 'border-gray-700 hover:border-gray-500'}`}>
                  <div className={`text-xs font-semibold ${vStyle === s.id ? 'text-purple-400' : 'text-white'}`}>{s.label}</div>
                  <div className="text-[10px] text-gray-500 mt-0.5">{s.desc}</div>
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs text-gray-400 mb-2">Duración por foto: <span className="text-white font-semibold">{vDur}s</span></p>
            <input type="range" min={2} max={8} step={1} value={vDur} onChange={e => setVDur(+e.target.value)}
              className="w-full accent-purple-400" />
            <div className="flex justify-between text-[10px] text-gray-600 mt-1"><span>2s</span><span>8s</span></div>
          </div>
          <button
            type="button"
            onClick={() => handleGenerateVideo(vFmt, vStyle, vDur)}
            className="w-full py-2.5 bg-purple-500 text-white font-semibold rounded-xl hover:bg-purple-400 transition-colors text-sm flex items-center justify-center gap-2"
          >
            <Zap size={14} /> Generar MP4
          </button>
          <p className="text-[10px] text-gray-600 text-center">Genera en ~20-30 segundos · max 7 fotos</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8 max-w-3xl mx-auto">

      {/* Video modal */}
      {videoModal && <VideoModal />}

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

      {/* Banner Gemini Key */}
      {brand && !brand.gemini_api_key && step === 1 && (
        <div className="mb-6 bg-yellow-400/5 border border-yellow-400/30 rounded-2xl p-4 flex items-center gap-4">
          <div className="w-9 h-9 rounded-xl bg-yellow-400/10 flex items-center justify-center flex-shrink-0">
            <Zap size={18} className="text-yellow-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-sm font-semibold">Sin API Key de Gemini — calidad reducida</p>
            <p className="text-gray-500 text-xs mt-0.5">Tus creativos se generarán con el motor básico. Agregá tu key gratis en 2 min para calidad publicitaria real.</p>
          </div>
          <Link to="/brand" className="flex-shrink-0 px-3 py-1.5 bg-yellow-400 text-gray-900 font-semibold rounded-lg text-xs hover:bg-yellow-300 transition-colors whitespace-nowrap">
            Configurar →
          </Link>
        </div>
      )}

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
          userId={user?.id}
          brand={brand}
        />
      )}

      {step === 3 && (
        <>
          <StepConfig
            fmt={fmt} setFmt={setFmt}
            slots={slots} setSlots={setSlots}
            selectedPhotos={selectedPhotos}
            slotErrors={slotErrors}
            onGenerate={handleGenerate}
            loading={loading}
            isRunning={isRunning}
            onBack={() => setStep(2)}
            brand={brand}
          />

          {/* Job result */}
          {job && (
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 mt-6">
              {/* Status header */}
              <div className="flex items-center gap-3 mb-4">
                {job.status === 'done' ? (
                  <CheckCircle className="text-green-400" size={22} />
                ) : job.status === 'error' ? (
                  <XCircle className="text-red-400" size={22} />
                ) : (
                  <Loader2 className="text-yellow-400 animate-spin" size={22} />
                )}
                <span className="text-white font-medium">{STATUS_LABELS[job.status]}</span>
                {job.status === 'done' && (
                  <span className="text-gray-500 text-xs ml-auto">{job.creatives?.length} imagen{job.creatives?.length !== 1 ? 'es' : ''}</span>
                )}
              </div>

              {job.status === 'error' && (
                <p className="text-red-400 text-sm bg-red-900/20 rounded-lg p-3">{job.error}</p>
              )}

              {/* Grilla: imágenes generadas + placeholders de loading */}
              {(job.creatives?.length > 0 || isRunning) && (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-5">
                  {/* Imágenes ya generadas */}
                  {slots.map((slot, i) => {
                    const imgUrl = slot.url || job.creatives?.[i]
                    const entry = slot.entry || job.creatives_fmt?.[i] || `imagen_${i + 1}`
                    const typeDef = TYPE_MAP[slot.type]

                    if (imgUrl) {
                      return (
                        <div key={i} className="relative group rounded-xl overflow-hidden border border-gray-700 aspect-square">
                          <img src={imgUrl} alt={entry} className="w-full h-full object-cover" />
                          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent px-2 py-2 flex items-end justify-between">
                            <p className="text-white text-xs font-medium">
                              {typeDef ? `${typeDef.emoji} ${typeDef.label}` : `#${i + 1}`}
                            </p>
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button onClick={() => handleRegenerate(i)} disabled={regenerating[i]}
                                title="Regenerar"
                                className="p-1 bg-white/20 rounded-md hover:bg-white/40 disabled:opacity-50">
                                <RefreshCw size={12} className={`text-white ${regenerating[i] ? 'animate-spin' : ''}`} />
                              </button>
                              <button onClick={() => downloadImage(imgUrl.split('?')[0], `inmogen_${entry}.jpg`)}
                                title="Descargar"
                                className="p-1 bg-white/20 rounded-md hover:bg-white/40">
                                <Download size={12} className="text-white" />
                              </button>
                            </div>
                          </div>
                        </div>
                      )
                    }
                    // Slot sin URL → loading o pendiente de generar
                    return (
                      <div key={i} className="rounded-xl aspect-square bg-gray-800 border border-gray-700 flex flex-col items-center justify-center gap-2">
                        {isRunning || regenerating[i] || addingMore
                          ? <Loader2 size={22} className="text-gray-600 animate-spin" />
                          : <>
                              <span className="text-2xl">{typeDef?.emoji || '🎨'}</span>
                              <span className="text-xs text-gray-500">{typeDef?.label || slot.type}</span>
                            </>
                        }
                      </div>
                    )
                  })}
                </div>
              )}

              {/* Progress bar */}
              {isRunning && (
                <div className="w-full bg-gray-800 rounded-full h-1.5 mb-4">
                  <div className="bg-yellow-400 h-1.5 rounded-full transition-all duration-700"
                    style={{ width: job.status === 'pending' ? '8%' : job.status === 'scraping' ? '35%' : '70%' }} />
                </div>
              )}

              {/* Acciones cuando está done */}
              {job.status === 'done' && (
                <div className="space-y-3">
                  {/* Slots nuevos sin URL */}
                  {slots.some(s => !s.url) && (
                    <div className="space-y-2 pt-2 border-t border-gray-800">
                      <p className="text-xs text-gray-500">Nuevos ángulos a generar:</p>
                      {slots.map((slot, i) => !slot.url && (
                        <SlotRow key={i} slot={slot} index={i}
                          onChange={(idx, field, val) => setSlots(prev => prev.map((s, j) => j === idx ? { ...s, [field]: val } : s))}
                          onRemove={idx => setSlots(prev => prev.filter((_, j) => j !== idx))}
                          error={slotErrors?.[i]}
                        />
                      ))}
                      <button onClick={handleGenerateMore} disabled={addingMore}
                        className="w-full py-3 bg-yellow-400 text-gray-900 font-semibold rounded-xl hover:bg-yellow-300 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                        {addingMore && <Loader2 size={16} className="animate-spin" />}
                        Generar {slots.filter(s => !s.url).length} nueva{slots.filter(s => !s.url).length !== 1 ? 's' : ''}
                      </button>
                    </div>
                  )}

                  <div className="flex gap-2 flex-wrap">
                    <button onClick={() => setSlots(prev => [...prev, { type: 'destacado', text: '', url: null }])}
                      className="px-4 py-2.5 border border-gray-700 text-gray-400 rounded-xl hover:border-yellow-400 hover:text-yellow-400 transition-colors text-sm">
                      + Agregar ángulo
                    </button>
                    <button
                      onClick={() => {
                        const shareUrl = `${window.location.origin}/share/${job.id}`
                        navigator.clipboard.writeText(shareUrl)
                        toast.success('¡Link copiado!', { icon: '🔗' })
                      }}
                      className="flex items-center gap-2 px-4 py-2.5 border border-gray-700 text-gray-400 rounded-xl hover:border-blue-400 hover:text-blue-400 transition-colors text-sm">
                      <Share2 size={14} /> Compartir
                    </button>
                    <button
                      onClick={() => setVideoModal(true)}
                      disabled={generatingVideo}
                      className="flex items-center gap-2 px-4 py-2.5 border border-gray-700 text-gray-400 rounded-xl hover:border-purple-400 hover:text-purple-400 transition-colors text-sm disabled:opacity-50">
                      {generatingVideo
                        ? <><Loader2 size={14} className="animate-spin" /> Generando video...</>
                        : <><Zap size={14} /> Video Ken Burns</>
                      }
                    </button>
                    {job.zip_url && (
                      <a href={job.zip_url}
                        className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-yellow-400 text-gray-900 font-semibold rounded-xl hover:bg-yellow-300 transition-colors text-sm">
                        <Download size={16} />
                        Descargar ZIP ({job.creatives?.length})
                      </a>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}
