# Ares Frontier

Plataforma demonstrativa para explorar Marte em 3D, comparar territórios fictícios e planejar missões com viagens, hospedagens e experiências.

- Globo interativo, galeria, favoritos e comparação de territórios.
- Planejamento de missões e simulação de reservas.
- Cadastro, login, acesso como visitante e administração de usuários.
- Astronauta com IA Gemini: explicações contextuais durante a navegação e chat sobre os catálogos da plataforma.

Missões e reservas ficam no navegador e são compartilhadas pelas contas que o utilizam. Autenticação e usuários são persistidos no PostgreSQL. A recuperação de senha é demonstrativa.

## Acessar online

Acesse o [Ares Frontier na Vercel](https://ares-frontier-eqed.vercel.app/) diretamente pelo navegador, sem instalar dependências ou configurar o ambiente local.

## Tecnologias

React 19, TypeScript, TanStack Start, Tailwind CSS, Three.js, FastAPI, PostgreSQL e Google Gemini.

## Rodar localmente

Requisitos: Node.js 22.12+, npm, Python e PostgreSQL. Os comandos abaixo usam PowerShell, a partir da raiz do projeto.

### Frontend

Se precisar de configuração local, use [.env.example](.env.example) como referência.
Deixe `VITE_API_URL` vazio para acessar `/api` na mesma origem; o Vite encaminha
essas chamadas à API local na porta 8000.

```powershell
npm.cmd install
npm.cmd run dev
```

Abra o endereço exibido pelo Vite, normalmente `http://localhost:8080`.

### Backend

Crie `backend/.env`, se ainda não existir, usando [backend/.env.example](backend/.env.example) e configure a conexão com seu PostgreSQL. Preserve credenciais existentes.

Crie o ambiente virtual se necessário e inicie a API:

```powershell
python -m venv backend/.venv
backend/.venv/Scripts/python.exe -m pip install -r backend/requirements.txt
Set-Location backend
.venv/Scripts/python.exe -m alembic upgrade head
.venv/Scripts/python.exe -m uvicorn app.main:app --reload --port 8000
```

Mantenha frontend e backend em terminais separados, usando o mesmo hostname (`localhost`). A documentação da API fica em `http://localhost:8000/docs`.

Veja [backend/README.md](backend/README.md) para administração de usuários, testes da API e publicação.

### Astronauta com IA

Para revisar o redesign visual sem depender de login, banco ou Gemini, execute
`npm.cmd run demo:astronauta` e abra
`http://127.0.0.1:8081/demos/astronauta.html`. A demonstração usa os componentes
reais com respostas simuladas em um servidor local separado e fica fora do build
de produção. Veja [a auditoria UX/UI e o roteiro de validação](docs/auditoria-astronauta-ux.md).

Entre com sua conta e abra o botão da nave. **Soltar astronauta** ativa o guia com explicações sobre as seções e os itens selecionados; **Conversar com o astronauta** abre o chat. As explicações podem ser pausadas pela nave ou pelo balão.

Para habilitar a IA, configure somente no `backend/.env`, preservando as demais variáveis:

```dotenv
GEMINI_API_KEY=SUA_CHAVE
GEMINI_MODEL=ID_DO_MODELO_HABILITADO
```

Instale as dependências de `backend/requirements.txt` e reinicie a API. A chave e o modelo ficam no backend, sem prefixo `VITE_`. O chat exige autenticação; seu histórico é temporário e não é salvo no navegador ou no banco.

As respostas usam os catálogos da plataforma e os blocos de conteúdo publicados. O astronauta orienta a exploração, sem efetuar compras, reservas ou alterações na missão. Os territórios, preços e serviços fazem parte da demonstração fictícia.

Na Vercel, configure `GEMINI_API_KEY` e `GEMINI_MODEL` no projeto **backend** e publique novamente esse projeto. O frontend também deve receber esta atualização. O `.env` local não é enviado à hospedagem.

Veja [o guia do astronauta Gemini](docs/gemini-astronauta.md) para endpoints, limites, testes e atualização da base de conhecimento. Ao alterar os catálogos TypeScript, execute `npm.cmd run ai:catalog` e versione o JSON gerado junto das alterações.

## Comandos úteis

Na raiz do projeto:

| Comando                        | Função                                            |
| ------------------------------ | ------------------------------------------------- |
| `npm.cmd test`                 | Executar testes do frontend.                      |
| `npm.cmd run build`            | Gerar o build de produção.                        |
| `npm.cmd run lint`             | Verificar o código.                               |
| `npm.cmd run ai:catalog`       | Atualizar os catálogos usados pela IA.            |
| `npm.cmd run ai:catalog:check` | Verificar se a base da IA acompanha os catálogos. |

## Deploy na Vercel

O frontend está no projeto `ares-frontier-eqed` e encaminha `/api/*` para o
backend do projeto `ares-frontier`. Veja [o guia de deploy na Vercel](backend/README.md#deploy-na-vercel)
para configurar os dois projetos, as variáveis de ambiente e as migrações.

## Lovable

Projeto conectado ao [editor Lovable](https://lovable.dev/projects/78f6a860-0637-4897-ac7f-e49c834b2ac7). Alterações enviadas à branch conectada são sincronizadas com o editor. Preserve o histórico publicado, evitando force push e reescrita de commits já enviados.
