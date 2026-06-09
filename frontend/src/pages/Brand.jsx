import { useState, useEffect, useRef } from 'react'
import { useUser } from '@clerk/clerk-react'
import { Save, Loader2, Key, ExternalLink, Upload } from 'lucide-react'
import toast from 'react-hot-toast'
import { getMe, updateBrand } from '../lib/api'

function resizeImageToDataUrl(file, maxH = 300) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(url)
      const scale = Math.min(1, maxH / img.height)
      const canvas = document.createElement('canvas')
      canvas.width = Math.round(img.width * scale)
      canvas.height = Math.round(img.height * scale)
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height)
      resolve(canvas.toDataURL('image/png', 0.9))
    }
    img.onerror = reject
    img.src = url
  })
}

const PALETTES = [
  { name: 'Azul corp.', primary: '#1A3C6E', secondary: '#F5A623' },
  { name: 'Negro elegante', primary: '#111111', secondary: '#E5C229' },
  { name: 'Verde premium', primary: '#1B4332', secondary: '#52B788' },
  { name: 'Bordo clásico', primary: '#6B2737', secondary: '#F2C166' },
  { name: 'Gris moderno', primary: '#2D3748', secondary: '#ECC94B' },
  { name: 'Azul marino', primary: '#0F2044', secondary: '#63B3ED' },
]

const DEFAULT_BRAND = {
  agency_name: '',
  logo_url: '',
  primary_color: '#1A3C6E',
  secondary_color: '#F5A623',
  text_color: '#FFFFFF',
  font_family: 'Inter',
  phone: '',
  website: '',
  instagram: '',
  gemini_api_key: '',
  replicate_api_key: '',
}

