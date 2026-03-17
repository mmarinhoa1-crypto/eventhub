import { useState } from 'react'
import Button from '../ui/Button'

export default function AnotacaoForm({ onSubmit }) {
  const [texto, setTexto] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    if (!texto.trim()) return
    setLoading(true)
    try {
      await onSubmit(texto)
      setTexto('')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      <textarea
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        placeholder="Adicionar anotação interna..."
        rows={3}
        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
      />
      <Button type="submit" size="sm" loading={loading} disabled={!texto.trim()}>
        Salvar anotação
      </Button>
    </form>
  )
}
