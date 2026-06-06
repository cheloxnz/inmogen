import { useState, useEffect } from 'react'
import { useUser } from '@clerk/clerk-react'
import { Link } from 'react-router-dom'
import { Image, CreditCard, ArrowRight, CheckCircle, Clock, XCircle, Download, ChevronDown, ChevronUp } from 'lucide-react'
import { getMe, listJobs } from '../lib/api'

const STATUS_ICON = {
  done:       <CheckCircle size={13} className="text-green-400" />,
  pending:    <Clock size={13} className="text-yellow-400" />,
  scraping:   <Clock size={13} className="text-blue-400" />,
  generating: <Clock size={13} className="text-purple-400" />,
  error:      <XCircle size={13} className="text-red-400" />,
}
const STATUS_LABEL = {
  done: 'Listo', pending: 'En cola', scraping: 'Scrapeando',
  generating: 'Generando', error: 'Error',
}

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

function JobCard({ job }) {
  const [expanded, setExpanded] = useState(false)
  const thumbs = (job.creatives || []).slice(0, 3)
  const extras = (job.creatives || []).length - 3
  const shortUrl = job.property_url?.replace(/^https?:\/\/(www\.)?/, '').slice(0, 55)
  const date = job.created_at ? new Date(job.created_at).toLocaleDateString('es-AR', { day: '2-digit', month: 'short' }) : ''

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden hover:border-gray-700 transition-colors">
      {/* Card header */}
      <div className="p-4 flex gap-3 items-start">
        {/* Thumbnails strip */}
        <div className="flex gap-1 flex-shrink-0">
          {thumbs.length > 0 ? thumbs.map((imgUrl, i) => (
            <div key={i} className="w-14 h-14 rounded-lg overflow-hidden bg-gray-800 flex-shrink-0">
              <img src={imgUrl} alt="" className="w-full h-full object-cover" loading="lazy" />
            </div>
          )) : (
            <div className="w-14 h-14 rounded-lg bg-gray-800 flex items-center justify-center">
              <Image size={20} className="text-gray-600" />
            </div>
          )}
          {extras > 0 && (
            <div className="w-14 h-14 rounded-lg bg-gray-800 flex items-center justify-center text-xs text-gray-400 font-semibold flex-shrink-0">
              +{extras}
            </div>
          )}
        </div>

        {/* Meta */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            {STATUS_ICON[job.status]}
            <span className="text-xs text-gray-500">{STATUS_LABEL[job.status]}</span>
            <span className="text-xs text-gray-700 ml-auto">{date}</span>
          </div>
          <p className="text-gray-300 text-xs truncate">{shortUrl}</p>
          {job.property_data?.title && (
            <p className="text-gray-500 text-xs truncate mt-0.5">{job.property_data.title}</p>
          )}
          {job.status === 'error' && job.error && (
            <p className="text-red-400 text-xs mt-1 truncate">{job.error}</p>
          )}
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-1 flex-shrink-0">
          {job.zip_url && (
            <a href={job.zip_url} download
              className="flex items-center gap-1 px-2.5 py-1.5 bg-yellow-400 text-gray-900 rounded-lg text-xs font-semibold hover:bg-yellow-300 transition-colors">
              <Download size={11} /> ZIP
            </a>
          )}
          {(job.creatives || []).length > 0 && (
            <button onClick={() => setExpanded(e => !e)}
              className="flex items-center gap-1 px-2.5 py-1.5 border border-gray-700 text-gray-400 rounded-lg text-xs hover:border-gray-500 transition-colors">
              {expanded ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
              Ver
            </button>
          )}
        </div>
      </div>

      {/* Expanded images */}
      {expanded && (job.creatives || []).length > 0 && (
        <div className="border-t border-gray-800 p-4">
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
            {job.creatives.map((imgUrl, i) => {
              const entry = job.creatives_fmt?.[i] || `imagen_${i + 1}`
              return (
                <div key={i} className="relative group">
                  <div className="aspect-square rounded-lg overflow-hidden bg-gray-800">
                    <img src={imgUrl} alt={entry} className="w-full h-full object-cover" loading="lazy" />
                  </div>
                  <button
                    onClick={() => downloadImage(imgUrl, `inmogen_${entry}.jpg`)}
                    className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg">
                    <Download size={18} className="text-white" />
                  </button>
                  <p className="text-gray-600 text-xs text-center mt-1 truncate">{entry.split('_')[0]}</p>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

export default function Dashboard() {
  const { user } = useUser()
  const userId = user?.id
  const [userData, setUserData] = useState(null)
  const [jobs, setJobs] = useState([])
  const [loadingData, setLoadingData] = useState(true)

  useEffect(() => {
    if (!userId) return
    setLoadingData(true)
    Promise.all([getMe(userId), listJobs(userId)])
      .then(([u, j]) => { setUserData(u); setJobs(j) })
      .finally(() => setLoadingData(false))
  }, [userId])

  const doneJobs = jobs.filter(j => j.status === 'done')

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold text-white mb-2">
        Bienvenido, {user?.firstName}
      </h1>
      <p className="text-gray-400 mb-8">Generá creativos inmobiliarios listos para Meta Ads.</p>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <StatCard
          label="Créditos disponibles"
          value={userData?.credits ?? '—'}
          accent="text-yellow-400"
          action={<Link to="/pricing" className="text-xs text-yellow-400 hover:underline flex items-center gap-1">Recargar <ArrowRight size={12} /></Link>}
        />
        <StatCard
          label="Propiedades generadas"
          value={doneJobs.length}
          accent="text-green-400"
        />
        <StatCard
          label="Plan actual"
          value={userData?.plan ? userData.plan.charAt(0).toUpperCase() + userData.plan.slice(1) : '—'}
          accent="text-blue-400"
        />
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        <Link to="/generate" className="bg-yellow-400 rounded-2xl p-5 flex items-center gap-4 hover:bg-yellow-300 transition-colors group">
          <div className="bg-gray-900/20 rounded-xl p-3">
            <Image size={24} className="text-gray-900" />
          </div>
          <div>
            <p className="font-bold text-gray-900">Generar creativos</p>
            <p className="text-sm text-gray-800">Pegá el link de una propiedad</p>
          </div>
          <ArrowRight size={20} className="ml-auto text-gray-900 group-hover:translate-x-1 transition-transform" />
        </Link>

        <Link to="/brand" className="bg-gray-900 border border-gray-800 rounded-2xl p-5 flex items-center gap-4 hover:border-gray-600 transition-colors group">
          <div className="bg-gray-800 rounded-xl p-3">
            <CreditCard size={24} className="text-yellow-400" />
          </div>
          <div>
            <p className="font-bold text-white">Configurar mi marca</p>
            <p className="text-sm text-gray-400">Logo, colores y tipografía</p>
          </div>
          <ArrowRight size={20} className="ml-auto text-gray-600 group-hover:text-white transition-colors" />
        </Link>
      </div>

      {/* Onboarding — si no tiene marca */}
      {userData && !userData.brand && (
        <div className="mb-6 bg-yellow-400/10 border border-yellow-400/30 rounded-2xl p-5 flex items-start gap-4">
          <div className="w-8 h-8 rounded-full bg-yellow-400 flex items-center justify-center text-gray-900 font-bold flex-shrink-0 mt-0.5">!</div>
          <div>
            <p className="text-white font-semibold mb-1">Primero configurá tu marca</p>
            <p className="text-gray-400 text-sm mb-3">Para generar creativos necesitás cargar el nombre de tu agencia, colores y datos de contacto.</p>
            <Link to="/brand" className="inline-flex items-center gap-2 px-4 py-2 bg-yellow-400 text-gray-900 font-semibold rounded-xl text-sm hover:bg-yellow-300 transition-colors">
              Configurar ahora <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      )}

      {/* Historial */}
      {loadingData ? (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white">Historial</h2>
          </div>
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-gray-900 border border-gray-800 rounded-2xl p-4 flex gap-3 animate-pulse">
                <div className="flex gap-1">
                  {[1,2,3].map(j => <div key={j} className="w-14 h-14 rounded-lg bg-gray-800" />)}
                </div>
                <div className="flex-1 space-y-2 py-1">
                  <div className="h-3 bg-gray-800 rounded w-1/3" />
                  <div className="h-3 bg-gray-800 rounded w-2/3" />
                  <div className="h-3 bg-gray-800 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : jobs.length > 0 ? (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white">Historial</h2>
            <span className="text-xs text-gray-600">{jobs.length} generaciones</span>
          </div>
          <div className="space-y-3">
            {jobs.map(job => <JobCard key={job.id} job={job} />)}
          </div>
        </div>
      ) : userData ? (
        <div className="text-center py-16 text-gray-600">
          <Image size={40} className="mx-auto mb-3 opacity-30" />
          <p>Todavía no generaste ningún creativo.</p>
          <Link to="/generate" className="mt-3 inline-block text-yellow-400 text-sm hover:underline">Crear el primero →</Link>
        </div>
      ) : null}
    </div>
  )
}

function StatCard({ label, value, accent, action }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
      <p className="text-gray-500 text-sm mb-1">{label}</p>
      <p className={`text-3xl font-bold ${accent}`}>{value}</p>
      {action && <div className="mt-2">{action}</div>}
    </div>
  )
}
