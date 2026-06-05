import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuth, UserButton, useUser } from '@clerk/clerk-react'
import { Zap, LayoutDashboard, Image, Palette, CreditCard } from 'lucide-react'

export default function Layout() {
  const { user } = useUser()

  return (
    <div className="min-h-screen bg-gray-950 flex">
      {/* Sidebar */}
      <aside className="w-56 bg-gray-900 border-r border-gray-800 flex flex-col">
        <div className="p-4 flex items-center gap-2 border-b border-gray-800">
          <Zap className="text-yellow-400" size={22} />
          <span className="font-bold text-white text-lg">InmoGen</span>
        </div>

        <nav className="flex-1 p-3 space-y-1">
          <NavItem to="/dashboard" icon={<LayoutDashboard size={18} />} label="Dashboard" />
          <NavItem to="/generate" icon={<Image size={18} />} label="Generar" />
          <NavItem to="/brand" icon={<Palette size={18} />} label="Mi Marca" />
          <NavItem to="/pricing" icon={<CreditCard size={18} />} label="Planes" />
        </nav>

        <div className="p-4 border-t border-gray-800 flex items-center gap-3">
          <UserButton afterSignOutUrl="/" />
          <span className="text-gray-400 text-sm truncate">{user?.firstName}</span>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  )
}

function NavItem({ to, icon, label }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
          isActive
            ? 'bg-yellow-400 text-gray-900 font-semibold'
            : 'text-gray-400 hover:text-white hover:bg-gray-800'
        }`
      }
    >
      {icon}
      {label}
    </NavLink>
  )
}
