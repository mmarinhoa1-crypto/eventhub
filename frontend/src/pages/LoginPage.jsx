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
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-gray-900 to-indigo-950 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-16 h-16 logo-gradient rounded-2xl flex items-center justify-center text-white font-bold text-xs shadow-lg mx-auto mb-4">314</div>
          <h1 className="text-3xl font-bold text-white">314</h1>
          <p className="text-gray-400 mt-2">Entre na sua conta</p>
        </div>
        <div className="bg-white rounded-xl shadow-xl border border-gray-200 p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="seu@email.com" required />
            <Input label="Senha" type="password" value={senha} onChange={(e) => setSenha(e.target.value)} placeholder="Sua senha" required />
            <Button type="submit" loading={loading} className="w-full">Entrar</Button>
          </form>
          <p className="mt-4 text-center text-sm text-gray-500">
            Não tem conta?{' '}
            <Link to="/registrar" className="text-indigo-600 hover:text-indigo-700 font-medium">Registrar</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
