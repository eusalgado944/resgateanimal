# Resgate Animal

Plataforma para uma ONG de proteção animal, com a **Associação Focinho Amigo**
como estudo de caso fictício. Inclui vitrine de adoção, candidaturas, contato,
interesse em voluntariado e doações, denúncias e área administrativa para
animais, fotos, triagem e atendimento. Doações não processam pagamentos.
Prontuário veterinário, controle financeiro e escalas de voluntários ficam
fora desta versão.

## Estrutura

- `backend/`: API REST JavaScript, Node.js 24, Express 5, zod, JWT, bcrypt,
  Knex e migrations PostgreSQL.
- `frontend/`: React 19, Vite e Nginx com proxy de mesma origem.
- `compose.yaml`: três serviços Docker (web/Nginx, API e PostgreSQL 18).
- `scripts/backup.sh`: backup do banco e fotos, com retenção de sete dias.
- `docs/specification.txt`: proposta de 39 requisitos funcionais, 13 não
  funcionais e 10 regras de negócio derivada do resumo.
- `docs/01-use-cases.mmd` a `docs/05-deployment.mmd`: cinco diagramas Mermaid
  independentes (casos de uso, dados, sequência, atividade e implantação).

O resumo original não forneceu o detalhamento dos requisitos nem resultados
de execução verificáveis; não é evidência de que esta implementação tenha
31 testes aprovados ou já esteja implantada.

## Implantação com Docker

Requer Docker Engine com Compose v2. Execute na raiz do repositório:

```sh
cp .env.example .env
openssl rand -hex 32
openssl rand -hex 32
```

Preencha `DB_PASSWORD` e `JWT_SECRET` em `.env` com os dois valores diferentes.
Use senha hexadecimal para que possa compor a URL PostgreSQL sem escapar
caracteres. Não versione `.env`; restrinja suas permissões (`chmod 600 .env`).

```sh
docker compose up --build -d
docker compose logs api
```

A API executa as migrations antes de iniciar e aguarda o banco saudável.
A interface fica em `http://localhost:8080` (configurável por `HTTP_PORT`),
com acesso restrito ao próprio host por padrão (`HTTP_BIND=127.0.0.1`).
Banco e API não expõem portas no host. Não há credenciais administrativas
padrão. Para criar um administrador, no Bash:

```sh
export ADMIN_NAME='Administrador'
export ADMIN_EMAIL='admin@example.org'
read -rsp 'Senha administrativa (mínimo 12 caracteres): ' ADMIN_PASSWORD
echo
export ADMIN_PASSWORD
docker compose exec -e ADMIN_NAME -e ADMIN_EMAIL -e ADMIN_PASSWORD api npm run bootstrap-admin
unset ADMIN_PASSWORD ADMIN_NAME ADMIN_EMAIL
```

Dados fictícios de animais são opcionais: `docker compose exec api npm run seed`.
Não execute seeds sem revisar seu conteúdo em um banco com dados reais.
Volumes preservam dados ao recriar containers. **Não execute
`docker compose down -v` em produção**, pois remove os volumes.

### Proxmox VE / LXC

Prepare um LXC Linux dedicado com armazenamento persistente, Docker Engine e
Compose v2. A execução de Docker dentro de LXC requer suporte a nesting e
configuração compatível do host; confirme a política de segurança com o
administrador do Proxmox. Prefira container não privilegiado, não desative
AppArmor para contornar erros e considere VM se o host não suportar essa
configuração com segurança.

Copie o projeto para um caminho persistente, configure `.env` e execute os
comandos acima. Na borda, configure domínio e proxy HTTPS com certificado
válido; o Nginx incluído serve HTTP e **não provisiona TLS**. Restrinja a
porta HTTP ao proxy/rede confiável, mantenha o Proxmox atualizado e não
exponha PostgreSQL. Configure monitoramento, cópia externa dos backups,
política de retenção de dados pessoais e teste de restauração antes de
receber informações reais.

Se o proxy HTTPS estiver em outro host, altere `HTTP_BIND` para o IP privado
do LXC e libere a porta apenas para esse proxy no firewall. Não exponha
formulários ou login pela Internet sem HTTPS.

