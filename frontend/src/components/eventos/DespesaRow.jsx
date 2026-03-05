import api from "../../api/client"
import toast from "react-hot-toast"

const categorias = [
  'Artistico', 'Logistica/Camarim', 'Estrutura do Evento',
  'Divulgacao e Midia', 'Documentacao e Taxas', 'Operacional',
  'Bar', 'Alimentacao', 'Outros'
]

const catColors = {
  'Artistico': 'bg-blue-50 text-blue-700',
  'Logistica/Camarim': 'bg-blue-50 text-blue-700',
  'Estrutura do Evento': 'bg-blue-50 text-blue-700',
  'Divulgacao e Midia': 'bg-blue-50 text-blue-700',
  'Documentacao e Taxas': 'bg-blue-50 text-blue-700',
  'Operacional': 'bg-blue-50 text-blue-700',
  'Bar': 'bg-blue-50 text-blue-700',
  'Alimentacao': 'bg-blue-50 text-blue-700',
  'Outros': 'bg-blue-50 text-blue-700',
}

export default function DespesaRow({ despesa, onUpdate }) {
  async function mudarCategoria(novaCat) {
    try {
      await api.patch('/despesas/' + despesa.id, { centro_custo: novaCat })
      if (onUpdate) onUpdate(despesa.id, novaCat)
      toast.success('Categoria atualizada')
    } catch { toast.error('Erro ao atualizar') }
  }

  return (
    <tr className="border-b border-gray-100 hover:bg-gray-50">
      <td className="px-4 py-3 text-sm text-gray-500">#{despesa.id}</td>
      <td className="px-4 py-3 text-sm font-medium text-gray-900">
        R$ {Number(despesa.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
      </td>
      <td className="px-4 py-3 text-sm text-gray-700">{despesa.fornecedor || '-'}</td>
      <td className="px-4 py-3 text-sm text-gray-500">{despesa.data || '-'}</td>
      <td className="px-4 py-3 text-sm text-gray-600">{despesa.descricao || '-'}</td>
      <td className="px-4 py-3">
        <select value={despesa.centro_custo || 'Outros'} onChange={e => mudarCategoria(e.target.value)} className={'text-xs font-medium px-2 py-1 rounded-full border-0 cursor-pointer ' + (catColors[despesa.centro_custo] || catColors['Outros'])}>
          {categorias.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </td>
      <td className="px-4 py-3 text-center">
        {despesa.comprovante_url ? (
          <button onClick={() => window.open('/api' + despesa.comprovante_url, '_blank')} className="text-blue-500 hover:text-blue-700 transition text-lg" title="Ver comprovante">📎</button>
        ) : <span className="text-gray-200 text-xs">-</span>}
      </td>
    </tr>
  )
}
