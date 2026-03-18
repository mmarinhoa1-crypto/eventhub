# EventHub — Contexto do Projeto

## Visão Geral

EventHub é uma plataforma de gestão de eventos em português brasileiro, desenvolvida para a **314 Produções** (app.314br.com). O sistema cobre todo o ciclo de vida de eventos: planejamento, briefing, cronograma, marketing, design e operação.

## Stack Técnica

- **Frontend**: React 18+ com JSX (SPA)
- **Estilo**: CSS modules / inline styles (sem Tailwind)
- **Backend**: Node.js + Express (API REST)
- **Banco**: PostgreSQL
- **Infra**: VPS Linux (produção direta, sem staging)
- **Deploy**: Manual via SSH — arquivos editados diretamente no servidor
- **Servidor**: `/opt/eventhub/` no VPS

## Arquitetura de Componentes

### Views Principais

| View | Descrição | Arquivos Críticos |
|------|-----------|-------------------|
| **AdminPage** | Gestão geral, configurações | `AdminPage.jsx` |
| **MarketingPage** | Redes sociais, posts, métricas | `MarketingPage.jsx` |
| **DesignerPage** | Demandas de design, briefings | `DesignerPage.jsx` |
| **MinhasDemandas** | Kanban de demandas por usuário | `MinhasDemandas.jsx` |
| **Cronograma** | Calendário semanal de eventos | `Cronograma.jsx` |

### Padrões de Componente

```jsx
// Padrão EventHub: componente funcional com hooks
import React, { useState, useEffect } from 'react';

const NomeComponente = ({ eventoId, onUpdate }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [eventoId]);

  const fetchData = async () => {
    try {
      const res = await fetch(`/api/endpoint/${eventoId}`);
      const json = await res.json();
      setData(json);
    } catch (err) {
      console.error('Erro ao carregar:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="loading">Carregando...</div>;

  return (
    <div className="container">
      {/* conteúdo */}
    </div>
  );
};

export default NomeComponente;
```

## ⚠️ Regras Críticas de Desenvolvimento

### 1. NUNCA sobrescrever funcionalidades existentes

Antes de editar qualquer arquivo JSX:
- Ler o arquivo COMPLETO primeiro
- Listar todas as funcionalidades presentes
- Confirmar com o usuário quais funcionalidades manter
- Após edição, verificar que NADA foi removido

### 2. Arquivos grandes (>1500 linhas)

O terminal tem limite de ~1500 linhas para paste. Para arquivos grandes:
- Usar `str_replace` para edições pontuais (PREFERIDO)
- Nunca reescrever o arquivo inteiro se só precisa mudar uma seção
- Se precisar reescrever, dividir em múltiplas operações

### 3. Deploy no VPS

- Servidor de produção: edições são LIVE imediatamente
- Sempre fazer backup antes: `cp arquivo.jsx arquivo.jsx.bak`
- Testar mudanças incrementais, não big-bang
- Reiniciar serviço se necessário: `pm2 restart eventhub`

### 4. Idioma

- Toda interface em **português brasileiro**
- Variáveis e funções em **inglês** (padrão de código)
- Comentários em **português** quando explicativos
- Commits e documentação em **português**

## Funcionalidades Recentes (não remover!)

- Filtros de evento com dropdown pesquisável + botão limpar
- Kanban de briefing com ordenação por cards
- Calendário cronograma com visualização semanal padrão
- Event switcher no header da MarketingPage
- Abas de redes sociais na view de marketing

## Features Planejadas

- [ ] Instagram collab posts (Graph API `collaborators`)
- [ ] WhatsApp bot para classificação receita vs. despesa (keyword-in-caption)
- [ ] Mapa interativo de venue (seções: Palco, Gourmet, Premium, Soirée)

## Estrutura de Pastas

```
/opt/eventhub/
├── client/
│   ├── src/
│   │   ├── components/    # Componentes reutilizáveis
│   │   ├── pages/         # Views principais
│   │   ├── hooks/         # Custom hooks
│   │   └── utils/         # Funções auxiliares
│   └── public/
├── server/
│   ├── routes/            # Rotas da API
│   ├── controllers/       # Lógica de negócio
│   ├── models/            # Models PostgreSQL
│   └── middleware/
├── CLAUDE.md              # Este arquivo
└── _bmad/                 # BMAD Method configs
```

## Comandos Úteis

```bash
# Logs do servidor
pm2 logs eventhub

# Restart
pm2 restart eventhub

# Status
pm2 status

# Backup rápido de arquivo
cp arquivo.jsx arquivo.jsx.bak.$(date +%Y%m%d%H%M)
```

## Git

⚠️ Git não está rastreando todos os arquivos. Sempre verificar status antes de assumir que algo está versionado.

```bash
git status
git diff nome-do-arquivo.jsx
```