O Compose confia em um único salto de proxy (`TRUST_PROXY=1`), com a API
acessível apenas na rede Docker. O Nginx deve substituir, e não confiar
cegamente em, cabeçalhos de IP enviados pelo visitante. Se houver outro
proxy TLS na frente, configure no Nginx os endereços confiáveis desse proxy
para recuperar o IP real; sem isso os limites de requisição serão
compartilhados entre visitantes vindos desse proxy. Não habilite confiança
irrestrita em cabeçalhos nem publique a porta da API nessa configuração.

## Backup diário e restauração

O script exige Bash, `flock`, Docker Compose e acesso ao projeto. Exemplo de
agendamento no LXC (substitua o caminho absoluto pelo da instalação):

```cron
0 2 * * * /opt/resgateanimal/scripts/backup.sh >> /var/log/resgateanimal-backup.log 2>&1
```

`BACKUP_DIR` permite escolher outro destino. Cada diretório UTC contém
`database.dump` (pg_dump em formato custom) e `uploads.tar.gz`. O script
só publica o diretório após as duas operações terem sucesso, impede
execuções concorrentes e elimina backups completos com mais de seis dias.
Falhas interrompem a operação e preservam os backups anteriores. Copie os
arquivos para armazenamento externo protegido e monitore as falhas.
Se apenas a retenção falhar, o backup publicado permanece válido; o script
registra essa distinção e retorna erro para que a falta de limpeza seja tratada.

O dump é transacional, mas não há transação conjunta entre banco e arquivos.
Para um ponto de recuperação consistente, bloqueie novas gravações e aguarde
requisições em curso antes do backup. Não confunda snapshot LXC com backup
lógico validado.

Para restaurar **em instalação isolada**, com os três serviços em execução
e sem tráfego público, escolha um backup confiável e pare a entrada web:

```sh
BACKUP=/caminho/absoluto/backups/AAAAMMDDTHHMMSSZ
gzip -t "$BACKUP/uploads.tar.gz"
docker compose stop web api
docker compose exec -T db pg_restore -U resgateanimal -d resgateanimal \
  --clean --if-exists --single-transaction < "$BACKUP/database.dump"
docker compose run --rm --no-deps -T api sh -ec \
  'find /app/uploads -mindepth 1 -maxdepth 1 -exec rm -rf {} +; tar -C /app/uploads -xzf -' \
  < "$BACKUP/uploads.tar.gz"
docker compose up -d api web
```

Esses comandos substituem os dados da instalação de destino. Se algum
comando falhar, mantenha o acesso bloqueado e investigue antes de continuar.
Verifique login, fotos, candidaturas e mensagens antes de liberar tráfego.

## Contrato da API

Solicitações JSON usam `Content-Type: application/json`. Operações
administrativas exigem o cabeçalho `Authorization`, com esquema `Bearer`
seguido do token retornado pelo login;
o token expira em duas horas. Não envie tokens em URLs.

| Método e caminho | Função |
| --- | --- |
| `GET /api/health` | Verificar acesso ao banco |
| `GET /api/organization` | Consultar informações da ONG fictícia |
| `GET /api/animals` | Vitrine de animais disponíveis |
| `GET /api/animals/:id` | Detalhes do animal disponível |
| `POST /api/applications` | Enviar candidatura |
| `POST /api/messages` | Enviar contato, voluntariado, doação ou denúncia |
| `POST /api/admin/login` | Autenticar com `email` e `password` |
| `GET/POST /api/admin/animals` | Listar/cadastrar animais |
| `PATCH/DELETE /api/admin/animals/:id` | Editar/excluir animal |
| `POST /api/admin/animals/:id/photo` | Enviar foto multipart no campo `photo` |
| `GET /api/admin/applications` | Consultar candidaturas |
| `PATCH /api/admin/applications/:id` | Alterar triagem e notas |
| `GET /api/admin/messages` | Consultar mensagens |
| `PATCH /api/admin/messages/:id` | Alterar atendimento |

Listagens retornam a coleção e `total`; aceitam `limit` (1–100, padrão 24)
e `offset`. Animais aceitam `species`, `size` e `search`; candidaturas,
`status`; mensagens, `type` e `status`. IDs são UUIDs.

Animais: `name`, `species` (`dog`/`cat`), `breed`, `age` (texto),
`sex` (`male`/`female`), `size` (`small`/`medium`/`large`), `description`,
`status` (`available`/`adopted`/`unavailable`) e `featured` (booleano).
Foto PNG, JPEG ou WebP de até 5 MB é enviada separadamente; a API gera
o nome do arquivo e não aceita caminhos de arquivo enviados pelo usuário.

