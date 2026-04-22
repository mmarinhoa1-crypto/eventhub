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
  const [escolhendoCategoria, setEscolhendoCategoria] = useState(false)
  const [undoSeg, setUndoSeg] = useState(0)
  const undoTimer = useRef(null)

  // Campos editaveis
  const [valor, setValor] = useState('')
  const [descricao, setDescricao] = useState('')
  const [fornecedor, setFornecedor] = useState('')
  const [dataComp, setDataComp] = useState('')
  const [quantidade, setQuantidade] = useState(1)
  const [fontePag, setFontePag] = useState('')

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
          setFornecedor(dd.fornecedor || '')
          setDataComp(dd.data || '')
          setQuantidade(parseInt(dd.quantidade) || 1)
          setFontePag(dd.fonte_pagamento || '')
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

  const confirmar = async (acao, categoria = null) => {
    setConfirmando(true)
    setErro(null)
    try {
      const body = {
        acao,
        categoria,
        valor: parseFloat(valor) || 0,
        descricao,
        fornecedor,
        data: dataComp,
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
        setResultado({ acao: d.acao, categoria, podeDesfazer: true })
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

  const d = data.dados || {}
  const catSugerida = d.centro_custo || 'Outros'
  const isPdf = data.comprovante_url?.endsWith('.pdf')

  if (escolhendoCategoria) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-md mx-auto">
          <div className="bg-white rounded-xl shadow p-5 mb-3">
            <div className="text-sm text-gray-500 mb-1">Escolher categoria</div>
            <div className="text-xl font-semibold">
              R${' '}
              {(parseFloat(valor) || 0).toLocaleString('pt-BR', {
                minimumFractionDigits: 2,
              })}
            </div>
            <div className="text-sm text-gray-600">{descricao || ''}</div>
          </div>
          <div className="space-y-2">
            {data.categorias?.map((c) => (
              <button
                key={c.nome}
                disabled={confirmando}
                onClick={() => confirmar('despesa', c.nome)}
                className="w-full bg-white hover:bg-gray-100 rounded-xl shadow p-4 text-left flex items-center gap-3 disabled:opacity-50"
              >
                <span className="text-2xl">{c.emoji}</span>
                <span className="font-medium text-gray-800">{c.nome}</span>
              </button>
            ))}
          </div>
          <button
            disabled={confirmando}
            onClick={() => setEscolhendoCategoria(false)}
            className="w-full mt-3 text-gray-500 p-3"
          >
            Voltar
          </button>
        </div>
      </div>
    )
  }

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

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-gray-500">Fornecedor</label>
                <input
                  type="text"
                  value={fornecedor}
                  onChange={(e) => setFornecedor(e.target.value)}
                  className="w-full p-2 rounded border border-gray-200 focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500">Data</label>
                <input
                  type="text"
                  placeholder="DD/MM/AAAA"
                  value={dataComp}
                  onChange={(e) => setDataComp(e.target.value)}
                  className="w-full p-2 rounded border border-gray-200 focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
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
                <label className="text-xs text-gray-500">Pago por</label>
                <select
                  value={fontePag}
                  onChange={(e) => setFontePag(e.target.value)}
                  className="w-full p-2 rounded border border-gray-200 focus:border-blue-500 focus:outline-none bg-white"
                >
                  <option value="">-- Nenhuma --</option>
                  {data.contas?.map((c) => (
                    <option key={c.id} value={c.nome}>
                      {c.nome}
                      {c.titular ? ` (${c.titular})` : ''}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="text-sm text-gray-500">
              Categoria sugerida pela IA: <span className="font-medium">{catSugerida}</span>
            </div>
          </div>
        </div>

        {erro && (
          <div className="bg-red-50 text-red-700 rounded-lg p-3 mb-3 text-sm">{erro}</div>
        )}

        <div className="space-y-2">
          <button
            disabled={confirmando}
            onClick={() => confirmar('despesa', catSugerida)}
            className="w-full bg-green-600 hover:bg-green-700 text-white rounded-xl p-4 font-semibold text-lg disabled:opacity-50"
          >
            ✅ Despesa ({catSugerida})
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
            onClick={() => setEscolhendoCategoria(true)}
            className="w-full bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-xl p-4 font-semibold disabled:opacity-50"
          >
            📂 Mudar categoria
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
