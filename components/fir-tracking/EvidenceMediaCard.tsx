'use client'

import { Image as ImageIcon, FileText, Film, ExternalLink, Plus, Upload, Loader2, X } from 'lucide-react'
import { useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { addEvidenceToCase } from '@/app/citizen/my-reports/[incidentId]/actions'

export function EvidenceMediaCard({ evidence, canAdd, incidentId, onRefresh }: { evidence: any[]; canAdd: boolean; incidentId: string; onRefresh: () => void }) {
  const [showUpload, setShowUpload] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [category, setCategory] = useState('proof')
  const fileRef = useRef<HTMLInputElement>(null)

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const supabase = createClient()
      const path = `${incidentId}/${Date.now()}_${file.name}`
      const { error: uploadError } = await supabase.storage.from('incident-evidence').upload(path, file)
      if (uploadError) { alert('Upload failed: ' + uploadError.message); setUploading(false); return }
      await addEvidenceToCase(incidentId, path, file.name, file.size, file.type, category)
      setShowUpload(false)
      onRefresh()
    } catch { alert('Upload failed') }
    setUploading(false)
  }

  return (
    <div className="bg-[#111827] border border-[#1F2D42] rounded-xl p-5">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
          <ImageIcon className="w-3.5 h-3.5 text-orange-400" /> Evidence & Media
        </h4>
        <div className="flex items-center gap-2">
          {evidence.length > 0 && (
            <span className="text-[9px] bg-orange-500/10 text-orange-400 px-2 py-0.5 rounded-md font-bold border border-orange-500/20">
              {evidence.length} file{evidence.length !== 1 ? 's' : ''}
            </span>
          )}
          {canAdd && (
            <button onClick={() => setShowUpload(!showUpload)} className="text-[10px] text-orange-400 bg-orange-500/10 border border-orange-500/20 px-2 py-1 rounded-lg hover:bg-orange-500/15 transition-all flex items-center gap-1">
              <Plus className="w-3 h-3" /> Add
            </button>
          )}
        </div>
      </div>

      {/* Upload dialog */}
      {showUpload && (
        <div className="mb-3 p-3 bg-[#0D1420] rounded-xl border border-orange-500/20 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs text-white font-medium">Add Evidence</p>
            <button onClick={() => setShowUpload(false)} className="text-gray-500 hover:text-white"><X className="w-4 h-4" /></button>
          </div>
          <select value={category} onChange={e => setCategory(e.target.value)} className="w-full bg-[#111827] border border-[#1F2D42] rounded-lg px-3 py-2 text-xs text-white outline-none">
            <option value="property_photo">Property Photo</option>
            <option value="proof">Proof Document</option>
            <option value="screenshot">Screenshot</option>
            <option value="transaction_receipt">Transaction Receipt</option>
            <option value="cctv_footage">CCTV Footage</option>
            <option value="other">Other</option>
          </select>
          <input ref={fileRef} type="file" onChange={handleUpload} className="hidden" accept="image/*,application/pdf,video/*" />
          <button onClick={() => fileRef.current?.click()} disabled={uploading} className="w-full flex items-center justify-center gap-2 text-xs text-orange-400 bg-orange-500/10 border border-orange-500/20 rounded-lg py-2.5 hover:bg-orange-500/15 transition-all disabled:opacity-50">
            {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
            {uploading ? 'Uploading...' : 'Choose File'}
          </button>
        </div>
      )}

      {/* Evidence grid */}
      {evidence.length > 0 ? (
        <div className="grid grid-cols-2 gap-2">
          {evidence.map((ev: any) => (
            <a key={ev.id} href={ev.signedUrl || ev.public_url || '#'} target="_blank" rel="noopener noreferrer"
              className="group relative bg-[#0D1420] border border-[#1F2D42] rounded-xl overflow-hidden hover:border-orange-500/30 transition-all">
              <div className="aspect-square flex items-center justify-center overflow-hidden">
                {ev.mime_type?.startsWith('image/') ? (
                  <img src={ev.signedUrl || ev.public_url} alt={ev.file_name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                ) : ev.mime_type?.startsWith('video/') ? (
                  <div className="flex flex-col items-center gap-1.5">
                    <div className="w-8 h-8 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center">
                      <Film className="w-4 h-4 text-red-400" />
                    </div>
                    <span className="text-[8px] text-gray-600 uppercase font-black tracking-widest">Video</span>
                  </div>
                ) : ev.mime_type === 'application/pdf' ? (
                  <div className="flex flex-col items-center gap-1.5">
                    <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                      <FileText className="w-4 h-4 text-amber-400" />
                    </div>
                    <span className="text-[8px] text-gray-600 uppercase font-black tracking-widest">PDF</span>
                  </div>
                ) : (
                  <FileText className="w-5 h-5 text-blue-400" />
                )}
              </div>
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end justify-center pb-2">
                <div className="flex items-center gap-1">
                  <ExternalLink className="w-3 h-3 text-white" />
                  <span className="text-[9px] text-white font-bold">Open</span>
                </div>
              </div>
              <div className="absolute top-1.5 right-1.5 bg-black/60 backdrop-blur-sm text-gray-300 text-[7px] font-mono px-1.5 py-0.5 rounded">
                {ev.file_size > 1048576 ? `${(ev.file_size / 1048576).toFixed(1)} MB` : `${Math.round(ev.file_size / 1024)} KB`}
              </div>
              {ev.category && (
                <div className="absolute bottom-1.5 left-1.5 bg-black/60 backdrop-blur-sm text-gray-300 text-[7px] px-1.5 py-0.5 rounded capitalize">
                  {ev.category.replace(/_/g, ' ')}
                </div>
              )}
            </a>
          ))}
        </div>
      ) : (
        <div className="bg-[#0D1420] rounded-xl p-5 text-center border border-[#1F2D42]/50 border-dashed">
          <ImageIcon className="w-7 h-7 text-gray-800 mx-auto mb-2" />
          <p className="text-[10px] text-gray-600 font-bold uppercase tracking-wider">No Evidence Attached</p>
          {canAdd && <p className="text-[9px] text-gray-700 mt-0.5">Click "+ Add" above to attach evidence</p>}
        </div>
      )}
    </div>
  )
}
