import ChamadoRow from './ChamadoRow'

const columns = ['#', 'Cliente', 'Tópico', 'Status', 'Prioridade', 'Atualizado']

export default function ChamadosList({ chamados, onSelect }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200">
            {columns.map((col) => (
              <th key={col} className="px-4 py-3 text-left font-medium text-gray-500 uppercase tracking-wider text-xs">
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {chamados.length === 0 ? (
            <tr>
              <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                Nenhum chamado encontrado
              </td>
            </tr>
          ) : (
            chamados.map((c) => (
              <ChamadoRow key={c.id} chamado={c} onClick={onSelect} />
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}
