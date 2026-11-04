# Roteiro do vídeo — Resgate Animal

**Duração alvo:** cerca de 10 minutos · **Formato:** gravação de tela com narração, cada integrante apresentando a parte em que trabalhou.
**Ambiente da demonstração:** sistema publicado no LXC (`http://192.168.0.109`), com os dados fictícios da Associação Focinho Amigo.

| # | Bloco | Apresentador | Tempo | Duração |
|---|---|---|---|---|
| 1 | Abertura e o problema | David | 0:00 – 0:50 | 50 s |
| 2 | Site público | Breno | 0:50 – 2:50 | 2 min |
| 3 | Painel administrativo | Gabriel | 2:50 – 4:30 | 1 min 40 s |
| 4 | Código da API (Express) | Caio | 4:30 – 5:40 | 1 min 10 s |
| 5 | Regras, segurança e uploads | Eduardo | 5:40 – 6:50 | 1 min 10 s |
| 6 | Banco de dados | Jessica | 6:50 – 8:00 | 1 min 10 s |
| 7 | Infraestrutura e implantação | David | 8:00 – 9:20 | 1 min 20 s |
| 8 | Testes, resultados e encerramento | Gabriel | 9:20 – 10:15 | 55 s |

> As falas são sugestões: leiam em voz alta uma vez e adaptem ao jeito de cada um. O que importa é a **ação na tela** casar com a **fala**.

---

## Antes de gravar (checklist)

**Dados de demonstração.** O banco do LXC está vazio. No painel (`/admin`), cadastrem os animais abaixo usando as ilustrações de [`fotos-demo/`](fotos-demo/). Deixem **a Mel e a Bolinha de fora**: elas serão cadastradas e usadas ao vivo no vídeo.

| Animal | Espécie / sexo / porte | Idade (meses) | Status | Fotos |
|---|---|---|---|---|
| Thor | cachorro / macho / grande | 36 | disponível | `thor.jpg`, `thor-2.jpg` |
| Luna | gato / fêmea / pequeno | 30 | disponível | `luna.jpg` |
| Caramelo | cachorro / macho / médio | 48 | disponível | `caramelo.jpg` |
| Frajola | gato / macho / médio | 60 | disponível | `frajola.jpg` |
| Pretinha | cachorro / fêmea / médio | 72 | em processo de adoção | `pretinha.jpg` |
| Pipoca | cachorro / macho / pequeno | 18 | em tratamento | `pipoca.jpg` |
| Nina | gato / fêmea / pequeno | 20 | adotado | `nina.jpg` |

Use as descrições do Capítulo 2 / Seção 9 do relatório, ou escrevam as de vocês. Também enviem pelo site **uma candidatura** (para o Thor) e **duas mensagens** em "Como ajudar" (uma de voluntariado e uma denúncia), para o painel não aparecer vazio.

**Navegador**
- Janela em 1920×1080, zoom 110% a 125% para o texto ficar legível no vídeo.
- Aba anônima (sem extensões, sem histórico aparecendo no autocompletar).
- Deixar o login do admin **já digitado em um bloco de notas fora da tela**, ou fazer o login antes de começar o bloco 3.

**Editor de código (VS Code)**
- Tema claro ou escuro com fonte 18 ou maior; esconder a barra lateral quando não for usada.
- Abrir as abas na ordem dos blocos 4, 5 e 6, para não perder tempo procurando arquivo.

**Terminal do LXC**
- Fonte grande, `clear` antes de cada comando.
- **Nunca mostrar o arquivo `.env`** nem rodar `cat .env` ou `grep ADMIN_PASSWORD`. Ele tem as senhas reais do servidor.

**Gravação**
- OBS Studio (gratuito), gravando a tela inteira a 1080p e 30 fps, com microfone separado se possível.
- Cada integrante grava o próprio bloco; a edição junta tudo. Combinem a mesma resolução e o mesmo zoom do navegador.

---

## Bloco 1 — Abertura e o problema · David · 0:00 – 0:50

