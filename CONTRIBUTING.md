# Guia de Colaboração — EventHub

Este documento descreve o fluxo de trabalho que **todo dev** do projeto EventHub deve seguir. Foi criado depois de uma situação em que múltiplas pessoas editaram o servidor de produção direto, sem passar pelo Git, e quase perdemos código. Não repitam isso.

## Regra mais importante

**Não edite arquivos direto no servidor (VPS).** Todo trabalho passa pelo Git, na sua máquina local. O servidor só recebe código via `git pull` (no comando de deploy).

---

## 1. Setup inicial (faça uma vez só)

No seu computador, na pasta onde você quer ter o projeto:

```bash
git clone https://github.com/mmarinhoa1-crypto/eventhub.git
cd eventhub
git config user.name "Seu Nome"
git config user.email "seu-email@exemplo.com"
```

A partir daqui, todo trabalho acontece nessa pasta local.

---

## 2. Fluxo do dia-a-dia

### 2.1 Antes de começar a trabalhar

Sempre puxa o que os outros já enviaram:

```bash
git pull
```

### 2.2 Trabalhando

Edita os arquivos normalmente, salva, testa.

### 2.3 Antes de commitar

Veja o que mudou:

```bash
git status   # lista arquivos alterados
git diff     # mostra exatamente o que mudou em cada um
```

Confira se não tem nada indevido sendo enviado (configs locais, `.DS_Store`, dumps SQL, etc).

### 2.4 Commitando

**Adicione arquivos por nome** (não use `git add .` — isso pega tudo, inclusive lixo):

```bash
git add backend/routes/exemplo.js frontend/src/pages/ExemploPage.jsx
git commit -m "feat: descricao curta do que fez"
```

**Padrão de mensagens:**
- `feat:` para nova funcionalidade
- `fix:` para correção de bug
- `refactor:` para reorganização sem mudar comportamento
- `docs:` para documentação

### 2.5 Antes de enviar

Sempre traz o que o outro dev pode ter enviado nesse meio tempo:

```bash
git pull --rebase
```

`--rebase` reaplica seus commits em cima dos do outro, sem criar merge commit. Histórico fica linear e limpo.

### 2.6 Enviando

```bash
git push
```

Se o `push` for rejeitado com mensagem "Updates were rejected", significa que tem coisa nova no remoto. Roda `git pull --rebase` e tenta `git push` de novo.

---

## 3. Deploy em produção

**Só faça deploy DEPOIS** de commitar e pushar pro GitHub. O servidor faz `git pull` direto do GitHub — então se o seu commit não está lá, ele não chega no servidor.

```bash
SSHPASS='<senha-do-VPS>' sshpass -e ssh -o StrictHostKeyChecking=no -o PubkeyAuthentication=no \
  root@147.93.35.4 "cd /opt/eventhub && git pull origin main && \
  docker compose build --no-cache eventhub-frontend eventhub-backend && \
  docker compose up -d eventhub-frontend eventhub-backend && \
  docker cp eventhub_frontend:/usr/share/nginx/html/. /var/www/eventhub/ && \
  nginx -s reload && echo '✅ Deploy concluído'"
```

> **Senha do VPS:** será compartilhada por canal seguro (WhatsApp/Signal). **Não cole a senha em texto no Git, em mensagens de chat de grupo ou em código.**
>
> **Pré-requisito:** instale o `sshpass`:
> - Mac: `brew install esolitos/ipa/sshpass`
> - Ubuntu/Debian: `sudo apt install sshpass`

O deploy demora ~3 a 5 minutos (build + restart dos containers). Durante esse período, o site fica fora do ar por ~10 a 30 segundos no momento do restart.

---

## 4. Regras de ouro pra evitar dor de cabeça

1. **Sempre `git pull` antes de começar a trabalhar.**
2. **Sempre `git pull --rebase` antes de `git push`** — traz mudanças do outro sem criar merge commit.
3. **Combinem antes de mexer no mesmo arquivo grande.** Manda no chat: "vou mexer em `MinhasDemandas.jsx`, te aviso quando terminar". Evita 90% dos conflitos.
4. **Commits pequenos e frequentes.** Um commit por mudança lógica. Não acumula 3 dias de trabalho num commit só.
5. **`git status` e `git diff` SEMPRE** antes de `git add`. Não commita lixo.
6. **Nunca `git push --force`** sem combinar primeiro. Pode apagar trabalho do outro.
7. **Nunca edita arquivos direto no servidor de produção via SSH.** Se precisar testar em prod, pede pra outro dev fazer um deploy ou faz tu mesmo via Git.

