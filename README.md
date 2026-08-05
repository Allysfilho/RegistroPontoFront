# Prompt de implementação — Sistema de Registro de Ponto Multi-tenant (v1)

Este documento é a especificação completa para implementar o projeto do zero. Leia tudo antes de começar a escrever código.

---

## Como trabalhar neste projeto

- Implemente **uma fase por vez** (seção 8). Não pule fases nem antecipe trabalho de fases futuras.
- Ao terminar cada fase: pare, resuma o que foi construído, e liste passos concretos para eu validar com dado real (comandos para rodar, o que checar no banco, o que testar na tela). Só siga para a próxima fase depois da minha confirmação.
- Se alguma decisão desta spec parecer ambígua na hora de codar, pergunte antes de assumir — mas não reabra decisões já tomadas aqui sem motivo forte.
- Siga convenções idiomáticas de Laravel e Vue 3; não precisa me consultar sobre estilo de código.
- Os dois projetos (backend e frontend) já existem como pastas abertas no workspace — confira o estado atual de cada um antes de assumir que estão vazios.

---

## 1. Contexto

Sistema web de registro de ponto (controle de frequência), multi-tenant — cada empresa-cliente é isolada por schema dentro da mesma aplicação. Uso inicial: 1 empresa, ~50 funcionários. Deve funcionar bem em PC e celular (responsivo).

Fluxo essencial: funcionário loga com matrícula/CPF (ou identificador definido pela empresa) + senha, bate o ponto, o sistema opcionalmente valida se ele está numa localização permitida antes de aceitar o registro. Administradores gerenciam sua empresa num painel próprio; um superadmin gerencia o SaaS como um todo.

---

## 2. Escopo da v1

### Está dentro

- Multi-tenancy real via **schema-per-tenant** (Postgres), mesmo com só 1 empresa hoje.
- Autenticação de funcionário por matrícula/CPF/identificador customizado + senha.
- Autenticação de administrador (dentro do schema da empresa) e de superadmin (central, fora de qualquer tenant).
- **Painel administrativo funcional**: estabelecimento, locais permitidos, gestão de funcionários e administradores, definição/reset de senha sem depender de e-mail.
- Captura de foto no momento do ponto, salva como evidência do registro.
- Validação de geolocalização (Haversine), configurável por empresa e por funcionário.
- Geocodificação reversa (endereço legível) via Nominatim self-hosted.
- Consulta pelo funcionário dos próprios registros.
- Fluxo de solicitação de ajuste (esquecimento de marcação etc.), com aprovação pelo admin no painel.
- Modelo de dados já preparado para os requisitos legais futuros do REP-P (ver seção 9), mesmo sem implementá-los agora.
- `docker compose up` sobe backend + frontend buildado. `npm run dev` continua disponível à parte para desenvolvimento do frontend com hot-reload.

### Está fora — não construir agora

- **PWA completo** (manifest.json, service worker, instalação "adicionar à tela inicial"). Construa um SPA Vue responsivo normal — câmera (`getUserMedia`) e geolocalização funcionam em navegador comum, não dependem de PWA.
- **Reconhecimento facial ativo** (comparação/verificação biométrica via AWS Rekognition ou self-hosted). A v1 só captura e guarda a foto — não compara com nada. Não crie tabela de templates biométricos nem lógica de matching.
- Anti-spoofing/liveness (consequência do item acima).
- Geração dos arquivos AFD/AEJ, assinatura digital ICP-Brasil, registro do software no INPI — tudo isso é REP-P pleno, fase futura.
- Múltiplos estabelecimentos por empresa — modele a tabela `estabelecimentos` (é barato e evita migração depois), mas a UI e os fluxos podem assumir 1 estabelecimento por empresa por enquanto.
- Envio de e-mail transacional (sem servidor SMTP configurado ainda) — ver seção 6 para como o fluxo de senha funciona sem isso.

---

## 3. Stack e decisões de arquitetura