| Tela / ação | Fala sugerida |
|---|---|
| Capa do relatório (`docs/relatorio/Relatorio-Resgate-Animal.pdf`, página 1). | "Olá! Este é o Resgate Animal, um sistema web para ONGs de resgate e proteção animal, desenvolvido por Breno, Caio, David, Eduardo, Gabriel e Jessica." |
| Página 16 do PDF: as citações do estudo de caso. | "Para guiar o projeto, criamos uma ONG fictícia, a Associação Focinho Amigo. O dia a dia dela é de muitas ONGs reais: pedidos de adoção espalhados entre Instagram, WhatsApp e e-mail, denúncias que se perdem, vacinas controladas num caderno. Um mesmo cachorro, o Thor, chegou a ser prometido para duas famílias." |
| Página 16, gráfico dos canais (Figura 3). | "Quase metade dos pedidos chegava por mensagem direta no Instagram. A nossa proposta foi juntar tudo num lugar só: o site da ONG e um painel de gestão." |
| Corte para o navegador em `http://192.168.0.109`. | "Vamos ver o sistema funcionando." |

---

## Bloco 2 — Site público · Breno · 0:50 – 2:50

| Tela / ação | Fala sugerida |
|---|---|
| Página inicial. Rolar devagar até os cartões dos animais e os três pilares. | "Esta é a página inicial. Ela apresenta a missão da ONG, os animais disponíveis mais recentes e os três pilares do trabalho: resgate, cuidado e adoção responsável. O frontend é feito em React com Vite." |
| Clicar em **Adote**. | "Na vitrine aparecem só os animais disponíveis. A Pretinha, que está em processo de adoção, e a Nina, que já foi adotada, não aparecem aqui." |
| Filtrar **Espécie: Gato**. Mostrar a URL mudando para `?species=gato`. | "Os filtros ficam na URL. Assim a ONG pode postar no Instagram um link direto para 'nossos gatos'." |
| Limpar o filtro e clicar no **Thor**. Passar pelas duas fotos. | "Cada animal tem a sua página, com galeria de fotos, ficha, história e observações de saúde." |
| Rolar até **Quero adotar Thor**. Preencher com dados fictícios e enviar. Mostrar a mensagem de confirmação. | "E aqui está a principal mudança para a ONG: o pedido de adoção é feito pelo próprio site e cai direto numa fila no painel. Nada mais se perde no celular de alguém." |
| Clicar em **Como ajudar**. Mostrar os três cartões e enviar uma mensagem com assunto **Denúncia**. | "Em 'Como ajudar' ficam a doação por PIX, o voluntariado e o canal de denúncia. A mensagem chega classificada pelo assunto." |
| Abrir o DevTools (F12) e ativar o modo celular (Ctrl+Shift+M), iPhone ou Pixel. Navegar pela página inicial. | "Como a maior parte do público vem do celular, todo o site se adapta a telas pequenas." |

---

## Bloco 3 — Painel administrativo · Gabriel · 2:50 – 4:30

| Tela / ação | Fala sugerida |
|---|---|
| Ir direto para `/admin`, que redireciona para `/login`. | "Se alguém tenta abrir o painel sem login, o sistema leva para a tela de entrada." |
| Fazer login (credenciais fora da tela). | "Depois de entrar, voltamos para a página que tínhamos pedido." |
| Lista de animais. Clicar em **+ Cadastrar animal** e cadastrar a **Mel** (gato, fêmea, pequeno, 14 meses, castrada e vacinada). Salvar. | "Vamos cadastrar a Mel, que acabou de ser resgatada." |
| No editor da Mel, enviar `mel.jpg` e `mel-2.jpg` de uma vez. Remover uma e enviar de novo. | "Podemos enviar várias fotos ao mesmo tempo e remover qualquer uma. A primeira foto vira a capa na vitrine." |
| Abrir o site em outra aba e mostrar a Mel na vitrine. | "E a Mel já aparece no site para adoção." |
| Voltar ao painel, aba **Adoções**. Mostrar o pedido enviado no bloco 2 e clicar em **Aprovar**. | "Na fila de adoções aparece o pedido para o Thor, com contatos e o relato da família. A coordenação aprova ou recusa com um clique." |
| Editar o Thor e mudar o status para **Em processo de adoção**. Mostrar que ele sai da vitrine. | "Com a adoção encaminhada, o Thor passa para 'em processo' e sai da vitrine, então novas famílias não o encontram mais na lista." |
| Aba **Mensagens**. Mostrar a denúncia e clicar em **Marcar como lida**. | "As mensagens chegam separadas por tipo. Depois de tratada, a mensagem fica esmaecida e a equipe vê o que ainda falta responder." |

