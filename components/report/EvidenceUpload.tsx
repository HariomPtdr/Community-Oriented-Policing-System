'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  Upload, X, FileText, Image as ImageIcon, Film, Loader2,
  CheckCircle, AlertCircle, Camera, Video, Paperclip,
  ZoomIn, Trash2, GripVertical, Eye, Shield, Info,
  ImagePlus, Mic, FileUp, Clock, Tag
} from 'lucide-react'

/* ── Types ─────────────────────────────────────────────────── */
interface Evidence {
  id: string
  file_name: string
  file_size: number
  mime_type: string
  public_url: string
  storage_path: string
  category: string
  description: string | null
  is_primary: boolean
  uploaded_at: string
  sort_order: number
}

interface EvidenceUploadProps {
  incidentId: string
  readOnly?: boolean
  onUploadComplete?: () => void
}

const CATEGORY_OPTIONS = [
  { value: 'property_photo', label: 'Property Photo', icon: Camera, color: 'text-blue-400' },
  { value: 'proof', label: 'ID / Proof', icon: Shield, color: 'text-green-400' },
  { value: 'screenshot', label: 'Screenshot', icon: ImageIcon, color: 'text-purple-400' },
  { value: 'transaction_receipt', label: 'Transaction Receipt', icon: FileText, color: 'text-amber-400' },
  { value: 'cctv_footage', label: 'CCTV Footage', icon: Video, color: 'text-red-400' },
  { value: 'other', label: 'Other', icon: Paperclip, color: 'text-gray-400' },
]

const MAX_FILE_SIZE = 50 * 1024 * 1024 // 50 MB
const ALLOWED_TYPES = [
  'image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/gif',
  'video/mp4', 'video/quicktime', 'video/webm', 'video/3gpp',
  'application/pdf', 'audio/mpeg', 'audio/ogg', 'audio/wav',
]

/* ── Helpers ───────────────────────────────────────────────── */
function formatSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}

