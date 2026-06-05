import { useState, useEffect } from 'react'
import { useUser } from '@clerk/clerk-react'
import { Save, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { getMe, updateBrand } from '../lib/api'

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
}

export default function Brand() {
  const { user } = useUser()
  const userId = user?.id
  const [brand, setBrand] = useState(DEFAULT_BRAND)
  const [saving, setSaving] = useState(false)

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

        <Field label="URL del logo (imagen)">
          <input type="url" value={brand.logo_url} onChange={e => set('logo_url', e.target.value)}
            placeholder="https://..." className={inputCls} />
          {brand.logo_url && (
            <img src={brand.logo_url} alt="Logo preview" className="mt-2 h-12 object-contain rounded" />
          )}
        </Field>

        <div className="grid grid-cols-3 gap-4">
          <ColorField label="Color primario" value={brand.primary_color} onChange={v => set('primary_color', v)} />
          <ColorField label="Color secundario" value={brand.secondary_color} onChange={v => set('secondary_color', v)} />
          <ColorField label="Color texto" value={brand.text_color} onChange={v => set('text_color', v)} />
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
