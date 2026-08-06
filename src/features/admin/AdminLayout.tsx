import { NavLink, Outlet } from 'react-router-dom'

const links = [
  { to: '/admin/users', label: 'Usuarios' },
  { to: '/admin/churches', label: 'Iglesias' },
  { to: '/admin/songs', label: 'Catálogo global' },
]

export function AdminLayout() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-6 md:px-6">
      <header className="mb-6 border-b border-indigo-100 pb-4">
        <p className="text-sm font-semibold text-indigo-600">Planly</p>
        <h1 className="text-2xl font-bold text-gray-900">Administración de plataforma</h1>
        <p className="mt-1 text-sm text-gray-600">Gestiona usuarios, membresías e iglesias.</p>
      </header>
      <nav aria-label="Administración" className="mb-6 flex gap-2 border-b border-gray-200">
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            className={({ isActive }) =>
              `min-h-11 border-b-2 px-3 py-2 text-sm font-medium ${
                isActive ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-gray-600 hover:text-gray-900'
              }`
            }
          >
            {link.label}
          </NavLink>
        ))}
      </nav>
      <Outlet />
    </div>
  )
}
