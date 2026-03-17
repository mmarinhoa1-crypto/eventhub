import { createContext, useState, useEffect } from 'react'
import api from '../api/client'

export const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(() => {
    const saved = localStorage.getItem('usuario')
    return saved ? JSON.parse(saved) : null
  })
  const [organizacao, setOrganizacao] = useState(() => {
    const saved = localStorage.getItem('organizacao')
    return saved ? JSON.parse(saved) : null
  })
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (token && import.meta.env.PROD) {
      api.get('/auth/eu')
        .then(({ data }) => {
          const usr = data.usuario
          setUsuario(usr)
          localStorage.setItem('usuario', JSON.stringify(usr))
          if (usr.nome_org) {
            const org = { id: data.org_id, nome: usr.nome_org, plano: usr.plano }
            setOrganizacao(org)
            localStorage.setItem('organizacao', JSON.stringify(org))
          }
        })
        .catch(() => {
          localStorage.removeItem('token')
          localStorage.removeItem('usuario')
          localStorage.removeItem('organizacao')
          setUsuario(null)
          setOrganizacao(null)
        })
        .finally(() => setCarregando(false))
    } else {
      setCarregando(false)
    }
  }, [])

  async function entrar(email, senha) {
    if (import.meta.env.DEV && email === 'dev@dev.com' && senha === 'dev') {
      const usr = { id: 0, nome: 'Dev Admin', email: 'dev@dev.com', funcao: 'admin' }
      const org = { id: 0, nome: '314 Produções', plano: 'pro' }
      localStorage.setItem('token', 'dev')
      localStorage.setItem('usuario', JSON.stringify(usr))
      localStorage.setItem('organizacao', JSON.stringify(org))
      setUsuario(usr)
      setOrganizacao(org)
      return
    }
    const { data } = await api.post('/auth/entrar', { email, senha })
    localStorage.setItem('token', data.token)
    localStorage.setItem('usuario', JSON.stringify(data.usuario))
    localStorage.setItem('organizacao', JSON.stringify(data.organizacao))
    setUsuario(data.usuario)
    setOrganizacao(data.organizacao)
    return data
  }

  async function registrar(nome, email, senha, nomeOrganizacao) {
    const { data } = await api.post('/auth/registrar', {
      nome,
      email,
      senha,
      nome_organizacao: nomeOrganizacao,
    })
    localStorage.setItem('token', data.token)
    localStorage.setItem('usuario', JSON.stringify(data.usuario))
    localStorage.setItem('organizacao', JSON.stringify(data.organizacao))
    setUsuario(data.usuario)
    setOrganizacao(data.organizacao)
    return data
  }

  function sair() {
    localStorage.removeItem('token')
    localStorage.removeItem('usuario')
    localStorage.removeItem('organizacao')
    setUsuario(null)
    setOrganizacao(null)
  }

  return (
    <AuthContext.Provider value={{ usuario, organizacao, carregando, entrar, registrar, sair }}>
      {children}
    </AuthContext.Provider>
  )
}
