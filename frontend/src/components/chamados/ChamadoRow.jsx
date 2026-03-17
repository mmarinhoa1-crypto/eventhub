import StatusBadge from '../ui/StatusBadge'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export default function ChamadoRow({ chamado, onClick }) {
  return (
    <tr
      onClick={() => onClick(chamado)}
      className="cursor-pointer hover:bg-gray-50 transition-colors border-b border-gray-100"
    >
      <td className="px-4 py-3 text-sm text-gray-500">#{chamado.id}</td>
      <td className="px-4 py-3 text-sm font-medium text-gray-900">{chamado.nome_cliente}</td>
      <td className="px-4 py-3 text-sm text-gray-600">{chamado.topico || '-'}</td>
      <td className="px-4 py-3"><StatusBadge value={chamado.status} /></td>
      <td className="px-4 py-3"><StatusBadge type="prioridade" value={chamado.prioridade} /></td>
      <td className="px-4 py-3 text-sm text-gray-500">
        {chamado.atualizado_em
          ? formatDistanceToNow(new Date(chamado.atualizado_em), { addSuffix: true, locale: ptBR })
          : '-'}
      </td>
    </tr>
  )
}
