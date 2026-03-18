import { useState, useEffect, useRef } from 'react'
import { Send } from 'lucide-react'
import api from '../../api/client'
import toast from 'react-hot-toast'
import MensagemBolha from './MensagemBolha'
import SugestaoIA from './SugestaoIA'
import AnotacaoForm from './AnotacaoForm'
import StatusBadge from '../ui/StatusBadge'
import Button from '../ui/Button'
import Card from '../ui/Card'
import LoadingSpinner from '../ui/LoadingSpinner'
import { format, parseISO, isValid } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export default function ChamadoDetalhe({ chamadoId }) {
  const [chamado, setChamado] = useState(null)
  const [mensagens, setMensagens] = useState([])
  const [anotacoes, setAnotacoes] = useState([])
  const [resposta, setResposta] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [loading, setLoading] = useState(true)
  const chatEndRef = useRef(null)

  function scrollToBottom() {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  async function carregarDados() {
    try {
      const [chRes, msgRes, notRes] = await Promise.all([
        api.get('/chamados'),
        api.get(`/chamados/${chamadoId}/mensagens`),
        api.get(`/chamados/${chamadoId}/anotacoes`),
      ])
      const ch = (Array.isArray(chRes.data) ? chRes.data : []).find((c) => c.id === Number(chamadoId))
      setChamado(ch || null)
      setMensagens(Array.isArray(msgRes.data) ? msgRes.data : [])
      setAnotacoes(Array.isArray(notRes.data) ? notRes.data : [])
    } catch {
      // erro tratado silenciosamente
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    carregarDados()
  }, [chamadoId])

  useEffect(() => {
    scrollToBottom()
  }, [mensagens])

  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const { data } = await api.get(`/chamados/${chamadoId}/mensagens`)
        setMensagens(data)
      } catch {}
    }, 12000)
    return () => clearInterval(interval)
  }, [chamadoId])

  async function enviarResposta(e) {
    e.preventDefault()
    if (!resposta.trim()) return
    setEnviando(true)
    try {
      await api.post(`/chamados/${chamadoId}/responder`, { texto: resposta })
      setResposta('')
      const { data } = await api.get(`/chamados/${chamadoId}/mensagens`)
      setMensagens(data)
      toast.success('Mensagem enviada')
    } catch {
      toast.error('Erro ao enviar mensagem')
    } finally {
      setEnviando(false)
    }
  }

  async function atualizarChamado(campo, valor) {
    try {
      await api.patch(`/chamados/${chamadoId}`, { [campo]: valor })
      setChamado((prev) => ({ ...prev, [campo]: valor }))
      toast.success('Atualizado')
    } catch {
      toast.error('Erro ao atualizar')
    }
  }

  async function adicionarAnotacao(texto) {
    await api.post(`/chamados/${chamadoId}/anotacoes`, { content: texto })
    const { data } = await api.get(`/chamados/${chamadoId}/anotacoes`)
    setAnotacoes(data)
    toast.success('Anotação salva')
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (!chamado) {
    return <p className="text-gray-500">Chamado não encontrado</p>
  }

  return (
    <div className="flex gap-6 h-[calc(100vh-10rem)]">
      {/* Chat panel */}
      <div className="flex-[2] flex flex-col">
        <Card className="flex-1 flex flex-col overflow-hidden">
          {/* Header */}
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-gray-900">
                  #{chamado.id} - {chamado.nome_cliente}
                </h3>
                <p className="text-sm text-gray-500">{chamado.topico || 'Sem tópico'}</p>
              </div>
              <div className="flex items-center gap-3">
                <select
                  value={chamado.status}
                  onChange={(e) => atualizarChamado('status', e.target.value)}
                  className="text-sm border border-gray-300 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="novo">Novo</option>
                  <option value="respondido">Respondido</option>
                  <option value="resolvido">Resolvido</option>
                  <option value="fechado">Fechado</option>
                </select>
                <select
                  value={chamado.prioridade}
                  onChange={(e) => atualizarChamado('prioridade', e.target.value)}
                  className="text-sm border border-gray-300 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="baixa">Baixa</option>
                  <option value="media">Média</option>
                  <option value="alta">Alta</option>
                </select>
              </div>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4">
            {mensagens.map((m, i) => (
              <MensagemBolha key={i} mensagem={m} />
            ))}
            <div ref={chatEndRef} />
          </div>

          {/* Input */}
          <div className="p-4 border-t border-gray-200">
            <SugestaoIA chamadoId={chamadoId} onUsar={(t) => setResposta(t)} />
            <form onSubmit={enviarResposta} className="flex gap-2 mt-2">
              <input
                value={resposta}
                onChange={(e) => setResposta(e.target.value)}
                placeholder="Digite sua resposta..."
                className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <Button type="submit" loading={enviando} disabled={!resposta.trim()}>
                <Send size={16} />
              </Button>
            </form>
          </div>
        </Card>
      </div>

      {/* Annotations panel */}
      <div className="flex-1 flex flex-col">
        <Card className="flex-1 flex flex-col overflow-hidden">
          <div className="p-4 border-b border-gray-200">
            <h3 className="font-semibold text-gray-900">Anotações Internas</h3>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {anotacoes.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">Nenhuma anotação</p>
            ) : (
              anotacoes.map((a) => (
                <div key={a.id} className="bg-yellow-50 dark:bg-yellow-500/10 border border-yellow-200 dark:border-yellow-500/30 rounded-lg p-3">
                  <p className="text-sm text-gray-800 whitespace-pre-wrap">{a.texto}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    {a.hora && isValid(new Date(a.hora)) ? format(new Date(a.hora), "dd/MM/yyyy HH:mm", { locale: ptBR }) : (a.hora || '')}
                  </p>
                </div>
              ))
            )}
          </div>
          <div className="p-4 border-t border-gray-200">
            <AnotacaoForm onSubmit={adicionarAnotacao} />
          </div>
        </Card>
      </div>
    </div>
  )
}
