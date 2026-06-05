import { useState, useEffect } from 'react'
import { useUser } from '@clerk/clerk-react'
import { Link2, Loader2, CheckCircle, XCircle, Download, Image } from 'lucide-react'
import toast from 'react-hot-toast'
import { startGeneration, pollJob, getMe } from '../lib/api'

const STATUS_LABELS = {
  pending: 'En cola...',
  scraping: 'Extrayendo datos de la propiedad...',
  generating: 'Generando creativos...',
  done: '¡Creativos listos!',
  error: 'Error al generar',
}

export default function Generate() {
  const { user } = useUser()
  const userId = user?.id
  const [url, setUrl] = useState('')
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
      const newJob = await startGeneration(userId, url.trim(), userData.brand)
      setJob(newJob)
      setCredits(c => c - 1)
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Error al iniciar generación')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Generar Creativos</h1>
          <p className="text-gray-400 mt-1">Pegá el link de la propiedad y obtenés 6 formatos listos.</p>
        </div>
        {credits !== null && (
          <div className="bg-gray-900 border border-gray-800 rounded-xl px-4 py-2 text-center">
            <p className="text-2xl font-bold text-yellow-400">{credits}</p>
            <p className="text-xs text-gray-500">créditos</p>
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="flex gap-3 mb-8">
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
        <button
          type="submit"
          disabled={loading || (job && !['done', 'error'].includes(job.status))}
          className="px-6 py-3 bg-yellow-400 text-gray-900 font-semibold rounded-xl hover:bg-yellow-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {loading ? <Loader2 size={16} className="animate-spin" /> : null}
          Generar
        </button>
      </form>

      {/* Job status */}
      {job && (
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
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

          {/* Mostrar creativos progresivamente mientras genera */}
          {(job.creatives?.length > 0) && (
            <>
              <div className="grid grid-cols-3 gap-3 mb-5">
                {job.creatives.map((url, i) => (
                  <div key={i} className="relative rounded-lg overflow-hidden border border-gray-700 aspect-square">
                    <img src={url} alt={`Creativo ${i + 1}`} className="w-full h-full object-cover" />
                    <div className="absolute bottom-1 right-1 bg-black/60 text-white text-xs px-1.5 py-0.5 rounded">
                      {i + 1}/6
                    </div>
                  </div>
                ))}
                {/* Placeholders para los que faltan */}
                {job.status !== 'done' && Array.from({length: 6 - job.creatives.length}).map((_, i) => (
                  <div key={`ph-${i}`} className="rounded-lg aspect-square bg-gray-800 border border-gray-700 flex items-center justify-center">
                    <Loader2 size={20} className="text-gray-600 animate-spin" />
                  </div>
                ))}
              </div>
              {job.status === 'done' && job.zip_url && (
                <a
                  href={job.zip_url}
                  download="creativos.zip"
                  className="flex items-center justify-center gap-2 w-full py-3 bg-yellow-400 text-gray-900 font-semibold rounded-xl hover:bg-yellow-300 transition-colors"
                >
                  <Download size={18} />
                  Descargar ZIP (6 creativos)
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
