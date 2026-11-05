# Ares Frontier

Plataforma demonstrativa de exploração e planejamento de viagens a Marte. Explore o planeta em 3D, compare territórios fictícios e monte uma missão com viagem, hospedagem e experiências.

O catálogo e as reservas são simulações locais. Cadastro, autenticação e administração de usuários usam uma API Python com persistência em PostgreSQL.

## Funcionalidades

- Globo de Marte interativo, catálogo de territórios, galeria, favoritos e comparação.
- Catálogos de viagens, hospedagens e experiências para montar uma missão.
- Simulação de reservas com resumo, total e histórico no navegador.
- Acesso como visitante, cadastro, login, restauração da sessão e logout.
- Área administrativa para buscar, criar, editar e ativar/desativar usuários, além de gerenciar seus perfis de acesso.

Missões, reservas e favoritos ficam no `localStorage` e são compartilhados por quem usa o mesmo navegador; não são dados privados vinculados à conta. A recuperação de senha é demonstrativa e não envia e-mails.

## Tecnologias

| Camada | Tecnologias |
| --- | --- |
| Interface | React 19, TypeScript, TanStack Start e TanStack Router |
| Estilos e componentes | Tailwind CSS 4, Radix UI e Lucide |
| Visualização 3D | Three.js, React Three Fiber e Drei |
| Ferramentas | Vite 8, Vitest, Testing Library, ESLint e Prettier |
| API | FastAPI, SQLAlchemy, Psycopg e Alembic |
| Banco e autenticação | PostgreSQL, hashes Argon2 e sessões revogáveis com cookie HttpOnly |

## Requisitos

- Node.js 22.12 ou superior e npm.
- Python com suporte às dependências de [backend/requirements.txt](backend/requirements.txt) e ao módulo `venv`.
- PostgreSQL acessível localmente ou em um serviço como Neon para autenticação e administração.

## Executar localmente

Os comandos abaixo usam PowerShell e partem da raiz do repositório. Usar `npm.cmd` evita depender da permissão de execução de scripts do PowerShell. Em outros terminais, use `npm`.

### 1. Preparar o frontend

```powershell
npm.cmd install
```

Se ainda não existir, crie `.env.local` na raiz com base em [.env.example](.env.example):

```dotenv
VITE_API_URL=http://localhost:8000
```

Essa variável recebe a origem da API, sem o sufixo `/api`. Reinicie o Vite após alterá-la.

### 2. Preparar o backend

Crie o ambiente virtual se ele ainda não existir e instale as dependências. Não é necessário ativá-lo:

```powershell
python -m venv backend/.venv
backend/.venv/Scripts/python.exe -m pip install -r backend/requirements.txt
```

Se ainda não existir, crie `backend/.env` com base em [backend/.env.example](backend/.env.example). Preserve as credenciais de uma configuração existente.

| Variável | Finalidade |
| --- | --- |
| `DATABASE_URL` | Conexão PostgreSQL da aplicação, usando o driver Psycopg 3. |
| `DIRECT_DATABASE_URL` | Conexão direta opcional para migrações; quando vazia, usa `DATABASE_URL`. |
| `FRONTEND_ORIGINS` | Origens permitidas, separadas por vírgula, incluindo protocolo e porta do frontend. |
| `SESSION_COOKIE_SECURE` | `false` para HTTP local; `true` para HTTPS em produção. |
| `SESSION_TTL_SECONDS` | Duração da sessão; padrão de `604800` segundos (sete dias). |

Substitua os valores demonstrativos das conexões pelas credenciais do seu banco. Aplique as migrações e inicie a API:

```powershell
Set-Location backend
.venv/Scripts/python.exe -m alembic upgrade head
.venv/Scripts/python.exe -m uvicorn app.main:app --reload --port 8000
```

### 3. Iniciar o frontend

Em outro terminal, na raiz do repositório:

```powershell
npm.cmd run dev
```

Abra o endereço exibido pelo Vite, normalmente `http://localhost:8080`. Use o mesmo hostname no frontend e no backend (`localhost` em ambos ou `127.0.0.1` em ambos). Se a porta mudar, ajuste `FRONTEND_ORIGINS`.

- Cadastro: `http://localhost:8080/cadastro`.
- Documentação interativa da API: `http://localhost:8000/docs`.
- Estado da API e da conexão com o banco: `http://localhost:8000/api/health`.

