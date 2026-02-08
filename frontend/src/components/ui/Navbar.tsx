import { Link, useLocation } from 'react-router-dom'
import { UserButton } from '@clerk/clerk-react'
import { ThemeToggle } from './ThemeToggle'

interface NavbarProps {
  variant?: 'full' | 'minimal'
}

export function Navbar({ variant = 'full' }: NavbarProps) {
  if (variant === 'minimal') {
    return (
      <div className="navbar bg-base-100 shadow-sm">
        <div className="navbar-start">
          <span className="text-xl font-bold">WillCraft SA</span>
        </div>
        <div className="navbar-end">
          <ThemeToggle />
        </div>
      </div>
    )
  }

  return <FullNavbar />
}

function NavLinks({ mobile }: { mobile?: boolean }) {
  const { pathname } = useLocation()

  const links = [
    { to: '/', label: 'My Wills', isActive: pathname === '/' },
    { to: '/documents', label: 'Documents', isActive: pathname.startsWith('/documents') },
  ]

  const menuClass = mobile
    ? 'menu menu-sm dropdown-content bg-base-100 rounded-box z-10 mt-3 w-52 p-2 shadow'
    : 'menu menu-horizontal px-1'

  return (
    <ul className={menuClass}>
      {links.map((link) => (
        <li key={link.to}>
          <Link to={link.to} className={link.isActive ? 'active' : ''}>
            {link.label}
          </Link>
        </li>
      ))}
    </ul>
  )
}

function FullNavbar() {
  return (
    <div className="navbar bg-base-100 shadow-sm">
      <div className="navbar-start">
        <div className="dropdown">
          <div tabIndex={0} role="button" className="btn btn-ghost lg:hidden">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h8m-8 6h16" />
            </svg>
          </div>
          <NavLinks mobile />
        </div>
        <Link to="/" className="text-xl font-bold">WillCraft SA</Link>
      </div>
      <div className="navbar-center hidden lg:flex">
        <NavLinks />
      </div>
      <div className="navbar-end gap-2">
        <ThemeToggle />
        <UserButton />
      </div>
    </div>
  )
}
