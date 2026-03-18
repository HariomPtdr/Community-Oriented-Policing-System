'use client'

import { Download, Eye, Lock, Loader2, Info } from 'lucide-react'
import { useState } from 'react'
import { downloadFIRDocument } from '@/app/citizen/my-reports/[incidentId]/actions'

export function FIRDocumentCard({ incident, firDocument }: { incident: any; firDocument: any }) {
  const [downloading, setDownloading] = useState(false)
  const hasFirNumber = !!incident.fir_number

  const handleDownload = async () => {
    setDownloading(true)
    try {
      const result = await downloadFIRDocument(incident.id)
      if ('signedUrl' in result && result.signedUrl) {
        window.open(result.signedUrl, '_blank')
      } else if ('generating' in result) {
        alert('FIR document is being generated. Please try again in a few moments.')
      } else if ('locked' in result) {
        alert('FIR number has not been assigned yet.')
      } else if ('error' in result) {
        alert(result.error)
      }
    } catch { alert('Download failed') }
    setDownloading(false)
  }

  return (
    <div className="bg-[#111827] border border-[#1F2D42] rounded-xl p-5">
      <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
        <Download className="w-3.5 h-3.5 text-green-400" /> FIR Document
      </h4>

      {!hasFirNumber ? (
        <div className="bg-[#0D1420] rounded-xl p-5 text-center">
          <div className="w-10 h-10 rounded-full bg-gray-500/10 border border-gray-500/20 flex items-center justify-center mx-auto mb-3">
            <Lock className="w-5 h-5 text-gray-600" />
          </div>
          <p className="text-xs text-gray-400 font-medium">FIR Document Locked</p>
          <p className="text-[10px] text-gray-600 mt-1">Available after FIR number is assigned</p>
          <p className="text-[10px] text-blue-400/50 mt-2 italic">Expected: 1-3 business days after submission</p>
        </div>
      ) : firDocument ? (
        <div className="space-y-3">
          <div className="bg-[#0D1420] rounded-xl p-4">
            <p className="text-sm text-white font-mono font-semibold">FIR No. {incident.fir_number}</p>
            <div className="flex items-center gap-3 mt-2 text-[10px] text-gray-500">
              <span>Generated: {new Date(firDocument.generated_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
              {firDocument.file_size_bytes && <span>{(firDocument.file_size_bytes / 1024).toFixed(0)} KB</span>}
              <span>v{firDocument.version}</span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button onClick={handleDownload} disabled={downloading} className="flex items-center justify-center gap-2 text-xs font-medium text-green-400 bg-green-500/10 border border-green-500/20 rounded-xl px-3 py-2.5 hover:bg-green-500/15 transition-all disabled:opacity-50">
              {downloading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
              Download
            </button>
            <button onClick={handleDownload} disabled={downloading} className="flex items-center justify-center gap-2 text-xs font-medium text-blue-400 bg-blue-500/10 border border-blue-500/20 rounded-xl px-3 py-2.5 hover:bg-blue-500/15 transition-all disabled:opacity-50">
              <Eye className="w-3.5 h-3.5" /> Preview
            </button>
          </div>
          <div className="flex items-start gap-2 p-2.5 bg-blue-500/5 rounded-lg border border-blue-500/10">
            <Info className="w-3.5 h-3.5 text-blue-400 flex-shrink-0 mt-0.5" />
            <p className="text-[10px] text-blue-400/70">This is a digital copy for reference. For court/legal purposes, obtain a certified copy from your station.</p>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="bg-[#0D1420] rounded-xl p-4">
            <p className="text-sm text-white font-mono font-semibold">FIR No. {incident.fir_number}</p>
            <p className="text-[10px] text-gray-500 mt-1">Document not yet generated</p>
          </div>
          <button onClick={handleDownload} disabled={downloading} className="w-full flex items-center justify-center gap-2 text-xs font-medium text-green-400 bg-green-500/10 border border-green-500/20 rounded-xl px-3 py-2.5 hover:bg-green-500/15 transition-all">
            {downloading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
            Download FIR Copy
          </button>
        </div>
      )}
    </div>
  )
}
