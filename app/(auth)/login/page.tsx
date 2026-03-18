'use client'
import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { signIn } from '@/lib/auth/login'
import Link from 'next/link'
import { Shield } from 'lucide-react'

function LoginForm() {
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
    <div className="min-h-screen bg-[#0B0F1A] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-[#111827] rounded-2xl p-8 border border-[#1F2D42]">
        <div className="flex items-center gap-2 mb-6">
          <Shield className="w-6 h-6 text-orange-500" />
          <div>
            <h1 className="text-2xl font-bold text-white font-heading">Sign In</h1>
            <p className="text-gray-400 text-sm">COPS Platform — Community Policing</p>
          </div>
        </div>

        {message && (
          <p className="text-green-400 text-sm bg-green-900/20 p-3 rounded-xl mb-4">{message}</p>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="email"
            placeholder="Email Address"
            value={email}
            onChange={e => setEmail(e.target.value)}
            className="cops-input"
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            className="cops-input"
            required
          />

          {error && <p className="text-red-400 text-sm bg-red-900/20 p-3 rounded-xl">{error}</p>}

          <button type="submit" disabled={loading}
            className="w-full cops-btn-primary py-3 text-base">
            {loading ? 'Signing In...' : 'Sign In'}
          </button>

          <div className="flex flex-col gap-4 mt-6 pt-6 border-t border-[#1F2D42]">
            <div className="flex items-center justify-between text-sm">
              <Link href="/reset-password" title="Recover account" className="text-gray-400 hover:text-white">Forgot password?</Link>
              <Link href="/signup" className="text-orange-400 hover:underline font-bold">New Citizen? Register</Link>
            </div>
            
            <div className="bg-blue-500/5 border border-blue-500/10 rounded-xl p-3 flex items-center justify-between">
              <span className="text-[11px] text-blue-400/80 font-bold uppercase tracking-wider">Are you an Officer?</span>
              <Link href="/officer-login" className="text-[11px] bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded-lg font-black uppercase tracking-widest transition-all shadow-lg shadow-blue-900/20">
                Officer Portal
              </Link>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#0B0F1A] flex items-center justify-center">
        <p className="text-gray-400">Loading...</p>
      </div>
    }>
      <LoginForm />
    </Suspense>
  )
}
