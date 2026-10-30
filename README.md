# Resgate Animal

Site para uma ONG de resgate e adoção de animais.

- **Frontend:** React + Vite (JavaScript) — `web/`
- **API:** Node.js + Express + Knex — `api/`
- **Banco:** PostgreSQL 18
- **Produção:** Docker Compose (Nginx → API → Postgres), pensado para rodar em um LXC no Proxmox

## Funcionalidades

**Site público**
- Página inicial com animais disponíveis
- Lista de animais para adoção com filtros (espécie, sexo, porte)
- Página de cada animal com galeria de fotos e formulário de interesse em adoção
- Página "Como ajudar" (doação/PIX, voluntariado, denúncia) com formulário de contato

**Área administrativa** (`/admin`)
- Cadastro, edição e exclusão de animais, com upload de fotos
- Gestão das solicitações de adoção (aprovar / recusar)
- Caixa de mensagens recebidas pelo formulário de contato

## Arquitetura

```
Internet ──► [web] Nginx :80
               ├── /           → arquivos estáticos do React
               ├── /api/*      → [api] Express :3000 ──► [db] Postgres :5432
               └── /uploads/*  → [api] (fotos, volume "uploads")
```

Somente o container `web` expõe porta. API e banco ficam na rede interna do Docker.
As migrações do banco rodam automaticamente quando a API inicia, e o usuário
administrador definido no `.env` é criado na primeira execução.

## Desenvolvimento local

Pré-requisitos: Node.js 22+ e PostgreSQL instalado na máquina. Docker **não** é necessário
para desenvolver — ele só é usado no servidor.

1. Crie o usuário e o banco no seu Postgres local (no `psql` ou pgAdmin, como superusuário):

   ```sql
   CREATE USER resgate WITH PASSWORD 'sua-senha';
   CREATE DATABASE resgate OWNER resgate;
   ```

2. Copie o `.env.example` para `.env` e ajuste `DATABASE_URL` com essa senha
   (`postgres://resgate:sua-senha@localhost:5432/resgate`), além de `JWT_SECRET` e do admin.

As tabelas são criadas automaticamente quando a API sobe.

Em um terminal:

```bash
cd api && npm install && npm run dev       # http://localhost:3000
```

Em outro:

```bash
cd web && npm install && npm run dev       # http://localhost:5173
```

O Vite repassa `/api` e `/uploads` para a API, então tudo funciona pela porta 5173.

Acesse `/admin` com o e-mail e a senha definidos em `ADMIN_EMAIL` / `ADMIN_PASSWORD`.

## Deploy no Proxmox (LXC + Docker)

### 1. Criar o container LXC

No Proxmox, crie um CT a partir do template **Debian 13** (ou Ubuntu 24.04):

- 2 vCPU, 2 GB RAM, 20 GB de disco (suficiente para começar)
- **Não privilegiado** (recomendado)
- Em *Options → Features*, habilite **nesting** e **keyctl** — necessários para o Docker rodar dentro do LXC

Pela linha de comando do host Proxmox, equivalente:

```bash
pct set <CTID> --features nesting=1,keyctl=1
```

### 2. Instalar Docker no LXC

```bash
apt update && apt install -y curl git
curl -fsSL https://get.docker.com | sh
```

### 3. Subir a aplicação

```bash
git clone <url-do-repositorio> /opt/resgate-animal
cd /opt/resgate-animal
cp .env.example .env
nano .env                      # senhas fortes, JWT_SECRET, admin
docker compose up -d --build
docker compose logs -f api     # confirme "API ouvindo na porta 3000"
```

### 4. Atualizar para uma nova versão

```bash
cd /opt/resgate-animal
git pull
docker compose up -d --build
```

### 5. HTTPS e domínio

O container `web` serve HTTP na porta 80. Para HTTPS, coloque na frente um proxy reverso
com certificado (Let's Encrypt), por exemplo:

- **Nginx Proxy Manager** ou **Caddy** em outro LXC, apontando para `http://<ip-do-lxc>:80`; ou
- **Cloudflare Tunnel**, sem precisar abrir portas no roteador.

### 6. Backups

- `scripts/backup.sh` gera dump do banco + fotos em `backups/` (mantém os 14 últimos).
  Agende no cron do LXC:
  ```bash
  chmod +x /opt/resgate-animal/scripts/backup.sh
  crontab -e   # 0 3 * * * /opt/resgate-animal/scripts/backup.sh >> /var/log/resgate-backup.log 2>&1
  ```
- Complemente com backup do CT inteiro pelo Proxmox (*Datacenter → Backup*, modo snapshot).

Restaurar o banco:

```bash
docker compose exec -T db pg_restore -U resgate -d resgate --clean < backups/<data>/banco.dump
```

## Banco de dados

Tabelas: `users`, `animals`, `animal_photos`, `adoption_requests`, `contact_messages`.

Para alterar o esquema, crie `api/migrations/NNN_descricao.js` (com `up`/`down`) e registre-o em
`api/migrations/index.js`. Ele será aplicado na próxima inicialização da API.

## Próximos passos sugeridos

- Notificação por e-mail quando chegar solicitação de adoção ou mensagem
- Redimensionar/comprimir fotos no upload (ex.: `sharp`)
- Página "Animais adotados" / histórias de sucesso
- Gestão de múltiplos usuários administradores
- Integração com doações recorrentes
