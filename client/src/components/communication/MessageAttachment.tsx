import { Download, ExternalLink, FileText, Image as ImageIcon, Loader2 } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { communicationApi } from '../../lib/api'
import { formatFileSize, triggerFileDownload, cn } from '../../lib/utils'
import type { MessageAttachmentMeta } from '../../types'

function attachmentStorageKey(attachment: MessageAttachmentMeta): string {
  return `comm-att-downloaded:${attachment._id ?? attachment.publicId}`
}

function isAttachmentDownloaded(attachment: MessageAttachmentMeta): boolean {
  return sessionStorage.getItem(attachmentStorageKey(attachment)) === '1'
}

function fileTypeMeta(mimeType: string, fileName: string) {
  if (mimeType === 'application/pdf') {
    return { label: 'PDF', badge: 'PDF', className: 'bg-red-50 text-red-600' }
  }
  if (mimeType.startsWith('image/')) {
    return { label: 'Image', badge: 'IMG', className: 'bg-sky-50 text-sky-600' }
  }
  if (mimeType.includes('wordprocessingml') || fileName.endsWith('.docx')) {
    return { label: 'Word', badge: 'DOC', className: 'bg-blue-50 text-blue-600' }
  }
  if (mimeType.includes('spreadsheetml') || fileName.endsWith('.xlsx')) {
    return { label: 'Excel', badge: 'XLS', className: 'bg-emerald-50 text-emerald-600' }
  }
  if (mimeType.includes('presentationml') || fileName.endsWith('.pptx')) {
    return { label: 'PowerPoint', badge: 'PPT', className: 'bg-orange-50 text-orange-600' }
  }
  const ext = fileName.includes('.') ? fileName.split('.').pop()?.toUpperCase().slice(0, 4) : 'FILE'
  return { label: ext ?? 'File', badge: ext ?? 'FILE', className: 'bg-gray-100 text-gray-600' }
}

export function MessageAttachment({
  messageId,
  attachment,
}: {
  messageId: string
  attachment: MessageAttachmentMeta
}) {
  const [downloaded, setDownloaded] = useState(() => isAttachmentDownloaded(attachment))
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [downloading, setDownloading] = useState(false)
  const [opening, setOpening] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const blobRef = useRef<Blob | null>(null)
  const previewUrlRef = useRef<string | null>(null)

  const isImage = attachment.mimeType.startsWith('image/')
  const typeMeta = fileTypeMeta(attachment.mimeType, attachment.fileName)

  function setPreviewObjectUrl(url: string | null) {
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current)
    }
    previewUrlRef.current = url
    setPreviewUrl(url)
  }

  useEffect(() => {
    return () => {
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current)
      }
    }
  }, [])

  async function ensureBlob(): Promise<Blob> {
    if (blobRef.current) return blobRef.current
    if (!attachment._id) {
      throw new Error('This attachment cannot be loaded.')
    }
    const blob = await communicationApi.fetchMessageAttachmentBlob(messageId, attachment._id)
    blobRef.current = blob
    return blob
  }

  useEffect(() => {
    if (!downloaded || !isImage || previewUrl) return

    let cancelled = false
    ensureBlob()
      .then((blob) => {
        if (!cancelled) setPreviewObjectUrl(URL.createObjectURL(blob))
      })
      .catch(() => {})

    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [downloaded, isImage])

  async function handleDownload() {
    setDownloading(true)
    setError(null)
    try {
      const blob = await ensureBlob()
      triggerFileDownload(blob, attachment.fileName, attachment.mimeType)
      sessionStorage.setItem(attachmentStorageKey(attachment), '1')
      setDownloaded(true)
      if (isImage && !previewUrl) {
        setPreviewObjectUrl(URL.createObjectURL(blob))
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to download file')
    } finally {
      setDownloading(false)
    }
  }

  async function handleOpen() {
    setOpening(true)
    setError(null)
    try {
      const blob = await ensureBlob()
      const url = URL.createObjectURL(blob)
      const opened = window.open(url, '_blank', 'noopener,noreferrer')
      if (!opened) {
        URL.revokeObjectURL(url)
        throw new Error('Pop-up blocked. Please allow pop-ups or use Download.')
      }
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to open file')
    } finally {
      setOpening(false)
    }
  }

  return (
    <div className="max-w-md space-y-2">
      <div className="flex items-center gap-3 rounded-lg border border-gray-200 bg-[#f8f8f8] px-3 py-2.5 shadow-sm">
        <div
          className={cn(
            'flex h-11 w-11 shrink-0 items-center justify-center rounded-md text-[11px] font-bold uppercase',
            typeMeta.className
          )}
        >
          {isImage ? <ImageIcon className="h-5 w-5" strokeWidth={1.75} /> : typeMeta.badge}
        </div>

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-gray-900">{attachment.fileName}</p>
          <p className="text-xs text-gray-500">
            {typeMeta.label} · {formatFileSize(attachment.size)}
            {downloaded ? ' · Saved to your device' : ''}
          </p>
          {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
        </div>

        <div className="flex shrink-0 items-center gap-1">
          {downloaded && !isImage && (
            <button
              type="button"
              onClick={handleOpen}
              disabled={opening || downloading}
              title="Open file"
              className="inline-flex h-8 w-8 items-center justify-center rounded-md text-gray-600 transition-colors hover:bg-white hover:text-[#6264a7] disabled:opacity-50"
            >
              {opening ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ExternalLink className="h-4 w-4" strokeWidth={1.75} />
              )}
            </button>
          )}
          <button
            type="button"
            onClick={handleDownload}
            disabled={downloading || opening}
            title={downloaded ? 'Download again' : 'Download'}
            className={cn(
              'inline-flex h-8 items-center gap-1.5 rounded-md px-2.5 text-xs font-medium transition-colors disabled:opacity-50',
              downloaded
                ? 'text-gray-600 hover:bg-white hover:text-[#6264a7]'
                : 'bg-[#6264a7] text-white hover:bg-[#5558a0]'
            )}
          >
            {downloading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" strokeWidth={1.75} />
            )}
            {!downloaded && <span>Download</span>}
          </button>
        </div>
      </div>

      {isImage && downloaded && previewUrl && (
        <button
          type="button"
          onClick={handleOpen}
          className="block overflow-hidden rounded-lg border border-gray-200 bg-white text-left shadow-sm transition-shadow hover:shadow-md"
        >
          <img
            src={previewUrl}
            alt={attachment.fileName}
            className="max-h-56 max-w-full object-contain"
          />
        </button>
      )}

      {!isImage && downloaded && (
        <p className="flex items-center gap-1.5 text-xs text-gray-500">
          <FileText className="h-3.5 w-3.5" />
          Use the open icon to view this file, or download again to save another copy.
        </p>
      )}
    </div>
  )
}