---

## Bloco 4 — Código da API · Caio · 4:30 – 5:40

| Tela / ação | Fala sugerida |
|---|---|
| VS Code, árvore do projeto: pastas `api/`, `web/`, `docs/`, `scripts/`. | "O projeto é todo em JavaScript: a API em Node.js com Express na pasta `api`, o site em React na pasta `web`." |
| [`api/src/app.js`](../../api/src/app.js) linhas 16 a 31. | "O `app.js` monta a aplicação: confia no proxy Nginx para saber o IP real, aplica cabeçalhos de segurança com o helmet, limita o corpo das requisições a 100 kB e registra as rotas: autenticação, animais, adoções e contatos." |
| [`api/src/app.js`](../../api/src/app.js) linha 36 em diante. | "Todos os erros passam por um tratador central. Se a validação falhar, a resposta é 400 com os detalhes. Erros inesperados viram 500, sem expor nada interno." |
| [`api/src/routes/animals.js`](../../api/src/routes/animals.js) linha 10 (`animalSchema`). | "Cada rota valida a entrada com um esquema do zod. Nome, espécie, porte, idade: se algo vier errado, a requisição é recusada antes de chegar ao banco." |
| Mesmo arquivo, linhas 47 e 67. | "A listagem é pública e aceita filtros. O cadastro exige o middleware `requireAuth`, ou seja, só o administrador logado consegue criar ou alterar animais." |

---

## Bloco 5 — Regras, segurança e uploads · Eduardo · 5:40 – 6:50

| Tela / ação | Fala sugerida |
|---|---|
| [`api/src/routes/adoptions.js`](../../api/src/routes/adoptions.js) linhas 22 a 26. | "Aqui está uma regra de negócio: só aceitamos candidatura para animal disponível ou em processo. Se alguém tentar adotar um animal já adotado, a API recusa." |
| [`api/src/routes/auth.js`](../../api/src/routes/auth.js) linhas 20 a 25. | "No login, comparamos a senha com o hash bcrypt guardado no banco. Se estiver certa, geramos um token JWT válido por 8 horas. A mensagem de erro é sempre a mesma, para não revelar se o e-mail existe." |
| [`api/src/middleware/auth.js`](../../api/src/middleware/auth.js) linha 10. | "Esse token é verificado em toda rota administrativa." |
| [`api/src/middleware/upload.js`](../../api/src/middleware/upload.js) linhas 7 a 16. | "No envio de fotos, aceitamos só JPG, PNG e WEBP de até 5 MB, e o nome do arquivo é um UUID gerado pelo servidor. Ninguém consegue sobrescrever arquivos ou enviar um script disfarçado." |
| [`api/src/middleware/rateLimit.js`](../../api/src/middleware/rateLimit.js) linha 6. | "E o login e os formulários públicos aceitam no máximo 20 envios a cada 15 minutos por IP, contra spam e força bruta." |

---

## Bloco 6 — Banco de dados · Jessica · 6:50 – 8:00

| Tela / ação | Fala sugerida |
|---|---|
| draw.io com [`docs/diagramas.drawio`](../diagramas.drawio), página "Modelo de domínio". | "Este é o modelo completo do banco, com 14 tabelas divididas por módulo, cada um com uma cor. Nesta versão estão implementadas cinco: usuários, animais, fotos, pedidos de adoção e mensagens." |
| Página "Fluxo de adoção" do draw.io. | "Também modelamos os estados do animal e do processo de adoção, que guiam as próximas versões." |
| [`api/migrations/001_init.js`](../../api/migrations/001_init.js) linhas 23, 30 e 38. | "O banco é PostgreSQL 18, criado por migrations. Os status só aceitam valores válidos. As fotos usam `ON DELETE CASCADE`: se o animal sai, as fotos saem junto. Já o pedido de adoção usa `SET NULL`, para o histórico nunca se perder." |
| [`api/src/server.js`](../../api/src/server.js) linhas 7 a 9. | "Quando a API sobe, ela aplica as migrations pendentes e cria o administrador inicial. Atualizar o sistema nunca deixa o banco desatualizado." |
| Terminal do LXC: `cd /opt/resgate-animal && docker compose exec db psql -U resgate -d resgate -c "\dt"` | "Aqui está o banco rodando no servidor, com as tabelas criadas." |
| `docker compose exec db psql -U resgate -d resgate -c "select id, email, left(password_hash, 20) as hash from users;"` | "E a senha do administrador está guardada só como hash bcrypt, nunca em texto." |

