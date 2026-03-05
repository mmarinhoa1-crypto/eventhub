# EventHub

Plataforma web de gestão de eventos. Interface em português (pt-BR).

## Stack

- **Frontend**: React 18 + Vite + Tailwind CSS
- **Backend**: Express.js + PostgreSQL 16 + Multer (uploads)
- **Infra**: Docker Compose + Nginx no host + HTTPS (Let's Encrypt)
- **Domínio**: `app.314br.com` (HTTPS via Let's Encrypt)

## Estrutura do Projeto

```
/opt/eventhub/
├── frontend/              # React + Vite
│   └── src/
│       ├── api/client.js  # Axios (baseURL: '/api')
│       ├── components/
│       │   ├── auth/      # ProtectedRoute, RoleRedirect
│       │   ├── chamados/  # Tickets/suporte
│       │   ├── consumo/   # Consumo/pedidos
│       │   ├── equipe/    # Gestão de equipe
│       │   ├── eventos/   # Eventos, briefings, financeiro, marketing
│       │   ├── layout/    # DashboardLayout, Header, Sidebar
│       │   └── ui/        # Badge, Button, Card, Input, Modal, Table, etc.
│       └── pages/         # Páginas da aplicação
├── backend/
│   ├── server.js          # Todas as rotas da API
│   ├── init.sql           # Schema do banco
│   └── uploads/           # Arquivos enviados (volume Docker)
└── docker-compose.yml     # postgres, backend, frontend, evolution_api
```

## Containers Docker

| Container           | Porta local | Descrição                    |
|---------------------|-------------|------------------------------|
| eventhub_postgres   | 5432        | PostgreSQL 16                |
| eventhub_backend    | 3000        | API Express                  |
| eventhub_frontend   | 8081        | Nginx com build do React     |
| evolution_api       | 8080        | API de WhatsApp (Evolution)  |

## Deploy — IMPORTANTE

O Nginx do **host** serve o frontend estático de `/var/www/eventhub/`, NÃO do container. Após cada build do frontend:

```bash
docker compose up -d --build eventhub-frontend
rm -f /var/www/eventhub/assets/*
docker cp eventhub_frontend:/usr/share/nginx/html/. /var/www/eventhub/
```

Após mudanças no nginx do host:
```bash
nginx -t && systemctl reload nginx
```

Config do nginx do host: `/etc/nginx/sites-enabled/eventhub-app`

## Banco de Dados

- Acesso: `docker exec eventhub_postgres psql -U eventhub -d eventhub`
- Schema em `backend/init.sql`
- Tabelas principais: usuarios, briefings, arquivos, organizacoes, eventos, despesas, chamados

## Uploads

- Multer com limite de 1GB
- Tipos aceitos: jpg, jpeg, png, gif, mp4, mov, pdf, webp
- Diretório: `/app/uploads` (volume Docker `eventhub_uploads`)
- Nginx do host: `client_max_body_size 1G`, proxy timeouts 600s

## Convenções

- Todo o código e interface em **português (pt-BR)**
- Backend monolítico em `server.js` (todas as rotas)
- Frontend usa componentes reutilizáveis em `components/ui/`
- Axios client centralizado em `frontend/src/api/client.js`
- Autenticação via JWT (bcryptjs + jsonwebtoken)

## Bug Conhecido

File input (`<input type="file">`) não abre no Chrome. Suspeita: `document.body.style.overflow = 'hidden'` no Modal.jsx. Workarounds ativos: drag-and-drop + Ctrl+V.
