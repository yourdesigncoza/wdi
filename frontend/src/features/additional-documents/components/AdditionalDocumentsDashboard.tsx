import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { useApi } from '../../../contexts/AuthApiContext'
import { useAdditionalDocStore } from '../store/useAdditionalDocStore'
import type { AdditionalDocumentResponse } from '../../../services/api'
import type { DocumentType } from '../types/additionalDocument'

// --- Helpers ---

const DOC_TYPE_LABELS: Record<string, string> = {
  living_will: 'Living Will',
  funeral_wishes: 'Funeral Wishes',
}

function formatDocType(type: string): string {
  return DOC_TYPE_LABELS[type] || type
}

function statusBadge(status: string) {
  const map: Record<string, string> = {
    draft: 'badge-warning',
    completed: 'badge-success',
    generated: 'badge-accent',
  }
  const label: Record<string, string> = {
    draft: 'Draft',
    completed: 'Completed',
    generated: 'Generated',
  }
  return (
    <span className={`badge ${map[status] || 'badge-ghost'}`}>
      {label[status] || status}
    </span>
  )
}

// --- Document Card ---

function DocumentCard({
  doc,
  onEdit,
  onPreview,
  onDelete,
}: {
  doc: AdditionalDocumentResponse
  onEdit: (id: string) => void
  onPreview: (id: string) => void
  onDelete: (id: string) => void
}) {
  const [confirmDelete, setConfirmDelete] = useState(false)

  return (
    <div className="card bg-base-100 shadow-sm">
      <div className="card-body">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="space-y-1">
            <h3 className="card-title text-lg">
              {formatDocType(doc.document_type)}
            </h3>
            <div className="flex flex-wrap items-center gap-2 text-sm">
              {statusBadge(doc.status)}
              <span className="text-base-content/50">
                Updated {new Date(doc.updated_at).toLocaleDateString()}
              </span>
            </div>
          </div>
          <div className="flex gap-2">
            {(doc.status === 'draft' || doc.status === 'completed') && (
              <button
                className="btn btn-neutral btn-sm"
                onClick={() => onEdit(doc.id)}
              >
                Edit
              </button>
            )}
            {(doc.status === 'completed' || doc.status === 'generated') && (
              <button
                className="btn btn-soft btn-sm"
                onClick={() => onPreview(doc.id)}
              >
                Preview
              </button>
            )}
            {!confirmDelete ? (
              <button
                className="btn btn-error btn-outline btn-sm"
                onClick={() => setConfirmDelete(true)}
              >
                Delete
              </button>
            ) : (
              <div className="flex gap-1">
                <button
                  className="btn btn-error btn-sm"
                  onClick={() => {
                    onDelete(doc.id)
                    setConfirmDelete(false)
                  }}
                >
                  Confirm
                </button>
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => setConfirmDelete(false)}
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// --- Main Dashboard ---

export function AdditionalDocumentsDashboard() {
  const api = useApi()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const loadFromServer = useAdditionalDocStore((s) => s.loadFromServer)
  const resetDoc = useAdditionalDocStore((s) => s.resetDoc)

  const {
    data: documents,
    isLoading,
    error,
  } = useQuery<AdditionalDocumentResponse[]>({
    queryKey: ['additional-documents'],
    queryFn: () => api.listAdditionalDocuments(),
  })

  const deleteMutation = useMutation({
    mutationFn: (docId: string) => api.deleteAdditionalDocument(docId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['additional-documents'] })
    },
  })

  async function handleCreate(docType: DocumentType) {
    const doc = await api.createAdditionalDocument({ document_type: docType })
    resetDoc()
    loadFromServer(doc)
    navigate(`/documents/${doc.id}/edit`)
  }

  function handleEdit(docId: string) {
    navigate(`/documents/${docId}/edit`)
  }

  function handlePreview(docId: string) {
    navigate(`/documents/${docId}/preview`)
  }

  function handleDelete(docId: string) {
    deleteMutation.mutate(docId)
  }

  // Determine which document types already exist
  const existingTypes = new Set(
    (documents || []).map((d) => d.document_type),
  )

  const hasDocuments = documents && documents.length > 0

  if (isLoading) {
    return (
      <main className="max-w-4xl mx-auto px-4 py-8 flex justify-center">
        <span className="loading loading-spinner loading-lg text-primary"></span>
      </main>
    )
  }

  if (error) {
    return (
      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="alert alert-error">
          <span>Failed to load documents. Please try again later.</span>
        </div>
      </main>
    )
  }

  return (
    <main className="max-w-4xl mx-auto px-4 py-8">
      {!hasDocuments ? (
          <div className="space-y-6">
            <div className="card bg-base-100 shadow-sm">
              <div className="card-body items-center text-center space-y-4">
                <h2 className="card-title text-2xl">Additional Documents</h2>
                <p className="text-base-content/70">
                  Create supplementary estate planning documents alongside your
                  will.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Living Will Card */}
              <div className="card bg-base-100 shadow-sm">
                <div className="card-body space-y-3">
                  <h3 className="card-title text-lg">Living Will</h3>
                  <p className="text-sm text-base-content/70">
                    An advance healthcare directive that documents your
                    treatment preferences and appoints a healthcare proxy.
                  </p>
                  <button
                    className="btn btn-neutral"
                    onClick={() => handleCreate('living_will')}
                  >
                    Create Living Will
                  </button>
                </div>
              </div>

              {/* Funeral Wishes Card */}
              <div className="card bg-base-100 shadow-sm">
                <div className="card-body space-y-3">
                  <h3 className="card-title text-lg">Funeral Wishes</h3>
                  <p className="text-sm text-base-content/70">
                    Record your preferences for funeral arrangements, burial or
                    cremation, ceremony, and personal messages.
                  </p>
                  <button
                    className="btn btn-neutral"
                    onClick={() => handleCreate('funeral_wishes')}
                  >
                    Create Funeral Wishes
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">Your Documents</h2>
            </div>

            {documents.map((doc) => (
              <DocumentCard
                key={doc.id}
                doc={doc}
                onEdit={handleEdit}
                onPreview={handlePreview}
                onDelete={handleDelete}
              />
            ))}

            {/* Create buttons for types not yet created */}
            {(!existingTypes.has('living_will') ||
              !existingTypes.has('funeral_wishes')) && (
              <div className="divider">Create New</div>
            )}
            <div className="flex flex-wrap gap-3">
              {!existingTypes.has('living_will') && (
                <button
                  className="btn btn-neutral"
                  onClick={() => handleCreate('living_will')}
                >
                  Create Living Will
                </button>
              )}
              {!existingTypes.has('funeral_wishes') && (
                <button
                  className="btn btn-neutral"
                  onClick={() => handleCreate('funeral_wishes')}
                >
                  Create Funeral Wishes
                </button>
              )}
            </div>
          </div>
        )}
    </main>
  )
}
