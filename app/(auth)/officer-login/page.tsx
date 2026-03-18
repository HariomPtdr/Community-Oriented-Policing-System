'use client'
import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { signIn } from '@/lib/auth/login'
import Link from 'next/link'
import { Shield, BadgeCheck, Loader2 } from 'lucide-react'

function OfficerLoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const message = searchParams.get('message')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const result = await signIn(email, password)
      router.push(result.redirectTo)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#020617] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-600/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-900/10 rounded-full blur-[120px]" />
      </div>

      <div className="w-full max-w-md bg-[#0F172A] border border-blue-500/10 rounded-[2.5rem] p-8 md:p-10 shadow-2xl relative z-10 backdrop-blur-xl">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-blue-600/10 border border-blue-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-inner group">
            <Shield className="w-8 h-8 text-blue-500 group-hover:scale-110 transition-transform" />
          </div>
          <h1 className="text-2xl font-black text-white uppercase tracking-wider font-heading">Officer Login</h1>
          <p className="text-blue-400/60 text-[10px] font-black uppercase tracking-[0.3em] mt-2">Law Enforcement Portal</p>
        </div>

        {message && (
          <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-2xl p-4 mb-6 flex gap-3">
             <BadgeCheck className="w-5 h-5 text-emerald-500 shrink-0" />
             <p className="text-emerald-400 text-xs font-semibold">{message}</p>
          </div>
        )}

        {error && (
          <div className="bg-red-500/5 border border-red-500/20 rounded-2xl p-4 mb-6">
            <p className="text-red-400 text-xs font-semibold leading-relaxed">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-1.5 focus-within:translate-y-[-2px] transition-transform duration-300">
            <label className="text-[10px] font-black text-blue-500/50 uppercase tracking-widest ml-1">Work Email</label>
            <input
              type="email"
              placeholder="name@police.gov.in"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full bg-[#020617] border border-blue-500/10 rounded-2xl px-4 py-3.5 text-white placeholder:text-slate-700 outline-none focus:border-blue-500/30 transition-all font-medium"
              required
            />
          </div>

          <div className="space-y-1.5 focus-within:translate-y-[-2px] transition-transform duration-300">
            <label className="text-[10px] font-black text-blue-500/50 uppercase tracking-widest ml-1">Secure Password</label>
            <input
              type="password"
              placeholder="••••••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full bg-[#020617] border border-blue-500/10 rounded-2xl px-4 py-3.5 text-white placeholder:text-slate-700 outline-none focus:border-blue-500/30 transition-all font-medium"
              required
            />
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-black uppercase tracking-widest text-xs py-4 rounded-2xl transition-all shadow-xl shadow-blue-900/20 active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2 mt-2"
          >
            {loading ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Verifying Credentials...</>
            ) : (
              'Enter Command Center'
            )}
          </button>

          <div className="flex items-center justify-between text-[11px] font-bold px-1 mt-4">
            <Link href="/reset-password" title="Recover account" className="text-slate-500 hover:text-blue-400 transition-colors">Forgot password?</Link>
            <Link href="/officer-signup" className="text-blue-500 hover:underline">Officer Signup</Link>
          </div>
        </form>

        <div className="mt-10 pt-8 border-t border-white/5 text-center">
          <p className="text-[10px] text-slate-600 uppercase tracking-wider font-bold mb-4">Are you a Citizen?</p>
          <div className="flex items-center gap-3 justify-center">
            <Link href="/login" className="px-4 py-2 bg-slate-800/50 hover:bg-slate-800 rounded-xl text-slate-400 text-[10px] font-bold uppercase tracking-wider transition-all">Citizen Login</Link>
            <Link href="/signup" className="px-4 py-2 bg-slate-800/50 hover:bg-slate-800 rounded-xl text-slate-400 text-[10px] font-bold uppercase tracking-wider transition-all">Citizen Signup</Link>
          </div>
        </div>
      </div>
      
      <div className="absolute bottom-6 left-0 w-full text-center">
        <p className="text-[10px] text-slate-700 font-bold uppercase tracking-[0.2em]">Authorized Personnel Only • IP Logged</p>
      </div>
    </div>
  )
}

export default function OfficerLoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#020617] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    }>
      <OfficerLoginForm />
    </Suspense>
  )
}
