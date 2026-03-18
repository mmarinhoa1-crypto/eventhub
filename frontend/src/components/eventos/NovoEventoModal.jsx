import { useState, useEffect } from 'react'
import Modal from '../ui/Modal'
import Input from '../ui/Input'
import Button from '../ui/Button'
import api from '../../api/client'
import toast from 'react-hot-toast'

const tiposEvento = ['Festival','Show','Balada','Rodeio','Festa','Corporativo','Esportivo','Cultural','Religioso','Outro']

export default function NovoEventoModal({ open, onClose, onCreated }) {
  const [form, setForm] = useState({
    nome:'', id_grupo:'', orcamento:'', data_evento:'', hora_evento:'', hora_abertura:'',
    local_evento:'', cidade:'', descricao:'', publico_alvo:'', capacidade:'',
    atracoes:'', tipo_evento:'', info_lotes:'', observacoes:'',
    data_abertura_vendas:'', hora_abertura_vendas:'', promo_abertura:'',
    pontos_venda:'', classificacao:'', designer_id:'', social_media_id:'', diretor_id:''
  })
  const [loading, setLoading] = useState(false)
  const [grupos, setGrupos] = useState([])
  const [loadGrupos, setLoadGrupos] = useState(false)
  const [filtroGrupo, setFiltroGrupo] = useState('')
  const [designers, setDesigners] = useState([])
  const [socialMedias, setSocialMedias] = useState([])
  const [diretores, setDiretores] = useState([])

  useEffect(() => {
    if (!open) return
    Promise.all([
      api.get('/equipe/por-funcao/designer').catch(() => ({ data: [] })),
      api.get('/equipe/por-funcao/social_media').catch(() => ({ data: [] })),
      api.get('/equipe/por-funcao/diretor').catch(() => ({ data: [] })),
    ]).then(([d, s, dir]) => {
      setDesigners(d.data)
      setSocialMedias(s.data)
      setDiretores(dir.data)
    })
  }, [open])

  function set(k,v){ setForm({...form,[k]:v}) }

  async function carregarGrupos() {
    setLoadGrupos(true)
    try {
      const { data } = await api.get('/whatsapp/grupos')
      setGrupos(data)
      if(!data.length) toast.error('Nenhum grupo encontrado')
    } catch {
      toast.error('Erro ao buscar grupos. WhatsApp conectado?')
    } finally {
      setLoadGrupos(false)
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if(!form.nome.trim()) return
    setLoading(true)
    try {
      const designerSel = designers.find(d => d.id === Number(form.designer_id))
      const smSel = socialMedias.find(d => d.id === Number(form.social_media_id))
      const dirSel = diretores.find(d => d.id === Number(form.diretor_id))
      await api.post('/eventos', {
        ...form,
        orcamento: form.orcamento ? Number(form.orcamento) : null,
        capacidade: form.capacidade ? Number(form.capacidade) : null,
        designer: designerSel?.nome || '',
        social_media: smSel?.nome || '',
        diretor: dirSel?.nome || '',
        designer_id: form.designer_id ? Number(form.designer_id) : null,
        social_media_id: form.social_media_id ? Number(form.social_media_id) : null,
        diretor_id: form.diretor_id ? Number(form.diretor_id) : null,
      })
      toast.success('Evento criado!')
      setForm({nome:'',id_grupo:'',orcamento:'',data_evento:'',hora_evento:'',hora_abertura:'',local_evento:'',cidade:'',descricao:'',publico_alvo:'',capacidade:'',atracoes:'',tipo_evento:'',info_lotes:'',observacoes:'',data_abertura_vendas:'',hora_abertura_vendas:'',promo_abertura:'',pontos_venda:'',classificacao:''})
      onCreated()
      onClose()
    } catch {
      toast.error('Erro ao criar evento')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Novo Evento">
      <form onSubmit={handleSubmit} className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
        
        <div className="bg-blue-50 dark:bg-blue-500/10 rounded-lg p-3 border border-blue-200 dark:border-blue-500/30">
          <p className="text-xs text-blue-600 dark:text-blue-400 font-medium">Quanto mais informacoes voce preencher, mais inteligente a IA sera nos briefings, atendimento e financeiro.</p>
        </div>

        <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide border-b pb-1">Dados basicos</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Input label="Nome do evento *" value={form.nome} onChange={e=>set('nome',e.target.value)} placeholder="Ex: Lavras Rodeo Festival 2026" required />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de evento</label>
            <select value={form.tipo_evento} onChange={e=>set('tipo_evento',e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">Selecione</option>
              {tiposEvento.map(t=><option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Input label="Data do evento" type="date" value={form.data_evento} onChange={e=>set('data_evento',e.target.value)} />
          <Input label="Horario inicio" type="time" value={form.hora_evento} onChange={e=>set('hora_evento',e.target.value)} />
          <Input label="Abertura portoes" type="time" value={form.hora_abertura} onChange={e=>set('hora_abertura',e.target.value)} />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Input label="Local" value={form.local_evento} onChange={e=>set('local_evento',e.target.value)} placeholder="Ex: Expolavras" />
          <Input label="Cidade" value={form.cidade} onChange={e=>set('cidade',e.target.value)} placeholder="Ex: Lavras - MG" />
        </div>
        <textarea placeholder="Descricao do evento (o que e, como sera, diferencial...)" value={form.descricao} onChange={e=>set('descricao',e.target.value)} rows={3} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />

        <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide border-b pb-1">Atracoes e publico</h3>
        <textarea placeholder="Atracoes (separar por virgula). Ex: Matue, Hungria, Rodeio Profissional" value={form.atracoes} onChange={e=>set('atracoes',e.target.value)} rows={2} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Input label="Publico-alvo" value={form.publico_alvo} onChange={e=>set('publico_alvo',e.target.value)} placeholder="Ex: Jovens 18-30, universitarios" />
          <Input label="Capacidade" type="number" value={form.capacidade} onChange={e=>set('capacidade',e.target.value)} placeholder="Ex: 5000" />
          <Input label="Classificacao" value={form.classificacao} onChange={e=>set('classificacao',e.target.value)} placeholder="Ex: 18+" />
        </div>

        <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide border-b pb-1">Vendas e ingressos</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Input label="Data abertura vendas" type="date" value={form.data_abertura_vendas} onChange={e=>set('data_abertura_vendas',e.target.value)} />
          <Input label="Horario abertura vendas" type="time" value={form.hora_abertura_vendas} onChange={e=>set('hora_abertura_vendas',e.target.value)} />
        </div>
        <textarea placeholder="Promocao de abertura (ex: primeiros 100 ingressos com 50% OFF)" value={form.promo_abertura} onChange={e=>set('promo_abertura',e.target.value)} rows={2} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        <textarea placeholder="Informacoes de lotes (ex: 1o lote R$50, 2o lote R$80, VIP R$150)" value={form.info_lotes} onChange={e=>set('info_lotes',e.target.value)} rows={2} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        <textarea placeholder="Pontos de venda fisicos (ex: Loja X no centro, Banca Y na praca)" value={form.pontos_venda} onChange={e=>set('pontos_venda',e.target.value)} rows={2} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />

        <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide border-b pb-1">Equipe</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Designer</label>
            <select value={form.designer_id} onChange={e=>set('designer_id',e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">Nenhum</option>
              {designers.map(d=><option key={d.id} value={d.id}>{d.nome}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Social Media</label>
            <select value={form.social_media_id} onChange={e=>set('social_media_id',e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">Nenhum</option>
              {socialMedias.map(d=><option key={d.id} value={d.id}>{d.nome}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Diretor</label>
            <select value={form.diretor_id} onChange={e=>set('diretor_id',e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">Nenhum</option>
              {diretores.map(d=><option key={d.id} value={d.id}>{d.nome}</option>)}
            </select>
          </div>
        </div>

        <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide border-b pb-1">Financeiro</h3>
        <Input label="Orcamento (R$)" type="number" step="0.01" value={form.orcamento} onChange={e=>set('orcamento',e.target.value)} placeholder="50000.00" />
        
        <div className="bg-green-50 dark:bg-green-500/10 rounded-lg p-3 border border-green-200 dark:border-green-500/30">
          <p className="text-xs text-green-600 dark:text-green-400 font-medium">Vincule o grupo financeiro do WhatsApp. A IA vai registrar despesas automaticamente quando enviarem comprovantes nesse grupo.</p>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Grupo WhatsApp Financeiro</label>
          <div className="flex gap-2 mb-2">
            <button type="button" onClick={carregarGrupos} className="px-3 py-2 bg-green-500 text-white rounded-lg text-sm hover:bg-green-600 whitespace-nowrap">
              {loadGrupos ? 'Buscando...' : 'Buscar Grupos'}
            </button>
            {grupos.length > 0 && <input value={filtroGrupo} onChange={e=>setFiltroGrupo(e.target.value)} placeholder="Filtrar grupos..." className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />}
          </div>
          {grupos.length > 0 && (
            <select value={form.id_grupo} onChange={e=>set('id_grupo',e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" size={Math.min(grupos.filter(g=>!filtroGrupo||g.nome.toLowerCase().includes(filtroGrupo.toLowerCase())).length+1,6)}>
              <option value="">Nenhum grupo selecionado</option>
              {grupos.filter(g=>!filtroGrupo||g.nome.toLowerCase().includes(filtroGrupo.toLowerCase())).map(g=><option key={g.id} value={g.id}>{g.nome} ({g.participantes} membros)</option>)}
            </select>
          )}
          {form.id_grupo && <p className="text-xs text-green-600 dark:text-green-400 mt-1">Grupo vinculado!</p>}
        </div>

        <textarea placeholder="Observacoes gerais (qualquer info extra para a IA usar)" value={form.observacoes} onChange={e=>set('observacoes',e.target.value)} rows={2} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />

        <div className="flex justify-end gap-2 pt-2 border-t">
          <Button variant="secondary" type="button" onClick={onClose}>Cancelar</Button>
          <Button type="submit" loading={loading}>Criar evento</Button>
        </div>
      </form>
    </Modal>
  )
}
