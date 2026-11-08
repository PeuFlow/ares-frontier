# Autenticação local

O backend oferece cadastro, login, consulta da sessão e logout em `/api/auth`.
Senhas usam Argon2; o navegador recebe um cookie HttpOnly e o banco armazena
somente o SHA-256 do token aleatório da sessão. A sessão dura sete dias por padrão.

No PowerShell, a partir da raiz do projeto, não é necessário ativar o ambiente:

```powershell
backend/.venv/Scripts/python.exe -m pip install -r backend/requirements.txt
```

Configure `backend/.env` usando `backend/.env.example` como referência. Preserve
as credenciais existentes. Aplique as migrações e inicie a API:

```powershell
Set-Location backend
.venv/Scripts/python.exe -m alembic upgrade head
.venv/Scripts/python.exe -m uvicorn app.main:app --reload --port 8000
```

Em outro terminal, na raiz:

```powershell
npm.cmd run dev
```

Abra `http://localhost:8080/cadastro` (porta padrão deste projeto).

O frontend chama `/api` na própria origem. Em desenvolvimento com `npm run dev`,
o proxy do Vite encaminha essas chamadas para `http://127.0.0.1:8000`, preservando
o cookie e o cabeçalho Origin do navegador. Deixe `VITE_API_URL` vazio; para usar
intencionalmente outra API pública, configure essa variável no `.env.local` da
raiz e reinicie o Vite. Nesse caso, use o mesmo hostname nos dois processos.
Inclua a origem exata do frontend, com a porta, em `FRONTEND_ORIGINS`.

Crie uma conta em `/cadastro` com uma senha de 12 a 128 caracteres. O cadastro
inicia a sessão. Atualize a página para verificar a restauração e use Sair na
área da conta para revogar a sessão. Perfis antigos no localStorage não autenticam.
O acesso como visitante continua disponível. Missões e reservas ainda são
simulações locais compartilhadas pelo navegador; não são dados privados da conta.
Recuperação de senha continua demonstrativa e não envia e-mails.

## Publicação

Use HTTPS, `SESSION_COOKIE_SECURE=true` e uma origem explícita em
`FRONTEND_ORIGINS`. Sirva o frontend e a API no mesmo site (por exemplo,
`app.example.com` e `api.example.com`, ou proxy de `/api` no domínio do frontend).
O cookie SameSite=Lax não atende frontend e backend em sites independentes.
Sem `VITE_API_URL`, builds de produção usam `/api` na própria origem.
Configure limitação de tentativas de login/cadastro no proxy antes de expor a API
publicamente. O usuário comum nunca escolhe seu perfil administrativo.

Operações POST exigem `Origin` permitido e `X-Ares-CSRF: 1`; o frontend já envia
ambos pelo navegador. APIs privadas futuras devem usar `Depends(current_user)`
de `app.routers.auth` e aplicar a mesma validação CSRF em operações que alteram dados.
O bloqueio visual de navegação não substitui essa validação no servidor.

## Deploy na Vercel

A publicação atual usa dois projetos Vercel conectados a este repositório:

| Projeto                         | Raiz no repositório | URL                                   |
| ------------------------------- | ------------------- | ------------------------------------- |
| Frontend (`ares-frontier-eqed`) | `.`                 | https://ares-frontier-eqed.vercel.app |
| Backend (`ares-frontier`)       | `backend`           | https://ares-frontier.vercel.app      |

O backend exporta a aplicação FastAPI em `app/main.py`. O frontend mantém
TanStack Start com a configuração Lovable existente; o Nitro detecta a Vercel
e gera o build para essa plataforma. Não adicione outro plugin Nitro ao Vite.

O `vercel.json` na raiz pertence ao frontend: encaminha `/api/*` ao backend,
preservando o prefixo `/api`. Assim, o navegador usa a mesma origem para
requisições e cookies. A página do site é a URL do frontend; a raiz do backend
retorna informações da API, não a interface React.

Em **Settings → Environment Variables**, configure as variáveis separadamente.
O campo **Key** recebe o nome e **Value** recebe somente o valor, sem repetir
`NOME=`. Para Production:

| Projeto  | Key                     | Value                                                           |
| -------- | ----------------------- | --------------------------------------------------------------- |
| Frontend | `VITE_API_URL`          | Deixe ausente ou vazio.                                         |
| Backend  | `FRONTEND_ORIGINS`      | `https://ares-frontier-eqed.vercel.app`                         |
| Backend  | `SESSION_COOKIE_SECURE` | `true`                                                          |
| Backend  | `DATABASE_URL`          | Conexão PostgreSQL real da aplicação, preferencialmente pooled. |
| Backend  | `DIRECT_DATABASE_URL`   | Opcional: conexão direta para migrações.                        |

`FRONTEND_ORIGINS` aceita várias origens separadas por vírgula, sem barra final.
Inclua apenas URLs de preview que devem ser autorizadas; não use `*`. Configure
cada ambiente com seu banco e suas origens. Em desenvolvimento HTTP local,
use `SESSION_COOKIE_SECURE=false` e as origens indicadas em `backend/.env.example`.

Depois de alterar uma variável, faça redeploy do projeto correspondente. As
variáveis do backend não precisam ser copiadas para o frontend. Nunca exponha
conexões do banco em variáveis `VITE_*` e não envie arquivos `.env` ao Git.

As migrações não rodam automaticamente no build. Antes de publicar mudanças de
schema, execute na pasta `backend`, com as variáveis do banco de destino:

```powershell
.venv/Scripts/python.exe -m alembic upgrade head
```

Use um banco separado nos previews para evitar alterações em produção.
Para desenvolvimento local, utilize os processos Vite e FastAPI descritos no
início deste documento; o Vite encaminha `/api` à porta 8000.

