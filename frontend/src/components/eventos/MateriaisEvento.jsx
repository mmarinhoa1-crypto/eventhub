import { useState, useEffect } from 'react'
import { FileText, Paperclip, X as XIcon, Download } from 'lucide-react'
import api from '../../api/client'
import toast from 'react-hot-toast'
import { useTema } from '../../contexts/ThemeContext'

const categorias = ['Presskit', 'Vídeos YouTube', 'Logo Realização', 'Fotos e Vídeos Artistas', 'Artes Referência', 'Logo Patrocinadores', 'Outros']
const catIcons = { 'Presskit': '📦', 'Vídeos YouTube': '🎬', 'Logo Realização': '🎨', 'Fotos e Vídeos Artistas': '📸', 'Artes Referência': '✨', 'Logo Patrocinadores': '🤝', 'Outros': '📁' }

export default function MateriaisEvento({ eventoId, eventoNome, readOnly = false }) {
  const { tema } = useTema()
  const isDark = tema === 'dark'
  const [arquivos, setArquivos] = useState([])
  const [loading, setLoading] = useState(true)

  function carregar() {
    api.get(`/eventos/${eventoId}/materiais-arquivos`)
      .then(r => setArquivos(r.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => { carregar() }, [eventoId])

  async function upload(categoria, file) {
    const toastId = toast.loading(`Enviando ${file.name}...`)
    try {
      const fd = new FormData()
      fd.append('arquivo', file)
      fd.append('categoria', categoria)
      await api.post(`/eventos/${eventoId}/materiais-arquivos`, fd, { timeout: 600000 })
      toast.success('Arquivo enviado!', { id: toastId })
      carregar()
    } catch (err) {
      toast.error('Erro: ' + (err.response?.data?.erro || err.message), { id: toastId })
    }
  }

  async function deletar(arqId) {
    try {
      await api.delete(`/arquivos/${arqId}`)
      setArquivos(prev => prev.filter(a => a.id !== arqId))
      toast.success('Arquivo removido')
    } catch { toast.error('Erro ao remover') }
  }

  if (loading) {
    return <div className="flex justify-center py-16"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent" /></div>
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 mb-2">
        <FileText size={20} className="text-accent" />
        <div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white/90">Materiais de Marketing</h3>
          <p className="text-xs text-gray-400 dark:text-white/40">{eventoNome} — Upload de presskit, vídeos, logos e referências</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {categorias.map((cat, idx) => {
        const arqsCat = arquivos.filter(a => a.categoria_material === cat)
        const isLast = idx === categorias.length - 1
        return (
          <div
            key={cat}
            className={'rounded-xl overflow-hidden' + (isLast ? ' md:col-start-2' : '')}
            style={{
              background: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(255,255,255,0.6)',
              border: isDark ? '1px solid rgba(255,255,255,0.06)' : '1px solid rgba(0,0,0,0.04)',
            }}
          >
            <div className="px-4 py-3">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-semibold text-gray-900 dark:text-white/80 text-sm flex items-center gap-2">
                  <span>{catIcons[cat] || '📁'}</span> {cat}
                  {arqsCat.length > 0 && <span className="text-[10px] font-bold text-gray-400 dark:text-white/30 bg-gray-100 dark:bg-white/[0.06] px-1.5 py-0.5 rounded-full">{arqsCat.length}</span>}
                </h4>
              </div>

              {arqsCat.length > 0 && (
                <div className="grid grid-cols-2 gap-2 mb-3">
                  {arqsCat.map(arq => {
                    const isImg = arq.tipo?.startsWith('image')
                    const isVideo = arq.tipo?.startsWith('video')
                    return (
                      <div key={arq.id} className="relative group rounded-xl border border-gray-200 dark:border-white/[0.06] overflow-hidden bg-white dark:bg-white/[0.03] hover:shadow-md transition">
                        {isImg ? (
                          <img src={'/api' + arq.url} className="w-full h-28 object-cover" />
                        ) : isVideo ? (
                          <div className="w-full h-28 bg-gray-900 dark:bg-black/40 flex items-center justify-center"><span className="text-3xl">🎬</span></div>
                        ) : (
                          <a href={'/api' + arq.url} download>
                            <div className="w-full h-28 bg-gray-50 dark:bg-white/[0.02] flex items-center justify-center"><FileText size={28} className="text-gray-300 dark:text-white/15" /></div>
                          </a>
                        )}
                        <div className="p-2">
                          <p className="text-[10px] font-medium text-gray-700 dark:text-white/60 truncate" title={arq.nome_original}>{arq.nome_original}</p>
                          <div className="flex items-center justify-between mt-1">
                            <span className="text-[9px] text-gray-400 dark:text-white/30">
                              {arq.enviado_nome || ''}{arq.tamanho ? ' · ' + (arq.tamanho > 1048576 ? (arq.tamanho / 1048576).toFixed(1) + ' MB' : (arq.tamanho / 1024).toFixed(0) + ' KB') : ''}
                            </span>
                            <a href={'/api' + arq.url} download className="text-[9px] text-blue-500 hover:text-blue-700 font-medium">Baixar</a>
                          </div>
                        </div>
                        {!readOnly && (
                          <button onClick={() => deletar(arq.id)}
                            className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition text-xs">
                            <XIcon size={10} />
                          </button>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}

              {!readOnly && (
                <div
                  onDragOver={e => { e.preventDefault(); e.currentTarget.classList.add('border-blue-400', 'bg-blue-50', 'dark:bg-blue-500/5') }}
                  onDragLeave={e => { e.preventDefault(); e.currentTarget.classList.remove('border-blue-400', 'bg-blue-50', 'dark:bg-blue-500/5') }}
                  onDrop={e => { e.preventDefault(); e.currentTarget.classList.remove('border-blue-400', 'bg-blue-50', 'dark:bg-blue-500/5'); Array.from(e.dataTransfer.files).forEach(f => upload(cat, f)) }}
                  className="relative flex items-center justify-center gap-2 py-2.5 rounded-lg border-2 border-dashed border-gray-200 dark:border-white/[0.08] text-xs font-medium text-gray-400 dark:text-white/30 hover:text-blue-500 hover:border-blue-300 hover:bg-blue-50/50 dark:hover:bg-blue-500/5 transition cursor-pointer"
                >
                  <input type="file" accept="image/*,video/*,.pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.zip,.rar" multiple
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                    onChange={e => { Array.from(e.target.files).forEach(f => upload(cat, f)); e.target.value = '' }} />
                  <Paperclip size={14} /> Arraste ou clique para adicionar
                </div>
              )}
            </div>
          </div>
        )
      })}
      </div>
    </div>
  )
}
