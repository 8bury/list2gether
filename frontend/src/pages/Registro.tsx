import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { register } from '../services/auth'

export default function RegistroPage() {
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    setIsSubmitting(true)
    try {
      const res = await register({ username: username.trim(), email: email.trim(), password })
      setSuccess(res.message || 'Registro concluído. Você já pode fazer login.')
      setTimeout(() => navigate('/login'), 1000)
    } catch (err) {
      const message = (err as any)?.payload?.error || (err as Error).message || 'Falha no registro'
      setError(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-black px-6">
      <div className="auth-card">
        <h1 className="auth-title">Criar conta</h1>
        {error && <div className="auth-error">{error}</div>}
        {success && <div className="auth-success">{success}</div>}
        <form onSubmit={handleSubmit} className="auth-form">
          <label className="auth-label">
            Usuário
            <input
              className="auth-input"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="seu_nome"
              required
              autoComplete="username"
            />
          </label>
          <label className="auth-label">
            Email
            <input
              className="auth-input"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu@email.com"
              required
              autoComplete="email"
            />
          </label>
          <label className="auth-label">
            Senha
            <input
              className="auth-input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              autoComplete="new-password"
            />
          </label>
          <button className="auth-button" type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Registrando…' : 'Criar conta'}
          </button>
        </form>
        <p className="auth-footnote">
          Já tem conta? <Link className="underline" to="/login">Entrar</Link>
        </p>
      </div>
    </div>
  )
}


