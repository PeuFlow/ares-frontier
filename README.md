# Ares Frontier

Plataforma demonstrativa para explorar Marte em 3D, comparar territórios fictícios e planejar missões com viagens, hospedagens e experiências.

- Globo interativo, galeria, favoritos e comparação de territórios.
- Planejamento de missões e simulação de reservas.
- Cadastro, login, acesso como visitante e administração de usuários.

Missões e reservas ficam no navegador e são compartilhadas pelas contas que o utilizam. Autenticação e usuários são persistidos no PostgreSQL. A recuperação de senha é demonstrativa.

## Tecnologias

React 19, TypeScript, TanStack Start, Tailwind CSS, Three.js, FastAPI e PostgreSQL.

## Rodar localmente

Requisitos: Node.js 22.12+, npm, Python e PostgreSQL. Os comandos abaixo usam PowerShell, a partir da raiz do projeto.

### Frontend

Crie `.env.local`, se ainda não existir, usando [.env.example](.env.example) como referência (`VITE_API_URL=http://localhost:8000`).

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

## Comandos úteis

Na raiz do projeto:

| Comando | Função |
| --- | --- |
| `npm.cmd test` | Executar testes do frontend. |
| `npm.cmd run build` | Gerar o build de produção. |
| `npm.cmd run lint` | Verificar o código. |

## Lovable

Projeto conectado ao [editor Lovable](https://lovable.dev/projects/78f6a860-0637-4897-ac7f-e49c834b2ac7). Alterações enviadas à branch conectada são sincronizadas com o editor. Preserve o histórico publicado, evitando force push e reescrita de commits já enviados.
