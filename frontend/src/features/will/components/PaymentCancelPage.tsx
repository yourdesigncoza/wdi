import { Link } from 'react-router-dom'
import { ThemeToggle } from '../../../components/ui/ThemeToggle.tsx'
import { UserButton } from '@clerk/clerk-react'

export function PaymentCancelPage() {
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

      <main className="max-w-lg mx-auto px-4 py-12">
        <div className="card bg-base-100 shadow-sm">
          <div className="card-body items-center text-center space-y-4">
            <svg
              className="w-16 h-16 text-warning"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
              />
            </svg>

            <h2 className="card-title text-xl">Payment Cancelled</h2>
            <p className="text-base-content/70">
              Your payment was not completed. No charges have been made.
            </p>
            <p className="text-sm text-base-content/70">
              Your will progress has been saved. You can return and complete
              payment at any time.
            </p>

            <Link to="/will" className="btn btn-neutral btn-lg w-full">
              Return to Will
            </Link>
          </div>
        </div>
      </main>
    </div>
  )
}