| Camada | Escolha | Por quê |
|---|---|---|
| Backend | Laravel (API REST) + Filament (painel admin) | Definido pelo usuário para a API; Filament é a adição para o painel — ver seção 6 |
| Auth de API (funcionário) | Laravel Sanctum | Padrão simples para SPA consumindo API própria |
| Frontend (funcionário) | Vue 3 (Composition API), SPA responsivo | Definido pelo usuário. Sem PWA por enquanto (ver seção 2) |
| Banco de dados | PostgreSQL, já existe no host (`bd_sistema_ponto_intelix`, porta 5432), fora do Docker | Já provisionado pelo usuário — os schemas de cada tenant são criados **dentro** desse mesmo banco, não é um banco novo |
| Multi-tenancy | Pacote `stancl/tenancy`, **schema-per-tenant** (Postgres) | Confirmado nesta rodada. Isolamento mais forte para dado sensível (fotos de funcionários) do que row-level, sem o overhead de banco-por-tenant. A resolução do tenant acontece via middleware do pacote a partir do slug na URL — depois disso, toda query do Eloquent já opera automaticamente no schema correto, sem depender de um Global Scope aplicado manualmente em cada tabela (o que reduz o risco de um bug vazar dado entre empresas por esquecimento de código) |
| Fila/cache | Redis + Laravel Horizon | Necessário já na v1 para a geocodificação reversa assíncrona (não deve travar a resposta do ponto) e para rate limiting no login |
| Storage de fotos | Disco local via volume Docker, não efêmero | Adequado para o volume atual (50 funcionários) |

---

## 4. Modelo de dados

### Banco central (landlord — gerenciado pelo `stancl/tenancy`)

| Tabela | Campos-chave | Notas |
|---|---|---|
| `tenants` | id, slug (usado na URL), nome_razao_social, cnpj, tipo_identificador_funcionario (enum `matricula`\|`cpf`\|`custom`) | Modelo central do pacote, estendido com esses campos — representa a "empresa" no domínio |
| `superadmins` | id, nome, email (unique), senha (hash), senha_provisoria | Não pertence a nenhum tenant — gerencia o SaaS como um todo |

### Dentro do schema de cada tenant

| Tabela | Campos-chave | Notas |
|---|---|---|
| `estabelecimentos` | id, cnpj_cpf, endereco | Sem `empresa_id` — o schema já isola. 1 por tenant por enquanto |
| `locais_permitidos` | id, estabelecimento_id (FK), nome, latitude, longitude, raio_metros | |
| `administradores` | id, nome, email (unique dentro do schema), senha (hash), senha_provisoria, status | Gerencia a própria empresa — superadmin vive no banco central, não aqui |
| `funcionarios` | id, estabelecimento_id (FK), identificador (unique dentro do schema, validado conforme `tenants.tipo_identificador_funcionario`), nome, senha (hash), senha_provisoria, exige_geolocalizacao (bool, nullable = usa padrão da empresa), status | |
| `registros_ponto` | id, funcionario_id (FK), **nsr** (inteiro, sequencial por estabelecimento, sem furos), tipo (enum `entrada`/`saida`), registrado_em (timestamp **com timezone**), latitude, longitude, distancia_metros (nullable), geolocalizacao_validada (bool, nullable), endereco_legivel (nullable, preenchido depois, assíncrono), foto_evidencia_path, ip_address, user_agent, created_at | **Append-only: sem rota de UPDATE/DELETE.** Correção é via `solicitacoes_ajuste` |
| `solicitacoes_ajuste` | id, funcionario_id (FK), registro_ponto_id (FK, nullable), motivo (text), status (enum `pendente`/`aprovado`/`rejeitado`), aprovado_por (FK administradores, nullable), created_at, updated_at | |
| `configuracoes` | exige_geolocalizacao (bool), raio_padrao_metros (int, nullable) | Singleton por schema |
| `tentativas_ponto_negadas` | id, funcionario_id (FK), motivo, latitude, longitude, distancia_metros, created_at | Tentativas rejeitadas por geolocalização — auditoria antifraude, não vira `registros_ponto` |

