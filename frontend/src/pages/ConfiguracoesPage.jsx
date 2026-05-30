import { useState, useEffect } from 'react'
import { Save, RefreshCw, Link2, Unlink, CheckCircle2 } from 'lucide-react'
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
  const [googleStatus, setGoogleStatus] = useState(null)
  const [googleAction, setGoogleAction] = useState(false)

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
    return api.get('/whatsapp/grupos-marketing')
      .then(({ data }) => setGrupos(Array.isArray(data) ? data : []))
      .catch(() => toast.error('Erro ao carregar grupos do WhatsApp. Verifique se a instância está conectada.'))
      .finally(() => setCarregandoGrupos(false))
  }

  function carregarGoogleStatus() {
    return api.get('/auth/google/status')
      .then(({ data }) => setGoogleStatus(data))
      .catch(() => { /* silencioso — se nao tem rota, ignora */ })
  }

  useEffect(() => {
    Promise.all([carregarConfig(), carregarGrupos(), carregarGoogleStatus()])
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('google') === 'connected') {
      toast.success('Conta Google conectada com sucesso!')
      window.history.replaceState({}, '', '/configuracoes')
      carregarGoogleStatus()
    } else if (params.get('google') === 'erro') {
      toast.error('Erro ao conectar Google: ' + (params.get('motivo') || 'desconhecido'))
      window.history.replaceState({}, '', '/configuracoes')
    }
  }, [])

  async function conectarGoogle() {
    setGoogleAction(true)
    try {
      const { data } = await api.post('/auth/google/start')
      window.location.href = data.url
    } catch (e) {
      toast.error(e.response?.data?.erro || 'Erro ao iniciar conexao Google')
      setGoogleAction(false)
    }
  }

  async function desconectarGoogle() {
    if (!confirm('Desconectar a conta Google? Eventos sem planilha vinculada deixarao de sincronizar ate reconectar.')) return
    setGoogleAction(true)
    try {
      await api.post('/auth/google/disconnect')
      toast.success('Conta Google desconectada')
      carregarGoogleStatus()
    } catch (e) {
      toast.error(e.response?.data?.erro || 'Erro ao desconectar')
    } finally {
      setGoogleAction(false)
    }
  }

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

      <Card>
        <div className="p-4 space-y-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white/90">📊 Google Sheets</h3>
            <p className="text-sm text-gray-600 dark:text-white/60 mt-1">
              Conecte sua conta Google para que o sistema crie e atualize automaticamente as planilhas financeiras dos eventos no seu Drive.
            </p>
          </div>

          {googleStatus?.connected ? (
            <div className="rounded-lg border border-green-200 dark:border-green-500/30 bg-green-50 dark:bg-green-500/10 p-3">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="text-green-600 dark:text-green-400 mt-0.5" size={18} />
                  <div>
                    <p className="text-sm font-medium text-green-900 dark:text-green-300">Conectado</p>
                    <p className="text-xs text-green-700 dark:text-green-400/90">
                      Conta: <strong>{googleStatus.email || '(email não disponível)'}</strong>
                    </p>
                    {googleStatus.connected_at && (
                      <p className="text-[11px] text-green-700/80 dark:text-green-400/70">
                        desde {new Date(googleStatus.connected_at).toLocaleString('pt-BR')}
                      </p>
                    )}
                  </div>
                </div>
                <button
                  onClick={desconectarGoogle}
                  disabled={googleAction}
                  className="text-xs text-red-600 dark:text-red-400 hover:underline disabled:opacity-50 flex items-center gap-1"
                >
                  <Unlink size={12} /> Desconectar
                </button>
              </div>
            </div>
          ) : (
            <div className="rounded-lg border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/[0.03] p-3">
              <p className="text-sm text-gray-700 dark:text-white/80 mb-3">
                Nenhuma conta Google conectada. As planilhas dos eventos não serão criadas/atualizadas automaticamente.
              </p>
              <button
                onClick={conectarGoogle}
                disabled={googleAction || !googleStatus?.oauth_configured}
                className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white text-sm font-medium flex items-center gap-2"
              >
                <Link2 size={14} />
                {googleAction ? 'Abrindo...' : 'Conectar conta Google'}
              </button>
              {googleStatus && !googleStatus.oauth_configured && (
                <p className="text-xs text-amber-600 dark:text-amber-400 mt-2">
                  ⚠ OAuth não configurado no servidor (variáveis GOOGLE_OAUTH_CLIENT_ID/SECRET ausentes).
                </p>
              )}
            </div>
          )}

          {googleStatus && !googleStatus.template_configured && (
            <p className="text-xs text-amber-600 dark:text-amber-400">
              ⚠ Template de planilha não configurado no servidor (GOOGLE_SHEETS_TEMPLATE_ID).
              Avise o administrador.
            </p>
          )}
        </div>
      </Card>

      {org && (
        <Card>
          <div className="p-4 space-y-2 text-sm">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white/90">Organização</h3>
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
