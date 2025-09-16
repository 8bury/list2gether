import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { login } from '../services/auth'
import postersImg from '../assets/poster_background.png'

export default function LoginPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsSubmitting(true)
    try {
      const res = await login(email.trim(), password)
      localStorage.setItem('access_token', res.access_token)
      localStorage.setItem('refresh_token', res.refresh_token)
      localStorage.setItem('user', JSON.stringify(res.user))
      navigate('/home')
    } catch (err) {
      const message = (err as any)?.payload?.error || (err as Error).message || 'Falha no login'
      setError(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="relative min-h-screen w-full bg-black text-white">
      <img src={postersImg} alt="" className="absolute inset-0 h-full w-full object-cover opacity-60" />
      <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/70 to-black"></div>
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,0.08),rgba(0,0,0,0)_40%)]"></div>

      <div className="relative flex min-h-screen items-center justify-center px-6">
        <a
          href="/"
          className="absolute left-6 top-6 inline-flex items-center gap-2 rounded-lg border border-white/10 bg-black/60 px-3 py-1.5 text-sm no-underline hover:bg-black/70 focus:outline-none focus:ring-2 focus:ring-white/40"
        >
          ← Voltar
        </a>
        <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white/5 p-8 backdrop-blur-xl shadow-lg shadow-white/10">
          <div className="text-center">
            <h1 className="text-xl font-semibold tracking-tight">List2gether</h1>
          </div>

          {error && (
            <div className="mt-4 rounded-lg border border-red-800 bg-red-950/60 px-3 py-2 text-red-200">{error}</div>
          )}

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <label className="block text-sm text-gray-300">
              Email
              <input
                className="mt-1 w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-white placeholder-gray-400 outline-none focus:ring-2 focus:ring-white/40"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="username@gmail.com"
                required
                autoComplete="email"
              />
            </label>

            <label className="block text-sm text-gray-300">
              Password
              <input
                className="mt-1 w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-white placeholder-gray-400 outline-none focus:ring-2 focus:ring-white/40"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                required
                autoComplete="current-password"
              />
            </label>

            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-400"></span>
              <button type="button" className="text-sm text-gray-300 underline underline-offset-2 hover:opacity-80">
                Forgot Password?
              </button>
            </div>

            <button
              className="mt-2 w-full rounded-lg border border-white bg-white px-4 py-2.5 font-semibold text-black hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-70"
              type="submit"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-gray-300">
            Don't have an account yet? <Link className="underline" to="/registro">Register for free</Link>
          </p>
        </div>
      </div>
    </div>
  )
}


