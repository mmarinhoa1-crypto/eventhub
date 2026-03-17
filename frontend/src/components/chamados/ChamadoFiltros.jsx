import { Search } from 'lucide-react'

export default function ChamadoFiltros({ filtros, onChange }) {
  function set(key, value) {
    onChange({ ...filtros, [key]: value })
  }

  return (
    <div className="flex flex-wrap gap-3">
      <div className="relative flex-1 min-w-[200px]">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="Buscar por cliente ou tópico..."
          value={filtros.busca}
          onChange={(e) => set('busca', e.target.value)}
          className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>
      <select
        value={filtros.status}
        onChange={(e) => set('status', e.target.value)}
        className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
      >
        <option value="">Todos os status</option>
        <option value="novo">Novo</option>
        <option value="respondido">Respondido</option>
        <option value="resolvido">Resolvido</option>
        <option value="fechado">Fechado</option>
      </select>
      <select
        value={filtros.prioridade}
        onChange={(e) => set('prioridade', e.target.value)}
        className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
      >
        <option value="">Todas prioridades</option>
        <option value="baixa">Baixa</option>
        <option value="media">Média</option>
        <option value="alta">Alta</option>
      </select>
    </div>
  )
}
