import { useQuery } from '@tanstack/react-query'
import { Link, useNavigate } from 'react-router-dom'
import { UserButton } from '@clerk/clerk-react'
import { ThemeToggle } from '../../../components/ui/ThemeToggle'
import type { WillResponse } from '../../../services/api'
import { useApi } from '../../../contexts/AuthApiContext'
import { useWillStore } from '../store/useWillStore'

function statusBadge(status: string) {
  const map: Record<string, string> = {
    draft: 'badge-warning',
    in_review: 'badge-info',
    verified: 'badge-success',
    generated: 'badge-accent',
  }
  const label: Record<string, string> = {
    draft: 'Draft',
    in_review: 'In Review',
    verified: 'Verified',
    generated: 'Generated',
  }
  return (
    <span className={`badge ${map[status] || 'badge-ghost'}`}>
      {label[status] || status}
    </span>
  )
}

function testatorName(will: WillResponse): string {
  const t = will.testator
  if (t && t.first_name && t.last_name) {
    return `${t.first_name} ${t.last_name}`
  }
  if (t && t.first_name) return String(t.first_name)
  return 'Untitled Will'
}

function WillCard({
  will,
  onResume,
}: {
  will: WillResponse
  onResume: (id: string) => void
}) {
  const isPaid = !!will.paid_at

  return (
    <div className="card bg-base-100 shadow-sm">
      <div className="card-body">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="space-y-1">
            <h3 className="card-title text-lg">{testatorName(will)}</h3>
            <div className="flex flex-wrap items-center gap-2 text-sm">
              {statusBadge(will.status)}
              {isPaid && <span className="badge badge-primary">Paid</span>}
              {will.version > 1 && (
                <span className="text-base-content/60">v{will.version}</span>
              )}
              <span className="text-base-content/50">
                Updated {new Date(will.updated_at).toLocaleDateString()}
              </span>
            </div>
          </div>
          <div className="flex gap-2">
            {isPaid ? (
              <button
                className="btn btn-neutral btn-sm"
                onClick={() => onResume(will.id)}
              >
                Update Will
              </button>
            ) : (
              <button
                className="btn btn-neutral btn-sm"
                onClick={() => onResume(will.id)}
              >
                Resume Draft
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export function WillDashboard() {
  const api = useApi()
  const navigate = useNavigate()
  const loadFromServer = useWillStore((s) => s.loadFromServer)
  const resetWill = useWillStore((s) => s.resetWill)

  const {
    data: wills,
    isLoading,
    error,
  } = useQuery<WillResponse[]>({
    queryKey: ['wills'],
    queryFn: () => api.listWills(),
  })

  async function handleResume(willId: string) {
    const will = await api.getWill(willId)
    loadFromServer(will)
    navigate('/will')
  }

  function handleCreateNew(e: React.MouseEvent) {
    e.preventDefault()
    resetWill()
    navigate('/will')
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-base-200">
        <div className="navbar bg-base-100 shadow-sm">
          <div className="navbar-start">
            <span className="text-xl font-bold">WillCraft SA</span>
          </div>
          <div className="navbar-center hidden sm:flex">
            <p className="text-sm text-base-content/70">
              Create your legally compliant South African will
            </p>
          </div>
          <div className="navbar-end gap-2">
            <ThemeToggle />
            <UserButton />
          </div>
        </div>
        <main className="max-w-4xl mx-auto px-4 py-8 flex justify-center">
          <span className="loading loading-spinner loading-lg text-primary"></span>
        </main>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-base-200">
        <div className="navbar bg-base-100 shadow-sm">
          <div className="navbar-start">
            <span className="text-xl font-bold">WillCraft SA</span>
          </div>
          <div className="navbar-end gap-2">
            <ThemeToggle />
            <UserButton />
          </div>
        </div>
        <main className="max-w-4xl mx-auto px-4 py-8">
          <div className="alert alert-error">
            <span>Failed to load your wills. Please try again later.</span>
          </div>
        </main>
      </div>
    )
  }

  const hasWills = wills && wills.length > 0

  return (
    <div className="min-h-screen bg-base-200">
      <div className="navbar bg-base-100 shadow-sm">
        <div className="navbar-start">
          <span className="text-xl font-bold">WillCraft SA</span>
        </div>
        <div className="navbar-center hidden sm:flex">
          <p className="text-sm text-base-content/70">
            Create your legally compliant South African will
          </p>
        </div>
        <div className="navbar-end gap-2">
          <ThemeToggle />
          <UserButton />
        </div>
      </div>
      <main className="max-w-4xl mx-auto px-4 py-8">
        {!hasWills ? (
          <div className="card bg-base-100 shadow-sm">
            <div className="card-body items-center text-center space-y-4">
              <h2 className="card-title text-2xl">Welcome to WillCraft SA</h2>
              <p className="text-base-content/70">
                Create your legally compliant South African will with our
                step-by-step guided process. No legal knowledge required.
              </p>
              <Link to="/will" className="btn btn-neutral btn-lg">
                Create Your Will
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">Your Wills</h2>
              <Link
                to="/will"
                className="btn btn-neutral"
                onClick={handleCreateNew}
              >
                Create New Will
              </Link>
            </div>
            {wills.map((will) => (
              <WillCard key={will.id} will={will} onResume={handleResume} />
            ))}
          </div>
        )}

        {/* Additional Documents Section */}
        <div className="divider"></div>
        <div className="card bg-base-100 shadow-sm">
          <div className="card-body">
            <h3 className="card-title text-lg">Additional Documents</h3>
            <p className="text-base-content/70 text-sm">
              Create supplementary estate planning documents such as a living
              will or funeral wishes.
            </p>
            <div className="card-actions mt-2">
              <Link to="/documents" className="btn btn-neutral">
                View Documents
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
