# Resgate Animal — Site e Sistema de Gestão para ONG de Resgate de Animais

> Linguagem: **JavaScript (Node.js 24)** · Arquitetura: **API REST Express + SPA React** · Banco: **PostgreSQL 18**
> Hospedagem: **Docker Compose em container LXC no Proxmox**
> Diagramas: [`docs/diagramas.drawio`](docs/diagramas.drawio) (abrir em [app.diagrams.net](https://app.diagrams.net) ou na extensão Draw.io do VS Code)

**Legenda de status usada neste documento:** ✅ implementado · 🟡 parcial · ⬜ planejado

---

## 1. Visão geral

O Resgate Animal é o site público e o sistema de gestão de uma ONG de resgate e proteção animal. Ele divulga os animais disponíveis para adoção, recebe candidaturas e mensagens do público e, na área administrativa, centraliza o cadastro dos animais, o histórico veterinário, o processo de adoção, as doações e despesas e a organização dos voluntários.

O problema que o sistema ataca: ONGs de pequeno e médio porte costumam controlar essas informações em cadernos, grupos de WhatsApp e planilhas soltas. Isso gera perda de histórico de vacinação, adotantes sem acompanhamento pós-adoção e dificuldade de prestar contas das doações recebidas — o que compromete a captação de recursos.

### Contexto da ONG

> Preencher com os dados reais da ONG.

| Item | Valor |
|---|---|
| Nome | FormaCerta |
| Tempo de atuação | 1 ano |
| Animais abrigados (média) | 5 animais |
| Equipe fixa / veterinários parceiros | 2 |
| Voluntários ativos | 3 |
| Adoções por mês (média) | 2 |
| Fontes de receita | Doações de pessoa física, apadrinhamento, feiras |

**Dores típicas a confirmar com a ONG:**

- "Só descobrimos que a vacina venceu quando o animal adoece."
- "Perdemos o contato de quem adotou; não sabemos se o animal está bem."
- "Os padrinhos pedem foto e notícia do afilhado e a gente esquece de mandar."
- "No fim do mês não sei dizer quanto custou manter cada animal."

---

## 2. Objetivos

**Objetivo geral:** desenvolver uma aplicação web que divulgue os animais para adoção e digitalize o ciclo de vida do animal dentro da ONG, do resgate ao acompanhamento pós-adoção.

**Objetivos específicos:**

1. Divulgar publicamente os animais disponíveis e receber candidaturas de adoção pela internet.
2. Manter um prontuário veterinário único e auditável por animal.
3. Alertar automaticamente sobre vacinas, vermífugos e castrações pendentes ou vencidas.
4. Conduzir o processo de adoção por um fluxo de estados controlado, com termo de adoção em PDF.
5. Registrar doações e despesas, permitindo calcular o custo médio por animal e gerar relatório de transparência.
6. Organizar escalas de voluntariado e o vínculo de apadrinhamento.

---

## 3. Escopo

### Dentro do escopo

| Módulo | Descrição | Status |
|---|---|---|
| Site público | Página inicial, vitrine com filtros, página do animal, "Como ajudar", contato e denúncia | ✅ |
| Autenticação e perfis | Login, controle de acesso por papel, gestão de usuários | 🟡 |
| Animais e prontuário | Cadastro, fotos, eventos clínicos, alertas de pendência | 🟡 |
| Adoção | Candidatura, triagem, aprovação, termo em PDF, acompanhamento | 🟡 |
| Doações e despesas | Lançamentos, categorias, rateio por animal, relatórios | ⬜ |
| Voluntários e apadrinhamento | Cadastro, escala de tarefas, vínculo padrinho–animal | ⬜ |
| Relatórios | Dashboard operacional e prestação de contas | ⬜ |
| Infraestrutura | Docker Compose, deploy em LXC no Proxmox, backups | ✅ |

### Fora do escopo (não será implementado)

- Integração com gateway de pagamento real (doações são **registradas**, não processadas).
- Aplicativo móvel nativo.
- Emissão de nota fiscal ou recibo com validade fiscal.
- Integração com sistemas públicos (RGA, CRMV).
- Chat em tempo real entre adotante e ONG.

---

## 4. Atores e perfis de acesso

| Perfil | Quem é | Permissões | Status |
|---|---|---|---|
| `admin` | Coordenação da ONG | Acesso total, incluindo financeiro e gestão de usuários | ✅ (perfil único hoje) |
| `veterinario` | Veterinário parceiro | Leitura de animais, escrita no prontuário | ⬜ |
| `voluntario` | Voluntário cadastrado | Leitura de animais, registro de tarefas da própria escala | ⬜ |
| `visitante` | Público em geral (não autenticado) | Vitrine, candidatura de adoção, contato e denúncia | ✅ |

---

## 5. Requisitos funcionais

### 5.1 Site público e contato

| ID | Requisito | Prioridade | Status |
|---|---|---|---|
| RF01 | Exibir página inicial com chamada para adoção e os animais disponíveis mais recentes | Alta | ✅ |
| RF02 | Exibir página "Como ajudar" com dados para doação (PIX), voluntariado e denúncia | Alta | ✅ |
| RF03 | Permitir que o visitante envie mensagem de contato, voluntariado, doação ou denúncia | Alta | ✅ |
| RF04 | O administrador deve visualizar as mensagens recebidas e marcá-las como lidas | Média | ✅ |

### 5.2 Autenticação e administração

| ID | Requisito | Prioridade | Status |
|---|---|---|---|
| RF05 | O sistema deve permitir login com e-mail e senha | Alta | ✅ |
| RF06 | O sistema deve restringir funcionalidades conforme o perfil do usuário | Alta | ⬜ |
| RF07 | O `admin` deve poder cadastrar, editar e desativar usuários | Alta | ⬜ |
| RF08 | O sistema deve registrar log de auditoria (usuário, ação, data) para operações de escrita no prontuário e no financeiro | Média | ⬜ |

### 5.3 Animais e prontuário

| ID | Requisito | Prioridade | Status |
|---|---|---|---|
| RF09 | Cadastrar animal com nome, espécie, raça aproximada, sexo, porte, data de nascimento estimada, data de entrada, cor/pelagem e observações | Alta | 🟡 sem raça, cor e data de nascimento |
| RF10 | Anexar fotos ao animal, definindo uma como principal | Alta | 🟡 a primeira foto é a capa |
| RF11 | Registrar a origem do animal (resgate de rua, entrega voluntária, transferência, nascido na ONG) | Média | ⬜ |
| RF12 | Controlar o status do animal por meio de um fluxo definido (ver RN03) | Alta | 🟡 status livre, sem validação de transição |
| RF13 | Registrar eventos clínicos: vacina, vermífugo, castração, consulta, cirurgia, exame, medicação, óbito | Alta | ⬜ |
| RF14 | Ao registrar uma vacina com reforço, calcular e agendar automaticamente a próxima dose | Alta | ⬜ |
| RF15 | Exibir painel de pendências veterinárias, separando "vence em até 30 dias" de "vencido" | Alta | ⬜ |
| RF16 | Buscar e filtrar animais por espécie, porte, sexo, status, castração e faixa etária | Alta | 🟡 espécie, porte, sexo e status |
| RF17 | Exportar a ficha completa do animal em PDF | Média | ⬜ |

### 5.4 Adoção

| ID | Requisito | Prioridade | Status |
|---|---|---|---|
| RF18 | Exibir publicamente a vitrine dos animais com status `disponivel` | Alta | ✅ |
| RF19 | Permitir que um visitante envie candidatura com dados pessoais, tipo de moradia, telas de proteção, outros animais, renda aproximada e motivação | Alta | 🟡 nome, contato, cidade e mensagem |
| RF20 | Conduzir o processo de adoção pelos estados definidos em RN04 | Alta | 🟡 `pendente` → `aprovado`/`recusado` |
| RF21 | Registrar parecer da triagem (aprovado/reprovado com justificativa obrigatória) | Alta | ⬜ |
| RF22 | Gerar termo de adoção em PDF com dados do animal, do adotante e cláusulas de responsabilidade | Alta | ⬜ |
| RF23 | Agendar automaticamente acompanhamentos pós-adoção em 30, 90 e 180 dias após a entrega | Média | ⬜ |
| RF24 | Registrar o resultado de cada acompanhamento, com relato e fotos enviadas pelo adotante | Média | ⬜ |
| RF25 | Permitir registrar devolução do animal, retornando-o ao acervo com o histórico preservado | Média | ⬜ |
| RF26 | Impedir nova candidatura de adotante com registro de devolução sem justificativa aceita | Baixa | ⬜ |

### 5.5 Doações e despesas

| ID | Requisito | Prioridade | Status |
|---|---|---|---|
| RF27 | Registrar doação financeira ou em espécie (ração, medicamento, material), com doador, valor ou quantidade e data | Alta | ⬜ |
| RF28 | Registrar despesa com categoria (alimentação, veterinário, medicamento, estrutura, transporte, outros) | Alta | ⬜ |
| RF29 | Permitir vincular uma despesa a um animal específico ou classificá-la como despesa geral | Alta | ⬜ |
| RF30 | Calcular o custo acumulado por animal e o custo médio mensal por animal | Média | ⬜ |
| RF31 | Gerar relatório mensal de transparência (entradas, saídas, saldo) exportável em PDF | Alta | ⬜ |
| RF32 | Exibir dashboard com total de animais por status, adoções no mês, saldo financeiro e pendências veterinárias | Alta | ⬜ |

### 5.6 Voluntários e apadrinhamento

| ID | Requisito | Prioridade | Status |
|---|---|---|---|
| RF33 | Cadastrar voluntário com disponibilidade semanal e habilidades (banho, transporte, divulgação, feira de adoção) | Média | ⬜ |
| RF34 | Criar escala de tarefas por data e turno, atribuindo voluntários | Média | ⬜ |
| RF35 | Permitir que o voluntário confirme presença e registre as horas realizadas | Média | ⬜ |
| RF36 | Emitir declaração de horas de voluntariado em PDF | Baixa | ⬜ |
| RF37 | Registrar apadrinhamento: padrinho, animal, valor mensal e data de início | Média | ⬜ |
| RF38 | Listar apadrinhamentos com contribuição em atraso | Baixa | ⬜ |
| RF39 | Encerrar apadrinhamento automaticamente quando o animal for adotado, notificando o padrinho | Baixa | ⬜ |

---

## 6. Requisitos não funcionais

| ID | Requisito | Status |
|---|---|---|
| RNF01 | Toda a aplicação deve ser escrita em JavaScript: Node.js 22+ (ES Modules) no backend e React no frontend | ✅ |
| RNF02 | O banco de dados deve ser PostgreSQL | ✅ |
| RNF03 | As senhas devem ser armazenadas com hash bcrypt | ✅ |
| RNF04 | A API deve ser stateless, autenticada por JWT, e validar toda entrada com schemas (zod) | ✅ |
| RNF05 | Todo o esquema de banco deve ser versionado por migrations (Knex), aplicadas automaticamente na inicialização | ✅ |
| RNF06 | O sistema deve ser executável via Docker Compose com um único comando e implantável em container LXC no Proxmox | ✅ |
| RNF07 | Formulários públicos e login devem ter limite de requisições por IP | ✅ |
| RNF08 | O sistema deve responder a 95% das requisições de listagem em menos de 2 segundos com base de 1.000 animais | ⬜ a medir |
| RNF09 | A cobertura de testes automatizados da camada de serviço deve ser de no mínimo 60% | ⬜ |
| RNF10 | As imagens enviadas devem ser redimensionadas para no máximo 1280px e 500KB | ⬜ hoje: limite de 5 MB, sem redimensionar |
| RNF11 | Conformidade com a LGPD: consentimento explícito no formulário público e possibilidade de anonimizar dados do adotante | ⬜ |
| RNF12 | Interface responsiva e com critérios básicos de acessibilidade (contraste, labels em formulários, navegação por teclado) | 🟡 |
| RNF13 | Backup diário do banco e das fotos, com retenção de 14 dias | ✅ `scripts/backup.sh` |

---

## 7. Regras de negócio

**RN01 — Idade estimada.** Quando a data de nascimento for desconhecida, o usuário informa a idade aproximada em meses e o sistema deriva uma data de nascimento estimada, marcando-a como aproximada.

**RN02 — Bloqueio de adoção.** Um animal só pode entrar em processo de adoção se estiver com status `disponivel`, castrado (ou com castração agendada) e com vacinação em dia.

**RN03 — Estados do animal.** (diagrama: página *Estados do animal*)

```
resgatado → em_tratamento → disponivel → em_processo → adotado
    ↓             ↓              ↓             ↓
  obito         obito          obito      disponivel (desistência)

adotado → disponivel (devolução, exige justificativa)
```

**RN04 — Estados do processo de adoção.** (diagrama: página *Fluxo de adoção*)

```
solicitado → em_triagem → aprovado → entregue → em_acompanhamento → concluido
     ↓            ↓           ↓
 cancelado    reprovado   cancelado
```

Transições fora desse grafo devem ser rejeitadas pela API com erro `409`. A reprovação e o cancelamento exigem justificativa com no mínimo 20 caracteres.

**RN05 — Exclusividade da candidatura.** Um animal pode ter várias candidaturas em `solicitado`, mas apenas uma em `aprovado`. Ao aprovar uma, as demais passam automaticamente para `cancelado` com justificativa padrão.

**RN06 — Cálculo de reforço vacinal.** Vacina V8/V10 filhote: reforço em 21 dias, até 3 doses. Antirrábica: reforço anual. O intervalo é configurável por tipo de vacina em tabela de parâmetros.

**RN07 — Alerta de pendência.** Um item do prontuário é "a vencer" quando faltam 30 dias ou menos para a data prevista, e "vencido" quando a data prevista já passou.

**RN08 — Custo por animal.** O custo de um animal é a soma das despesas diretamente vinculadas a ele mais o rateio das despesas gerais do período, dividido pelo número de animais ativos na ONG naquele mês.

**RN09 — Exclusão lógica.** Nenhum registro de animal, adoção ou lançamento financeiro é removido fisicamente. A exclusão marca o registro como inativo (`active = false`), preservando o histórico.
> Hoje a exclusão de animal é física (com fotos). Passa a ser lógica quando o prontuário for implementado.

**RN10 — Encerramento de apadrinhamento.** Quando um animal muda para `adotado` ou `obito`, todos os apadrinhamentos ativos vinculados a ele são encerrados e o padrinho é notificado por e-mail.

---

## 8. Modelo de domínio

Diagrama completo: página *Modelo de domínio* em [`docs/diagramas.drawio`](docs/diagramas.drawio). Os nomes abaixo são os nomes físicos das tabelas e colunas no PostgreSQL.

### Tabelas

```
users            (id, name, email, password_hash, role, active, created_at)              ✅ sem role/active

animals          (id, name, species, breed, sex, size, birth_date, birth_estimated,
                  intake_date, origin, color, neutered, microchip, status,
                  description, active)                                                   🟡

animal_photos    (id, animal_id, filename, is_cover, position)                           ✅ sem is_cover

medical_records  (id, animal_id [1:1], weight_kg, allergies, chronic_conditions,
                  updated_at)                                                            ⬜

clinical_events  (id, medical_record_id, vet_id, type, description, performed_at,
                  next_due_at, cost)                                                     ⬜

adopters         (id, name, cpf, email, phone, address, housing_type, has_screens,
                  other_pets, income_range, lgpd_consent_at)                             ⬜

adoption_requests(id, animal_id, adopter_id, status, requested_at, motivation,
                  screening_notes, justification, delivered_at, term_pdf)                🟡 dados do adotante embutidos

follow_ups       (id, adoption_request_id, milestone_days, due_at, done_at,
                  report, outcome)                                                       ⬜

donations        (id, type, donor_name, donor_contact, amount, item_description,
                  quantity, date, recurring)                                             ⬜

expenses         (id, category, description, amount, date, animal_id [nullable],
                  receipt)                                                               ⬜

volunteers       (id, user_id, availability, skills, joined_at)                          ⬜

tasks            (id, volunteer_id, title, description, date, shift, status, hours)      ⬜

sponsorships     (id, animal_id, sponsor_name, sponsor_contact, monthly_amount,
                  started_at, ended_at, active)                                          ⬜

contact_messages (id, name, email, phone, type, message, read, created_at)               ✅
```

### Enums

Definidos em [`api/src/constants.js`](api/src/constants.js) e criados como `CHECK` no banco pelas migrations.

```js
species          = ['cachorro', 'gato', 'outro']
sex              = ['macho', 'femea']
size             = ['pequeno', 'medio', 'grande']
animal_origin    = ['resgate_rua', 'entrega_voluntaria', 'transferencia', 'nascido_ong']
animal_status    = ['resgatado', 'em_tratamento', 'disponivel', 'em_processo', 'adotado', 'obito']
event_type       = ['vacina', 'vermifugo', 'castracao', 'consulta', 'cirurgia', 'exame', 'medicacao', 'obito']
adoption_status  = ['solicitado', 'em_triagem', 'aprovado', 'reprovado', 'entregue',
                    'em_acompanhamento', 'concluido', 'cancelado']
donation_type    = ['financeira', 'racao', 'medicamento', 'material', 'servico']
expense_category = ['alimentacao', 'veterinario', 'medicamento', 'estrutura', 'transporte', 'outros']
contact_type     = ['contato', 'voluntario', 'doacao', 'denuncia']
user_role        = ['admin', 'veterinario', 'voluntario']
shift            = ['manha', 'tarde', 'noite']
```

> Hoje `animal_status` ainda não tem `resgatado` e `obito`, e `adoption_status` usa `pendente`/`aprovado`/`recusado`. A troca é feita por uma nova migration na Sprint 3.

### Cardinalidades

- `animals` 1 — 1 `medical_records`
- `medical_records` 1 — N `clinical_events`
- `animals` 1 — N `animal_photos`
- `animals` 1 — N `adoption_requests` (histórico, inclusive de devoluções)
- `adopters` 1 — N `adoption_requests`
- `adoption_requests` 1 — N `follow_ups`
- `animals` 0 — N `expenses` (despesa pode ser geral)
- `animals` 1 — N `sponsorships`
- `users` 1 — 1 `volunteers`
- `volunteers` 1 — N `tasks`
- `users` 1 — N `clinical_events` (veterinário responsável)

---

## 9. Arquitetura

Diagramas: páginas *Camadas da aplicação* e *Implantação* em [`docs/diagramas.drawio`](docs/diagramas.drawio).

Duas aplicações JavaScript separadas — uma SPA React servida pelo Nginx e uma API REST em Express — com o PostgreSQL acessível apenas pela API.

```
resgate-animal/
├── api/                        # Backend Node.js (Express)
│   ├── migrations/             # Migrations Knex (001_init.js, ...) + index.js (registro)
│   └── src/
│       ├── server.js           # Inicialização: migrations, admin inicial, HTTP
│       ├── app.js              # Express: middlewares, rotas, tratamento de erros
│       ├── config.js           # Variáveis de ambiente
│       ├── db.js               # Conexão Knex/pg
│       ├── constants.js        # Enums do domínio
│       ├── middleware/         # auth (JWT), upload (multer), rateLimit
│       ├── routes/             # Endpoints REST + schemas zod
│       └── services/           # Regras de negócio (a criar: adoptionStateMachine, vaccineSchedule…)
├── web/                        # Frontend React (Vite)
│   ├── nginx.conf              # Servidor de produção + proxy /api e /uploads
│   └── src/
│       ├── api.js              # Cliente HTTP, token, rótulos
│       ├── components/         # Layout, cartões, hooks
│       └── pages/              # Páginas públicas e admin/
├── docs/diagramas.drawio       # Diagramas do projeto
├── scripts/backup.sh           # Backup do banco e das fotos
└── docker-compose.yml          # web (Nginx) + api (Node) + db (Postgres)
```

**Decisões de projeto:**

- As transições de estado ficam na camada de serviço, em um `adoptionStateMachine.js` dedicado, não espalhadas pelas rotas.
- As rotas nunca gravam o corpo da requisição direto no banco: todo dado passa por um schema zod, que valida e normaliza.
- Knex como *query builder* (sem ORM): SQL explícito, migrations versionadas e consultas de relatório escritas sob medida.
- Migrations registradas explicitamente em `migrations/index.js`, para funcionar igual no Windows, no Linux e no container.
- Só o Nginx expõe porta; API e banco ficam na rede interna do Docker.

---

## 10. Stack e dependências

| Camada | Tecnologia |
|---|---|
| Linguagem | JavaScript (ES Modules) |
| Runtime | Node.js 24 |
| API | Express 5, zod (validação), jsonwebtoken, bcryptjs, multer, helmet, express-rate-limit |
| Acesso a dados | Knex + pg |
| Frontend | React 19, React Router 7, Vite |
| Banco | PostgreSQL 18 |
| Migrations | Knex |
| Relatórios PDF | pdfkit (planejado) |
| E-mail | nodemailer (planejado) |
| Testes | `node:test` + supertest (planejado) |
| Servidor web | Nginx |
| Ambiente | Docker + Docker Compose em LXC no Proxmox |
| Versionamento | Git |

---

## 11. Principais rotas

### Páginas (frontend)

| Rota | Perfil | Descrição | Status |
|---|---|---|---|
| `/` | Público | Página inicial | ✅ |
| `/adote` | Público | Vitrine com filtros | ✅ |
| `/adote/:id` | Público | Detalhe do animal + candidatura | ✅ |
| `/ajude` | Público | Como ajudar + contato | ✅ |
| `/login` | Público | Autenticação | ✅ |
| `/admin` | admin | Listagem e cadastro de animais | ✅ |
| `/admin/animais/:id` | admin | Edição e fotos do animal | ✅ |
| `/admin/adocoes` | admin | Fila de candidaturas | ✅ |
| `/admin/mensagens` | admin | Mensagens recebidas | ✅ |
| `/admin/painel` | autenticado | Dashboard | ⬜ |
| `/admin/animais/:id/prontuario` | admin, veterinario | Prontuário e eventos clínicos | ⬜ |
| `/admin/pendencias` | admin, veterinario | Alertas veterinários | ⬜ |
| `/admin/financeiro` | admin | Doações, despesas e relatório | ⬜ |
| `/admin/voluntarios` | admin | Voluntários e escala | ⬜ |
| `/admin/apadrinhamentos` | admin | Apadrinhamentos | ⬜ |

### API REST (`/api`)

| Método | Rota | Perfil | Descrição | Status |
|---|---|---|---|---|
| GET | `/health` | Público | Saúde da API e do banco | ✅ |
| POST | `/auth/login` | Público | Login, retorna JWT | ✅ |
| GET | `/auth/me` | Autenticado | Usuário atual | ✅ |
| GET | `/animals` | Público | Lista com filtros `species`, `sex`, `size`, `status` | ✅ |
| GET | `/animals/:id` | Público | Detalhe com fotos | ✅ |
| POST / PUT / DELETE | `/animals[/:id]` | admin | Cadastro, edição, exclusão | ✅ |
| POST / DELETE | `/animals/:id/photos[/:photoId]` | admin | Envio e remoção de fotos | ✅ |
| POST | `/adoptions` | Público | Candidatura de adoção | ✅ |
| GET / PATCH | `/adoptions[/:id]` | admin | Fila e mudança de status | ✅ |
| POST | `/contacts` | Público | Mensagem de contato | ✅ |
| GET / PATCH | `/contacts[/:id]` | admin | Caixa de mensagens | ✅ |
| GET / POST | `/animals/:id/medical-record` | admin, veterinario | Prontuário e eventos | ⬜ |
| GET | `/pending-care` | admin, veterinario | Pendências veterinárias | ⬜ |
| GET | `/adoptions/:id/term.pdf` | admin | Termo de adoção | ⬜ |
| GET / POST | `/donations`, `/expenses` | admin | Financeiro | ⬜ |
| GET | `/reports/monthly` | admin | Relatório de transparência | ⬜ |
| GET / POST | `/volunteers`, `/tasks`, `/sponsorships` | admin | Voluntários e apadrinhamento | ⬜ |
| GET / POST / PATCH | `/users` | admin | Gestão de usuários | ⬜ |

---

## 12. Como executar

### Desenvolvimento local (sem Docker)

Pré-requisitos: Node.js 22+ e PostgreSQL instalado na máquina.

```sql
-- 1. No psql ou pgAdmin, como superusuário
CREATE USER resgate WITH PASSWORD 'sua-senha';
CREATE DATABASE resgate OWNER resgate;
```

```bash
# 2. Configurar
cp .env.example .env     # ajuste DATABASE_URL, JWT_SECRET e o admin

# 3. API (terminal 1) — aplica as migrations e cria o admin na primeira execução
cd api && npm install && npm run dev        # http://localhost:3000

# 4. Frontend (terminal 2) — repassa /api e /uploads para a API
cd web && npm install && npm run dev        # http://localhost:5173
```

Acesse `/admin` com `ADMIN_EMAIL` / `ADMIN_PASSWORD` definidos no `.env`.

### Variáveis de ambiente

```
POSTGRES_DB=resgate                 # usados pelo docker-compose
POSTGRES_USER=resgate
POSTGRES_PASSWORD=
DATABASE_URL=postgres://resgate:senha@localhost:5432/resgate   # só no dev local
JWT_SECRET=
ADMIN_NAME=Administrador
ADMIN_EMAIL=
ADMIN_PASSWORD=
WEB_PORT=80
UPLOAD_DIR=./uploads                # opcional
```

### Produção: Proxmox (LXC + Docker)

```
Internet ──► Proxy reverso HTTPS ──► LXC :80 [web] Nginx
                                         ├── /           → SPA React
                                         ├── /api/*      → [api] Express :3000 ──► [db] Postgres :5432
                                         └── /uploads/*  → [api] (volume "uploads")
```

1. **Criar o LXC** a partir do template Debian 13: 2 vCPU, 2 GB RAM, 20 GB de disco, não privilegiado, com *Options → Features*: **nesting** e **keyctl** habilitados (`pct set <CTID> --features nesting=1,keyctl=1`).
2. **Instalar Docker no LXC:**
   ```bash
   apt update && apt install -y curl git
   curl -fsSL https://get.docker.com | sh
   ```
3. **Subir a aplicação:**
   ```bash
   git clone <url-do-repositorio> /opt/resgate-animal
   cd /opt/resgate-animal
   cp .env.example .env && nano .env      # senhas fortes, JWT_SECRET, admin
   docker compose up -d --build
   docker compose logs -f api             # aguarde "API ouvindo na porta 3000"
   ```
4. **Atualizar:** `git pull && docker compose up -d --build`
5. **HTTPS:** Nginx Proxy Manager ou Caddy em outro LXC apontando para `http://<ip-do-lxc>:80`, ou Cloudflare Tunnel.
6. **Backups:** agende `scripts/backup.sh` no cron do LXC (`0 3 * * *`) e complemente com o backup do CT pelo Proxmox (*Datacenter → Backup*, modo snapshot). Para restaurar o banco:
   ```bash
   docker compose exec -T db pg_restore -U resgate -d resgate --clean < backups/<data>/banco.dump
   ```

---

## 13. Dados de teste

⬜ Criar um seed de desenvolvimento (`npm run seed`) que popule a base com: 3 usuários (um por perfil), 30 animais distribuídos entre todos os status, prontuários com eventos vencidos e a vencer, 8 processos de adoção em estágios diferentes, 40 lançamentos financeiros de 3 meses e 6 voluntários com escala.

O objetivo é que o dashboard e os relatórios já apareçam preenchidos em demonstrações, sem precisar cadastrar nada ao vivo. O seed nunca roda em produção.

---

## 14. Estratégia de testes

| Tipo | Alvo | Ferramenta | Status |
|---|---|---|---|
| Unitário | Máquina de estados, cálculo de reforço vacinal e de custo por animal | `node:test` | ⬜ |
| Integração | Rotas da API contra um PostgreSQL de teste | `node:test` + supertest | ⬜ |
| Ponta a ponta | Fluxos principais da API (login, animais, fotos, adoção, contato) | Script de verificação | 🟡 executado manualmente (31 casos) |
| Manual | Roteiro de casos de teste por requisito funcional | Planilha de evidências | ⬜ |

Casos obrigatórios: tentativa de transição inválida de estado, adoção de animal não castrado, aprovação de candidatura cancelando as demais, acesso de `voluntario` a rota financeira (deve retornar 403).

---

## 15. Cronograma

| Sprint | Semanas | Entrega | Status |
|---|---|---|---|
| 0 — Planejamento | 1–2 | Especificação, diagramas, setup do repositório e do Docker | ✅ |
| 1 — Fundação | 3–5 | Site público, autenticação, CRUD de animais, upload de fotos, deploy no Proxmox | 🟡 falta perfis e gestão de usuários |
| 2 — Prontuário | 6–8 | Prontuário, eventos clínicos, cálculo de reforços, painel de pendências | ⬜ |
| 3 — Adoção | 9–11 | Candidatura completa, máquina de estados, termo em PDF, acompanhamento | ⬜ |
| 4 — Financeiro e voluntários | 12–14 | Doações, despesas, custo por animal, relatório, escala, apadrinhamento | ⬜ |
| 5 — Fechamento | 15–16 | Dashboard, testes, seed, LGPD, documentação final | ⬜ |

---

## 16. Documentação

1. Especificação de requisitos (este README).
2. [`docs/diagramas.drawio`](docs/diagramas.drawio), com as páginas:
   - Modelo de domínio
   - Estados do animal
   - Fluxo de adoção
   - Camadas da aplicação
   - Implantação (Proxmox / LXC / Docker)
3. [`docs/relatorio/Relatorio-Resgate-Animal.pdf`](docs/relatorio/Relatorio-Resgate-Animal.pdf): relatório final no formato acadêmico, com estudo de caso fictício (Associação Focinho Amigo), capturas de tela e testes. A fonte é `docs/relatorio/relatorio.html`; para regerar o PDF, abra no Chrome ou Edge e imprima com "Salvar como PDF", margens padrão e gráficos de fundo ativados.
4. Diagrama de casos de uso. ⬜
5. Protótipo de interface. ⬜

---

## 17. Evoluções futuras

- Notificações por e-mail e WhatsApp para adotantes, padrinhos e equipe.
- Integração com gateway de pagamento para doações recorrentes.
- Página de histórias de sucesso (animais adotados).
- Módulo de feiras de adoção com registro de resultados por evento.
- Sugestão de compatibilidade entre perfil do adotante e do animal.
- Aplicativo móvel consumindo a mesma API REST.

---

## 18. Equipe

| Integrante | Responsabilidade |
|---|---|
| | Backend / domínio |
| | Frontend |
| | Infraestrutura (Proxmox / Docker) |
| | Testes / documentação |

---

## 19. Licença

Projeto sem fins lucrativos. MIT.