### Diagnosticar login e cadastro na Vercel

O proxy do Vite funciona apenas em desenvolvimento. Em produção, é possível
usar dois projetos Vercel separados, como nesta publicação. O `vercel.json`
do frontend encaminha `/api/*` para a URL pública do
backend, mantendo o prefixo `/api`. Não use a própria URL do frontend como
destino: isso pode criar um ciclo de encaminhamento.

O rewrite atual aponta para `https://ares-frontier.vercel.app`, que deve ser o
projeto FastAPI. No projeto **backend**, configure `FRONTEND_ORIGINS` com a
origem exata do **frontend**, incluindo `https://` e sem barra final. Preserve
outras origens necessárias, separando-as por vírgula. Por exemplo, se o site
fosse `https://meu-frontend.vercel.app`, esse seria o valor autorizado, mesmo
que as requisições passem pelo rewrite. O navegador envia a origem do site.
Faça um novo deploy do backend após alterar essa variável. Mantenha
`SESSION_COOKIE_SECURE=true` no backend e `VITE_API_URL` vazio no frontend,
para que as chamadas e os cookies passem pelo domínio do frontend.

Depois de configurar as variáveis acima, faça um novo deploy e abra
`https://SEU-DOMINIO/api/health`. O resultado esperado é JSON com
`api: "connected"` e `database: "connected"`.

| Resultado                                        | O que verificar                                                                                                                   |
| ------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------- |
| HTML, 404 ou erro de encaminhamento              | Rewrite `/api/*` do frontend e disponibilidade do backend de destino; em Services, publicação do serviço `backend`.               |
| `database: "not_configured"`                     | `DATABASE_URL` no ambiente correto da Vercel.                                                                                     |
| HTTP 503 com `database: "unavailable"`           | Credenciais, disponibilidade e conexão com PostgreSQL; consulte os logs do backend.                                               |
| Health conectado, mas login/cadastro retorna 403 | `FRONTEND_ORIGINS` deve incluir a origem exata usada no navegador, como `https://ares-frontier-eqed.vercel.app`, sem barra final. |
| HTTP 500 com `FUNCTION_INVOCATION_FAILED`        | Logs da função FastAPI. Confira os valores e tipos das variáveis; `SESSION_COOKIE_SECURE` deve conter apenas `true` ou `false`.   |
| Login/cadastro retorna 503                       | Migrações aplicadas ao banco de destino e logs da função FastAPI.                                                                 |

Em **Settings → Environment Variables**, deixe `VITE_API_URL` ausente ou vazio,
configure `SESSION_COOKIE_SECURE=true` e use a conexão real em `DATABASE_URL`.
Variáveis locais não são enviadas automaticamente à Vercel. Alterações dessas
variáveis exigem um novo deploy; nunca publique os valores de conexão no Git.

Em `/api/auth/me`, um HTTP 401 antes do login é esperado: indica que a API
respondeu e não há sessão válida. Após entrar, essa rota deve retornar HTTP 200,
inclusive depois de atualizar a página.

## Área administrativa

Acesse `/admin` com uma conta de perfil `admin`. A tela permite buscar e filtrar
cadastros, criar usuários, editar nome/e-mail, alterar perfil e ativar/desativar
contas. Alterar perfil ou status revoga as sessões existentes. Não é permitido
remover o próprio acesso administrativo. Senhas e hashes nunca são enviados na listagem.

O botão **Senha** permite que administradores redefinam a senha de qualquer conta,
inclusive a própria, com confirmação na tela e limite de 12 a 128 caracteres.
`PUT /api/admin/users/{id}/password` exige a sessão de um administrador ativo e
proteção CSRF; armazena somente o hash Argon2 e revoga todas as sessões da conta
na mesma transação. A senha atual nunca é exibida. Ao alterar a própria senha,
o administrador é encaminhado ao login para entrar novamente com a nova senha.

A ação **Excluir** pede a confirmação do e-mail e remove permanentemente a conta,
encerrando suas sessões. Não é permitido excluir a própria conta administrativa
nem deixar o sistema sem um administrador ativo. Contas com missões vinculadas
não podem ser excluídas; desative-as para impedir novos acessos.

O **Histórico de exclusões** registra no banco o ID, nome e e-mail do usuário
removido e do administrador responsável, além da data e hora em UTC (exibida no
fuso do dispositivo). Os registros permanecem mesmo se uma dessas contas for
excluída posteriormente. Exclusão e auditoria ocorrem na mesma transação: uma
falha desfaz ambas. O histórico é paginado e acessível somente a administradores,
sem rotas de edição ou exclusão de logs. A migração `alembic upgrade head` cria a
tabela `admin_deletion_logs`; aplique-a antes de iniciar a API atualizada.

Para conceder o primeiro acesso, cadastre a conta no site e execute na pasta `backend`:

```powershell
.venv/Scripts/python.exe -m app.cli promote-admin seu-email@exemplo.com
```

O comando altera somente uma conta ativa já existente, sem criar senhas padrão.
Atualize o site após executá-lo; o menu Admin ficará disponível. As rotas
`GET/POST /api/admin/users` e `PUT /api/admin/users/{id}` verificam a sessão e o
perfil no banco. Operações de escrita também exigem a proteção CSRF.
Isso inclui `DELETE /api/admin/users/{id}`; `GET /api/admin/deletion-logs`
consulta o histórico com `offset` e `limit`.

## Verificação dos testes

Na pasta `backend`:

```powershell
.venv/Scripts/python.exe -m unittest discover -s tests -v
```

Os testes usam SQLite em memória, sem gravar no banco configurado.