**Sobre o NSR:** não use o auto-incremento da PK. Implemente um contador próprio por `estabelecimento_id` (ex: coluna `proximo_nsr` em `estabelecimentos`, incrementada dentro de transação com lock de linha) para garantir sequência sem furos — exigência da Portaria 671/2021 mesmo a v1 não gerando os arquivos ainda.

---

## 5. Fluxos principais

### Login do funcionário

1. Acessa `/{empresa_slug}/entrar`.
2. Backend resolve o tenant pelo slug (troca de schema via `stancl/tenancy`).
3. Informa identificador (matrícula/CPF/customizado) + senha, autentica dentro do schema correto, retorna token Sanctum.
4. Se `senha_provisoria = true`: força tela de troca de senha antes de liberar o resto do app.

### Login do administrador (dentro do tenant)

1. Acessa `/{empresa_slug}/admin/entrar` — mesma resolução de tenant por slug.
2. Enxerga só dados da própria empresa, garantido pelo isolamento de schema (não precisa de escopo manual).
3. Mesma regra de `senha_provisoria`.

### Login do superadmin (central)

1. Acessa `/central/entrar` — não passa por resolução de tenant, autentica contra o banco landlord.
2. Acesso irrestrito a todos os tenants via o painel central (seção 6).

### Bater ponto (fluxo central do sistema)

1. Funcionário autenticado abre a tela de bater ponto.
2. Frontend ativa a câmera (`getUserMedia`) e captura uma foto — sem nenhuma validação/comparação, é só evidência.
3. Se `exige_geolocalizacao` estiver ativo (override do funcionário ou, na ausência, config da empresa): frontend pede a posição via `navigator.geolocation.getCurrentPosition`.
4. Envia foto + lat/lng (se aplicável) para o backend.
5. Backend, de forma **síncrona**:
   - Se exige geolocalização: calcula Haversine contra o(s) `locais_permitidos`. Fora do raio → rejeita, grava em `tentativas_ponto_negadas`, **não cria `registros_ponto`**.
   - Se passou: gera o próximo NSR do estabelecimento, salva a foto, grava o `registros_ponto`.
6. Confirma para o funcionário. A resolução do endereço legível (Nominatim) acontece depois, assíncrona via fila.

### Solicitação de ajuste

Funcionário abre uma `solicitacao_ajuste` vinculada (ou não) a um registro, com motivo. Fica pendente até um admin aprovar/rejeitar no painel do tenant — aprovar não edita o `registros_ponto` original.

---

## 6. Painel administrativo

**Recomendação: Filament**, com **dois painéis separados** — consequência direta de usar schema-per-tenant:

- **Painel central** (`/central/...`, fora do contexto de qualquer tenant, opera no banco landlord): só superadmin acessa. CRUD de `tenants` (cadastro de novas empresas-clientes: slug, CNPJ, tipo de identificador) e de outros `superadmins`.
- **Painel do tenant** (`/{empresa_slug}/admin/...`, resolvido para o schema daquela empresa): admin acessa. CRUD de estabelecimento, locais permitidos, funcionários, outros administradores da mesma empresa, configurações, aprovação de solicitações de ajuste.

Isso é mais setup do que um painel único (a alternativa seria row-level, com 1 painel só) — é o preço de ter isolamento por schema. O `stancl/tenancy` tem suporte documentado para múltiplos painéis Filament (central + tenant); vale conferir a documentação atual do pacote para a integração exata na hora de implementar, em vez de assumir a API de memória.

Se preferirem manter tudo em Vue por uniformidade de stack em vez de Filament, também é viável, só que com bem mais tempo de tela para construir manualmente — comece por Filament se não houver objeção.

### Senha sem servidor SMTP

Não há e-mail configurado ainda, então o fluxo de senha é todo assistido, sem depender de envio de e-mail:

