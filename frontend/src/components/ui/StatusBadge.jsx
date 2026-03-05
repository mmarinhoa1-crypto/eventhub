import Badge from './Badge'

const statusMap = {
  novo: { label: 'Novo', variant: 'blue' },
  respondido: { label: 'Respondido', variant: 'yellow' },
  resolvido: { label: 'Resolvido', variant: 'green' },
  fechado: { label: 'Fechado', variant: 'gray' },
}

const prioridadeMap = {
  baixa: { label: 'Baixa', variant: 'gray' },
  media: { label: 'Média', variant: 'yellow' },
  alta: { label: 'Alta', variant: 'red' },
}

export default function StatusBadge({ type = 'status', value }) {
  const map = type === 'status' ? statusMap : prioridadeMap
  const config = map[value] || { label: value, variant: 'gray' }
  return <Badge variant={config.variant}>{config.label}</Badge>
}
