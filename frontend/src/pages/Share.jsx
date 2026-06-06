import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Download, Zap, ExternalLink, Loader2 } from 'lucide-react'
import axios from 'axios'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8003'

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

export default function Share() {
  const { jobId } = useParams()
  const [job, setJob] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    axios.get(`${API_BASE}/generate/${jobId}/share`)
      .then(r => setJob(r.data))
      .catch(() => setError('No se encontró este trabajo o aún no está listo.'))
      .finally(() => setLoading(false))
  }, [jobId])

  if (loading) return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <Loader2 size={32} className="text-yellow-400 animate-spin" />
    </div>
  )

  if (error) return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center text-center px-8">
      <p className="text-gray-400 mb-4">{error}</p>
      <Link to="/" className="text-yellow-400 hover:underline text-sm">← Volver al inicio</Link>
    </div>
  )

  const prop = job.property_data
  const shortUrl = job.property_url?.replace(/^https?:\/\/(www\.)?/, '').slice(0, 60)

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Nav */}
      <nav className="flex items-center justify-between px-8 py-4 border-b border-gray-800">
        <Link to="/" className="flex items-center gap-2">
          <Zap className="text-yellow-400" size={20} />
          <span className="font-bold text-lg">InmoGen</span>
        </Link>
        <Link to="/generate" className="px-4 py-2 bg-yellow-400 text-gray-900 text-sm font-semibold rounded-lg hover:bg-yellow-300 transition-colors">
          Crear los míos →
        </Link>
      </nav>

      <div className="max-w-4xl mx-auto px-6 py-10">
        {/* Property info */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white mb-2">
            {prop?.title || 'Creativos generados con InmoGen'}
          </h1>
          <div className="flex flex-wrap items-center gap-3 text-sm text-gray-400">
            {prop?.price && (
              <span className="text-yellow-400 font-semibold">
                {prop.currency === 'USD' ? `USD ${Number(prop.price).toLocaleString()}` : `$ ${Number(prop.price).toLocaleString()}`}
              </span>
            )}
            {prop?.location && <span>📍 {prop.location}</span>}
            {prop?.area_m2 && <span>{Math.round(prop.area_m2)} m²</span>}
            {prop?.rooms && <span>{prop.rooms} amb.</span>}
            {job.property_url && (
              <a href={job.property_url} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1 text-gray-500 hover:text-gray-300 transition-colors">
                <ExternalLink size={12} /> {shortUrl}
              </a>
            )}
          </div>
        </div>

        {/* Creatives grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-8">
          {job.creatives.map((imgUrl, i) => {
            const entry = job.creatives_fmt?.[i] || `imagen_${i + 1}`
            const type = entry.split('_')[0]
            return (
              <div key={i} className="relative group rounded-xl overflow-hidden border border-gray-800 aspect-square bg-gray-900">
                <img src={imgUrl} alt={entry} className="w-full h-full object-cover" loading="lazy" />
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent px-3 py-2 flex items-end justify-between opacity-0 group-hover:opacity-100 transition-opacity">
                  <span className="text-white text-xs font-medium capitalize">{type}</span>
                  <button onClick={() => downloadImage(imgUrl, `inmogen_${entry}.jpg`)}
                    className="p-1.5 bg-white/20 rounded-lg hover:bg-white/40 transition-colors">
                    <Download size={13} className="text-white" />
                  </button>
                </div>
              </div>
            )
          })}
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row items-center gap-4">
          {job.zip_url && (
            <a href={job.zip_url}
              className="flex items-center gap-2 px-6 py-3 bg-yellow-400 text-gray-900 font-semibold rounded-xl hover:bg-yellow-300 transition-colors">
              <Download size={16} /> Descargar todos en ZIP
            </a>
          )}
          <div className="bg-gray-900 border border-gray-800 rounded-xl px-5 py-3 text-center">
            <p className="text-gray-400 text-xs mb-1">Generado con</p>
            <Link to="/" className="flex items-center gap-1.5 text-yellow-400 font-bold">
              <Zap size={14} /> InmoGen
            </Link>
            <p className="text-gray-600 text-xs mt-1">Del link al creativo en 2 minutos</p>
          </div>
        </div>
      </div>
    </div>
  )
}
