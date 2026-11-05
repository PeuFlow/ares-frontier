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

O frontend usa `http://localhost:8000` em desenvolvimento. Para outra URL, defina
`VITE_API_URL` no `.env.local` da raiz, conforme `.env.example`, e reinicie o Vite.
Use o mesmo hostname nos dois processos: `localhost` em ambos, ou `127.0.0.1`
em ambos. Inclua a origem exata do frontend, com a porta, em `FRONTEND_ORIGINS`.

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

## Área administrativa

Acesse `/admin` com uma conta de perfil `admin`. A tela permite buscar e filtrar
cadastros, criar usuários, editar nome/e-mail, alterar perfil e ativar/desativar
contas. Alterar perfil ou status revoga as sessões existentes. Não é permitido
remover o próprio acesso administrativo. Senhas e hashes nunca são enviados na listagem.

Para conceder o primeiro acesso, cadastre a conta no site e execute na pasta `backend`:

```powershell
.venv/Scripts/python.exe -m app.cli promote-admin seu-email@exemplo.com
```

O comando altera somente uma conta ativa já existente, sem criar senhas padrão.
Atualize o site após executá-lo; o menu Admin ficará disponível. As rotas
`GET/POST /api/admin/users` e `PUT /api/admin/users/{id}` verificam a sessão e o
perfil no banco. Operações de escrita também exigem a proteção CSRF.

## Verificação dos testes

Na pasta `backend`:

```powershell
.venv/Scripts/python.exe -m unittest discover -s tests -v
```

Os testes usam SQLite em memória, sem gravar no banco configurado.