1. **Criação de funcionário/administrador/superadmin**: sistema gera uma senha aleatória (8–10 caracteres, evitando caracteres ambíguos como `0`/`O` e `1`/`l`, já que vai ser repassada verbalmente ou por WhatsApp), exibida **uma única vez** na tela para quem está cadastrando. Campo `senha_provisoria = true`.
2. **Primeiro login com senha provisória**: força troca de senha antes de liberar o resto do sistema.
3. **Esqueci minha senha**: sem estar logado, não tem como fazer self-service sem e-mail. A pessoa contata um administrador (ou um superadmin, se for um administrador que esqueceu), que reseta pelo painel correspondente — mesmo mecanismo do item 1.
4. **Troca voluntária** (já logado, sabe a senha atual): self-service normal, não depende de e-mail.

Isso cobre 100% dos casos sem SMTP. Quando tiverem um provedor de e-mail transacional (SES, Postmark, Resend, Mailgun etc.), um fluxo de "esqueci minha senha" por link de e-mail é um acréscimo por cima — a estrutura de dados já suporta, é troca da camada de entrega, não do modelo.

---

## 7. Infraestrutura e ambiente de desenvolvimento

### Estrutura de diretórios

Dois projetos separados, mesma pasta pai:
- Backend (Laravel + Filament): `RegistroPonto`
- Frontend (Vue, app do funcionário): `RegistroPontoFront`

### `docker compose up`

Sobe dois serviços:
- **`backend`**: Laravel via PHP-FPM + Nginx (ou Octane), expondo a API numa porta (ex: 8000). Conecta ao Postgres do host — **em Docker Desktop no Windows, use `DB_HOST=host.docker.internal`** (não `localhost`, que dentro do container aponta para o próprio container) para alcançar o banco `bd_sistema_ponto_intelix` já existente na porta 5432 do host. Não criar um banco novo — os schemas de cada tenant são criados dinamicamente pelo `stancl/tenancy` dentro desse banco.
- **`frontend`**: Dockerfile multi-stage — stage 1 (node) roda `npm ci && npm run build` usando o diretório `RegistroPontoFront` como build context (caminho relativo `../RegistroPontoFront` a partir do `docker-compose.yml`, que deve ficar na raiz do backend); stage 2 (nginx leve) serve os arquivos estáticos gerados numa porta (ex: 8080), com fallback de SPA (rota não encontrada retorna `index.html`) e proxy reverso de `/api` para o serviço `backend`.

Isso cobre "subir com `docker compose up` o backend e um front já buildado com base no conteúdo atual do diretório".

### `npm run dev` (desenvolvimento ativo do frontend)

Rodado diretamente no diretório `RegistroPontoFront`, fora do Docker, sobe o Vite dev server com hot-reload. Configure a variável de ambiente do Vite (base URL da API) apontando para onde o backend estiver acessível — `localhost:8000` se o serviço `backend` estiver rodando via `docker compose up`, ou o host/porta do Laragon se preferirem rodar o backend nativo durante o desenvolvimento.

### Volumes persistentes (não efêmeros)

Fotos de evidência do ponto, dados do Nominatim.

### Nominatim

Não importe o planeta inteiro — use o extrato regional do Brasil disponível via Geofabrik. Reduz drasticamente tempo de setup e espaço em disco.

---

## 8. Fases de implementação

Cada fase termina com um checkpoint — pare e me avise o que validar antes de seguir.

