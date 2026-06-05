import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from '@clerk/clerk-react'
import Layout from './components/Layout'
import Home from './pages/Home'
import Dashboard from './pages/Dashboard'
import Generate from './pages/Generate'
import Brand from './pages/Brand'
import Pricing from './pages/Pricing'

function ProtectedRoute({ children }) {
  const { isSignedIn, isLoaded } = useAuth()
  if (!isLoaded) return <div className="flex items-center justify-center h-screen text-gray-500">Cargando...</div>
  if (!isSignedIn) return <Navigate to="/" replace />
  return children
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/pricing" element={<Pricing />} />
      <Route element={<Layout />}>
        <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/generate" element={<ProtectedRoute><Generate /></ProtectedRoute>} />
        <Route path="/brand" element={<ProtectedRoute><Brand /></ProtectedRoute>} />
      </Route>
    </Routes>
  )
}
