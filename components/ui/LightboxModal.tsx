'use client'

import { useEffect, useState } from 'react'
import { X, Download } from 'lucide-react'
import { createBrowserClient } from '@supabase/ssr'

interface Props {
  isOpen: boolean
  onClose: () => void
  fileUrl?: string
  fileUrls?: string[]
  fileType: 'image' | 'pdf'
  title: string
}

export default function LightboxModal({ isOpen, onClose, fileUrl, fileUrls, fileType, title }: Props) {
  const [imgError, setImgError] = useState(false)
  const [currentPage, setCurrentPage] = useState(0)

  // Normalize to array
  const rawUrls = fileUrls ?? (fileUrl ? [fileUrl] : [])

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  // Get full public URL if it's a supabase path
  const finalUrls = rawUrls.map((url) => {
    if (url && !url.startsWith('http') && !url.startsWith('blob:')) {
      const cleanPath = url.replace(/^answer-sheets\//, '')
      const { data } = supabase.storage.from('answer-sheets').getPublicUrl(cleanPath)
      return data.publicUrl
    }
    return url
  })
  
  const activeUrl = finalUrls[currentPage] || ''
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        onClose()
      } else if (e.key === 'ArrowRight') {
        setCurrentPage(p => Math.min(finalUrls.length - 1, p + 1))
      } else if (e.key === 'ArrowLeft') {
        setCurrentPage(p => Math.max(0, p - 1))
      }
    }
    if (isOpen) {
      setImgError(false)
      document.addEventListener('keydown', handleKeyDown)
      document.body.style.overflow = 'hidden' // prevent body scroll
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = 'auto'
    }
  }, [isOpen, onClose, finalUrls.length])

  useEffect(() => {
    setImgError(false)
  }, [currentPage, isOpen])

  if (!isOpen) return null

  return (
    <div 
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.8)',
        zIndex: 200,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
      className="fixed inset-0"
      onClick={onClose}
    >
      <div 
        style={{
          backgroundColor: 'var(--color-surface)',
          borderRadius: 12,
          width: '90vw',
          maxWidth: 1000,
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* TOP BAR */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid var(--color-border)' }}>
          <h3 style={{ fontSize: 15, fontWeight: 600, fontFamily: 'var(--font-body)', margin: 0, color: 'var(--text-primary)' }}>
            {title}
          </h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button 
              onClick={async () => {
                try {
                  const response = await fetch(activeUrl)
                  const blob = await response.blob()
                  const url = URL.createObjectURL(blob)
                  const a = document.createElement('a')
                  a.href = url
                  a.download = title || 'answer-sheet'
                  a.click()
                  URL.revokeObjectURL(url)
                } catch (e) {
                  console.error('Download failed', e)
                  // Fallback
                  window.open(activeUrl, '_blank')
                }
              }}
              className="btn-secondary btn-sm"
            >
              <Download size={14} style={{ marginRight: 6 }} />
              Download
            </button>
            <button 
              onClick={onClose}
              className="btn-ghost btn-sm"
            >
              <X size={16} />
            </button>
          </div>
        </div>
        
        {/* CONTENT AREA */}
        <div style={{ flex: 1, overflow: 'auto', padding: 24, backgroundColor: 'var(--color-teal-light)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {fileType === 'image' ? (
            imgError ? (
              <div style={{ color: 'var(--text-muted)', fontSize: 14, fontFamily: 'var(--font-body)', textAlign: 'center' }}>
                Image could not be loaded
              </div>
            ) : (
              <img 
                src={activeUrl} 
                alt={`${title} - Page ${currentPage + 1}`}
                key={activeUrl}
                onError={() => setImgError(true)}
                style={{ width: '100%', height: 'auto', maxHeight: finalUrls.length > 1 ? 'calc(90vh - 200px)' : 'calc(90vh - 80px)', objectFit: 'contain', backgroundColor: 'var(--color-teal-light)', borderRadius: 4, display: 'block' }}
              />
            )
          ) : (
            <iframe 
              src={activeUrl} 
              title={title}
              style={{ width: '100%', height: 'calc(90vh - 80px)', border: 'none', backgroundColor: 'var(--color-surface)', borderRadius: 4 }}
            />
          )}
        </div>

        {/* NAVIGATION & THUMBNAILS */}
        {fileType === 'image' && finalUrls.length > 1 && (
          <div style={{ padding: '16px 24px', backgroundColor: 'var(--color-surface)', borderTop: '1px solid var(--color-border)', flexShrink: 0 }}>
            <div className="flex items-center justify-between mb-3">
              <button 
                onClick={() => setCurrentPage(p => Math.max(0, p - 1))}
                disabled={currentPage === 0}
                className="btn-secondary btn-sm"
                style={{ opacity: currentPage === 0 ? 0.5 : 1 }}
              >
                ← Prev
              </button>
              <span className="text-sm font-medium" style={{ color: 'var(--text-muted)' }}>
                Page {currentPage + 1} of {finalUrls.length}
              </span>
              <button
                onClick={() => setCurrentPage(p => Math.min(finalUrls.length - 1, p + 1))}
                disabled={currentPage === finalUrls.length - 1}
                className="btn-secondary btn-sm"
                style={{ opacity: currentPage === finalUrls.length - 1 ? 0.5 : 1 }}
              >
                Next →
              </button>
            </div>
            
            <div className="flex gap-2 overflow-x-auto pb-2" style={{ scrollbarWidth: 'thin' }}>
              {finalUrls.map((url, i) => (
                <img
                  key={i}
                  src={url}
                  onClick={() => setCurrentPage(i)}
                  alt={`thumbnail ${i+1}`}
                  className="object-cover cursor-pointer rounded transition-all"
                  style={{ 
                    width: '60px', 
                    height: '60px', 
                    border: currentPage === i ? '2px solid var(--color-teal)' : '1px solid var(--color-border)',
                    opacity: currentPage === i ? 1 : 0.6
                  }}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
