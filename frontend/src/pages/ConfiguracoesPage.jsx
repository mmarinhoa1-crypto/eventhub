import { useState, useEffect } from 'react'
import { Save, RefreshCw } from 'lucide-react'
import api from '../api/client'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import LoadingSpinner from '../components/ui/LoadingSpinner'
import toast from 'react-hot-toast'

export default function ConfiguracoesPage() {
  const [loading, setLoading] = useState(true)
  const [carregandoGrupos, setCarregandoGrupos] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [org, setOrg] = useState(null)
  const [grupos, setGrupos] = useState([])
  const [jidSelecionado, setJidSelecionado] = useState('')

  function carregarConfig() {
    return api.get('/organizacao')
      .then(({ data }) => {
        setOrg(data)
        setJidSelecionado(data.jid_grupo_equipe || '')
      })
      .catch(() => toast.error('Erro ao carregar configurações'))
  }

  function carregarGrupos() {
    setCarregandoGrupos(true)
    return api.get('/whatsapp/grupos')
      .then(({ data }) => setGrupos(Array.isArray(data) ? data : []))
      .catch(() => toast.error('Erro ao carregar grupos do WhatsApp. Verifique se a instância está conectada.'))
      .finally(() => setCarregandoGrupos(false))
  }

  useEffect(() => {
    Promise.all([carregarConfig(), carregarGrupos()])
      .finally(() => setLoading(false))
  }, [])

  async function salvar() {
    setSalvando(true)
    try {
      await api.patch('/organizacao', { jid_grupo_equipe: jidSelecionado || null })
      toast.success('Grupo da equipe atualizado')
      await carregarConfig()
    } catch (err) {
      toast.error(err.response?.data?.erro || 'Erro ao salvar')
    } finally {
      setSalvando(false)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  const grupoAtual = grupos.find(g => g.id === org?.jid_grupo_equipe)
  const mudou = jidSelecionado !== (org?.jid_grupo_equipe || '')

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Configurações</h2>
      </div>

      <Card>
        <div className="p-4 space-y-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Notificações WhatsApp</h3>
            <p className="text-sm text-gray-600 mt-1">
              Selecione o grupo do WhatsApp da equipe que receberá os alertas automáticos de demandas
              (proximidade do horário e atraso).
            </p>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-sm font-medium text-gray-700">Grupo da equipe</label>
              <button
                onClick={carregarGrupos}
                disabled={carregandoGrupos}
                className="text-xs text-indigo-600 hover:text-indigo-800 flex items-center gap-1 disabled:opacity-50"
                title="Recarregar lista de grupos"
              >
                <RefreshCw size={12} className={carregandoGrupos ? 'animate-spin' : ''} />
                Atualizar lista
              </button>
            </div>
            <select
              value={jidSelecionado}
              onChange={(e) => setJidSelecionado(e.target.value)}
              disabled={carregandoGrupos}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              <option value="">— Nenhum grupo selecionado —</option>
              {grupos.map(g => (
                <option key={g.id} value={g.id}>
                  {g.nome || g.id}{g.participantes ? ` (${g.participantes} participantes)` : ''}
                </option>
              ))}
            </select>
            {grupos.length === 0 && !carregandoGrupos && (
              <p className="text-xs text-amber-600 mt-1">
                Nenhum grupo encontrado. A instância WhatsApp pode estar desconectada.
              </p>
            )}
            {grupoAtual && (
              <p className="text-xs text-gray-500 mt-2">
                <span className="font-medium">Selecionado atualmente:</span> {grupoAtual.nome || grupoAtual.id}
              </p>
            )}
          </div>

          <div className="flex justify-end pt-2">
            <Button onClick={salvar} disabled={!mudou || salvando} loading={salvando}>
              <Save size={16} />
              Salvar
            </Button>
          </div>
        </div>
      </Card>

      {org && (
        <Card>
          <div className="p-4 space-y-2 text-sm">
            <h3 className="text-lg font-semibold text-gray-900">Organização</h3>
            <div className="grid grid-cols-2 gap-2 text-gray-700">
              <div><span className="text-gray-500">Nome:</span> {org.nome}</div>
              <div><span className="text-gray-500">Plano:</span> {org.plano}</div>
              <div><span className="text-gray-500">Slug:</span> {org.slug}</div>
              <div><span className="text-gray-500">Instância WhatsApp:</span> {org.instancia_whatsapp || '—'}</div>
            </div>
          </div>
        </Card>
      )}
    </div>
  )
}