Consulte [backend/README.md](backend/README.md) para os detalhes de autenticação, segurança e publicação.

## Administração de usuários

Cadastre uma conta no site e, na pasta `backend`, conceda o primeiro acesso administrativo:

```powershell
.venv/Scripts/python.exe -m app.cli promote-admin seu-email@exemplo.com
```

O comando promove uma conta ativa já existente e não cria credenciais padrão. Atualize o site e acesse `/admin`.

Os endpoints administrativos verificam a sessão e o perfil atual no banco. Alterações de perfil ou status revogam as sessões da conta afetada. O sistema preserva um administrador ativo e impede que um administrador remova o próprio acesso.

## Comandos e verificações

Execute na raiz do projeto:

| Comando | Finalidade |
| --- | --- |
| `npm.cmd run dev` | Iniciar o servidor de desenvolvimento. |
| `npm.cmd run build` | Gerar o build de produção. |
| `npm.cmd run build:dev` | Gerar o build em modo de desenvolvimento. |
| `npm.cmd run preview` | Iniciar a prévia local do build. |
| `npm.cmd run lint` | Verificar o código com ESLint. |
| `npm.cmd test` | Executar os testes do frontend. |
| `npm.cmd run test:watch` | Executar os testes em modo de observação. |
| `npm.cmd run format` | Formatar os arquivos com Prettier. |

Para executar os testes do backend, na pasta `backend`:

```powershell
.venv/Scripts/python.exe -m unittest discover -s tests -v
```

Os testes do backend usam SQLite em memória, sem gravar no PostgreSQL configurado.

## Estrutura do projeto

| Caminho | Responsabilidade |
| --- | --- |
| `src/components/frontier/` | Interface e componentes da plataforma. |
| `src/components/three/` | Visualização 3D carregada apenas no cliente. |
| `src/data/territories.ts` | Territórios e suas imagens, descrições e fontes. |
| `src/data/catalog.ts` | Catálogos de viagens, hospedagens e experiências. |
| `src/hooks/use-frontier.tsx` | Estado de favoritos e comparação. |
| `src/hooks/use-mission.tsx` | Sessão da interface e planejamento local de missões. |
| `src/lib/auth-api.ts` | Comunicação com a API de autenticação e administração. |
| `src/routes/` | Páginas e rotas baseadas em arquivos. |
| `src/routes/__root.tsx` | Layout principal e providers. |
| `src/test/` | Testes do frontend. |
| `backend/app/` | API, configuração, modelos e acesso ao banco. |
| `backend/app/routers/auth.py` | Cadastro, login, sessão e logout. |
| `backend/app/routers/admin.py` | Administração de usuários. |
| `backend/migrations/` | Migrações Alembic. |
| `backend/tests/` | Testes da API. |

O arquivo `src/routeTree.gen.ts` é gerado automaticamente. As convenções de rotas estão em [src/routes/README.md](src/routes/README.md).

## Autenticação e publicação

As senhas são armazenadas como hashes Argon2. A autenticação usa um cookie HttpOnly, com apenas o hash do token de sessão no banco; senhas e tokens de autenticação não são persistidos no armazenamento do frontend. A interface consulta `/api/auth/me` antes de restaurar uma conta autenticada.

Em produção, configure HTTPS, `SESSION_COOKIE_SECURE=true` e a origem exata do frontend em `FRONTEND_ORIGINS`. Frontend e API devem estar no mesmo site, usando subdomínios ou um proxy de `/api`. Sem `VITE_API_URL`, o build de produção usa `/api` na própria origem. Configure limitação de tentativas de login e cadastro no proxy antes de expor a API publicamente.

Endpoints privados devem validar o usuário no servidor. Operações que alteram dados também exigem origem permitida e o cabeçalho `X-Ares-CSRF: 1`, já enviado pelo cliente da aplicação.

## Desenvolvimento com Lovable

Este repositório está conectado ao [projeto no Lovable](https://lovable.dev/projects/78f6a860-0637-4897-ac7f-e49c834b2ac7). As alterações enviadas à branch conectada são sincronizadas com o editor.

Preserve o histórico publicado: evite force push e rebase, amend ou squash de commits já enviados, pois essas operações podem comprometer o histórico no Lovable.
