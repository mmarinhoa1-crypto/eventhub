import { useState, useEffect, useRef } from 'react'
import { useParams } from 'react-router-dom'

const API = '/api/public/comprovante'

export default function ComprovantePage() {
  const { token } = useParams()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [confirmando, setConfirmando] = useState(false)
  const [resultado, setResultado] = useState(null)
  const [erro, setErro] = useState(null)
  const [undoSeg, setUndoSeg] = useState(0)
  const undoTimer = useRef(null)

  // Campos editaveis
  const [valor, setValor] = useState('')
  const [descricao, setDescricao] = useState('')
  const [quantidade, setQuantidade] = useState(1)
  const [categoria, setCategoria] = useState('')
  const [fontePag, setFontePag] = useState('')
  const [contas, setContas] = useState([])

  // Criar nova conta
  const [criandoConta, setCriandoConta] = useState(false)
  const [novaContaNome, setNovaContaNome] = useState('')
  const [novaContaTitular, setNovaContaTitular] = useState('')
  const [salvandoConta, setSalvandoConta] = useState(false)

  const carregar = () => {
    setLoading(true)
    fetch(`${API}/${token}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.erro) setErro(d.erro)
        else {
          setData(d)
          const dd = d.dados || {}
          setValor(parseFloat(dd.valor) || 0)
          setDescricao(dd.descricao || '')
          setQuantidade(parseInt(dd.quantidade) || 1)
          setCategoria(dd.centro_custo || 'Outros')
          setFontePag(dd.fonte_pagamento || '')
          setContas(d.contas || [])
          if (d.status !== 'pendente' && d.undo_seg_restantes > 0) {
            setResultado({ acao: d.confirmed_ref_type || 'ignorar', podeDesfazer: true })
            setUndoSeg(d.undo_seg_restantes)
          } else if (d.status !== 'pendente') {
            setResultado({ jaFeito: d.status })
          }
        }
      })
      .catch((e) => setErro('Erro ao carregar: ' + e.message))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    carregar()
    return () => undoTimer.current && clearInterval(undoTimer.current)
  }, [token])

  useEffect(() => {
    if (undoSeg > 0) {
      undoTimer.current = setInterval(() => {
        setUndoSeg((s) => {
          if (s <= 1) {
            clearInterval(undoTimer.current)
            setResultado((r) => (r ? { ...r, podeDesfazer: false } : r))
            return 0
          }
          return s - 1
        })
      }, 1000)
      return () => clearInterval(undoTimer.current)
    }
  }, [undoSeg > 0])

  const confirmar = async (acao) => {
    setConfirmando(true)
    setErro(null)
    try {
      const body = {
        acao,
        categoria: acao === 'despesa' ? categoria : null,
        valor: parseFloat(valor) || 0,
        descricao,
        quantidade: parseInt(quantidade) || 1,
        fonte_pagamento: fontePag,
      }
      const r = await fetch(`${API}/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const d = await r.json()
      if (d.erro) {
        setErro(d.erro)
        if (d.status) setResultado({ jaFeito: d.status })
      } else {
        setResultado({ acao: d.acao, categoria: body.categoria, podeDesfazer: true })
        setUndoSeg(5 * 60)
      }
    } catch (e) {
      setErro('Erro ao confirmar: ' + e.message)
    } finally {
      setConfirmando(false)
    }
  }

  const desfazer = async () => {
    setConfirmando(true)
    setErro(null)
    try {
      const r = await fetch(`${API}/${token}/desfazer`, { method: 'POST' })
      const d = await r.json()
      if (d.erro) setErro(d.erro)
      else {
        setResultado(null)
        setUndoSeg(0)
        carregar()
      }
    } catch (e) {
      setErro('Erro ao desfazer: ' + e.message)
    } finally {
      setConfirmando(false)
    }
  }

  const criarConta = async () => {
    if (!novaContaNome.trim()) {
      setErro('Informe o nome da conta')
      return
    }
    setSalvandoConta(true)
    setErro(null)
    try {
      const r = await fetch(`${API}/${token}/criar-conta`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome: novaContaNome, titular: novaContaTitular }),
      })
      const d = await r.json()
      if (d.erro) {
        setErro(d.erro)
      } else {
        const nova = { id: d.id, nome: d.nome, titular: d.titular, tipo: d.tipo }
        setContas((prev) => [...prev, nova].sort((a, b) => a.nome.localeCompare(b.nome)))
        setFontePag(d.nome)
        setCriandoConta(false)
        setNovaContaNome('')
        setNovaContaTitular('')
      }
    } catch (e) {
      setErro('Erro ao criar conta: ' + e.message)
    } finally {
      setSalvandoConta(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-gray-500">Carregando...</div>
      </div>
    )
  }

  if (erro && !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="bg-white rounded-xl shadow p-6 max-w-md text-center">
          <div className="text-5xl mb-3">⚠️</div>
          <div className="text-lg font-semibold text-gray-800 mb-2">Erro</div>
          <div className="text-gray-600">{erro}</div>
        </div>
      </div>
    )
  }

  if (data?.status === 'expirado') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="bg-white rounded-xl shadow p-6 max-w-md text-center">
          <div className="text-5xl mb-3">⏰</div>
          <div className="text-lg font-semibold text-gray-800 mb-2">Link expirado</div>
          <div className="text-gray-600">Este comprovante expirou (&gt;7 dias).</div>
        </div>
      </div>
    )
  }

  if (resultado) {
    const msg = {
      despesa: '✅ Despesa registrada',
      receita: '💰 Receita registrada',
      ignorar: '❌ Comprovante ignorado',
    }
    const mm = Math.floor(undoSeg / 60)
    const ss = String(undoSeg % 60).padStart(2, '0')
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="bg-white rounded-xl shadow p-6 max-w-md text-center w-full">
          <div className="text-5xl mb-3">
            {resultado.jaFeito ? '⚠️' : resultado.acao === 'ignorar' ? '❌' : '✅'}
          </div>
          <div className="text-lg font-semibold text-gray-800 mb-2">
            {resultado.jaFeito ? `Ja foi ${resultado.jaFeito}` : msg[resultado.acao] || 'Feito'}
          </div>
          {resultado.categoria && (
            <div className="text-gray-600 mb-2">Categoria: {resultado.categoria}</div>
          )}
          {resultado.podeDesfazer && undoSeg > 0 && (
            <>
              <button
                disabled={confirmando}
                onClick={desfazer}
                className="mt-4 w-full bg-orange-500 hover:bg-orange-600 text-white rounded-xl p-3 font-medium disabled:opacity-50"
              >
                ↩ Desfazer ({mm}:{ss})
              </button>
              <div className="text-xs text-gray-400 mt-2">
                Voce pode desfazer por mais {mm}:{ss}
              </div>
            </>
          )}
          {erro && <div className="mt-3 text-red-600 text-sm">{erro}</div>}
          <div className="text-sm text-gray-400 mt-4">Pode fechar esta pagina.</div>
        </div>
      </div>
    )
  }

  const isPdf = data.comprovante_url?.endsWith('.pdf')

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-md mx-auto">
        <div className="bg-white rounded-xl shadow overflow-hidden mb-3">
          {data.comprovante_url && !isPdf && (
            <img
              src={data.comprovante_url}
              alt="Comprovante"
              className="w-full max-h-80 object-contain bg-gray-100"
            />
          )}
          {isPdf && (
            <div className="bg-gray-100 p-4 text-center">
              <div className="text-4xl mb-2">📄</div>
              <a
                href={data.comprovante_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 underline text-sm"
              >
                Abrir PDF
              </a>
            </div>
          )}
          <div className="p-5 space-y-3">
            <div className="text-sm text-gray-500">
              {data.evento_nome} · {data.remetente}
            </div>

            <div>
              <label className="text-xs text-gray-500">Valor (R$)</label>
              <input
                type="number"
                step="0.01"
                value={valor}
                onChange={(e) => setValor(e.target.value)}
                className="w-full text-2xl font-bold p-2 rounded border border-gray-200 focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="text-xs text-gray-500">Descricao</label>
              <input
                type="text"
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                className="w-full p-2 rounded border border-gray-200 focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="text-xs text-gray-500">Quantidade</label>
              <input
                type="number"
                min="1"
                value={quantidade}
                onChange={(e) => setQuantidade(e.target.value)}
                className="w-full p-2 rounded border border-gray-200 focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="text-xs text-gray-500">Categoria</label>
              <select
                value={categoria}
                onChange={(e) => setCategoria(e.target.value)}
                className="w-full p-2 rounded border border-gray-200 focus:border-blue-500 focus:outline-none bg-white"
              >
                {data.categorias?.map((c) => (
                  <option key={c.nome} value={c.nome}>
                    {c.emoji} {c.nome}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs text-gray-500">Pago por</label>
              <select
                value={criandoConta ? '__nova__' : fontePag}
                onChange={(e) => {
                  if (e.target.value === '__nova__') {
                    setCriandoConta(true)
                  } else {
                    setCriandoConta(false)
                    setFontePag(e.target.value)
                  }
                }}
                className="w-full p-2 rounded border border-gray-200 focus:border-blue-500 focus:outline-none bg-white"
              >
                <option value="">-- Nenhuma --</option>
                {contas?.map((c) => (
                  <option key={c.id} value={c.nome}>
                    {c.nome}
                    {c.titular ? ` (${c.titular})` : ''}
                  </option>
                ))}
                <option value="__nova__">➕ Criar nova conta</option>
              </select>
            </div>

            {criandoConta && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 space-y-2">
                <div className="text-xs font-medium text-blue-900">Nova conta</div>
                <input
                  type="text"
                  placeholder="Nome da conta (ex: Nubank PJ)"
                  value={novaContaNome}
                  onChange={(e) => setNovaContaNome(e.target.value)}
                  className="w-full p-2 rounded border border-gray-200 focus:border-blue-500 focus:outline-none"
                />
                <input
                  type="text"
                  placeholder="Titular (opcional)"
                  value={novaContaTitular}
                  onChange={(e) => setNovaContaTitular(e.target.value)}
                  className="w-full p-2 rounded border border-gray-200 focus:border-blue-500 focus:outline-none"
                />
                <div className="flex gap-2">
                  <button
                    disabled={salvandoConta}
                    onClick={criarConta}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg py-2 text-sm font-medium disabled:opacity-50"
                  >
                    {salvandoConta ? 'Salvando...' : 'Salvar conta'}
                  </button>
                  <button
                    disabled={salvandoConta}
                    onClick={() => {
                      setCriandoConta(false)
                      setNovaContaNome('')
                      setNovaContaTitular('')
                    }}
                    className="px-3 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg py-2 text-sm disabled:opacity-50"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {erro && (
          <div className="bg-red-50 text-red-700 rounded-lg p-3 mb-3 text-sm">{erro}</div>
        )}

        <div className="space-y-2">
          <button
            disabled={confirmando}
            onClick={() => confirmar('despesa')}
            className="w-full bg-green-600 hover:bg-green-700 text-white rounded-xl p-4 font-semibold text-lg disabled:opacity-50"
          >
            ✅ Despesa ({categoria})
          </button>
          <button
            disabled={confirmando}
            onClick={() => confirmar('receita')}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-xl p-4 font-semibold text-lg disabled:opacity-50"
          >
            💰 Receita
          </button>
          <button
            disabled={confirmando}
            onClick={() => confirmar('ignorar')}
            className="w-full bg-white border border-red-300 hover:bg-red-50 text-red-600 rounded-xl p-4 font-semibold disabled:opacity-50"
          >
            ❌ Nao registrar
          </button>
        </div>
      </div>
    </div>
  )
}
