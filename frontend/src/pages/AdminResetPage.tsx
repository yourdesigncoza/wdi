import { useState } from 'react'
import { API_BASE } from '../config'

export function AdminResetPage() {
  const [password, setPassword] = useState('')
  const [status, setStatus] = useState<'idle' | 'confirming' | 'loading' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState('')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!password.trim()) return
    setStatus('confirming')
  }

  async function handleConfirm() {
    setStatus('loading')
    setMessage('')
    try {
      const res = await fetch(`${API_BASE}/admin/reset-database`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })
      const data = await res.json()
      if (!res.ok) {
        setStatus('error')
        setMessage(data.detail || 'Reset failed.')
        return
      }
      // Clear all localStorage (consent, will store, etc.)
      localStorage.clear()
      setStatus('success')
      setMessage(`${data.message} Tables cleared: ${data.tables_cleared.join(', ')}`)
      setPassword('')
    } catch {
      setStatus('error')
      setMessage('Network error. Is the backend running?')
    }
  }

  function handleCancel() {
    setStatus('idle')
  }

  return (
    <div className="min-h-screen bg-base-200 flex items-center justify-center px-4">
      <div className="card bg-base-100 shadow-xl w-full max-w-md">
        <div className="card-body">
          <h2 className="card-title text-error">Database Reset</h2>
          <p className="text-sm text-base-content/70">
            This will delete all user data (users, wills, conversations, payments, consent records, audit logs).
            Clause library will be preserved.
          </p>

          {status === 'success' && (
            <div className="alert alert-success alert-soft">
              <span>{message}</span>
            </div>
          )}

          {status === 'error' && (
            <div className="alert alert-error alert-soft">
              <span>{message}</span>
            </div>
          )}

          {status === 'confirming' ? (
            <div className="space-y-4 mt-4">
              <div className="alert alert-warning">
                <span>This action is irreversible. All user data will be permanently deleted.</span>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={handleConfirm}
                  className="btn btn-error flex-1"
                >
                  Yes, Delete Everything
                </button>
                <button
                  onClick={handleCancel}
                  className="btn btn-soft flex-1"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4 mt-4">
              <div className="form-control">
                <label className="label">
                  <span className="label-text">Admin Password</span>
                </label>
                <input
                  type="password"
                  className="input input-bordered w-full"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter admin password"
                  disabled={status === 'loading'}
                />
              </div>
              <button
                type="submit"
                className="btn btn-error w-full"
                disabled={status === 'loading' || !password.trim()}
              >
                {status === 'loading' ? (
                  <>
                    <span className="loading loading-spinner loading-sm"></span>
                    Resetting...
                  </>
                ) : (
                  'Reset Database'
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
