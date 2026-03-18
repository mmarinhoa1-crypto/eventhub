import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import toast from 'react-hot-toast'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [loading, setLoading] = useState(false)
  const { entrar } = useAuth()
  const navigate = useNavigate()

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    try {
      await entrar(email, senha)
      toast.success('Bem-vindo de volta!')
      navigate('/', { replace: true })
    } catch (err) {
      toast.error(err.response?.data?.erro || 'Erro ao entrar')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-gray-900 to-indigo-950 dark:from-[#0d0d10] dark:via-[#131316] dark:to-[#0d0d10] flex items-center justify-center px-4 transition-colors duration-300">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-24 h-24 mx-auto mb-4">
            <img src="/logo.png" alt="Logo" className="w-full h-full object-contain drop-shadow-lg" />
          </div>
          <h1 className="text-3xl font-bold text-white">314</h1>
          <p className="text-gray-400 mt-2">Entre na sua conta</p>
        </div>
        <div className="bg-white dark:bg-white/5 dark:backdrop-blur-2xl dark:border dark:border-white/10 rounded-xl shadow-xl border border-gray-200 p-6 transition-colors duration-300">
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="seu@email.com" required />
            <Input label="Senha" type="password" value={senha} onChange={(e) => setSenha(e.target.value)} placeholder="Sua senha" required />
            <Button type="submit" loading={loading} className="w-full">Entrar</Button>
          </form>
          <p className="mt-4 text-center text-sm text-gray-500">
            Não tem conta?{' '}
            <Link to="/registrar" className="text-indigo-600 hover:text-indigo-700 font-medium">Registrar</Link>
          </p>
          {import.meta.env.DEV && (
            <button
              type="button"
              onClick={() => { setEmail('dev@dev.com'); setSenha('dev') }}
              className="mt-3 w-full text-xs text-gray-400 hover:text-gray-600 border border-dashed border-gray-200 rounded-lg py-2 transition"
            >
              Preencher credenciais dev
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
