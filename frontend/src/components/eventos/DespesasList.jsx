import DespesaRow from "./DespesaRow"

const columns = ['#', 'Valor', 'Fornecedor', 'Data', 'Descricao', 'Centro de Custo', 'Comprovante']

export default function DespesasList({ despesas, onUpdate }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200">
            {columns.map((col) => (
              <th key={col} className="px-4 py-3 text-left font-medium text-gray-500 uppercase tracking-wider text-xs">{col}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {despesas.length === 0 ? (
            <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">Nenhuma despesa registrada</td></tr>
          ) : (
            despesas.map((d) => <DespesaRow key={d.id} despesa={d} onUpdate={onUpdate} />)
          )}
        </tbody>
      </table>
    </div>
  )
}