---

## 5. Resolvendo conflitos

Quando você roda `git pull --rebase` e o git diz que há conflito:

```bash
# Git lista quais arquivos conflitaram. Abre cada um, procura por:
# <<<<<<< HEAD
# (codigo seu)
# =======
# (codigo do outro)
# >>>>>>> commit-id

# Edita o arquivo manualmente, escolhendo qual versao manter (ou combinando ambas).
# Apaga as marcas <<<<<<<, =======, >>>>>>>.
# Salva.

git add <arquivo-que-resolveu>
git rebase --continue
```

Se a coisa estiver muito complicada e você não souber por onde ir, **dá undo**:

```bash
git rebase --abort
```

E pede ajuda no chat antes de tentar de novo.

---

## 6. Estrutura do projeto

```
/opt/eventhub/                          # raiz no servidor; espelhado no seu PC
├── backend/                            # Node.js + Express
│   ├── server.js                       # entrypoint da API
│   ├── routes/                         # rotas REST por dominio (auth, eventos, financeiro, etc)
│   ├── jobs/                           # workers em background (notificacoes WA, relatorio mensal)
│   ├── utils/                          # helpers compartilhados
│   ├── migrations/                     # migrations SQL (aplicar manualmente no banco)
│   └── Dockerfile
├── frontend/                           # React 18 + Vite
│   ├── src/
│   │   ├── pages/                      # views principais (uma por rota)
│   │   ├── components/                 # componentes reutilizaveis
│   │   ├── api/client.js               # axios instance pra API
│   │   └── App.jsx                     # router
│   └── Dockerfile
├── docker-compose.yml                  # orquestra postgres, evolution_api, backend, frontend
├── CLAUDE.md                           # contexto do projeto
└── CONTRIBUTING.md                     # este arquivo
```

---

## 7. Migrations de banco

Quando você criar uma migration nova (`backend/migrations/nome.sql`):

1. Commita o arquivo no git e dá push (como código normal)
2. Antes do próximo deploy, **aplica manualmente no banco do servidor**:

```bash
ssh root@147.93.35.4
cd /opt/eventhub
# Backup primeiro!
docker exec eventhub_postgres pg_dump -U eventhub eventhub > /tmp/bkp-$(date +%Y%m%d%H%M).sql
# Aplica
cat backend/migrations/sua-migration.sql | docker exec -i eventhub_postgres psql -U eventhub -d eventhub
```

Use `IF NOT EXISTS` em `CREATE TABLE` e `ADD COLUMN IF NOT EXISTS` em `ALTER TABLE` pra a migration ser **idempotente** (rodar várias vezes sem dar erro).

---

## 8. Recomendação pro futuro

Trabalhar todos juntos direto na branch `main` funciona pra equipe pequena, mas tem riscos:
- Se alguém pushar código quebrado, **entra em produção no próximo deploy**
- Conflitos frequentes quando 2 pessoas mexem no mesmo arquivo
- Difícil reverter mudanças individuais

O **caminho profissional** é trabalhar em **branches separadas** e abrir Pull Requests:

```bash
# Cria branch nova pra cada feature
git checkout -b feature/nome-curto-da-feature

# Trabalha normalmente, commita, pusha
git push -u origin feature/nome-curto-da-feature

# No GitHub, abre Pull Request da sua branch pra main
# Outro dev revisa, aprova, merge
# Aí faz deploy
```

Vantagens:
- Outro dev revisa o código antes de virar produção
- Reverter é fácil (só reverte o merge do PR)
- Conflitos resolvidos no GitHub antes de chegar no servidor

Quando estiverem prontos pra adotar isso, atualizem este documento.

---

## 9. Quando algo der errado

- **Site fora do ar depois de um deploy:** olha os logs no servidor:
  ```bash
  ssh root@147.93.35.4
  docker logs --tail 100 eventhub_backend
  docker logs --tail 100 eventhub_frontend
  ```
- **Mudança quebrou algo:** reverte o commit no Git localmente, dá push, faz deploy:
  ```bash
  git revert <hash-do-commit-ruim>
  git push
  # depois roda o comando de deploy
  ```
- **Banco em estado estranho:** restaura do backup mais recente em `/tmp/` no servidor:
  ```bash
  cat /tmp/eventhub-bkp-XXXXX.sql | docker exec -i eventhub_postgres psql -U eventhub -d eventhub
  ```

---

**Última atualização:** 24/04/2026