0. **Setup dos dois projetos.** Conferir estado atual de `RegistroPonto` e `RegistroPontoFront`. Inicializar o que faltar. `docker-compose.yml` com os serviços `backend` e `frontend` (seção 7), conexão com o Postgres do host funcionando via `host.docker.internal`. *Validar: `docker compose up` sobe os dois serviços, backend responde num endpoint de teste, frontend buildado carrega no navegador.*
1. **Fundação multi-tenant.** `stancl/tenancy` configurado com schema-per-tenant, identificação por slug na URL, criar um tenant de teste. *Validar: criar 2 tenants de teste, confirmar isolamento de schema (dado de um não aparece no outro).*
2. **Autenticação.** Login de funcionário e de administrador (dentro do tenant) e de superadmin (central), Sanctum, lógica de `senha_provisoria` com troca obrigatória no primeiro login. *Validar: login de teste para os três tipos de usuário.*
3. **Painel administrativo (Filament).** Painel central (superadmin: CRUD de tenants) e painel do tenant (admin: CRUD de estabelecimento, locais permitidos, funcionários, outros administradores). Fluxo completo de senha sem SMTP (seção 6). *Validar: criar uma empresa pelo painel central; cadastrar o estabelecimento e os funcionários reais (ou de teste) pelo painel do tenant; testar reset de senha.*
4. **Geolocalização.** Captura no frontend, validação Haversine no backend, respeitando config por empresa/funcionário. *Validar: bater ponto de dentro e de fora do raio configurado, com coordenadas reais.*
5. **Registro de ponto com foto.** Captura de foto, upload, geração de NSR, gravação append-only. *Validar: bater ponto de ponta a ponta, conferir NSR sequencial no banco, conferir que não existe rota de edição do registro.*
6. **Consulta de registros + solicitação de ajuste.** Funcionário vê os próprios registros; fluxo de solicitação de ajuste com aprovação no painel do tenant. *Validar: consultar registros de um funcionário de teste; abrir e aprovar uma solicitação pelo Filament.*
7. **Geocodificação reversa.** Nominatim self-hosted (extrato Brasil), job assíncrono preenchendo `endereco_legivel`. *Validar: bater ponto, conferir que o endereço aparece no registro pouco depois.*
8. **Hardening básico.** Rate limiting no login, logs estruturados, teste automatizado de isolamento entre tenants. *Validar: teste automatizado passando; tentativa de força bruta bloqueada.*

---

## 9. Regras não-negociáveis (checklist final)

- [ ] Isolamento de schema testado automaticamente — criar 2 tenants de teste, confirmar que dado de um não aparece no outro.
- [ ] Painel central (superadmin) e painel do tenant (admin) configurados como panels Filament separados, cada um autenticando e operando no contexto certo.
- [ ] Senha provisória força troca no primeiro login, para funcionário, administrador e superadmin.
- [ ] NSR sequencial por estabelecimento, começando em 1, sem furos, gerado com lock para evitar corrida.
- [ ] `registros_ponto` é append-only — nenhuma rota de UPDATE/DELETE nela.
- [ ] Todo `registrado_em` grava timezone explícito (não usar datetime "naive").
- [ ] Campos que os leiautes futuros (AFD/AEJ) vão pedir já existem na tabela, mesmo sem gerar os arquivos ainda.
- [ ] Nenhuma tabela de template/embedding biométrico nesta fase.
- [ ] PostgreSQL fora do `docker-compose.yml` — conectar ao banco já existente (`bd_sistema_ponto_intelix`) via `host.docker.internal`; os schemas de cada tenant são criados dinamicamente pelo `stancl/tenancy` dentro desse mesmo banco, nunca um banco novo.

**Sobre LGPD nesta fase:** como a v1 não faz nenhum processamento técnico da foto (sem extração de pontos faciais, sem comparação), a foto capturada é dado pessoal comum, não se enquadra como dado biométrico sensível pela LGPD enquanto for só evidência armazenada — ainda assim, trate como dado pessoal normal (acesso restrito, política de retenção, TLS em trânsito). Isso muda quando o reconhecimento facial ativo entrar.

---

## 10. Contexto para fases futuras (não implementar agora)

- Reconhecimento facial ativo: AWS Rekognition (conta e credenciais IAM já preparadas, região `sa-east-1`) ou self-hosted (CompreFace/InsightFace + anti-spoofing separado), decisão ainda em aberto.
- REP-P pleno: geração de AFD/AEJ assinados com certificado ICP-Brasil, registro do programa no INPI.
- PWA completo (manifest, service worker) por cima do SPA responsivo, se fizer sentido depois.
- Envio de e-mail transacional, quando tiverem SMTP/provedor configurado.

---

Comece pela Fase 0. Ao terminar, pare e me diga o que validar antes de eu confirmar a próxima fase.