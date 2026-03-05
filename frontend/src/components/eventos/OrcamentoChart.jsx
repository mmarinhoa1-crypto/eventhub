import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

const COLORS = {
  Estrutura: '#3b82f6',
  Artistico: '#8b5cf6',
  Seguranca: '#ef4444',
  'Alimentacao/Bebidas': '#f97316',
  Marketing: '#eab308',
  'Impostos/Taxas': '#6b7280',
  'Equipe/Staff': '#22c55e',
  Outros: '#9ca3af',
}

export default function OrcamentoChart({ porCentro }) {
  if (!porCentro || Object.keys(porCentro).length === 0) {
    return <p className="text-sm text-gray-400 text-center py-8">Sem dados para exibir</p>
  }

  const data = Object.entries(porCentro).map(([nome, info]) => ({
    nome,
    total: Number(info.total) || 0,
    quantidade: info.quantidade || 0,
  }))

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis dataKey="nome" tick={{ fontSize: 12 }} angle={-20} textAnchor="end" height={60} />
        <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `R$${v.toLocaleString('pt-BR')}`} />
        <Tooltip
          formatter={(value) => [`R$ ${Number(value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 'Total']}
        />
        <Bar dataKey="total" fill="#3b82f6" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}
