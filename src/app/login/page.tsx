'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Lock, Mail, Eye, EyeOff, LayoutGrid } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetch('/api/auth', { method: 'DELETE' }).catch(() => {})
  }, [])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || 'Login gagal. Cek kembali email & password.')
      router.push('/')
      router.refresh()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleQuickLogin = (roleEmail: string) => {
    setEmail(roleEmail)
    setPassword('sjkitchen123')
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-[#F5F5F7] px-4 select-none relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[360px] bg-gradient-to-b from-[#007AFF]/6 to-transparent rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-[380px] z-10">
        {/* Brand */}
        <div className="flex flex-col items-center mb-8 text-center">
          <div className="h-14 w-14 rounded-[18px] bg-[#007AFF] flex items-center justify-center shadow-[0_8px_24px_rgba(0,122,255,0.28)] mb-5">
            <LayoutGrid className="h-7 w-7 text-white stroke-[2]" />
          </div>
          <h1 className="text-[22px] font-bold tracking-tight text-[#1D1D1F]">SJ Kitchen</h1>
          <p className="text-[13px] text-[#6E6E73] mt-1 font-medium">Affiliate Marketing CRM</p>
        </div>

        {/* Card */}
        <div className="bg-white border border-[#E5E5EA] rounded-[24px] p-6 shadow-[0_4px_24px_rgba(0,0,0,0.06)]">
          <form onSubmit={handleLogin} className="space-y-4">
            {error && (
              <div className="bg-[#FFF1F0] border border-[#FCA5A5] rounded-xl p-3 text-[12px] text-[#991B1B] font-medium fade-in">
                ⚠ {error}
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-[#6E6E73] uppercase tracking-wide block" htmlFor="email">
                Email
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-[#8E8E93] pointer-events-none">
                  <Mail className="h-4 w-4" />
                </span>
                <input
                  id="email"
                  type="email"
                  required
                  placeholder="nama@sjkitchen.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full h-11 pl-10 pr-4 bg-[#F5F5F7] border border-[#E5E5EA] rounded-xl text-[13px] text-[#1D1D1F] placeholder-[#C7C7CC] focus:outline-none focus:border-[#007AFF] focus:ring-2 focus:ring-[#007AFF]/12 transition-all"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-[#6E6E73] uppercase tracking-wide block" htmlFor="password">
                Password
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-[#8E8E93] pointer-events-none">
                  <Lock className="h-4 w-4" />
                </span>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full h-11 pl-10 pr-10 bg-[#F5F5F7] border border-[#E5E5EA] rounded-xl text-[13px] text-[#1D1D1F] placeholder-[#C7C7CC] focus:outline-none focus:border-[#007AFF] focus:ring-2 focus:ring-[#007AFF]/12 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-[#8E8E93] hover:text-[#1D1D1F] transition-colors cursor-pointer"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full h-11 bg-[#007AFF] hover:bg-[#0066D6] active:scale-[0.99] text-white font-semibold rounded-xl text-[13.5px] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:pointer-events-none mt-2 shadow-[0_4px_12px_rgba(0,122,255,0.25)]"
            >
              {loading ? (
                <div className="h-4 w-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              ) : 'Masuk ke CRM'}
            </button>
          </form>

          {/* Demo accounts */}
          <div className="mt-6 pt-5 border-t border-[#F2F2F7]">
            <p className="text-[10.5px] font-semibold text-[#8E8E93] mb-2.5 text-center uppercase tracking-wider">
              Akun Demo
            </p>
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: 'Dinda', email: 'dindavictoria1509@gmail.com' },
                { label: 'Intan', email: 'intan@sjkitchen.com' },
                { label: 'Staff', email: 'staff@sjkitchen.com' },
              ].map(acc => (
                <button
                  key={acc.email}
                  type="button"
                  onClick={() => handleQuickLogin(acc.email)}
                  className="py-2 text-center bg-[#F5F5F7] hover:bg-[#E8EED] active:scale-[0.97] border border-[#E5E5EA] rounded-[10px] text-[11px] font-semibold text-[#1D1D1F] transition-all cursor-pointer"
                >
                  {acc.label}
                </button>
              ))}
            </div>
            <p className="text-[10px] text-[#8E8E93] mt-2.5 text-center">
              Password: <span className="font-mono font-semibold text-[#6E6E73]">sjkitchen123</span>
            </p>
          </div>
        </div>

        <p className="text-center text-[11px] text-[#8E8E93] mt-5">
          &copy; {new Date().getFullYear()} SJ Kitchen · Enterprise CRM Suite
        </p>
      </div>
    </main>
  )
}
