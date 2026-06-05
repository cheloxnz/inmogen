import { useState, useEffect } from 'react'
import { useUser } from '@clerk/clerk-react'
import { Link } from 'react-router-dom'
import { Image, CreditCard, ArrowRight, CheckCircle, Clock, XCircle } from 'lucide-react'
import { getMe, listJobs } from '../lib/api'

const STATUS_ICON = {
  done: <CheckCircle size={14} className="text-green-400" />,
  pending: <Clock size={14} className="text-yellow-400" />,
  scraping: <Clock size={14} className="text-blue-400" />,
  generating: <Clock size={14} className="text-purple-400" />,
  error: <XCircle size={14} className="text-red-400" />,
}

export default function Dashboard() {
  const { user } = useUser()
  const userId = user?.id
  const [userData, setUserData] = useState(null)
  const [jobs, setJobs] = useState([])

  useEffect(() => {
    if (!userId) return
    getMe(userId).then(setUserData)
    listJobs(userId).then(setJobs)
  }, [userId])

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold text-white mb-2">
        Bienvenido, {user?.firstName} 👋
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
          value={jobs.filter(j => j.status === 'done').length}
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

      {/* Recent jobs */}
      {jobs.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-white mb-4">Historial reciente</h2>
          <div className="space-y-2">
            {jobs.slice(0, 8).map(job => (
              <div key={job.id} className="bg-gray-900 border border-gray-800 rounded-xl px-4 py-3 flex items-center gap-3">
                {STATUS_ICON[job.status]}
                <span className="text-gray-300 text-sm flex-1 truncate">{job.property_url}</span>
                {job.zip_url && (
                  <a href={job.zip_url} download className="text-yellow-400 text-xs hover:underline">Descargar</a>
                )}
                <span className="text-gray-600 text-xs">{new Date(job.created_at).toLocaleDateString('es')}</span>
              </div>
            ))}
          </div>
        </div>
      )}
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
