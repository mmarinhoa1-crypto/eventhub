import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import toast from 'react-hot-toast'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'

export default function RegistrarPage() {
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [nomeOrg, setNomeOrg] = useState('')
  const [loading, setLoading] = useState(false)
  const { registrar } = useAuth()
  const navigate = useNavigate()

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    try {
      await registrar(nome, email, senha, nomeOrg)
      toast.success('Conta criada com sucesso!')
      navigate('/', { replace: true })
    } catch (err) {
      toast.error(err.response?.data?.erro || 'Erro ao registrar')
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
          <p className="text-gray-400 mt-2">Crie sua conta</p>
        </div>
        <div className="bg-white rounded-xl shadow-xl border border-gray-200 p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input label="Seu nome" value={nome} onChange={(e) => setNome(e.target.value)} placeholder="João Silva" required />
            <Input label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="seu@email.com" required />
            <Input label="Senha" type="password" value={senha} onChange={(e) => setSenha(e.target.value)} placeholder="Mínimo 6 caracteres" minLength={6} required />
            <Input label="Nome da organização" value={nomeOrg} onChange={(e) => setNomeOrg(e.target.value)} placeholder="Minha Empresa" required />
            <Button type="submit" loading={loading} className="w-full">Registrar</Button>
          </form>
          <p className="mt-4 text-center text-sm text-gray-500">
            Já tem conta?{' '}
            <Link to="/entrar" className="text-indigo-600 hover:text-indigo-700 font-medium">Entrar</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
