import { useState } from 'react'
import { useAuth } from '../../hooks/useAuth'
import Modal from '../ui/Modal'
import Input from '../ui/Input'
import Button from '../ui/Button'
import api from '../../api/client'
import toast from 'react-hot-toast'

const funcoesPorPerfil = {
  admin: [
    { value: 'admin', label: 'Admin' },
    { value: 'agent', label: 'Agente' },
    { value: 'designer', label: 'Designer' },
    { value: 'social_media', label: 'Social Media' },
    { value: 'diretor', label: 'Diretor' },
    { value: 'gestor_trafego', label: 'Gestor de Tráfego' },
    { value: 'suporte', label: 'Suporte' },
    { value: 'viewer', label: 'Visualizador' },
  ],
  diretor: [
    { value: 'designer', label: 'Designer' },
    { value: 'social_media', label: 'Social Media' },
    { value: 'gestor_trafego', label: 'Gestor de Tráfego' },
  ],
}

export default function ConvidarModal({ open, onClose, onCreated }) {
  const { usuario } = useAuth()
  const funcao = usuario?.funcao || 'viewer'
  const opcoes = funcoesPorPerfil[funcao] || []
  const [form, setForm] = useState({ nome: '', email: '', senha: '', funcao: opcoes[0]?.value || 'agent', telefone_whatsapp: '' })
  const [loading, setLoading] = useState(false)

  function set(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    // Validacao do telefone (opcional). Se preenchido, deve ser 55 + DDD + numero.
    const telLimpo = String(form.telefone_whatsapp || '').replace(/\D/g, '')
    if (telLimpo && !/^55\d{10,11}$/.test(telLimpo)) {
      toast.error('WhatsApp inválido. Use 55 + DDD + número (ex: 5511987654321)')
      return
    }
    setLoading(true)
    try {
      await api.post('/equipe/convidar', { ...form, telefone_whatsapp: telLimpo })
      toast.success('Membro convidado!')
      setForm({ nome: '', email: '', senha: '', funcao: opcoes[0]?.value || 'agent', telefone_whatsapp: '' })
      onCreated()
      onClose()
    } catch (err) {
      toast.error(err.response?.data?.erro || 'Erro ao convidar')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Convidar Membro">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input label="Nome" value={form.nome} onChange={(e) => set('nome', e.target.value)} required />
        <Input label="Email" type="email" value={form.email} onChange={(e) => set('email', e.target.value)} required />
        <Input label="Senha" type="password" value={form.senha} onChange={(e) => set('senha', e.target.value)} minLength={6} required />
        <Input
          label="WhatsApp (opcional)"
          value={form.telefone_whatsapp}
          onChange={(e) => set('telefone_whatsapp', e.target.value)}
          placeholder="5511987654321"
        />
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Função</label>
          <select
            value={form.funcao}
            onChange={(e) => set('funcao', e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            {opcoes.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" type="button" onClick={onClose}>Cancelar</Button>
          <Button type="submit" loading={loading}>Convidar</Button>
        </div>
      </form>
    </Modal>
  )
}
