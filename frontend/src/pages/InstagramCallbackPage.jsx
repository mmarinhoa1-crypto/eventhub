import { useEffect, useState } from 'react'

export default function InstagramCallbackPage() {
  const [status, setStatus] = useState('processing')
  const [message, setMessage] = useState('Conectando Instagram...')

  useEffect(() => {
    handleCallback()
  }, [])

  async function handleCallback() {
    try {
      // Ler tokens do fragmento da URL (#access_token=...&long_lived_token=...)
      const hash = window.location.hash.substring(1)
      const params = new URLSearchParams(hash)
      const longLivedToken = params.get('long_lived_token')
      const accessToken = params.get('access_token')
      const token = longLivedToken || accessToken

      if (!token) {
        // Verificar se foi cancelamento
        const query = new URLSearchParams(window.location.search)
        if (query.get('error')) {
          setStatus('error')
          setMessage('Login cancelado.')
          setTimeout(() => window.close(), 2000)
          return
        }
        setStatus('error')
        setMessage('Token não recebido. Tente novamente.')
        setTimeout(() => window.close(), 3000)
        return
      }

      // Recuperar evento_id do localStorage
      const eventoId = localStorage.getItem('ig_connect_evento_id')

      // Enviar token para o backend
      const jwt = localStorage.getItem('token')
      const res = await fetch('/api/instagram/complete-business-login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + jwt
        },
        body: JSON.stringify({ token, evento_id: eventoId })
      })

      const data = await res.json()

      if (data.erro) {
        setStatus('error')
        setMessage(data.erro)
        setTimeout(() => window.close(), 4000)
        return
      }

      if (data.multiple) {
        // Multiplas contas - mostrar seletor
        setStatus('select')
        setMessage('Selecione o Instagram:')
        setAccounts(data.accounts)
        return
      }

      // Sucesso
      setStatus('success')
      setMessage('Instagram conectado: @' + data.username)
      setTimeout(() => window.close(), 2000)

    } catch (err) {
      setStatus('error')
      setMessage('Erro: ' + (err.message || 'Falha na conexão'))
      setTimeout(() => window.close(), 4000)
    }
  }

  const [accounts, setAccounts] = useState([])

  async function selectAccount(acc) {
    try {
      setStatus('processing')
      setMessage('Conectando @' + acc.username + '...')

      const eventoId = localStorage.getItem('ig_connect_evento_id')
      const jwt = localStorage.getItem('token')
      const res = await fetch('/api/instagram/select-business-account', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + jwt
        },
        body: JSON.stringify({ account: acc, evento_id: eventoId })
      })
      const data = await res.json()

      if (data.erro) {
        setStatus('error')
        setMessage(data.erro)
        setTimeout(() => window.close(), 4000)
        return
      }

      setStatus('success')
      setMessage('Instagram conectado: @' + data.username)
      setTimeout(() => window.close(), 2000)
    } catch (err) {
      setStatus('error')
      setMessage('Erro: ' + err.message)
      setTimeout(() => window.close(), 4000)
    }
  }

  const colors = {
    processing: { bg: '#fdf2f8', icon: '⏳', color: '#ec4899' },
    success: { bg: '#f0fdf4', icon: '✅', color: '#22c55e' },
    error: { bg: '#fef2f2', icon: '❌', color: '#ef4444' },
    select: { bg: '#fdf2f8', icon: '📱', color: '#ec4899' }
  }
  const c = colors[status] || colors.processing

  return (
    <div style={{ fontFamily: '-apple-system, sans-serif', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: c.bg, margin: 0, padding: 20 }}>
      <div style={{ background: 'white', borderRadius: 20, padding: 28, maxWidth: 420, width: '100%', boxShadow: '0 8px 30px rgba(0,0,0,0.1)', textAlign: 'center' }}>
        <div style={{ fontSize: 40, marginBottom: 16 }}>{c.icon}</div>
        <h2 style={{ color: c.color, margin: '0 0 8px', fontSize: 18 }}>{message}</h2>

        {status === 'processing' && (
          <p style={{ color: '#999', fontSize: 13 }}>Aguarde...</p>
        )}

        {status === 'success' && (
          <p style={{ color: '#999', fontSize: 13 }}>Pode fechar esta janela.</p>
        )}

        {status === 'error' && (
          <p style={{ color: '#999', fontSize: 13 }}>Esta janela fechará automaticamente.</p>
        )}

        {status === 'select' && (
          <div style={{ marginTop: 16 }}>
            {accounts.map((acc, i) => (
              <div
                key={i}
                onClick={() => selectAccount(acc)}
                style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 14, border: '2px solid #e5e7eb', borderRadius: 14, cursor: 'pointer', marginBottom: 10, background: 'white', transition: 'all 0.2s' }}
                onMouseOver={e => { e.currentTarget.style.borderColor = '#ec4899'; e.currentTarget.style.background = '#fdf2f8' }}
                onMouseOut={e => { e.currentTarget.style.borderColor = '#e5e7eb'; e.currentTarget.style.background = 'white' }}
              >
                {acc.picture ? (
                  <img src={acc.picture} style={{ width: 44, height: 44, borderRadius: '50%', objectFit: 'cover', border: '2px solid #e5e7eb' }} />
                ) : (
                  <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'linear-gradient(135deg, #a855f7, #ec4899)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 'bold', fontSize: 18 }}>
                    {(acc.username || '?')[0].toUpperCase()}
                  </div>
                )}
                <div style={{ textAlign: 'left' }}>
                  <p style={{ fontWeight: 'bold', color: '#111', margin: 0, fontSize: 15 }}>@{acc.username}</p>
                  <p style={{ fontSize: 12, color: '#999', margin: '2px 0 0' }}>via {acc.pageName}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
