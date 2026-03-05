import { useState } from 'react'
import { Wine } from 'lucide-react'
import DashboardConsumo from '../components/consumo/DashboardConsumo'
import ProdutosConsumo from '../components/consumo/ProdutosConsumo'
import RegistrosConsumo from '../components/consumo/RegistrosConsumo'
import GerarPedido from '../components/consumo/GerarPedido'

const subTabs = [
  { key: 'dashboard', label: 'Dashboard' },
  { key: 'produtos', label: 'Produtos' },
  { key: 'registros', label: 'Registros' },
  { key: 'pedidos', label: 'Gerar Pedido' },
]

export default function ConsumoPage() {
  const [activeTab, setActiveTab] = useState('dashboard')

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-blue-100 rounded-xl">
          <Wine size={24} className="text-blue-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Consumo de Bebidas</h1>
          <p className="text-sm text-gray-500">Analise de consumo e geração de pedidos automáticos</p>
        </div>
      </div>

      <div className="border-b border-gray-200">
        <div className="flex gap-6">
          {subTabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.key
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {activeTab === 'dashboard' && <DashboardConsumo />}
      {activeTab === 'produtos' && <ProdutosConsumo />}
      {activeTab === 'registros' && <RegistrosConsumo />}
      {activeTab === 'pedidos' && <GerarPedido />}
    </div>
  )
}