export default function Brand() {
  const { user } = useUser()
  const userId = user?.id
  const [brand, setBrand] = useState(DEFAULT_BRAND)
  const [saving, setSaving] = useState(false)
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const logoInputRef = useRef(null)

  async function handleLogoFile(e) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) return toast.error('El logo debe pesar menos de 5MB')
    setUploadingLogo(true)
    try {
      const dataUrl = await resizeImageToDataUrl(file, 300)
      set('logo_url', dataUrl)
    } catch {
      toast.error('No se pudo procesar la imagen')
    } finally {
      setUploadingLogo(false)
    }
  }

  useEffect(() => {
    if (!userId) return
    getMe(userId).then(u => { if (u.brand) setBrand(u.brand) })
  }, [userId])

  const set = (key, val) => setBrand(b => ({ ...b, [key]: val }))

  async function handleSave(e) {
    e.preventDefault()
    if (!brand.agency_name) return toast.error('El nombre de la agencia es requerido')
    setSaving(true)
    try {
      await updateBrand(userId, brand)
      toast.success('Marca guardada correctamente')
    } catch {
      toast.error('Error al guardar la marca')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-white mb-2">Mi Marca</h1>
      <p className="text-gray-400 mb-8">Configurá tu identidad visual. Se aplica automáticamente a todos los creativos.</p>

      <form onSubmit={handleSave} className="space-y-5">
        <Field label="Nombre de la agencia *" required>
          <input type="text" value={brand.agency_name} onChange={e => set('agency_name', e.target.value)}
            placeholder="Inmobiliaria Rodríguez" className={inputCls} />
        </Field>

        <Field label="Logo de la agencia">
          <input ref={logoInputRef} type="file" accept="image/*" onChange={handleLogoFile} className="hidden" />
          <div className="flex gap-2">
            <button type="button" onClick={() => logoInputRef.current?.click()}
              disabled={uploadingLogo}
              className="flex items-center gap-2 px-4 py-2.5 bg-gray-900 border border-gray-700 rounded-xl text-sm text-gray-300 hover:border-yellow-400 transition-colors disabled:opacity-50">
              {uploadingLogo ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
              {uploadingLogo ? 'Procesando...' : 'Subir logo'}
            </button>
            <input type="url" value={brand.logo_url.startsWith('data:') ? '' : brand.logo_url}
              onChange={e => set('logo_url', e.target.value)}
              placeholder="O pegá una URL de imagen"
              className={inputCls + ' flex-1'} />
          </div>
          {brand.logo_url && (
            <img src={brand.logo_url} alt="Logo preview" className="mt-2 h-12 object-contain rounded bg-gray-800 p-1" />
          )}
        </Field>

        <div>
          <label className="block text-sm text-gray-400 mb-2">Paletas profesionales</label>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mb-4">
            {PALETTES.map(p => (
              <button key={p.name} type="button" title={p.name}
                onClick={() => { set('primary_color', p.primary); set('secondary_color', p.secondary) }}
                className="rounded-xl overflow-hidden border-2 border-transparent hover:border-yellow-400 transition-all">
                <div className="h-6" style={{ backgroundColor: p.primary }} />
                <div className="h-2" style={{ backgroundColor: p.secondary }} />
                <div className="text-xs text-gray-500 text-center py-1 bg-gray-900 leading-tight px-1">{p.name}</div>
              </button>
            ))}
          </div>
          <div className="grid grid-cols-3 gap-4">
            <ColorField label="Color primario" value={brand.primary_color} onChange={v => set('primary_color', v)} />
            <ColorField label="Color secundario" value={brand.secondary_color} onChange={v => set('secondary_color', v)} />
            <ColorField label="Color texto" value={brand.text_color} onChange={v => set('text_color', v)} />
          </div>
        </div>

        <Field label="Teléfono / WhatsApp">
          <input type="text" value={brand.phone} onChange={e => set('phone', e.target.value)}
            placeholder="+54 11 1234-5678" className={inputCls} />
        </Field>

        <Field label="Sitio web">
          <input type="text" value={brand.website} onChange={e => set('website', e.target.value)}
            placeholder="www.miinmobiliaria.com" className={inputCls} />
        </Field>

        <Field label="Instagram">
          <input type="text" value={brand.instagram} onChange={e => set('instagram', e.target.value)}
            placeholder="@miinmobiliaria" className={inputCls} />
        </Field>

        {/* Gemini API Key */}
        <div className="rounded-2xl border-2 border-yellow-400/50 bg-yellow-400/5 p-5 shadow-lg shadow-yellow-400/5">
          <div className="flex items-center gap-2 mb-3">
            <Key size={18} className="text-yellow-400" />
            <span className="font-semibold text-white">API Key de Google Gemini</span>
            <span className="text-xs bg-yellow-400 text-gray-900 px-2 py-0.5 rounded-full font-bold ml-1">RECOMENDADO</span>
          </div>
          <p className="text-gray-400 text-sm mb-3">
            Con tu propia API Key de Google, los creativos se generan con <strong className="text-white">Gemini Imagen 3</strong> — calidad profesional, sin costo adicional para vos.
          </p>
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="bg-gray-900/80 rounded-xl p-3 border border-gray-800">
              <p className="text-gray-500 text-xs font-semibold mb-1.5">❌ Sin API Key</p>
              <ul className="text-gray-500 text-xs space-y-1">
                <li>· Motor básico de composición</li>
                <li>· Fondos sólidos o simples</li>
                <li>· Tipografía estándar</li>
              </ul>
            </div>
            <div className="bg-yellow-400/5 rounded-xl p-3 border border-yellow-400/30">
              <p className="text-yellow-400 text-xs font-semibold mb-1.5">✓ Con Gemini Imagen 3</p>
              <ul className="text-gray-300 text-xs space-y-1">
                <li>· Fondos IA fotorrealistas</li>
                <li>· Composición publicitaria</li>
                <li>· Calidad lista para Meta Ads</li>
              </ul>
            </div>
          </div>

          {/* Instructivo */}
          <div className="bg-gray-900 rounded-xl p-4 mb-4 space-y-2">
            <p className="text-xs font-semibold text-yellow-400 uppercase tracking-wide mb-2">Cómo obtener tu API Key gratis:</p>
            {[
              { step: '1', text: 'Andá a Google AI Studio', link: 'https://aistudio.google.com/apikey', linkText: 'aistudio.google.com →' },
              { step: '2', text: 'Iniciá sesión con tu cuenta de Google' },
              { step: '3', text: 'Click en "Create API Key"' },
              { step: '4', text: 'Copiá la key y pegála acá abajo' },
            ].map(({ step, text, link, linkText }) => (
              <div key={step} className="flex items-start gap-3">
                <span className="w-5 h-5 rounded-full bg-yellow-400 text-gray-900 text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">{step}</span>
                <span className="text-gray-300 text-sm">
                  {text}
                  {link && (
                    <a href={link} target="_blank" rel="noopener noreferrer"
                      className="ml-1 text-yellow-400 hover:underline inline-flex items-center gap-1">
                      {linkText} <ExternalLink size={11} />
                    </a>
                  )}
                </span>
              </div>
            ))}
          </div>

          <div className="relative">
            <Key size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              type="password"
              value={brand.gemini_api_key}
              onChange={e => set('gemini_api_key', e.target.value)}
              placeholder="AIzaSy..."
              className={inputCls + ' pl-8 font-mono text-sm'}
            />
          </div>
          {brand.gemini_api_key ? (
            <p className="text-green-400 text-xs mt-2 flex items-center gap-1">✓ API Key configurada — tus creativos usarán Gemini Imagen 3</p>
          ) : (
            <p className="text-gray-500 text-xs mt-2">Sin API Key se usará el motor básico de generación.</p>
          )}
        </div>

        {/* Replicate API Key */}
        <div className="rounded-2xl border border-gray-700 bg-gray-900/50 p-5">
          <div className="flex items-center gap-2 mb-2">
            <Key size={16} className="text-purple-400" />
            <span className="font-semibold text-white text-sm">API Key de Replicate</span>
            <span className="text-xs bg-gray-800 text-gray-400 px-2 py-0.5 rounded-full">Opcional</span>
          </div>
          <p className="text-gray-400 text-xs mb-3">
            Necesaria para el <strong className="text-white">Home Staging Virtual</strong> (amoblar habitaciones con IA).
            Obtené tu token gratis en{' '}
            <a href="https://replicate.com/account/api-tokens" target="_blank" rel="noopener noreferrer"
              className="text-purple-400 hover:underline">replicate.com →</a>
          </p>
          <div className="relative">
            <Key size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              type="password"
              value={brand.replicate_api_key || ''}
              onChange={e => set('replicate_api_key', e.target.value)}
              placeholder="r8_xxxxxxxxxxxxxxxxxxxx"
              className={inputCls + ' pl-8 font-mono text-sm'}
            />
          </div>
          {brand.replicate_api_key ? (
            <p className="text-green-400 text-xs mt-2">✓ Replicate Key configurada — podés usar Staging Virtual</p>
          ) : (
            <p className="text-gray-600 text-xs mt-2">Sin key, el staging usa la key del servidor (si está configurada).</p>
          )}
        </div>

        {/* Preview mini */}
        <div className="rounded-2xl border border-gray-700 overflow-hidden">
          <div className="h-3" style={{ backgroundColor: brand.secondary_color }} />
          <div className="p-4 flex items-center gap-3" style={{ backgroundColor: brand.primary_color }}>
            <div className="w-8 h-8 rounded bg-white/20" />
            <span className="font-bold text-sm" style={{ color: brand.text_color }}>
              {brand.agency_name || 'Nombre de agencia'}
            </span>
          </div>
          <div className="bg-gray-900 p-4 text-xs text-gray-500">Vista previa de colores de marca</div>
        </div>

        <button type="submit" disabled={saving}
          className="w-full py-3 bg-yellow-400 text-gray-900 font-semibold rounded-xl hover:bg-yellow-300 transition-colors flex items-center justify-center gap-2 disabled:opacity-50">
          {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
          Guardar marca
        </button>
      </form>
    </div>
  )
}

function Field({ label, children, required }) {
  return (
    <div>
      <label className="block text-sm text-gray-400 mb-1.5">{label}{required && <span className="text-yellow-400 ml-1">*</span>}</label>
      {children}
    </div>
  )
}

function ColorField({ label, value, onChange }) {
  return (
    <div>
      <label className="block text-xs text-gray-400 mb-1.5">{label}</label>
      <div className="flex items-center gap-2 bg-gray-900 border border-gray-700 rounded-lg p-2">
        <input type="color" value={value} onChange={e => onChange(e.target.value)}
          className="w-8 h-8 rounded cursor-pointer border-0 bg-transparent" />
        <span className="text-gray-300 text-xs font-mono">{value}</span>
      </div>
    </div>
  )
}

const inputCls = 'w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-yellow-400 transition-colors text-sm'
