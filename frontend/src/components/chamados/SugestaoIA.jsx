import { useState } from 'react'
import { Sparkles } from 'lucide-react'
import api from '../../api/client'
import Button from '../ui/Button'

export default function SugestaoIA({ chamadoId, onUsar }) {
  const [sugestao, setSugestao] = useState('')
  const [loading, setLoading] = useState(false)

  async function obterSugestao() {
    setLoading(true)
    try {
      const { data } = await api.post('/ia/sugerir', { idChamado: chamadoId })
      setSugestao(data.sugestao)
    } catch {
      setSugestao('Erro ao obter sugestão.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-2">
      <Button variant="secondary" size="sm" onClick={obterSugestao} loading={loading}>
        <Sparkles size={16} />
        Sugestão IA
      </Button>
      {sugestao && (
        <div className="bg-violet-50 dark:bg-violet-500/10 border border-violet-200 dark:border-violet-500/30 rounded-lg p-3">
          <p className="text-sm text-purple-900 dark:text-purple-300 whitespace-pre-wrap">{sugestao}</p>
          <button
            onClick={() => onUsar(sugestao)}
            className="mt-2 text-xs text-violet-600 dark:text-violet-400 hover:text-purple-900 dark:hover:text-purple-300 font-medium"
          >
            Usar esta resposta
          </button>
        </div>
      )}
    </div>
  )
}