---

## Bloco 7 — Infraestrutura e implantação · David · 8:00 – 9:20

| Tela / ação | Fala sugerida |
|---|---|
| draw.io, página "Implantação (Proxmox)". | "A aplicação roda num servidor Proxmox, dentro de um container LXC com Docker. São três containers: o Nginx, a API e o PostgreSQL. Só o Nginx fica exposto." |
| Interface web do Proxmox: CT 301, aba **Options** (Features: nesting, keyctl) e **Summary** (CPU e memória). | "Este é o nosso container: Ubuntu 22.04, 1 vCPU e 1 GB de memória, que bastam para o porte de uma ONG." |
| [`docker-compose.yml`](../../docker-compose.yml) linhas 24, 27 e 41. | "O Docker Compose descreve tudo. A API só sobe depois que o banco está saudável, a conexão é montada a partir das variáveis de ambiente e só a porta 80 é publicada." |
| [`web/nginx.conf`](../../web/nginx.conf) linhas 14 a 32. | "O Nginx entrega o site em React e repassa `/api` e `/uploads` para a API." |
| Terminal do LXC: `docker compose ps` | "No servidor, os três containers estão rodando, e o banco aparece como saudável." |
| Terminal do LXC: `git pull && docker compose up -d --build` (sem mudanças, só para mostrar o comando). | "Para atualizar, basta um `git pull` e um comando do Compose. O servidor baixa o código do GitHub por uma deploy key somente leitura." |
| [`scripts/backup.sh`](../../scripts/backup.sh) linhas 12 a 16, e `ls backups/` no LXC. | "Todo dia às 3 da manhã, um script faz o dump do banco e copia as fotos, guardando os últimos 14 dias. E o Proxmox ainda faz backup do container inteiro." |

---

## Bloco 8 — Testes, resultados e encerramento · Gabriel · 9:20 – 10:15

| Tela / ação | Fala sugerida |
|---|---|
| PDF, página 46 (Tabela 14, casos de teste). | "Validamos a API com 31 testes de ponta a ponta: login, permissões, validação, fotos, adoção e contato. Todos passaram, e eles ainda encontraram um defeito de fuso horário nas datas, que corrigimos." |
| PDF, página 47 (Tabela 15, objetivos). | "Os objetivos desta etapa foram atingidos, e o sistema já está publicado no nosso servidor." |
| README no GitHub, seção 5, com os requisitos e os status ✅ 🟡 ⬜. | "A especificação completa tem 39 requisitos. Os próximos passos são o prontuário veterinário com alerta de vacinas, o fluxo completo de adoção com termo em PDF e o módulo financeiro para prestação de contas." |
| Voltar para a página inicial do site. | "O Resgate Animal mostra que dá para construir, com software livre e baixo custo, uma ferramenta de verdade para quem cuida dos animais. Obrigado!" |
| Tela final com os nomes e RAs dos integrantes. | (sem fala, 5 segundos) |

---

## Edição

- **Ordem:** juntar os blocos 1 a 8. Usar cortes secos entre os blocos, com o nome de quem apresenta no canto inferior nos 3 primeiros segundos.
- **Zoom no código:** nos blocos 4 a 6, dar zoom na região das linhas citadas. No editor (DaVinci Resolve, Shotcut ou CapCut) isso é um *crop* com animação.
- **Legendas:** colocar o caminho do arquivo (`api/src/routes/auth.js`) na parte de baixo da tela sempre que o código aparecer.
- **Tela final:** fundo creme `#fdf9f5`, título "Resgate Animal" em laranja `#b85a1a`, os seis nomes com RA e o link do repositório, se ele for apresentado.
- **Duração:** se passar de 10 minutos, os primeiros cortes são o modo celular (bloco 2) e o `git pull` (bloco 7).
