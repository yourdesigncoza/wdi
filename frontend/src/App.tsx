import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom'
import {
  SignedIn,
  SignedOut,
  SignInButton,
  SignUpButton,
  UserButton,
} from '@clerk/clerk-react'
import { ConsentProvider } from './components/consent/ConsentProvider'
import { ConsentModal } from './components/consent/ConsentModal'
import { PrivacyPolicy } from './components/common/PrivacyPolicy'
import { InfoOfficerContact } from './components/common/InfoOfficerContact'
import { ThemeToggle } from './components/ui/ThemeToggle'
import { WillWizard } from './features/will/components/WillWizard.tsx'
import { PaymentReturnPage } from './features/will/components/PaymentReturnPage.tsx'
import { PaymentCancelPage } from './features/will/components/PaymentCancelPage.tsx'
import { DownloadPage } from './features/will/components/DownloadPage.tsx'
import { useConsent } from './hooks/useConsent'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 5 * 60 * 1000,
    },
  },
})

function LandingPage() {
  return (
    <div className="min-h-screen bg-base-200 flex flex-col">
      <div className="navbar bg-base-100 shadow-sm">
        <div className="navbar-start">
          <span className="text-xl font-bold">WillCraft SA</span>
        </div>
        <div className="navbar-end">
          <ThemeToggle />
        </div>
      </div>
      <main className="flex-1 flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center space-y-8">
          <div className="space-y-3">
            <h2 className="text-3xl font-bold text-base-content">
              Create Your Will Online
            </h2>
            <p className="text-base-content/70 text-lg">
              A legally compliant South African will, guided by AI — no legal
              knowledge required.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <SignInButton mode="modal">
              <button className="btn btn-neutral">
                Sign In
              </button>
            </SignInButton>
            <SignUpButton mode="modal">
              <button className="btn btn-secondary">
                Sign Up
              </button>
            </SignUpButton>
          </div>
        </div>
      </main>
    </div>
  )
}

function MainContent() {
  const { hasConsent, isLoading } = useConsent()

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <span className="loading loading-spinner loading-lg text-primary"></span>
      </div>
    )
  }

  if (!hasConsent) {
    return null
  }

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
        <div className="card bg-base-100 shadow-sm">
          <div className="card-body items-center text-center space-y-4">
            <h2 className="card-title text-2xl">Welcome to WillCraft SA</h2>
            <p className="text-base-content/70">
              Create your legally compliant South African will with our step-by-step guided process.
            </p>
            <Link to="/will" className="btn btn-neutral btn-lg">
              Create Your Will
            </Link>
          </div>
        </div>
      </main>
    </div>
  )
}

function WillPage() {
  const { hasConsent, isLoading } = useConsent()

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <span className="loading loading-spinner loading-lg text-primary"></span>
      </div>
    )
  }

  if (!hasConsent) {
    return null
  }

  return <WillWizard />
}

function AuthGatedContent({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SignedOut>
        <LandingPage />
      </SignedOut>
      <SignedIn>
        <ConsentProvider>
          <ConsentModal />
          {children}
        </ConsentProvider>
      </SignedIn>
    </>
  )
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/privacy-policy" element={<PrivacyPolicy />} />
          <Route path="/info-officer" element={<InfoOfficerContact />} />
          <Route path="/will" element={<AuthGatedContent><WillPage /></AuthGatedContent>} />
          <Route path="/payment/return" element={<AuthGatedContent><PaymentReturnPage /></AuthGatedContent>} />
          <Route path="/payment/cancel" element={<AuthGatedContent><PaymentCancelPage /></AuthGatedContent>} />
          <Route path="/download/:token" element={<AuthGatedContent><DownloadPage /></AuthGatedContent>} />
          <Route path="*" element={<AuthGatedContent><MainContent /></AuthGatedContent>} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  )
}
