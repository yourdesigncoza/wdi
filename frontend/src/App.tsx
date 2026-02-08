import { useState, useEffect } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter, Routes, Route, useParams, useNavigate } from 'react-router-dom'
import {
  SignedIn,
  SignedOut,
  SignInButton,
  SignUpButton,
} from '@clerk/clerk-react'
import { AuthApiProvider } from './contexts/AuthApiContext'
import { useApi } from './contexts/AuthApiContext'
import { ConsentProvider } from './components/consent/ConsentProvider'
import { ConsentModal } from './components/consent/ConsentModal'
import { PrivacyPolicy } from './components/common/PrivacyPolicy'
import { InfoOfficerContact } from './components/common/InfoOfficerContact'
import { ThemeToggle } from './components/ui/ThemeToggle'
import { WillWizard } from './features/will/components/WillWizard.tsx'
import { PaymentReturnPage } from './features/will/components/PaymentReturnPage.tsx'
import { PaymentCancelPage } from './features/will/components/PaymentCancelPage.tsx'
import { DownloadPage } from './features/will/components/DownloadPage.tsx'
import { WillDashboard } from './features/will/components/WillDashboard.tsx'
import { AdditionalDocumentsDashboard } from './features/additional-documents/components/AdditionalDocumentsDashboard.tsx'
import { DocumentPreview } from './features/additional-documents/components/DocumentPreview.tsx'
import { LivingWillForm } from './features/additional-documents/components/LivingWillForm.tsx'
import { FuneralWishesForm } from './features/additional-documents/components/FuneralWishesForm.tsx'
import { useAdditionalDocStore } from './features/additional-documents/store/useAdditionalDocStore.ts'
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

  return <WillDashboard />
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
        <AuthApiProvider>
          <ConsentProvider>
            <ConsentModal />
            {children}
          </ConsentProvider>
        </AuthApiProvider>
      </SignedIn>
    </>
  )
}

function DocumentsPage() {
  const { hasConsent, isLoading } = useConsent()
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <span className="loading loading-spinner loading-lg text-primary"></span>
      </div>
    )
  }
  if (!hasConsent) return null
  return <AdditionalDocumentsDashboard />
}

function DocumentEditPage() {
  const { hasConsent, isLoading: consentLoading } = useConsent()
  const { docId } = useParams<{ docId: string }>()
  const api = useApi()
  const navigate = useNavigate()
  const loadFromServer = useAdditionalDocStore((s) => s.loadFromServer)
  const resetDoc = useAdditionalDocStore((s) => s.resetDoc)
  const documentType = useAdditionalDocStore((s) => s.documentType)
  const currentDocId = useAdditionalDocStore((s) => s.currentDocId)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!docId || consentLoading || !hasConsent) return
    // Only fetch if we don't already have this doc loaded in the store
    if (currentDocId === docId && documentType) {
      setLoading(false)
      return
    }
    let cancelled = false
    async function load() {
      try {
        const doc = await api.getAdditionalDocument(docId!)
        if (!cancelled) {
          resetDoc()
          loadFromServer(doc)
          setLoading(false)
        }
      } catch {
        if (!cancelled) navigate('/documents')
      }
    }
    load()
    return () => { cancelled = true }
  }, [docId, consentLoading, hasConsent, api, loadFromServer, resetDoc, navigate, currentDocId, documentType])

  if (consentLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <span className="loading loading-spinner loading-lg text-primary"></span>
      </div>
    )
  }
  if (!hasConsent) return null

  function handleComplete() {
    navigate(`/documents/${docId}/preview`)
  }
  function handleBack() {
    navigate('/documents')
  }

  if (documentType === 'living_will') {
    return (
      <div className="min-h-screen bg-base-200">
        <main className="max-w-4xl mx-auto px-4 py-8">
          <LivingWillForm docId={docId!} onComplete={handleComplete} onBack={handleBack} />
        </main>
      </div>
    )
  }
  if (documentType === 'funeral_wishes') {
    return (
      <div className="min-h-screen bg-base-200">
        <main className="max-w-4xl mx-auto px-4 py-8">
          <FuneralWishesForm docId={docId!} onComplete={handleComplete} onBack={handleBack} />
        </main>
      </div>
    )
  }

  return null
}

function DocumentPreviewPage2() {
  const { hasConsent, isLoading } = useConsent()
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <span className="loading loading-spinner loading-lg text-primary"></span>
      </div>
    )
  }
  if (!hasConsent) return null
  return <DocumentPreview />
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
          <Route path="/documents" element={<AuthGatedContent><DocumentsPage /></AuthGatedContent>} />
          <Route path="/documents/:docId/edit" element={<AuthGatedContent><DocumentEditPage /></AuthGatedContent>} />
          <Route path="/documents/:docId/preview" element={<AuthGatedContent><DocumentPreviewPage2 /></AuthGatedContent>} />
          <Route path="*" element={<AuthGatedContent><MainContent /></AuthGatedContent>} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  )
}