Candidaturas: `animalId`, `name`, `email`, `phone`, `city` e campos opcionais
`housing`, `experience`, `message`. Triagem usa `status`
(`pending`/`approved`/`rejected`) e `notes` opcional. Excluir o animal
preserva a candidatura e o nome histórico, anulando o vínculo.

Mensagens: `type` (`contact`/`volunteer`/`donation`/`abuse`), `name`, `email`,
`message` (mínimo dez caracteres), `phone` opcional e `address` (local da
ocorrência obrigatório para denúncia). Atendimento usa `status`
(`new`/`read`/`archived`). Dados pessoais são acessíveis apenas na área
administrativa. Erros retornam `error` e, em validações, `details`;
dados internos do banco não são expostos.

## Desenvolvimento e validação

Use Node.js 24 e PostgreSQL 18. Instale dependências com `npm ci` em cada
diretório. Na API, configure `DATABASE_URL`, `JWT_SECRET` (mínimo 32 bytes)
e, para desenvolvimento, `PORT=3000` e `CORS_ORIGIN=http://localhost:5173`.
Exporte as variáveis no shell; copiar um arquivo `.env` não implica que
ele seja carregado automaticamente.

```sh
cd backend
npm ci
npm run migrate
npm run dev
# Em outro terminal, na raiz:
cd frontend
npm ci
npm run dev
```

### Testes da API

Os testes usam `node:test`, iniciam a API em porta temporária e acessam um
PostgreSQL real. **Eles apagam as tabelas do banco informado.** Use uma
instância isolada; `TEST_DATABASE_URL` é obrigatório e o nome do banco deve
terminar em `_test`. Nunca use um banco com dados que precisam ser mantidos.

Exemplo de banco descartável (Bash, na raiz do projeto):

```sh
export POSTGRES_PASSWORD="$(openssl rand -hex 32)"
docker run --rm -d --name resgateanimal-tests \
  -p 127.0.0.1:5433:5432 \
  -e POSTGRES_USER=resgateanimal -e POSTGRES_DB=resgateanimal_test \
  -e POSTGRES_PASSWORD postgres:18
docker exec resgateanimal-tests pg_isready -U resgateanimal -d resgateanimal_test
# Aguarde pg_isready indicar que aceita conexões antes de prosseguir.
export TEST_DATABASE_URL="postgresql://resgateanimal:${POSTGRES_PASSWORD}@127.0.0.1:5433/resgateanimal_test"
cd backend
npm ci
npm run check
npm test
docker stop resgateanimal-tests
unset POSTGRES_PASSWORD TEST_DATABASE_URL
```

Frontend: execute `npm test`, `npm run lint` e `npm run build` em `frontend/`.
Operação: `bash -n scripts/backup.sh`, ShellCheck se instalado, e
`docker compose config --quiet` com as variáveis obrigatórias configuradas.
Para validação manual, exercite cadastro e foto de animal, vitrine,
candidatura, todos os canais, triagem, atendimento, erros de formulário e
bloqueio sem autenticação.

Validação da API: 50 testes aprovados, zero falhas, com Node.js
24.22.2 e PostgreSQL 18.6. A checagem de sintaxe, o build Docker da API
e a execução como usuário não privilegiado passaram. A rotina de backup
passou em ShellCheck e verificações simuladas de sucesso, falha,
concorrência, retenção e colisão de nomes. Esses resultados não substituem
um teste de recuperação no servidor de destino.

Validação da interface: oito testes unitários e 22 cenários de navegador
com um mock estrito do contrato da API aprovados; lint, build Vite e
build/configuração Nginx no Docker aprovados. O início do conjunto real
de três containers também foi verificado, incluindo migrations, criação
do administrador, seed opcional, health check e permissões de uploads.
CodeQL não encontrou alertas de JavaScript.

Integração real: 26 cenários de navegador aprovados com os três containers,
incluindo adoção, todos os canais públicos, administração, upload PNG,
triagem, atendimento, paginação de todas as listas e layout móvel. A persistência após reinício foi
verificada. O script de backup foi executado contra essa instalação
descartável; os arquivos foram lidos e o dump restaurado em outro banco
isolado, preservando os quatro animais. A recuperação completa de arquivos,
TLS, cron e operação no Proxmox ainda precisam de validação no destino.
