import { useState, useEffect } from 'react'
import { useUser } from '@clerk/clerk-react'
import { Link, useSearchParams, useNavigate } from 'react-router-dom'
import { Image, CreditCard, ArrowRight, CheckCircle, Clock, XCircle, Download, ChevronDown, ChevronUp, Trash2, ChevronLeft, ChevronRight, AlertTriangle, Gift, Copy, Zap, PartyPopper } from 'lucide-react'
import { getMe, listJobs, deleteJob, deleteAllJobs, getReferralInfo } from '../lib/api'
import toast from 'react-hot-toast'

const PER_PAGE = 10

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

function ConfirmModal({ message, onConfirm, onCancel }) {
  const [loading, setLoading] = useState(false)

  async function handleConfirm() {
    setLoading(true)
    await onConfirm()
    setLoading(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 max-w-sm w-full">
        <div className="flex items-center gap-3 mb-4">
          <AlertTriangle size={20} className="text-red-400 flex-shrink-0" />
          <p className="text-white text-sm">{message}</p>
        </div>
        <div className="flex gap-3">
          <button onClick={onCancel} disabled={loading}
            className="flex-1 py-2 border border-gray-700 text-gray-400 rounded-xl hover:border-gray-500 transition-colors text-sm disabled:opacity-40">
            Cancelar
          </button>
          <button onClick={handleConfirm} disabled={loading}
            className="flex-1 py-2 bg-red-500 text-white rounded-xl hover:bg-red-600 transition-colors text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-70">
            {loading
              ? <><svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg> Eliminando...</>
              : 'Eliminar'
            }
          </button>
        </div>
      </div>
    </div>
  )
}

function JobCard({ job, onDelete }) {
  const [expanded, setExpanded] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const thumbs = (job.creatives || []).slice(0, 3)
  const extras = (job.creatives || []).length - 3
  const shortUrl = job.property_url?.replace(/^https?:\/\/(www\.)?/, '').slice(0, 50)
  const date = job.created_at
    ? new Date(job.created_at).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: '2-digit' })
    : ''

  async function handleDelete() {
    setDeleting(true)
    try {
      await onDelete(job.id)
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden hover:border-gray-700 transition-colors">
      <div className="p-4 flex gap-3 items-start">
        {/* Thumbnails */}
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
          <button onClick={handleDelete} disabled={deleting}
            className="flex items-center gap-1 px-2.5 py-1.5 border border-gray-800 text-gray-600 rounded-lg text-xs hover:border-red-500 hover:text-red-400 transition-colors disabled:opacity-50">
            <Trash2 size={11} />
          </button>
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
  const [total, setTotal] = useState(0)
  const [pages, setPages] = useState(1)
  const [page, setPage] = useState(1)
  const [loadingData, setLoadingData] = useState(true)
  const [confirm, setConfirm] = useState(null)
  const [referral, setReferral] = useState(null)
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()

  // Banner de éxito post-pago
  const paySuccess = searchParams.get('success')
  const creditsAdded = searchParams.get('credits')

  useEffect(() => {
    if (paySuccess || creditsAdded) {
      // Limpiar params de URL sin recargar
      navigate('/dashboard', { replace: true })
    }
  }, [])

  async function fetchJobs(p = page) {
    if (!userId) return
    const res = await listJobs(userId, p, PER_PAGE)
    setJobs(res.jobs)
    setTotal(res.total)
    setPages(res.pages)
  }

  useEffect(() => {
    if (!userId) return
    setLoadingData(true)
    // Pasar ref code si existe en localStorage (usuario nuevo)
    const ref = localStorage.getItem('inmogen_ref') || ''
    Promise.all([
      fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8003'}/users/me${ref ? `?ref=${ref}` : ''}`, { headers: { 'x-user-id': userId } }).then(r => r.json()),
      listJobs(userId, 1, PER_PAGE),
      getReferralInfo(userId).catch(() => null),
    ]).then(([u, res, ref]) => {
      setUserData(u)
      setJobs(res.jobs)
      setTotal(res.total)
      setPages(res.pages)
      setReferral(ref)
      if (localStorage.getItem('inmogen_ref')) localStorage.removeItem('inmogen_ref')
    }).finally(() => setLoadingData(false))
  }, [userId])

  async function handleDeleteOne(jobId) {
    setConfirm({ type: 'one', jobId })
  }

  async function handleDeleteAll() {
    setConfirm({ type: 'all' })
  }

  async function confirmDelete() {
    try {
      if (confirm.type === 'one') {
        await deleteJob(userId, confirm.jobId)
        toast.success('Generación eliminada')
        const newTotal = total - 1
        const newPages = Math.max(1, Math.ceil(newTotal / PER_PAGE))
        const newPage = page > newPages ? newPages : page
        setPage(newPage)
        await fetchJobs(newPage)
      } else {
        await deleteAllJobs(userId)
        toast.success('Historial eliminado')
        setJobs([])
        setTotal(0)
        setPages(1)
        setPage(1)
      }
    } catch {
      toast.error('Error al eliminar')
    } finally {
      setConfirm(null)
    }
  }

  async function goToPage(p) {
    setPage(p)
    setLoadingData(true)
    try { await fetchJobs(p) } finally { setLoadingData(false) }
  }

  const doneJobs = jobs.filter(j => j.status === 'done')

  return (
    <div className="p-8 max-w-5xl mx-auto">

      {/* Banner éxito suscripción */}
      {paySuccess && (
        <div className="mb-6 bg-green-500/10 border border-green-500/30 rounded-2xl p-5 flex items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0">
            <CheckCircle size={20} className="text-green-400" />
          </div>
          <div>
            <p className="text-white font-semibold">¡Suscripción activada!</p>
            <p className="text-gray-400 text-sm">Tus créditos ya están disponibles. ¡A generar!</p>
          </div>
          <Link to="/generate" className="ml-auto flex items-center gap-2 px-4 py-2 bg-green-500 text-white font-semibold rounded-xl text-sm hover:bg-green-400 transition-colors flex-shrink-0">
            Generar ahora <ArrowRight size={14} />
          </Link>
        </div>
      )}

      {/* Banner éxito pack de créditos */}
      {creditsAdded && (
        <div className="mb-6 bg-yellow-400/10 border border-yellow-400/30 rounded-2xl p-5 flex items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-yellow-400/20 flex items-center justify-center flex-shrink-0">
            <Zap size={20} className="text-yellow-400" />
          </div>
          <div>
            <p className="text-white font-semibold">¡Créditos agregados!</p>
            <p className="text-gray-400 text-sm">Tu saldo fue actualizado. Ya podés seguir generando creativos.</p>
          </div>
          <Link to="/generate" className="ml-auto flex items-center gap-2 px-4 py-2 bg-yellow-400 text-gray-900 font-semibold rounded-xl text-sm hover:bg-yellow-300 transition-colors flex-shrink-0">
            Generar ahora <ArrowRight size={14} />
          </Link>
        </div>
      )}

      <h1 className="text-2xl font-bold text-white mb-2">Bienvenido, {user?.firstName}</h1>
      <p className="text-gray-400 mb-8">Generá creativos inmobiliarios listos para Meta Ads.</p>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <StatCard label="Créditos disponibles" value={userData?.credits ?? '—'} accent="text-yellow-400"
          action={<Link to="/pricing" className="text-xs text-yellow-400 hover:underline flex items-center gap-1">Recargar <ArrowRight size={12} /></Link>} />
        <StatCard label="Propiedades generadas" value={total} accent="text-green-400" />
        <StatCard label="Plan actual"
          value={userData?.plan ? userData.plan.charAt(0).toUpperCase() + userData.plan.slice(1) : '—'}
          accent="text-blue-400" />
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        <Link to="/generate" className="bg-yellow-400 rounded-2xl p-5 flex items-center gap-4 hover:bg-yellow-300 transition-colors group">
          <div className="bg-gray-900/20 rounded-xl p-3"><Image size={24} className="text-gray-900" /></div>
          <div>
            <p className="font-bold text-gray-900">Generar creativos</p>
            <p className="text-sm text-gray-800">Pegá el link de una propiedad</p>
          </div>
          <ArrowRight size={20} className="ml-auto text-gray-900 group-hover:translate-x-1 transition-transform" />
        </Link>
        <Link to="/brand" className="bg-gray-900 border border-gray-800 rounded-2xl p-5 flex items-center gap-4 hover:border-gray-600 transition-colors group">
          <div className="bg-gray-800 rounded-xl p-3"><CreditCard size={24} className="text-yellow-400" /></div>
          <div>
            <p className="font-bold text-white">Configurar mi marca</p>
            <p className="text-sm text-gray-400">Logo, colores y tipografía</p>
          </div>
          <ArrowRight size={20} className="ml-auto text-gray-600 group-hover:text-white transition-colors" />
        </Link>
      </div>

      {/* Onboarding */}
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

      {/* Referidos */}
      {referral && (
        <div className="mb-8 bg-gray-900 border border-gray-800 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <Gift size={18} className="text-yellow-400" />
            <h2 className="font-semibold text-white">Invitá y ganás créditos</h2>
            {referral.referrals_count > 0 && (
              <span className="ml-auto text-xs text-green-400 font-semibold">
                {referral.referrals_count} referido{referral.referrals_count !== 1 ? 's' : ''} · +{referral.credits_earned} créditos ganados
              </span>
            )}
          </div>
          <p className="text-gray-400 text-sm mb-4">
            Por cada amigo que se registre con tu link recibís <span className="text-yellow-400 font-semibold">{referral.credits_per_referral} créditos</span>. Ellos también reciben <span className="text-yellow-400 font-semibold">{referral.credits_new_user} créditos extra</span>.
          </p>
          <div className="flex items-center gap-2">
            <div className="flex-1 bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-sm text-gray-300 font-mono truncate">
              {referral.ref_url}
            </div>
            <button
              onClick={() => { navigator.clipboard.writeText(referral.ref_url); toast.success('¡Link copiado!', { icon: '🔗' }) }}
              className="flex items-center gap-2 px-4 py-2.5 bg-yellow-400 text-gray-900 font-semibold rounded-xl hover:bg-yellow-300 transition-colors text-sm flex-shrink-0">
              <Copy size={14} /> Copiar
            </button>
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
            <h2 className="text-lg font-semibold text-white">
              Historial <span className="text-gray-600 text-sm font-normal ml-1">{total} generaciones</span>
            </h2>
            <button onClick={handleDeleteAll}
              className="flex items-center gap-1.5 text-xs text-gray-600 hover:text-red-400 transition-colors">
              <Trash2 size={13} /> Borrar todo
            </button>
          </div>

          <div className="space-y-3 mb-6">
            {jobs.map(job => <JobCard key={job.id} job={job} onDelete={handleDeleteOne} />)}
          </div>

          {/* Paginado */}
          {pages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <button onClick={() => goToPage(page - 1)} disabled={page === 1}
                className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-700 text-gray-400 hover:border-gray-500 disabled:opacity-30 transition-colors">
                <ChevronLeft size={15} />
              </button>

              {Array.from({ length: pages }, (_, i) => i + 1).map(p => {
                // Mostrar primera, última, actual y adyacentes — el resto como "..."
                const show = p === 1 || p === pages || Math.abs(p - page) <= 1
                const showDotsBefore = p === page - 2 && page > 3
                const showDotsAfter = p === page + 2 && page < pages - 2
                if (showDotsBefore || showDotsAfter) return <span key={p} className="text-gray-600 text-sm">…</span>
                if (!show) return null
                return (
                  <button key={p} onClick={() => goToPage(p)}
                    className={`w-8 h-8 flex items-center justify-center rounded-lg text-sm font-medium transition-colors ${
                      p === page ? 'bg-yellow-400 text-gray-900' : 'border border-gray-700 text-gray-400 hover:border-gray-500'
                    }`}>
                    {p}
                  </button>
                )
              })}

              <button onClick={() => goToPage(page + 1)} disabled={page === pages}
                className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-700 text-gray-400 hover:border-gray-500 disabled:opacity-30 transition-colors">
                <ChevronRight size={15} />
              </button>
            </div>
          )}
        </div>
      ) : userData ? (
        <div className="text-center py-16 text-gray-600">
          <Image size={40} className="mx-auto mb-3 opacity-30" />
          <p>Todavía no generaste ningún creativo.</p>
          <Link to="/generate" className="mt-3 inline-block text-yellow-400 text-sm hover:underline">Crear el primero →</Link>
        </div>
      ) : null}

      {/* Confirm modal */}
      {confirm && (
        <ConfirmModal
          message={
            confirm.type === 'all'
              ? `¿Eliminar todo el historial? Esta acción no se puede deshacer.`
              : `¿Eliminar esta generación? No se puede deshacer.`
          }
          onConfirm={confirmDelete}
          onCancel={() => setConfirm(null)}
        />
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