function getFileIcon(mimeType: string) {
  if (mimeType.startsWith('image/')) return { Icon: ImageIcon, color: 'text-blue-400', bg: 'bg-blue-500/10', label: 'Image' }
  if (mimeType.startsWith('video/')) return { Icon: Film, color: 'text-red-400', bg: 'bg-red-500/10', label: 'Video' }
  if (mimeType === 'application/pdf') return { Icon: FileText, color: 'text-amber-400', bg: 'bg-amber-500/10', label: 'PDF' }
  if (mimeType.startsWith('audio/')) return { Icon: Mic, color: 'text-purple-400', bg: 'bg-purple-500/10', label: 'Audio' }
  return { Icon: FileUp, color: 'text-gray-400', bg: 'bg-gray-500/10', label: 'File' }
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

function detectCategory(file: File): string {
  const name = file.name.toLowerCase()
  if (name.includes('receipt') || name.includes('transaction') || name.includes('payment')) return 'transaction_receipt'
  if (name.includes('screenshot') || name.includes('screen')) return 'screenshot'
  if (name.includes('cctv') || name.includes('footage') || name.includes('camera')) return 'cctv_footage'
  if (name.includes('id') || name.includes('proof') || name.includes('aadhaar') || name.includes('pan')) return 'proof'
  if (file.type.startsWith('image/')) return 'property_photo'
  return 'other'
}

/* ── Component ─────────────────────────────────────────────── */
export function EvidenceUpload({ incidentId, readOnly = false, onUploadComplete }: EvidenceUploadProps) {
  const supabase = createClient()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [evidence, setEvidence] = useState<Evidence[]>([])
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({})
  const [error, setError] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editDescription, setEditDescription] = useState('')
  const [editCategory, setEditCategory] = useState('')

  // ── Load evidence ──────────────────────────────────────────
  const loadEvidence = useCallback(async () => {
    const { data } = await supabase
      .from('incident_evidence')
      .select('*')
      .eq('incident_id', incidentId)
      .order('sort_order', { ascending: true })
      .order('uploaded_at', { ascending: false })

    if (data) setEvidence(data)
  }, [incidentId])

  useEffect(() => { loadEvidence() }, [loadEvidence])

  // ── File validation ────────────────────────────────────────
  const validateFile = (file: File): string | null => {
    if (file.size > MAX_FILE_SIZE) return `${file.name} exceeds 50 MB limit.`
    if (!ALLOWED_TYPES.some(t => file.type.startsWith(t.split('/')[0]) || file.type === t)) {
      return `${file.name} is not a supported file type.`
    }
    return null
  }

  // ── Upload handler ─────────────────────────────────────────
  const handleUpload = async (files: FileList | File[]) => {
    const fileArray = Array.from(files)
    if (fileArray.length === 0) return

    // Validate all files first
    const errors: string[] = []
    fileArray.forEach(f => {
      const err = validateFile(f)
      if (err) errors.push(err)
    })
    if (errors.length > 0) {
      setError(errors.join(' '))
      return
    }

    setUploading(true)
    setError(null)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('You must be logged in to upload evidence.')

      const uploadResults: string[] = []

      for (let i = 0; i < fileArray.length; i++) {
        const file = fileArray[i]
        const fileId = `upload-${Date.now()}-${i}`
        setUploadProgress(prev => ({ ...prev, [fileId]: 0 }))

        const fileExt = file.name.split('.').pop()?.toLowerCase() || 'bin'
        const uniqueName = `${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${fileExt}`
        const filePath = `evidence/${incidentId}/${uniqueName}`

        // Simulate progress
        const progressInterval = setInterval(() => {
          setUploadProgress(prev => ({
            ...prev,
            [fileId]: Math.min((prev[fileId] || 0) + Math.random() * 20, 90)
          }))
        }, 200)

        // Upload to storage
        const { error: uploadError } = await supabase.storage
          .from('incident-evidence')
          .upload(filePath, file, { cacheControl: '3600', upsert: false })

        clearInterval(progressInterval)
        setUploadProgress(prev => ({ ...prev, [fileId]: 100 }))

        if (uploadError) throw uploadError

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from('incident-evidence')
          .getPublicUrl(filePath)

        // Auto-detect category
        const autoCategory = detectCategory(file)

        // Save metadata
        const { error: dbError } = await supabase
          .from('incident_evidence')
          .insert({
            incident_id: incidentId,
            uploaded_by: user.id,
            storage_path: filePath,
            public_url: publicUrl,
            file_name: file.name,
            file_size: file.size,
            mime_type: file.type,
            category: autoCategory,
            sort_order: evidence.length + i,
            is_primary: evidence.length === 0 && i === 0,
          })

        if (dbError) throw dbError
        uploadResults.push(file.name)
      }

      // Clear progress after a beat
      setTimeout(() => setUploadProgress({}), 800)
      await loadEvidence()
      if (onUploadComplete) onUploadComplete()
    } catch (err: any) {
      setError(err.message || 'Upload failed. Please try again.')
    } finally {
      setUploading(false)
    }
  }

  // ── Input change ──────────────────────────────────────────
  const onFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) handleUpload(e.target.files)
    e.target.value = '' // reset for re-upload
  }

  // ── Drag & Drop ───────────────────────────────────────────
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    if (e.dataTransfer.files) handleUpload(e.dataTransfer.files)
  }

  // ── Remove evidence ──────────────────────────────────────
  const removeEvidence = async (id: string, path: string) => {
    setDeletingId(id)
    try {
      await supabase.storage.from('incident-evidence').remove([path])
      await supabase.from('incident_evidence').delete().eq('id', id)
      setEvidence(prev => prev.filter(e => e.id !== id))
    } catch (err: any) {
      setError('Failed to delete evidence.')
    } finally {
      setDeletingId(null)
    }
  }

  // ── Update evidence metadata ──────────────────────────────
  const saveEdit = async (id: string) => {
    await supabase
      .from('incident_evidence')
      .update({ description: editDescription, category: editCategory })
      .eq('id', id)
    setEditingId(null)
    await loadEvidence()
  }

  // ── Set as primary ────────────────────────────────────────
  const setPrimary = async (id: string) => {
    // Unset all first
    await supabase.from('incident_evidence')
      .update({ is_primary: false })
      .eq('incident_id', incidentId)
    // Set the one
    await supabase.from('incident_evidence')
      .update({ is_primary: true })
      .eq('id', id)
    await loadEvidence()
  }

  // Stats
  const totalSize = evidence.reduce((sum, e) => sum + e.file_size, 0)
  const imageCount = evidence.filter(e => e.mime_type.startsWith('image/')).length
  const videoCount = evidence.filter(e => e.mime_type.startsWith('video/')).length
  const otherCount = evidence.length - imageCount - videoCount

  return (
    <div className="space-y-5">

      {/* ── Stats Bar ─────────────────────────────────────────── */}
      {evidence.length > 0 && (
        <div className="grid grid-cols-4 gap-2">
          {[
            { label: 'Total Files', value: evidence.length, icon: Paperclip, color: 'text-orange-400', bg: 'bg-orange-500/10' },
            { label: 'Photos', value: imageCount, icon: Camera, color: 'text-blue-400', bg: 'bg-blue-500/10' },
            { label: 'Videos', value: videoCount, icon: Video, color: 'text-red-400', bg: 'bg-red-500/10' },
            { label: 'Total Size', value: formatSize(totalSize), icon: FileUp, color: 'text-gray-400', bg: 'bg-gray-500/10' },
          ].map(s => (
            <div key={s.label} className="bg-[#0D1420] border border-[#1F2D42]/50 rounded-xl p-2.5 flex items-center gap-2">
              <div className={`w-7 h-7 rounded-lg ${s.bg} flex items-center justify-center flex-shrink-0`}>
                <s.icon className={`w-3.5 h-3.5 ${s.color}`} />
              </div>
              <div className="min-w-0">
                <p className={`text-sm font-bold font-mono ${s.color}`}>{s.value}</p>
                <p className="text-[8px] text-gray-600 uppercase tracking-widest font-bold">{s.label}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Evidence Grid ─────────────────────────────────────── */}
      {evidence.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {evidence.map((item, index) => {
            const fileInfo = getFileIcon(item.mime_type)
            const categoryInfo = CATEGORY_OPTIONS.find(c => c.value === item.category)
            const isEditing = editingId === item.id

            return (
              <div
                key={item.id}
                className={`group relative bg-[#0D1420] border rounded-2xl overflow-hidden transition-all duration-300 ${
                  item.is_primary
                    ? 'border-orange-500/40 shadow-lg shadow-orange-500/5 ring-1 ring-orange-500/20'
                    : 'border-[#1F2D42] hover:border-[#2a3a52]'
                }`}
              >
                {/* Primary badge */}
                {item.is_primary && (
                  <div className="absolute top-2 left-2 z-20 bg-orange-500 text-black text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md shadow-lg">
                    Primary
                  </div>
                )}

                {/* File number */}
                <div className="absolute top-2 right-2 z-20 bg-black/60 backdrop-blur-sm text-gray-300 text-[9px] font-mono px-1.5 py-0.5 rounded-md">
                  #{index + 1}
                </div>

                {/* Preview area */}
                <div
                  className="aspect-[4/3] bg-[#080D15] flex items-center justify-center overflow-hidden cursor-pointer relative"
                  onClick={() => item.mime_type.startsWith('image/') ? setPreviewUrl(item.public_url) : window.open(item.public_url, '_blank')}
                >
                  {item.mime_type.startsWith('image/') ? (
                    <>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={item.public_url}
                        alt={item.file_name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                        <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center">
                          <ZoomIn className="w-5 h-5 text-white" />
                        </div>
                      </div>
                    </>
                  ) : item.mime_type.startsWith('video/') ? (
                    <div className="flex flex-col items-center gap-3 relative">
                      <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
                        <Film className="w-8 h-8 text-red-400" />
                      </div>
                      <span className="text-[9px] text-gray-500 uppercase tracking-[0.2em] font-black">Video Clip</span>
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="w-10 h-10 rounded-full bg-red-500/20 backdrop-blur-md flex items-center justify-center border border-red-500/30">
                          <Eye className="w-5 h-5 text-red-400" />
                        </div>
                      </div>
                    </div>
                  ) : item.mime_type === 'application/pdf' ? (
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                        <FileText className="w-8 h-8 text-amber-400" />
                      </div>
                      <span className="text-[9px] text-gray-500 uppercase tracking-[0.2em] font-black">PDF Document</span>
                    </div>
                  ) : item.mime_type.startsWith('audio/') ? (
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-16 h-16 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
                        <Mic className="w-8 h-8 text-purple-400" />
                      </div>
                      <span className="text-[9px] text-gray-500 uppercase tracking-[0.2em] font-black">Audio Recording</span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-3">
                      <div className={`w-16 h-16 rounded-2xl ${fileInfo.bg} border border-[#1F2D42] flex items-center justify-center`}>
                        <fileInfo.Icon className={`w-8 h-8 ${fileInfo.color}`} />
                      </div>
                      <span className="text-[9px] text-gray-500 uppercase tracking-[0.2em] font-black">{fileInfo.label}</span>
                    </div>
                  )}
                </div>

                {/* Info bar */}
                <div className="p-3 space-y-2 border-t border-[#1F2D42]/40">
                  {/* File name + size */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] text-white font-medium truncate leading-tight">{item.file_name}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[9px] text-gray-600 font-mono">{formatSize(item.file_size)}</span>
                        <span className="text-[9px] text-gray-700">•</span>
                        <span className="text-[9px] text-gray-600 flex items-center gap-0.5">
                          <Clock className="w-2.5 h-2.5" /> {timeAgo(item.uploaded_at)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Category tag */}
                  {categoryInfo && (
                    <div className="flex items-center gap-1.5">
                      <Tag className="w-2.5 h-2.5 text-gray-600" />
                      <span className={`text-[9px] font-bold uppercase tracking-wider ${categoryInfo.color}`}>{categoryInfo.label}</span>
                    </div>
                  )}

                  {/* Description */}
                  {item.description && !isEditing && (
                    <p className="text-[10px] text-gray-400 leading-relaxed bg-[#111827] rounded-lg px-2.5 py-1.5 border border-[#1F2D42]/30">
                      {item.description}
                    </p>
                  )}

                  {/* Edit mode */}
                  {isEditing && (
                    <div className="space-y-2">
                      <input
                        type="text"
                        value={editDescription}
                        onChange={(e) => setEditDescription(e.target.value)}
                        placeholder="Describe this evidence..."
                        className="w-full text-[11px] bg-[#111827] border border-[#1F2D42] rounded-lg px-2.5 py-2 text-white placeholder:text-gray-600 focus:border-orange-500/40 focus:outline-none transition-colors"
                      />
                      <select
                        value={editCategory}
                        onChange={(e) => setEditCategory(e.target.value)}
                        className="w-full text-[11px] bg-[#111827] border border-[#1F2D42] rounded-lg px-2.5 py-2 text-white focus:border-orange-500/40 focus:outline-none transition-colors"
                      >
                        {CATEGORY_OPTIONS.map(c => (
                          <option key={c.value} value={c.value}>{c.label}</option>
                        ))}
                      </select>
                      <div className="flex gap-1.5">
                        <button
                          onClick={() => saveEdit(item.id)}
                          className="flex-1 text-[10px] font-bold bg-orange-500 text-black py-1.5 rounded-lg hover:bg-orange-400 transition-colors"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          className="flex-1 text-[10px] font-bold bg-[#1F2D42] text-gray-300 py-1.5 rounded-lg hover:bg-[#2a3a52] transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Action buttons */}
                  {!readOnly && !isEditing && (
                    <div className="flex items-center gap-1.5 pt-1">
                      <button
                        onClick={() => {
                          setEditingId(item.id)
                          setEditDescription(item.description || '')
                          setEditCategory(item.category)
                        }}
                        className="flex-1 text-[9px] font-bold text-gray-400 hover:text-orange-400 bg-[#111827] border border-[#1F2D42]/50 rounded-lg py-1.5 flex items-center justify-center gap-1 transition-all hover:border-orange-500/20"
                      >
                        <FileText className="w-2.5 h-2.5" /> Edit
                      </button>
                      {!item.is_primary && (
                        <button
                          onClick={() => setPrimary(item.id)}
                          className="flex-1 text-[9px] font-bold text-gray-400 hover:text-amber-400 bg-[#111827] border border-[#1F2D42]/50 rounded-lg py-1.5 flex items-center justify-center gap-1 transition-all hover:border-amber-500/20"
                        >
                          <CheckCircle className="w-2.5 h-2.5" /> Primary
                        </button>
                      )}
                      <button
                        onClick={() => removeEvidence(item.id, item.storage_path)}
                        disabled={deletingId === item.id}
                        className="text-[9px] font-bold text-gray-400 hover:text-red-400 bg-[#111827] border border-[#1F2D42]/50 rounded-lg py-1.5 px-3 flex items-center justify-center gap-1 transition-all hover:border-red-500/20 hover:bg-red-500/5 disabled:opacity-40"
                      >
                        {deletingId === item.id ? (
                          <Loader2 className="w-2.5 h-2.5 animate-spin" />
                        ) : (
                          <Trash2 className="w-2.5 h-2.5" />
                        )}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ── Upload Progress ───────────────────────────────────── */}
      {Object.keys(uploadProgress).length > 0 && (
        <div className="space-y-2">
          {Object.entries(uploadProgress).map(([id, progress]) => (
            <div key={id} className="bg-[#0D1420] border border-[#1F2D42] rounded-xl p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] text-gray-400 font-medium">Uploading evidence...</span>
                <span className="text-[10px] text-orange-400 font-bold font-mono">{Math.round(progress)}%</span>
              </div>
              <div className="w-full h-1.5 bg-[#1F2D42] rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-orange-500 to-amber-400 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Upload Zone ───────────────────────────────────────── */}
      {!readOnly && (
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          className={`relative rounded-2xl border-2 border-dashed transition-all duration-300 ${
            dragOver
              ? 'border-orange-500 bg-orange-500/10 scale-[1.02]'
              : uploading
                ? 'border-orange-500/20 bg-[#0D1420]/50'
                : 'border-[#1F2D42] bg-[#0D1420] hover:border-orange-500/40 hover:bg-orange-500/5'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            multiple
            accept="image/*,video/*,application/pdf,audio/*"
            onChange={onFileInputChange}
            disabled={uploading}
          />

          <div
            className="flex flex-col items-center justify-center py-10 px-6 cursor-pointer"
            onClick={() => fileInputRef.current?.click()}
          >
            {uploading ? (
              <>
                <Loader2 className="w-10 h-10 text-orange-500 animate-spin mb-4" />
                <p className="text-sm text-white font-semibold">Processing files...</p>
                <p className="text-[10px] text-gray-500 mt-1">This may take a moment for large files</p>
              </>
            ) : dragOver ? (
              <>
                <div className="w-16 h-16 rounded-2xl bg-orange-500/20 border border-orange-500/30 flex items-center justify-center mb-4 animate-bounce">
                  <Upload className="w-8 h-8 text-orange-400" />
                </div>
                <p className="text-sm text-orange-400 font-bold">Drop files here</p>
              </>
            ) : (
              <>
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-orange-500/15 to-amber-500/5 border border-orange-500/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <ImagePlus className="w-8 h-8 text-orange-400" />
                </div>
                <p className="text-sm text-white font-semibold">Upload Evidence Files</p>
                <p className="text-[11px] text-gray-500 mt-1.5 text-center max-w-xs">
                  Drag and drop or click to browse. Supports photos, videos, PDFs, and audio recordings.
                </p>

                {/* Quick upload type buttons */}
                <div className="flex items-center gap-2 mt-4">
                  {[
                    { icon: Camera, label: 'Photo', color: 'text-blue-400', border: 'border-blue-500/20 hover:border-blue-500/40' },
                    { icon: Film, label: 'Video', color: 'text-red-400', border: 'border-red-500/20 hover:border-red-500/40' },
                    { icon: FileText, label: 'PDF', color: 'text-amber-400', border: 'border-amber-500/20 hover:border-amber-500/40' },
                    { icon: Mic, label: 'Audio', color: 'text-purple-400', border: 'border-purple-500/20 hover:border-purple-500/40' },
                  ].map(t => (
                    <div key={t.label} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#111827] border ${t.border} transition-all`}>
                      <t.icon className={`w-3 h-3 ${t.color}`} />
                      <span className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">{t.label}</span>
                    </div>
                  ))}
                </div>

                <p className="text-[9px] text-gray-700 mt-3 flex items-center gap-1">
                  <Info className="w-3 h-3" /> Max 50 MB per file • Auto-categorization enabled
                </p>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── Error Toast ──────────────────────────────────────── */}
      {error && (
        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-2.5 animate-in fade-in duration-300">
          <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-xs text-red-400 font-medium">{error}</p>
          </div>
          <button onClick={() => setError(null)} className="text-red-400/60 hover:text-red-400 transition-colors flex-shrink-0">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* ── Summary Footer ───────────────────────────────────── */}
      {evidence.length > 0 && (
        <div className="flex items-center justify-between p-3.5 bg-gradient-to-r from-green-500/5 to-emerald-500/5 border border-green-500/15 rounded-xl">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-green-500/15 flex items-center justify-center">
              <CheckCircle className="w-4 h-4 text-green-400" />
            </div>
            <div>
              <p className="text-[11px] text-white font-medium">
                <span className="text-green-400 font-bold">{evidence.length}</span> evidence file{evidence.length !== 1 ? 's' : ''} uploaded
              </p>
              <p className="text-[9px] text-gray-500">Total: {formatSize(totalSize)} • {imageCount} photo{imageCount !== 1 ? 's' : ''}, {videoCount} video{videoCount !== 1 ? 's' : ''}{otherCount > 0 ? `, ${otherCount} other` : ''}</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-[9px] text-green-400/60">
            <Shield className="w-3 h-3" />
            <span className="font-bold uppercase tracking-wider">Encrypted</span>
          </div>
        </div>
      )}

      {/* ── Image Preview Lightbox ────────────────────────────── */}
      {previewUrl && (
        <div
          className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-xl flex items-center justify-center p-4 cursor-pointer animate-in fade-in duration-200"
          onClick={() => setPreviewUrl(null)}
        >
          <button
            className="absolute top-6 right-6 w-10 h-10 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center text-white hover:bg-white/20 transition-all z-10"
            onClick={() => setPreviewUrl(null)}
          >
            <X className="w-5 h-5" />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={previewUrl}
            alt="Evidence preview"
            className="max-w-full max-h-[90vh] object-contain rounded-xl shadow-2xl animate-in zoom-in-95 duration-300"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  )
}
